const BaseBot = require('discord-bot-base').Bot;

class Bot extends BaseBot{
    onReady() {
        super.onReady();

        setInterval(() => {this.container.get('manager.server').manage()}, 30000);
    }
}

module.exports = Bot;