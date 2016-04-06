const _            = require('lodash'),
      Server       = require('../Model/Server'),
      InviteUpdate = require('../Model/InviteUpdate'),
      requestify   = require('request');

const WAIT_TIME = .1;

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

        this.sendToCarbon = _.throttle(this.sendToCarbon, 6 * 60 * 1000);
    }

    sendToCarbon() {
        requestify.post({
            url:  'https://www.carbonitex.net/discord/data/botdata.php',
            form: {
                key:         process.env.DISCORD_CARBON_KEY,
                servercount: this.client.servers.length
            }
        }, (error, response, body) => {
            if (error) {
                return this.logger.error("Error updating carbonitex");
            }

            this.logger.info("Server count changed. Updated carbonitex");
        });
    }

    updateServer(dbServer, botServer) {
        if (!dbServer) {
            return Server.findOne({identifier: botServer.id}, (error, server) => {
                if (error) {
                    return this.logger.error(error);
                }

                this.updateServer(server, botServer);
            })
        }

        if (!botServer.id) {
            botServer = this.client.servers.get('id', dbServer.identifier);
        }

        return new Promise((resolve, reject) => {
            let owner = botServer.owner === null ? {} : {id: botServer.owner.id, name: botServer.owner.username};

            dbServer.name         = botServer.name;
            dbServer.region       = botServer.region;
            dbServer.members      = botServer.members.length;
            dbServer.online       = botServer.members.filter(user => user.status != 'offline').length;
            dbServer.icon         = botServer.iconURL;
            dbServer.enabled      = true;
            dbServer.owner        = owner;
            dbServer.modifiedDate = Date.now();

            dbServer.save(error => {
                if (error) {
                    this.logger.error(error);

                    return reject();
                }

                //this.logger.debug("Updating server: ", dbServer.name);


                return resolve();
            });
        });
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
            this.logger.debug(`Bot is not connected to ${dbServer.identifier}. Disabling.`);
            dbServer.enabled = false;
            dbServer.private = true;
            return dbServer.save(error => {
                if (error) {
                    this.logger.error(error);
                }

                return setTimeout(this.updateNextServer.bind(this), 1);
            });
        }

        this.logger.debug(
            `Server Update: [${this.servers.index()}/${this.servers.all().length - 1}] - ${botServer.id} updating.`
        );

        this.updateServer(dbServer, botServer)
            .then(() => setTimeout(this.updateNextServer.bind(this), 1000 * WAIT_TIME))
            .catch(error => {
                setTimeout(this.updateNextServer.bind(this), 1);
                this.logger.error(error);
                this.logger.error(error.stack);
            });
    }

    serverJoined(server) {
        Server.findOne({identifier: server.id}, (error, dbServer) => {
            if (error) {
                return this.logger.error(error);
            }

            if (dbServer && !dbServer.enabled) {
                dbServer.enabled = true;
                dbServer.private = false;

                dbServer.save(error => {
                    if (error) {
                        this.logger.error(error);
                    }
                });
            }
        })
    }

    manage() {
        this.sendToCarbon();
        this.client.on('serverCreated', this.serverJoined.bind(this));
        this.client.on('serverCreated', this.sendToCarbon.bind(this));
        this.client.on('serverDeleted', this.sendToCarbon.bind(this));

        // Loop through servers in database, check if bot is in the server, also check if invite link is working
        // Loop through servers bot is connected to, check if server is in the database
        // After each server, wait 5 seconds (should be configurable)

        this.dispatcher.on('manager.server.start', () => {
            this.logger.info("Starting server manager");
            Server.find({enabled: true}, (error, servers) => {
                this.servers = makeIterator(_.shuffle(servers));
                this.checkConnectedServers()
                    .then(() => {
                        this.updateNextServer();
                    })
                    .catch(error => {
                        console.error(error);
                        console.error(error.stack);
                    })
            });
        });

        this.dispatcher.on('manager.server.done', () => {
            setTimeout(() => {
                this.dispatcher.emit('manager.server.start');
            }, 15000)
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

    checkConnectedServers(servers) {
        servers = servers === undefined ? this.client.servers : servers;

        return new Promise(resolve => {
            for (let index in servers) {
                if (!this.client.servers.hasOwnProperty(index) || index === 'length' || index === 'limit') {
                    continue;
                }

                let server = servers[index];
                if (this.servers && this.servers.all().find(dbServer => dbServer.identifier === server.id)) {
                    continue;
                }

                this.logger.debug(`Bot is connected to ${server.name} but it isn't in the database.`);
                let owner = server.owner === null ? {} : {id: server.owner.id, name: server.owner.username};

                let dbServer = new Server({
                    name:       server.name,
                    identifier: server.id,
                    region:     server.region,
                    members:    server.members.length,
                    online:     server.members.filter(user => user.status != 'offline').length,
                    icon:       server.iconURL,
                    owner:      owner
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
}

module.exports = ServerManager;