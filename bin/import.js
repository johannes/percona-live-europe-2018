#!/usr/bin/env node

const wreck = require('wreck');
const querystring = require("querystring");
const mysqlx = require('@mysql/xdevapi');

const overpass_query = `
[out:json];
node[amenity=pub](50.002811322341515,8.500165905761719,50.21052145027411,8.806572912597656);
node[amenity=bar](50.002811322341515,8.500165905761719,50.21052145027411,8.806572912597656);
node[amenity=restaurant](50.002811322341515,8.500165905761719,50.21052145027411,8.806572912597656);
out;
`;

const session_promise = mysqlx.getSession('mysqlx://root@localhost');

const url = "http://overpass-api.de/api/interpreter?data=" +
            querystring.escape(overpass_query);

async function fetch() {
  if (process.argv[2]) {
    return require(process.cwd() + '/' + process.argv[2]);
  } else {
    const {res, payload} = await wreck.get(url, {json : true});
    return payload;
  }
}

async function createSchemaAndCollectons(session) {
  session.dropSchema('appelwoi');
  const schema = await session.createSchema('appelwoi');
  return Promise.all([
    schema.createCollection('info'),
    schema.createCollection('places'),
  ]);
}

(async function() {
  try {
    const data = await fetch();
    console.log(data.osm3s);

    const session = await session_promise;
    const [ info, places ] = await createSchemaAndCollectons(session);

    info.add(data.osm3s).execute();

    places
        .add(data.elements.map(element => {
          element.geometry = {
            "type" : "Point",
            "coordinates" : [ element.lon, element.lat ]
          };
          delete element.lon;
          delete element.lan;
	  return element;
        }))
        .execute();

    places.createIndex('geometry', {
                fields: [{
                    field: '$.geometry',
                    type: 'GEOJSON',
                    required: true
                }],
                type: 'SPATIAL'
            });

    session.close();
  } catch (err) {
    console.error("ERROR:", err.message);
    process.terminate();
  }

})();
