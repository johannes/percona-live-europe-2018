#!/usr/bin/env node
'use strict';

const Hapi = require('hapi');
const devapi = require('@mysql/xdevapi');
const mysqlx = require('../lib/mysqlx');
const querystring = require("querystring");
const handlebars = require('handlebars');
const prettyHtml = require('json-pretty-html').default;
const server = Hapi.server({port : 3000, host : 'localhost'});

server.route({
  method : 'GET',
  path : '/',
  handler : async(request, h) => {
    const schema = await request.mysqlxSchema();
    const collections =
        (await schema.getCollections()).map(coll => {
          return {
            name : coll.getName(),
            url : querystring.escape(coll.getName())
          }
        });
    return h.view('index', { version: devapi.getVersion(), collections });
  }
});

server.route({
  method : 'GET',
  path : '/{collection}',
  handler : async(request, h) => {
    const collection = await request.mysqlxCollection(request.params.collection);

    const docs = [];
    try {
      await collection.find().execute(
          doc => docs.push({id : doc._id, doc : prettyHtml(doc)}));
      return h.view('collection',
                    {name : request.params.collection, docs}) // docs;
    } catch (err) {
      console.log(err);
      return err;
    }
  }
});

const init = async() => {
  await Promise.all([
    server.register(require('vision')), 
    server.register({
      plugin : mysqlx.plugin,
      options : {
        url : 'mysqlx://root@localhost',
        client : {pooling : {maxSize : 100}},
        schema : 'test'
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

  await server.start();
  console.log(`Server running at: ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();
