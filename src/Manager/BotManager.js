const Bot = require('../Model/Bot');

const WAIT_TIME      = 10 * 60;
const BOT_SERVER_ID  = '110373943822540800';
const BOT_ROLE       = 'Bots';
const BOT_CHANNEL_ID = '110374080984682496';

function makeIterator(array) {
    var currentIndex = -1;

    return {
        current: function () {
            return array[currentIndex];
        },
        done:    function () {
            return currentIndex >= array.length;
        },
        index:   function () {
            return currentIndex;
        },
        prev:    function () {
            currentIndex--;
        },
        next:    function () {
            currentIndex++;
        },
        push:    function (item) {
            array.push(item);
        },
        all:     function () {
            return array;
        }
    }
}

class BotManager {
    constructor(dispatcher, client, logger, channelHelper, ignoreHelper) {
        this.dispatcher    = dispatcher;
        this.client        = client;
        this.logger        = logger;
        this.channelHelper = channelHelper;
        this.ignoreHelper  = ignoreHelper;
        this.lastRun       = Math.round(new Date().getTime() / 1000);
    }

    manage() {
        // Find all bots in the `Discord Bots` server. (Users with the `Bots` role)
        // Run through #bot-list channel, updating bots with their info
        // After updating, wait 5 minutes, and then run again (Should be configurable)

        this.dispatcher.on('manager.bot.start', () => {
            this.logger.info("Starting bot manager");
            this.lastRun = Math.round(new Date().getTime() / 1000);

            this.fetchBots().then(() => {
                this.bots.forEach(bot => {
                    this.ignoreHelper.ignore('user', bot.id).then(
                        ignored => this.logger.debug('Ignored User: ' + ignored.id),
                        this.logger.error
                    );
                });

                this.updateBots();
            }).catch(error => {
                throw error
            });
        });

        this.dispatcher.on('manager.bot.done', () => {
            setTimeout(() => {
                this.dispatcher.emit('manager.bot.start');
            }, WAIT_TIME * 1000)
        });

        this.dispatcher.emit('manager.bot.start');

        setInterval(() => {
            let currentTime = Math.round(new Date().getTime() / 1000) - (WAIT_TIME + 1);
            if (currentTime - this.lastRun >= 0) {
                this.logger.info("Bot Manager died. Starting up again.");
                this.dispatcher.emit('manager.bot.start');
            }
        }, 5000)
    }

    fetchBots() {
        return new Promise(resolve => {
            let server = this.client.servers.get('id', BOT_SERVER_ID), role;

            if (!server) {
                return;
            }

            role = server.roles.get('name', BOT_ROLE);

            this.bots = server.members.filter(user => this.client.memberHasRole(user, role));
            resolve(this.bots);
        });
    }

    getBotList(callback) {
        let server  = this.client.servers.get('id', BOT_SERVER_ID),
            channel = server.channels.get('id', BOT_CHANNEL_ID);

        this.channelHelper.getChannelLogs(channel)
            .then((messages) => {
                callback(messages.reverse().join("\n").replace(/\n\n/g, "\n").split("\n"));
            });
    }

    updateBots() {
        let requests = this.bots.map(this.updateBot.bind(this));
        Promise.all(requests)
            .catch(error => {
                this.logger.error(error);
                console.error(error.stack);
            })
            .then(bots => {
                this.getBotList(botList => {
                    botList.forEach(item => {
                        let regex   = /^\d+:\s<@(\d+)>\s+by\s+(?:(?:<@)?(unknown|\d+)>?)\s+\|\s+\*\*([A-Za-z0-9\.\s\+\-]+)\*\*(?:\s+\|\s+(.+))?$/,
                            matches = regex.exec(item);

                        if (!matches) {
                            return;
                        }

                        let bot = this.client.users.get('id', matches[1]);

                        if (bot === null) {
                            return;
                        }

                        let changed = false;
                        Bot.findOne({identifier: bot.id}, (error, dbBot) => {
                            if (error) {
                                return this.logger.error(error);
                            }

                            if (!dbBot) {
                                dbBot   = new Bot({identifier: bot.id, name: bot.name});
                                changed = true;
                            }

                            if (matches[2] !== 'unknown') {
                                let owner = this.client.users.get('id', matches[2]);
                                if (owner !== null) {
                                    dbBot.owner = owner.id;
                                    changed     = true;
                                }
                            }

                            if (matches[3] !== 'unknown') {
                                dbBot.library = matches[3];
                                changed       = true;
                            }

                            if (matches[4] !== undefined) {
                                dbBot.notes = matches[4];
                                changed     = true;
                            }

                            if (changed) {
                                dbBot.save();
                            }
                        });
                    });

                    this.dispatcher.emit('manager.bot.done');
                });
            })
    }

    updateBot(bot) {
        return new Promise(resolve => {
            Bot.findOne({identifier: bot.id}, (error, dbBot) => {
                if (error) {
                    return this.logger.error(error);
                }

                if (!dbBot) {
                    dbBot = new Bot({identifier: bot.id});
                }

                dbBot.name = bot.name;
                dbBot.save(error => {
                    if (error) {
                        return this.logger.error("Error updating bot: " + bot.id, error);
                    }

                    resolve(dbBot);
                })
            })
        })
    }
}

module.exports = BotManager;