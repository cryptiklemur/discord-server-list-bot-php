const BaseBot = require('discord-bot-base').Bot;

class Bot extends BaseBot {
    onReady() {
        super.onReady();

        let client = this.container.get('client');
        let interval = setInterval(() => {
            let goodServers = client.servers.filter(server => server.name);

            console.log(goodServers.length, client.servers.length);
            if (goodServers.length === client.servers.length) {
                clearInterval(interval);
                this.logger.info("Starting managers");
                this.container.get('manager.bot').manage();
                this.container.get('manager.server').manage();
                this.container.get('manager.invite').manage();
            }
        }, 50);

    }
}

module.exports = Bot;