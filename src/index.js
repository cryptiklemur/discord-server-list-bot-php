'use strict';

const pkg           = require('../package');
const walk          = require('walk');
const Bot           = require('./Bot');
const API           = require('./API');
const ServerManager = require('./Manager/ServerManager');
const es            = require('elasticsearch');
const env           = process.env;

function ElasticSearch(host) {
    return new es.Client({host: host});
}

let walker  = walk.walk(__dirname + '/Command/', {followLinks: false}),
    options = {
        admin_id:  env.DISCORD_ADMIN_ID,
        email:     env.DISCORD_EMAIL,
        password:  env.DISCORD_PASSWORD,
        name:      pkg.name,
        version:   pkg.version,
        author:    pkg.author,
        commands:  [],
        status:    'www.discservs.co',
        prefix:    "|",
        container: (Bot) => {
            return {
                parameters: {
                    redis_url:         env.DISCORD_REDIS_URL,
                    mongo_url:         env.DISCORD_MONGO_URL,
                    api_key:           env.DISCORD_API_KEY,
                    elasticsearch_url: env.DISCORD_ELASTICSEARCH
                },
                services:   {
                    'api':            {module: API, args: ['%dev%', '%api_key%']},
                    'manager.server': {module: ServerManager, args: [{$ref: 'client'}, {$ref: 'api'}]},
                    search:           {module: ElasticSearch, args: ['%elasticsearch_url%']}
                }
            };
        }
    };

walker.on('file', (root, stat, next) => {
    options.commands.push(require(__dirname + '/Command/' + stat.name));

    next();
});

walker.on('end', () => {
    let environment = 'prod';
    if (env.DISCORD_ENV !== undefined) {
        environment = env.DISCORD_ENV;
    }
    new Bot(environment, environment === 'dev', options);
});
