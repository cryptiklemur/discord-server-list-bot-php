const AbstractCommand = require('discord-bot-base').AbstractCommand;

class PremiumCommand extends AbstractCommand {
    static get name() {
        return 'premium';
    }

    static get description() {
        return 'Get information about becoming a premium server';
    }

    handle() {
        this.responds(/^premium$/g, () => {
            if (this.message.isPm()) {
                return;
            }

            let host    = this.container.getParameter('env') === 'dev' ? 'dev' : 'www',
                message = `Premium Servers are servers servers that bid to be shown higher on the server listing,
allowing the server to get more traffic. Bidding starts ar $5 a month, and has no upper limit.

To place a bid for premium, visit the DiscordServers.com site here: http://${host}.discordservers.com/premium/${this.message.server.id}
`;
        });
    }
}

module.exports = PremiumCommand;