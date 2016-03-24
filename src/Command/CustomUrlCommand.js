const AbstractCommand = require('discord-bot-base').AbstractCommand;
const Server          = require('../Model/Server');

class CustomUrlCommand extends AbstractCommand {
    static get name() {
        return 'custom';
    }

    static get description() {
        return `Sets a custom url for your server.`;
    }

    static get help() {
        return `Sets a custom url for your server.
Use only Alphanumeric characters, dashes, and underscores (\`A-Z\`, \`0-9\`, \`-\` and \`_\`).
Custom URL has to be at least three characters long.`;
    }

    handle() {
        this.responds(/^custom(\s?url)?$/, () => {
            return this.reply(CustomUrlCommand.help);
        });

        return this.responds(/^(custom(?:\s?url)?)\s/, matches => {
            if (this.isPm() || !this.isAdminOrOwner()) {
                return false;
            }

            let url   = matches.input.replace(matches[0], ''),
                regex = /([A-Za-z0-9_-]+)/;

            if (!regex.test(url) || url.length < 3) {
                return this.reply(
                    "Custom URL Provided is not valid. Make sure you are only using alphanumeric and dash/underscore characters and that the URL is at least 3 characters long."
                );
            }

            Server.findOne({customUrl: url}, (error, server) => {
                if (error) {
                    return this.reply("Unable to set a URL at this time.");
                }

                if (server) {
                    return this.reply("That URL is already taken.");
                }

                Server.findOne({identifier: this.server.id}, (error, server) => {
                    if (error) {
                        return this.reply("Unable to set a URL at this time.");
                    }

                    server.customUrl = url;
                    server.save(error => {
                        if (error) {
                            return this.reply("Unable to set a URL at this time.");
                        }

                        let newUrl = 'http://discservs.co/s/' + url;
                        this.reply("Custom URL has been set. Your new URL is: <" + newUrl + ">");
                    })
                })
            })
        });
    }
}

module.exports = CustomUrlCommand;