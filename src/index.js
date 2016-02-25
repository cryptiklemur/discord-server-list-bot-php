'use strict';

const pkg           = require('../package');
const Bot           = require('./Bot');
const ServerManager = require('./Manager/ServerManager');
const BotManager    = require('./Manager/BotManager');
const Commands      = require('require-all')(__dirname + '/Command/');
const es            = require('elasticsearch');
const env           = process.env;

let commands = [];
for (let name in Commands) {
    if (Commands.hasOwnProperty(name)) {
        if (name !== 'AbstractCommand') {
            commands.push(Commands[name]);
        }
    }
}

function ElasticSearch(host) {
    return new es.Client({host: host});
}

let options = {
    admin_id:  env.DISCORD_ADMIN_ID,
    email:     env.DISCORD_EMAIL,
    password:  env.DISCORD_PASSWORD,
    log_dir:   '/var/log/discord_bots',
    name:      pkg.name,
    version:   pkg.version,
    author:    pkg.author,
    commands:  commands,
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
                elasticsearch_url: env.DISCORD_ELASTICSEARCH
            },
            services:   {
                'manager.server': {
                    module: ServerManager,
                    args:   [{$ref: 'dispatcher'}, {$ref: 'client'}, {$ref: 'logger'}]
                },
                'manager.bot':    {
                    module: BotManager,
                    args:   [
                        {$ref: 'dispatcher'},
                        {$ref: 'client'},
                        {$ref: 'logger'},
                        {$ref: 'helper.channel'},
                        {$ref: 'helper.ignore'}
                    ]
                },
                search:           {module: ElasticSearch, args: ['%elasticsearch_url%']}
            }
        };
    }
};

let environment = 'prod';
if (env.DISCORD_ENV !== undefined) {
    environment = env.DISCORD_ENV;
}
new Bot(environment, environment === 'dev', options);
