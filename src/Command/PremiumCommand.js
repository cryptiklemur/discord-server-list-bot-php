const AbstractCommand = require('discord-bot-base').AbstractCommand;
const Server          = require('../Model/Server');

class PremiumCommand extends AbstractCommand {
    static get name() {
        return 'premium';
    }

    static get description() {
        return 'Get information about becoming a premium server';
    }

    handle() {
        this.responds(/^premium$/g, () => {
            if (this.isPm()) {
                return;
            }

            Server.findOne({identifier: this.server.id}, (error, server) => {
                if (error) {
                    return this.logger.error(error);
                }

                if (!server) {
                    return this.reply("Couldn't find your server. Strange.");
                }

                let host    = this.container.getParameter('env') === 'dev' ? 'dev' : 'www',
                    message = `Premium Servers are servers servers that bid to be shown higher on the server listing,
allowing the server to get more traffic. Bidding starts ar $5 a month, and has no upper limit.

To place a bid for premium, visit the DiscordServers.com site here: http://${host}.discordservers.com/premium/${server.id}
`;

                this.reply(message);
            });
        });
    }
}

module.exports = PremiumCommand;