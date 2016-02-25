const _            = require('lodash');
const Server       = require('../Model/Server');
const InviteUpdate = require('../Model/InviteUpdate');

const WAIT_TIME = 5;

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

class ServerManager {
    constructor(dispatcher, client, logger) {
        this.dispatcher = dispatcher;
        this.client     = client;
        this.logger     = logger;
        this.lastRun    = Math.round(new Date().getTime() / 1000);
    }

    updateNextServer() {
        this.lastRun = Math.round(new Date().getTime() / 1000);

        this.servers.next();
        if (this.servers.done()) {
            return this.dispatcher.emit('manager.server.done');
        }

        let dbServer  = this.servers.current(),
            botServer = this.client.servers.get('id', dbServer.identifier);

        if (dbServer.private) {
            return setTimeout(this.updateNextServer.bind(this), 1);
        }

        if (botServer === null) {
            this.logger.debug('Bot is not connected to this server. Disabling.');
            dbServer.enabled = false;
            return dbServer.save(error => {
                if (error) {
                    return this.logger.error(error);
                }

                return setTimeout(this.updateNextServer.bind(this), 1);
            });
        }

        dbServer.name         = botServer.name;
        dbServer.region       = botServer.region;
        dbServer.members      = botServer.members.length;
        dbServer.online       = botServer.members.filter(user => user.status != 'offline').length;
        dbServer.icon         = botServer.iconURL;
        dbServer.enabled      = true;
        dbServer.owner        = {id: botServer.owner.id, name: botServer.owner.username};
        dbServer.modifiedDate = Date.now();

        dbServer.save(error => {
            if (error) {
                return this.logger.error(error);
            }

            //this.logger.debug("Updating server: ", dbServer.name);

            this.client.getInvite(dbServer.inviteCode, (error, invite) => {
                if (error) {
                    //this.logger.debug("Server's invite code is invalid or expired.");
                    this.getNewInviteCode(botServer);
                    dbServer.inviteCode = undefined;
                    dbServer.enabled    = false;

                    return dbServer.save(error => {
                        if (error) {
                            return this.logger.error(error);
                        }

                        return setTimeout(this.updateNextServer.bind(this), 1000 * WAIT_TIME);
                    });
                }

                //this.logger.debug(`Server finished updating. Waiting ${WAIT_TIME} seconds, then updating next server.`);

                return setTimeout(this.updateNextServer.bind(this), 1000 * WAIT_TIME);
            });
        });
    }

    manage() {
        // Loop through servers in database, check if bot is in the server, also check if invite link is working
        // Loop through servers bot is connected to, check if server is in the database
        // After each server, wait 5 seconds (should be configurable)

        this.dispatcher.on('manager.server.start', () => {
            this.logger.info("Starting server manager");
            Server.find({}, (error, servers) => {
                this.servers = makeIterator(servers);
                this.checkConnectedServers()
                    .then(() => {
                        this.updateNextServer();
                    })
                    .catch(error => {
                        console.error(error.stack);
                    })
            });
        });

        this.dispatcher.on('manager.server.done', () => {
            setTimeout(() => {
                this.dispatcher.emit('manager.server.start');
            }, 30000)
        });

        this.dispatcher.emit('manager.server.start');

        setInterval(() => {
            let currentTime = Math.round(new Date().getTime() / 1000) - 60;
            if (currentTime - this.lastRun >= 0) {
                this.logger.info("Manager died. Starting up again.");
                this.dispatcher.emit('manager.server.start');
            }
        }, 5000)
    }

    checkConnectedServers() {
        return new Promise(resolve => {
            for (let index in this.client.servers) {
                if (!this.client.servers.hasOwnProperty(index) || index === 'length' || index === 'limit') {
                    continue;
                }

                let server = this.client.servers[index];
                if (this.servers.all().find(dbServer => dbServer.identifier === server.id)) {
                    continue;
                }

                this.logger.debug(`Bot is connected to ${server.name} but it isn't in the database.`);

                let dbServer = new Server({
                    name:       server.name,
                    identifier: server.id,
                    region:     server.region,
                    members:    server.members.length,
                    online:     server.members.filter(user => user.status != 'offline').length,
                    icon:       server.iconURL,
                    owner:      {id: server.owner.id, name: server.owner.username}
                });

                dbServer.save(error => {
                    if (error) {
                        this.logger.error(error);
                    }
                });
            }

            resolve();
        });
    }

    sendUpdateRequest(server) {
        this.client.sendMessage(
            server.owner,
            `Hey there! Your server (${_.trim(server.name)}) is currently using an old invite code for \<http://discordservers.com\>. If you don't update this,
we can't show your server.

***Notice: This bot is not affiliated with Discord, and is an unofficial bot. Message \`Aaron\` in Discord Bots, or tweet \`@aequasi\` for help/issues.***

Please reply with a new invite link (preferably a permanent link), in the following format.

\`\`\`
update ${server.id} <new invite url>
\`\`\``
        );
    }

    getNewInviteCode(server) {
        InviteUpdate.find({serverId: server.id}, (error, requests) => {
            let threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            if (requests.length === 0) {
                let update = new InviteUpdate({serverId: server.id});

                return update.save(error => {
                    if (error) {
                        return this.logger.error(error);
                    }

                    this.sendUpdateRequest(server);
                })
            }

            for (let index in requests) {
                if (!requests.hasOwnProperty(index)) {
                    continue;
                }

                let request = requests[index];
                if (request.insertDate <= threeDaysAgo) {
                    request.remove();
                } else {
                    return false;
                }
            }

            this.sendUpdateRequest(server);
        });
    }
}

module.exports = ServerManager;