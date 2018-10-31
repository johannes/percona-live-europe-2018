'use strict';

const mysqlx = require('@mysql/xdevapi');

let client = null;

async function getMysqlxSession(plugin) {
  if (!client) {
    throw new Error('MySQL X Client not initialized');
  }
  if (!plugin.session) {
    return client.getSession().then(session => plugin.session = session);
    //return mysqlx.getSession(plugin.options.url)
    //   .then(session => plugin.session = session);
  } else {
    return plugin.session;
  }
}

exports.plugin = {
  name: 'xdevapi',
  version: '1.0.0',
  register: async function(server, options) {
    client = mysqlx.getClient(options.url, options.client);

    server.ext({
      'type' : 'onRequest',
      'method' : async function(request, h) {
        request.plugins.mysqlx = { options };
        //request.plugins.mysqlx = await client.getSession();
        return h.continue;
      }
    });

    server.decorate('request', 'mysqlxSession', async function() {
      return getMysqlxSession(this.plugins.mysqlx)
    });

    server.decorate('request', 'mysqlxSchema', async function() {
      return getMysqlxSession(this.plugins.mysqlx)
          .then(session =>
                    session.getSchema(this.plugins.mysqlx.options.schema));
    });

    server.decorate('request', 'mysqlxCollection', async function(coll) {
      return getMysqlxSession(this.plugins.mysqlx)
          .then(session => session.getSchema(this.plugins.mysqlx.options.schema)
                               .getCollection(coll));
    });

    server.events.on('response', request => {
      if (request.plugins.mysqlx.session) {
        request.plugins.mysqlx.session.close().catch(
            err => console.log("CLOSE", err));
      }
    });

    server.events.on('stop', () => client.close());
  }
};
