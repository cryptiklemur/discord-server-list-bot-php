'use strict';

const pkg           = require('../package');
const Bot           = require('./Bot');
const InviteManager = require('./Manager/InviteManager');
const ServerManager = require('./Manager/ServerManager');
const BotManager    = require('./Manager/BotManager');
const es            = require('elasticsearch');
const env           = process.env;

let options = {
    admin_id:  env.DISCORD_ADMIN_ID,
    email:     env.DISCORD_EMAIL,
    password:  env.DISCORD_PASSWORD,
    log_dir:   '/var/log/discord_bots',
    name:      pkg.name,
    version:   pkg.version,
    author:    pkg.author,
    modules:   [require('./DSLModule')],
    status:    'http://discservs.co',
    prefix:    "|",
    redis_url: env.DISCORD_REDIS_URL,
    mongo_url: env.DISCORD_MONGO_URL,
    queue:     {
        host: env.DISCORD_RABBIT_HOST
    },
    container: (Bot) => {
        return {
            parameters: {
                elasticsearch: {
                    host: env.DISCORD_ELASTICSEARCH_HOST,
                    port: env.DISCORD_ELASTICSEARCH_PORT
                }
            },
            services:   {
                search:           {module: es.Client, args: ['%elasticsearch%']},
                'manager.invite': {
                    module: InviteManager,
                    args:   ['@dispatcher', '@client', '@logger']
                },
                'manager.server': {
                    module: ServerManager,
                    args:   ['@dispatcher', '@client', '@logger']
                },
                'manager.bot':    {
                    module: BotManager,
                    args:   ['@dispatcher', '@client', '@logger', '@helper.channel', '@helper.ignore']
                }
            }
        };
    }
};

let environment = 'prod';
if (env.DISCORD_ENV !== undefined) {
    environment = env.DISCORD_ENV;
}
new Bot(environment, environment === 'dev', options);
