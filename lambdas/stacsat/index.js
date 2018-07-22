
'use strict'

const local = require('kes/src/local')
const satlib = require('sat-api-lib')
const request = require('request')

function download_json(url) {
  return new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      if (error) reject(error);
      if (response.statusCode != 200) {
        reject('Invalid status code <' + response.statusCode + '>')
      }
      resolve(body)
    })
  })
}

function handler (event, context=null, cb=function(){}) {

  //console.log(JSON.stringify(event))

  // Build array with all STAC items
  var imported_stac_items = []
  event.Records.forEach(function(record) {

    // load stac item
    const body = JSON.parse(record.body)
    const imported_stac_item = JSON.parse(body.Message)
    console.log(imported_stac_item)
    imported_stac_items.push(imported_stac_item)
    //console.log(imported_stac_item.geometry.coordinates[0][0][0][0])
    //console.log(imported_stac_item.geometry.coordinates[0][0][0][1])
    //console.log(imported_stac_item.geometry.coordinates[0][0][1][0])
    //console.log(imported_stac_item.geometry.coordinates[0][0][1][1])

  })

  satlib.es.client().then((client) => {

    console.log('Connected to ES')

    // Create a 'collection' index in ES
    satlib.es.putMapping(client, 'collections').catch((err) => {})

    // traverse list and add collection if necessary
    // satlib.es.client is an async function
    imported_stac_items.forEach(function(imported_stac_item) {
      // Check if we need to import collection
      console.log("Checking ", imported_stac_item.properties['c:id'])
      client.exists({
        index: 'collections',
        type: 'doc',
        id: imported_stac_item.properties['c:id']
      }).then(function (collection_exists) {
        if( !collection_exists ) {
          // Read collection information and insert into ES
          // Load collection from stac item
          download_json(imported_stac_item.links.collection.href).then(function (body) {
            const imported_collection = JSON.parse(body)
            console.log(imported_collection)
            console.log(imported_collection.properties['c:id'])
        
            // @todo repeating c:id parameter at first level, check 'c:id' passed
            // to saveRecords below
            imported_collection['c:id'] = imported_collection.properties['c:id']
          
            // @todo check, had to remove index= named parameter
            satlib.es.saveRecords(client, [imported_collection], 'collections', 'c:id',
                                  (err, updated, errors) => {
                                    if (err) console.log('Error: ', err)
                                  })
          })
        } else {
          console.log('Collection', imported_stac_item.properties['c:id'],
                      'already imported');
        }
      })
    })
    // Include all STAC items
    satlib.es.saveRecords(client, imported_stac_items, 'items', 'id', (err, updated, errors) => {
      if (err) console.log('Error: ', err)
    })
  })
}

