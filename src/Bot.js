const BaseBot = require('discord-bot-base').Bot;

class Bot extends BaseBot {
    onReady() {
        super.onReady();

        this.container.get('manager.server').manage();
        this.container.get('manager.bot').manage();
    }
}

module.exports = Bot;