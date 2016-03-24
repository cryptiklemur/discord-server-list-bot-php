const AbstractCommand = require('discord-bot-base').AbstractCommand;
const request         = require('request');
const Server          = require('../Model/Server');
const InviteRequest   = require('../Model/InviteRequest');

const CARBON_BOT_ID = '109338686889476096';

class InviteCommand extends AbstractCommand {
    static get name() {
        return 'invite';
    }

    static get description() {
        return "DSL listens for invite codes and messages users asking if they want it listed.";
    }

    initialize() {
        this.checkForReply     = this.checkForReply.bind(this);
        this.currentlyChecking = {};
    }

    handle() {
        return this.hears(/https:\/\/discord\.gg\/(.*)/g, (matches) => {
            if (matches[0].indexOf('update') === 0) {
                return;
            }

            this.code = matches[1];

            if (this.currentlyChecking[this.code]) {
                return false;
            }

            this.currentlyChecking[this.code] = true;
            this.client.getInvite(this.code, (error, info) => {
                if (error) {
                    if (this.isPm()) {
                        this.reply("That invite code is invalid. Please try a better one.");
                    }

                    this.logger.error(error);
                    return;
                }

                if (this.client.servers.get('id', info.server.id)) {
                    return;
                }

                Server.findOne({identifier: info.server.id}, (error, server) => {
                    if (error || server) {
                        return;
                    }

                    if (this.isPm()) {
                        if (this.author.id == CARBON_BOT_ID) {
                            this.client.joinServer(this.code, (error, server) => {
                                if (error) {
                                    this.logger.error(error);
                                }
                                this.reply("Success!");

                                this.sendMessage(server, `Meep Morp, Hey there! I was invited by someone who used the Carbon website. To see what I do, send me a \`help\` private message, or type \`|help\`.`);
                            });

                            return;
                        }

                        this.client.on('message', this.checkForReply);

                        return this.reply("Meep Morp, hey! Would you like to list this server? (Yes, or No)");
                    }

                    InviteRequest.find(
                        {serverId: info.server.id, authorId: this.author.id},
                        (error, requests) => {
                            let fifteenDaysAgo = new Date();
                            fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

                            if (requests.length === 0) {
                                let request = new InviteRequest({
                                    serverId: info.server.id,
                                    authorId: this.author.id
                                });

                                return request.save(error => {
                                    if (error) {
                                        return this.logger.error(error);
                                    }

                                    this.sendInviteRequest();
                                })
                            }

                            for (let index in requests) {
                                if (!requests.hasOwnProperty(index)) {
                                    continue;
                                }

                                let request = requests[index];
                                if (request.insertDate <= fifteenDaysAgo) {
                                    request.remove();
                                } else {
                                    return false;
                                }
                            }

                            this.sendInviteRequest();
                        }
                    )
                })
            });
        })

    }

    sendInviteRequest() {
        this.sendMessage(
            this.author,
            `Hey there! I just saw you post your server link. Would you like to have it registered with the <http://www.discordservers.com> public server list? (Yes, or No)

 **Notice: This bot is not affiliated with Discord, and is an unofficial bot. Message @Aaron in Discord Bots, or tweet @discservs for help/issues.**`
        );

        this.client.on('message', this.checkForReply);
    }

    checkForReply(message) {
        if (message.author !== this.author || message.channel.server !== undefined) {
            return;
        }

        let content = message.content.toLowerCase();
        this.client.removeListener('message', this.checkForReply);

        if (content !== 'yes' && content !== 'no') {
            return this.sendMessage(
                message.author,
                "Make sure you reply with `yes` or `no`. If you would like to try again, send me the link again"
            );
        }

        if (content === 'yes') {
            this.sendMessage(message.author, 'Awesome! I\'ll add it to the list in the next few minutes.');

            this.client.joinServer(this.code, (error, server) => {
                if (error) {
                    return this.logger.error("Error for " + server.id, error);
                }

                Server.findOne({identifier: server.id}, (error, dbServer) => {
                    if (error) {
                        return this.logger.error(error);
                    }

                    if (!dbServer) {
                        dbServer = new Server({identifier: server.id, inviteCode: this.code});
                    }

                    dbServer.save(error => {
                        if (error) {
                            return this.logger.error(error);
                        }

                        this.sendMessage(server, `Hey there! I was invited by ${message.author.mention()}. To see what I do, send me a \`help\` private message, or type \`|help\`.`);

                        if (server.owner.id !== message.author.id) {
                            this.sendMessage(
                                server.owner,
                                `Hey there. I was invited to ${server.name} by ${message.author.username}. I am a bot for <http://discordservers.com/>.
**This bot is not affiliated with discord, in any way.** If you have any questions about the bot, try sending a \`help\` message, or tweet @aequasi.

If you don't want the bot on your server, type \`|delist\` in your server.`
                            );
                        }
                    });
                });
            });
        } else {
            this.sendMessage(message.author, 'Alright, if you change your mind, just send me a link again.');
        }

        this.currentlyChecking[this.code] = false;
    }
}

module.exports = InviteCommand;