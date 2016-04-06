const BaseBot    = require('discord-bot-base').Bot,
      _          = require('lodash'),
      requestify = require('request');

class Bot extends BaseBot {
    onReady() {
        super.onReady();

        this.sendToCarbon = _.throttle(this.sendToCarbon, 6 * 60 * 1000);

        this.container.get('client').on('serverCreated', this.container.get('factory.manager.server').create);
    }

    sendToCarbon() {
        requestify.post({
            url:  'https://www.carbonitex.net/discord/data/botdata.php',
            form: {
                key:         process.env.DISCORD_CARBON_KEY,
                servercount: this.container.get('client').servers.length
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