const AbstractCommand = require('discord-bot-base').AbstractCommand;
const _ = require('lodash');
const Server = require('../Model/Server');

class ViolateCommand extends AbstractCommand {
    static get name() { return 'violate'; }

    static get description() { return 'Marks a server as disabled, and sends the given message to the owner.'; }

    handle() {
        if (this.message.author.id !== this.client.admin.id) {
            return false;
        }

        return this.responds(/^violate (\d+) ?([\S\s]+)?$/gmi, (matches) => {
                let id     = matches[1],
                    server = this.client.servers.get('id', id),
                    message = matches[2] !== undefined ? matches[2] : `Your server has been removed for violating the terms of service of DiscordServers.com.
If you would like to appeal this, please tweet \`@discservs\` or find \`Aaron\` in the \`Discord Bots\` server. View the TOS here: http://www.discordservers.com/terms`;

                console.log('Bot server: ', server);
                if (server === null) {
                    this.reply("Bad server id");

                    return;
                }

                Server.findOne({identifier: server.id}, (error, server) => {
                    if (error) {
                        this.logger.error(error);

                        return this.reply("There was an error updating that server. Try again later.");
                    }

                    console.log('Db Server: ', server);
                    if (!server) {
                        this.reply("Bad server id");

                        return;
                    }

                    server.enabled    = false;
                    server.save(error => {
                        if (error) {
                            this.logger.error(error);

                            return this.reply("There was an error updating your server. Try again later.");
                        }

                        let owner = this.client.users.get('id', server.owner.id);
                        this.client.sendMessage(owner, message);
                        this.reply(`Send owner of ${server.name} (${owner.name}) the following message: \n\n\`\`\`${message}\`\`\``)
                    });
                });
            });
    }
}

module.exports = ViolateCommand;