// to execute locally
//   needs
//     const local = require('kes/src/local')
//   $ node index.js local
//  connection to ES require process.env.ES_TEST_HOST
local.localRun(() => {
  console.log('running locally')

  // Test event payload (single SQS message)
  const a = { Records:
              [ { messageId: '7438ccd7-976c-461a-8422-190c1dd05826',
                  receiptHandle: 'AQEBIC+RFVMVmWGgh2aRIZK03KQ+Iq7GCgDWSIR78NSgRLLjdLtEbbqqfK5/eADKLMqxtVhFe/O73FgQNc6kD5CGjRLDRtnaPpg1ClP4kUrenrFBXlSmevYVoAR6YVhS5lvF2z2XPPP3pvatIU/NGUEra+9TiV/ikMzICJZJvRQGA0yMOEuSSu+s9xcHzxHqn3aqWP4HxotL7+YoGYJKoBcl24ESu0uKoSo2lvAlTk8C9MyFEqPowjrfl8rcncHMkSu9DIr+Ar0dvRlAJ3cD8XQ0AYk2izDi904B2PKQCpyRx/T8Avftz+k+zLZmjhl368AIVyAaMYAtU3SVN6096+FpCnwbltXfFJ20P0WslGH0HSXhLGSINuD5FFEyPqyWTEPy',
                  body: '{\n "Type" : "Notification",\n "MessageId" : "75a4b276-4fc5-5b19-bbd4-e1bb84f872d6",\n "TopicArn" : "arn:aws:sns:us-east-1:769537946825:cbers-2-stac-CBERSSTACItemTopic-N0MZUA5EIQC9",\n "Message" : "{\\"id\\": \\"CBERS_4_AWFI_20170202_163_135_L4\\", \\"type\\": \\"Feature\\", \\"bbox\\": [-62.623474, -35.166778, -51.450413, -26.896415], \\"geometry\\": {\\"type\\": \\"MultiPolygon\\", \\"coordinates\\": [[[[-62.520943, -33.720312], [-52.892548, -35.197403], [-51.389008, -28.427529], [-60.347934, -27.053129], [-62.520943, -33.720312]]]]}, \\"properties\\": {\\"datetime\\": \\"2017-02-02T13:58:04Z\\", \\"provider\\": \\"INPE\\", \\"eo:collection\\": \\"default\\", \\"eo:sun_azimuth\\": 69.6523, \\"eo:sun_elevation\\": 60.1348, \\"eo:off_nadir\\": -0.00834499, \\"eo:epsg\\": 32757, \\"cbers:data_type\\": \\"L4\\", \\"cbers:path\\": 163, \\"cbers:row\\": 135, \\"c:id\\": \\"CBERS_4_AWFI_L4\\"}, \\"links\\": {\\"self\\": {\\"rel\\": \\"self\\", \\"href\\": \\"https://cbers-stac.s3.amazonaws.com/CBERS4/AWFI/163/135/CBERS_4_AWFI_20170202_163_135_L4.json\\"}, \\"catalog\\": {\\"rel\\": \\"catalog\\", \\"href\\": \\"https://cbers-stac.s3.amazonaws.com/CBERS4/AWFI/163/catalog.json\\"}, \\"collection\\": {\\"rel\\": \\"collection\\", \\"href\\": \\"https://cbers-stac.s3.amazonaws.com/collections/CBERS_4_AWFI_L4_collection.json\\"}}, \\"assets\\": {\\"thumbnail\\": {\\"href\\": \\"https://s3.amazonaws.com/cbers-meta-pds/CBERS4/AWFI/163/135/CBERS_4_AWFI_20170202_163_135_L4/CBERS_4_AWFI_20170202_163_135.jpg\\", \\"type\\": \\"jpeg\\"}, \\"metadata\\": {\\"href\\": \\"s3://cbers-pds/CBERS4/AWFI/163/135/CBERS_4_AWFI_20170202_163_135_L4/CBERS_4_AWFI_20170202_163_135_L4_BAND14.xml\\", \\"type\\": \\"xml\\"}, \\"B13\\": {\\"href\\": \\"s3://cbers-pds/CBERS4/AWFI/163/135/CBERS_4_AWFI_20170202_163_135_L4/CBERS_4_AWFI_20170202_163_135_L4_BAND13.tif\\", \\"type\\": \\"GeoTIFF\\", \\"format\\": \\"COG\\", \\"eo_bands\\": [\\"13\\"]}, \\"B14\\": {\\"href\\": \\"s3://cbers-pds/CBERS4/AWFI/163/135/CBERS_4_AWFI_20170202_163_135_L4/CBERS_4_AWFI_20170202_163_135_L4_BAND14.tif\\", \\"type\\": \\"GeoTIFF\\", \\"format\\": \\"COG\\", \\"eo_bands\\": [\\"14\\"]}, \\"B15\\": {\\"href\\": \\"s3://cbers-pds/CBERS4/AWFI/163/135/CBERS_4_AWFI_20170202_163_135_L4/CBERS_4_AWFI_20170202_163_135_L4_BAND15.tif\\", \\"type\\": \\"GeoTIFF\\", \\"format\\": \\"COG\\", \\"eo_bands\\": [\\"15\\"]}, \\"B16\\": {\\"href\\": \\"s3://cbers-pds/CBERS4/AWFI/163/135/CBERS_4_AWFI_20170202_163_135_L4/CBERS_4_AWFI_20170202_163_135_L4_BAND16.tif\\", \\"type\\": \\"GeoTIFF\\", \\"format\\": \\"COG\\", \\"eo_bands\\": [\\"16\\"]}}}",\n "Timestamp" : "2018-07-21T23:59:57.306Z",\n "SignatureVersion" : "1",\n "Signature" : "FrgcguM0cCxptNw69h+8+XJDxU4MDGIoRVWn63zM4061Kaa4GvoH8yHrgeD9uY39mohJTj3sFhNmJiOc+PEeFk6jDqnQlE0Qfo5pNDqJ0w85Fs4J4J2tMM9dv+pWPvO/rTSjumjxlM/HTnqz8AWsX3JipphobldkbKhuO/89A7KyWmCDH4FcvCt4SxfQNpYQDfreh1zlv0nzOW6/+gMjND6FXGcvZBJjwPeuzrYRME1VB2qeRaojmxxN4ftJ8PGcN2orPCwEugnDXSUuHqHXWCexQ/dRG4wEuleWHXg21he9QR/AMAyKfC0NMhaB7Hi4YE/+5uSybYYJGHSEMzQQBg==",\n "SigningCertURL" : "https://sns.us-east-1.amazonaws.com/SimpleNotificationService-eaea6120e66ea12e88dcd8bcbddca752.pem",\n "UnsubscribeURL" : "https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:us-east-1:769537946825:cbers-2-stac-CBERSSTACItemTopic-N0MZUA5EIQC9:27d89923-20b3-4208-b012-47ed0dfd7918",\n "MessageAttributes" : {\n "bbox.ur_lon" : {"Type":"Number","Value":"-51.450413"},\n "bbox.ur_lat" : {"Type":"Number","Value":"-26.896415"},\n "links.self.href" : {"Type":"String","Value":"https://cbers-stac.s3.amazonaws.com/CBERS4/AWFI/163/135/CBERS_4_AWFI_20170202_163_135_L4.json"},\n "bbox.ll_lon" : {"Type":"Number","Value":"-62.623474"},\n "properties.datetime" : {"Type":"String","Value":"2017-02-02T13:58:04Z"},\n "bbox.ll_lat" : {"Type":"Number","Value":"-35.166778"},\n "properties.c.id" : {"Type":"String","Value":"CBERS_4_AWFI_L4"}\n }\n}',
                  attributes: [Object],
                  messageAttributes: {},
                  md5OfBody: 'b0c84e1710389da6a2b36afa0021bf7f',
                  eventSource: 'aws:sqs',
                  eventSourceARN: 'arn:aws:sqs:us-east-1:769537946825:STACItemTest',
                  awsRegion: 'us-east-1' } ] }

  handler(a, null, (err, r) => {                            
    if (err) {
      console.log(`error: ${e}`)
    } else {
      console.log(`success: ${r}`)
    }
  })

})

module.exports.handler = handler
