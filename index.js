#!/usr/bin/env node
'use strict';

const Path = require('path');
const Hapi = require('hapi');
const Inert = require('inert');
const devapi = require('@mysql/xdevapi');
const hapi_mysqlx = require('hapi-mysqlx');
const querystring = require("querystring");
const handlebars = require('handlebars');
const prettyHtml = require('json-pretty-html').default;


const server = Hapi.server({
  port : 3000,
  host : 'localhost',
  routes : {files : {relativeTo : Path.join(__dirname, 'public')}}
});

server.route({
  method : 'GET',
  path : '/',
  handler : async(request, h) => {
    const schema = await request.mysqlxSchema();
    const data = { version: devapi.getVersion() };

    data.collections =
        (await schema.getCollections()).map(coll => {
          return {
            name : coll.getName(),
            url : querystring.escape(coll.getName())
          }
        });

    await schema.getCollection('info')
        .find()
        .fields("copyright")
        .limit(1)
        .execute(doc => {data.copyright = doc.copyright});


    return h.view('index', data);
  }
});

server.route({
  method : 'GET',
  path : '/collection/{collection}',
  handler : async(request, h) => {
    const collection = await request.mysqlxCollection(request.params.collection);

    const docs = [];
    try {
      //await collection.find().execute(
      await collection
	    .find()
	    .execute(
          doc => docs.push({id : doc._id, doc : prettyHtml(doc)}));
      return h.view('collection',
                    {name : request.params.collection, docs}) // docs;
    } catch (err) {
      console.log(err);
      return err;
    }
  }
});

server.route({
  method : 'GET',
  path : '/map',
  handler : async(request, h) => {
    return h.view('map');
  }
});

server.route({
  method : 'POST',
  path : '/getLocations',
  handler : async(request, h) => {
    // TODO: Handle bad data
    const collection = await request.mysqlxCollection('places');
    const geometry = request.payload.geometry;

    const conditions = [
      "ST_within(ST_GeomFromGeoJSON($.geometry, 1, 4326), ST_GeomFromGeoJSON(:geo, 1, 4326))"
    ];
    const values = { 'geo': JSON.stringify(geometry) };
/*
    conditions.push("tags.wheelchair = :wheel");
    values['wheel'] = 'yes';
*/
    const result = { places: [] };
      await collection
	    .find(conditions.join(' && '))
	    .bind(values)
	    //.find("St_within(st_geomfromgeojson($.geometry, 1, 4326), ST_GeomFromGeoJSON(:geo, 1, 4326))")
	    //.bind({ 'geo': JSON.stringify(geometry)})
	    .execute(place => result.places.push(place));

    return result;
  }
});

const init = async() => {
  await Promise.all([
    server.register(require('vision')), 
    server.register({
      plugin : hapi_mysqlx.plugin,
      options : {
        url : 'mysqlx://root@localhost',
        client : {pooling : {maxSize : 100}},
        schema : 'appelwoi'
      }
    })
  ]);

  server.views({
    engines : {html : require('handlebars')},
    relativeTo : __dirname,
    path : 'templates',
    layout : true,
    layoutPath : 'templates/layout'
  });

  await server.register(Inert);

  server.route({
    method : 'GET',
    path : '/assets/{param*}',
    handler : {
      directory : {
        path : '.',
        redirectToSlash : true,
        index : true,
      }
    }
  });

  await server.start();
  console.log(`Server running at: ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();
