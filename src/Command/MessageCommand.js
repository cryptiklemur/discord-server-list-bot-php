const AbstractCommand = require('discord-bot-base').AbstractCommand;

class MessageCommand extends AbstractCommand {
    static get name() { return 'message'; }

    static get description() { return 'Message a server, or all servers.'; }

    handle() {
        if (this.client.admin.id !== this.message.author.id) {
            return false;
        }

        this.responds(/^message server (\d+) (.*)/g, (matches) => {
            if (!this.message.isPm()) {
                return this.reply('Please pm this');
            }

            this.messageServer(this.bot.servers.get('id', matches[1]), matches[2]);
        });

        this.responds(/^message servers (.*)/g, (matches) => {
            if (!this.message.isPm()) {
                return this.reply('Please pm this');
            }

            this.client.servers.forEach(server => this.messageServer(server, matches[1]));
        });
    }

    messageServer(server, message) {
        if (server === null || server === undefined) {
            this.reply("Server with that ID does not exist.");

            return false;
        }

        this.client.sendMessage(server.owner, message);

        return true;
    }
}

module.exports = MessageCommand;