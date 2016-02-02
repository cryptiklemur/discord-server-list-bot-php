const AbstractCommand = require('discord-bot-base').AbstractCommand;

class PremiumCommand extends AbstractCommand {
    static get name() { return 'premium'; }

    static get description() { return 'Get information about becoming a premium server'; }

    handle() {
        this.responds(/^premium/g, () => {
            this.reply('A premium server will show up higher on the list, allowing you to get more traffic.');
            this.reply(
                'To upgrade to a premium server, check out the Patreon page: https://www.patreon.com/user?u=2792231'
            );
        });
    }
}

module.exports = PremiumCommand;