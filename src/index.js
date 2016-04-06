'use strict';

const pkg                  = require('../package'),
      Bot                  = require('./Bot'),
      InviteChecker        = require('./Checker/InviteChecker'),
      ServerListener       = require('./Listener/ServerListener'),
      ServerManagerFactory = require('./Factory/Manager/ServerManagerFactory'),
      es                   = require('elasticsearch'),
      env                  = process.env;

let options = {
    admin_id:      env.DISCORD_ADMIN_ID,
    token:         env.DISCORD_TOKEN,
    log_dir:       '/var/log/discord_bots',
    name:          pkg.name,
    version:       pkg.version,
    author:        pkg.author,
    modules:       [require('./DSLModule')],
    status:        'http://discservs.co',
    loaderTimeout: 240,
    prefix:        "|",
    redis_url:     env.DISCORD_REDIS_URL,
    mongo_url:     env.DISCORD_MONGO_URL,
    queue:         {
        host: env.DISCORD_RABBIT_HOST
    },
    container:     (Bot) => {
        return {
            parameters: {
                elasticsearch: {
                    host: env.DISCORD_ELASTICSEARCH_HOST,
                    port: env.DISCORD_ELASTICSEARCH_PORT
                }
            },
            services:   {
                search:                   {module: es.Client, args: ['%elasticsearch%']},
                'checker.invite':         {module: InviteChecker, args: ['@client', '@logger']},
                'listener.server':        {module: ServerListener, args: ['@client', '@logger']},
                'factory.manager.server': {module: ServerManagerFactory, args: ['@container']}
            }
        };
    }
};

let environment = 'prod';
if (env.DISCORD_ENV !== undefined) {
    environment = env.DISCORD_ENV;
}
new Bot(environment, environment === 'dev', options);
