const AbstractCommand = require('discord-bot-base').AbstractCommand;
const request = require('request');

const CARBON_BOT_ID = '109338686889476096';

class InviteCommand extends AbstractCommand {
    static get name() {
        return 'invite';
    }

    static get description() {
        return "DSL listens for invite codes and messages users asking if they want it listed.";
    }

    initialize() {
        this.checkForReply = this.checkForReply.bind(this);
        this.currentlyChecking = {};
        this.api = this.container.get('api');
    }

    handle() {
        return this.hears(/https:\/\/discord\.gg\/(.*)/g, (matches) => {
            this.code = matches[1];

            if (this.currentlyChecking[this.code]) {
                return false;
            }

            this.currentlyChecking[this.code] = true;

            request('https://discordapp.com/api/invite/' + this.code, (err, response, body) => {
                let json = JSON.parse(body),
                    serverId = json.guild === undefined ? undefined : json.guild.id;

                if (serverId === undefined) {
                    if (this.message.isPm()) {
                        this.reply("That invite code is invalid. Please try a better one.");
                    }

                    return;
                }

                this.api.call('/invite/' + this.message.author.id + '/' + serverId, 'get', {}, (err, response, body) => {
                    if (err) {
                        throw Error(err);
                    }
                    let json = JSON.parse(body);
                    if (this.message.isPm()) {
                        if (this.message.author.id == CARBON_BOT_ID) {
                            this.client.joinServer(this.code, (error, server) => {
                                if (error) {
                                    this.looger.error(error);
                                }
                                this.reply("Success!");

                                this.sendMessage(server, `Meep Morp, Hey there! I was invited by someone who used the Carbon website. To see what I do, send me a \`help\` private message, or type \`|help\`.`);
                            });

                            return;
                        }

                        this.reply("Meep Morp, hey! Would you like to list this server? (Yes, or No)");
                    } else {
                        if (json.message === 'has-request') {
                            return;
                        }

                        this.sendMessage(
                            this.message.author,
                            `Meep Morp, hey there! I just saw you post your server link. \nWould you like to have it registered with the http://www.discordservers.com public server list? (Yes, or No)

                            Notice: This bot is not affiliated with Discord, and is an unofficial bot. Message @Aaron in Discord Bots, or tweet @aequasi for help/issues.`
                        );
                    }

                    this.client.on('message', this.checkForReply);
                });
            });

            return true;
        })

    }

    checkForReply(message) {
        if (message.author !== this.message.author || message.channel.server !== undefined) {
            return;
        }

        let content = message.content.toLowerCase();

        if (content !== 'yes' && content !== 'no') {
            this.sendMessage(
                message.author,
                "Make sure you reply with `yes` or `no`. If you would like to try again, send me the link again"
            );

            return this.client.removeListener('message', this.checkForReply);
        }

        if (content === 'yes') {
            this.sendMessage(message.author, 'Awesome! I\'ll add it to the list in the next few minutes.');

            this.client.joinServer(this.code, (error, server) => {
                if (error) {
                    this.logger.error(error);
                }

                if (error) {
                    return this.logger.error("Error for " + server.id, error);
                }

                this.sendMessage(server, `Meep Morp, Hey there! I was invited by ${message.author.mention()}. To see what I do, send me a \`help\` private message, or type \`|help\`.`);

                if (server.owner.id !== message.author.id) {
                    this.sendMessage(
                        server.owner,
                        `Hey there. I was invited to ${server.name} by ${message.author.username}. I am a bot for <http://discordservers.com/>.
This bot is not affiliated with discord, in any way. If you have any questions about the bot, try sending a \`help\` message, or tweet @aequasi.

If you don't want the bot on your server, just kick it.`
                    );
                }

                this.api.call(
                    '/server/' + server.id,
                    'post', {id: server.id, name: server.name, invite_code: this.code}
                );
            });
        } else {
            this.sendMessage(message.author, 'Alright, if you change your mind, just send me a link again.');
        }

        this.currentlyChecking[this.code] = false;
        this.client.removeListener('message', this.checkForReply);
    }
}

module.exports = InviteCommand;