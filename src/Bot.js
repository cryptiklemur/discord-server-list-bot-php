const BaseBot = require('discord-bot-base').Bot;

class Bot extends BaseBot {
    onReady() {
        super.onReady();

        this.logger.info("Starting managers");
        this.container.get('manager.bot').manage();
        this.container.get('manager.server').manage();
        this.container.get('manager.invite').manage();
    }
}

module.exports = Bot;