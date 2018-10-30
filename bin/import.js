#!/usr/bin/env node

const wreck = require('wreck');
const querystring = require("querystring");
const mysqlx = require('@mysql/xdevapi');
const config = require('config');

const overpass_query = `
[out:json];
node[amenity=pub](49.952811322341515,8.200165905761719,50.81052145027411,9.006572912597656);
node[amenity=bar](49.952811322341515,8.200165905761719,50.81052145027411,9.006572912597656);
node[amenity=restaurant](49.952811322341515,8.200165905761719,50.81052145027411,9.006572912597656);
out;
`;

const session_promise = mysqlx.getSession(config.get('mysql.url'));

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
  session.dropSchema(config.get('mysql.schema'));
  const schema = await session.createSchema(config.get('mysql.schema'));
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
