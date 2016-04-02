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
        return this.hears(/https:\/\/discord\.gg\/([A-Za-z0-9-]+)/g, (matches) => {
            if (matches[0].indexOf('update') === 0) {
                return;
            }

            this.code = matches[1];

            if (this.currentlyChecking[this.code]) {
                return false;
            }

            this.currentlyChecking[this.code] = true;
            this.client.getInvite(this.code)
                .catch(error => {
                    if (this.isPm()) {
                        this.reply("That invite code is invalid. Please try a better one.");
                    }

                    this.logger.error(error);
                })
                .then(info => {
                    if (this.client.servers.get('id', info.server.id)) {
                        return;
                    }

                    Server.findOne({identifier: info.server.id}, (error, server) => {
                        if (error || server) {
                            return;
                        }

                        if (this.isPm()) {
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
            this.sendMessage(
                message.author,
                `Awesome! Click on this link to add it to the server!

                https://discordapp.com/oauth2/authorize?&client_id=162469056312639488&scope=bot

If you don't have the Manage Server permission, pass this link along to your server administrator.`
            );
        } else {
            this.sendMessage(message.author, 'Alright, if you change your mind, just send me a link again.');
        }

        this.currentlyChecking[this.code] = false;
    }
}

module.exports = InviteCommand;