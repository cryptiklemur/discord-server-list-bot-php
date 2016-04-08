const BaseBot    = require('discord-bot-base').Bot,
      _          = require('lodash'),
      requestify = require('request');

class Bot extends BaseBot {
    run() {
        this.loader.on('start.pre', loader => {
            loader.loaded.extra.es = false;

            let es     = this.container.get('search'),
                logger = this.container.get('logger');

            es.indices.exists({index: 'app'})
                .catch(logger.error)
                .then(exists => {
                    if (exists) {
                        return es.indices.delete({index: 'app'})
                            .catch(logger.error)
                            .then(response => this.createIndex(es, logger));
                    }

                    this.createIndex(es, logger);
                })
        });

        super.run();
    }

    createIndex(es, logger) {
        es.indices.create({index: 'app'})
            .catch(logger.error)
            .then(() => {
                es.indices
                    .putMapping({index: 'app', type:  "Server", body:  require('./elasticMappings')})
                    .catch(logger.error)
                    .then(response => this.loader.setLoaded('extra', 'es'))
            });
    }

    onReady() {
        super.onReady();

        this.client = this.container.get('client');
        this.client.on('raw', (message) => this.logger.debug(message));


        // Send to carbon the server counts after 5 minutes, then throttle so it only sends once every 5 minutes
        this.sendToCarbon = _.throttle(this.sendToCarbon.bind(this), 5 * 60 * 1000);

        //this.client.on('serverCreated', this.container.get('factory.manager.server').create);
        //this.client.servers.forEach(this.container.get('factory.manager.server').create);
        this.sendToCarbon();
    }


    sendToCarbon() {
        this.logger.info("SENDING TO CARBON: " + this.client.servers.length);
        if (!process.env.DISCORD_CARBON_KEY) {
            this.logger.error("Carbon is disabled");
            return;
        }

        requestify.post({
            url:  'https://www.carbonitex.net/discord/data/botdata.php',
            form: {
                key:         process.env.DISCORD_CARBON_KEY,
                servercount: this.client.servers.length
            }
        }, (error, response, body) => {
            if (error) {
                return this.logger.error("Error updating carbonitex");
            }

            this.logger.info("Server count changed. Updated carbonitex");
        });
    }
}

module.exports = Bot;