const ArrayIterator = require('../ArrayIterator'),
      InviteUpdate  = require('../Model/InviteUpdate'),
      _             = require('lodash'),
      EventEmitter  = require('events').EventEmitter;

const WAIT_TIME = 5;

class InviteChecker extends EventEmitter {
    constructor(client, repository, logger) {
        super();

        this.client     = client;
        this.repository = repository;
        this.logger     = logger;

        this.serverManagers = new ArrayIterator(this.repository.items);
        this.repository.on('add', this.addServerManager.bind(this));
        this.repository.on('remove', this.removeServerManager.bind(this));

        this.on('start', this.checkNextInvite.bind(this));
        this.on('end', () => setTimeout(() => this.emit('start'), 1));

        // Start the invite checker after 5 minutes
        //setTimeout(() => this.emit('start'), 5 * 60 * 1000);
        setTimeout(() => {this.logger.info("Starting invite checker"); this.emit('start');}, 30000);
    }

    addServerManager(serverManager) {
        this.serverManagers.push(serverManager);
    }

    removeServerManager(serverManager) {
        let managers = this.serverManagers.all();
        for (let index in managers) {
            if (!managers.hasOwnProperty(index)) {
                continue;
            }

            if (managers[index].clientServer.id === serverManager.clientServer.id) {
                managers.splice(index, 1);

                break;
            }
        }

        this.serverManagers = new ArrayIterator(managers);
    }

    checkNextInvite() {
        this.serverManagers.next();
        if (this.serverManagers.done()) {
            this.serverManagers.reset();

            return this.emit('end');
        }

        let current        = this.serverManagers.current(),
            databaseServer = current.databaseServer,
            clientServer   = current.clientServer;

        if (!databaseServer || databaseServer.private) {
            return setTimeout(this.checkNextInvite.bind(this), 1);
        }

        if (!clientServer) {
            return setTimeout(this.checkNextInvite.bind(this), 1);
        }

        //this.logger.debug(
        //    `Server Invite Update: [${this.serverManagers.currentIndex() + 1}/${this.serverManagers.length}] - ${clientServer.name} updating invite.`
        //);

        this.updateServer(current)
            .then(() => setTimeout(this.checkNextInvite.bind(this), 1000 * WAIT_TIME))
            .catch(() => setTimeout(this.checkNextInvite.bind(this), 1));
    }


    updateServer(serverManager) {
        let databaseServer = serverManager.databaseServer,
            clientServer   = serverManager.clientServer;

        return new Promise((resolve, reject) => {
            this.client.getInvite(databaseServer.inviteCode)
                .then(resolve)
                .catch(error => {
                    return this.getNewInviteCode(
                        clientServer,
                        (invite) => {
                            databaseServer.inviteCode = invite.code;
                            databaseServer.enabled    = true;

                            serverManager.updateServer().then(resolve).catch(reject);
                        },
                        () => {
                            if (databaseServer.inviteCode !== undefined && databaseServer.enabled !== false) {
                                databaseServer.inviteCode = undefined;
                                databaseServer.enabled    = false;

                                return serverManager.updateServer().then(resolve).catch(reject);
                            }

                            resolve();
                        }
                    );
                });
        });
    }

    getNewInviteCode(server, successCallback, unchangedCallback) {
        this.client.getInvites(server)
            .catch(unchangedCallback)
            .then(invites => {
                if (!invites || invites.length < 1) {
                    if (!server.defaultChannel) {
                        return unchangedCallback();
                    }

                    return this.client.createInvite(server.defaultChannel.id, {temporary: false})
                        .then(
                            invite => {
                                if (!invite) {
                                    return this.checkInviteUpdate(server, unchangedCallback);
                                }

                                successCallback(invite);
                            },
                            () => this.checkInviteUpdate(server, unchangedCallback)
                        );
                }

                let invite = this.getBestInvite(invites);
                if (invite !== null) {
                    return successCallback(invite);
                }
            });
    }

    getBestInvite(invites) {
        let bestInvite = null;
        for (let index in invites) {
            if (!invites.hasOwnProperty(index)) {
                continue;
            }

            let invite = invites[index];
            if (!bestInvite) {
                bestInvite = invite;
            }

            if (invite.temporary || invite.revoked) {
                continue;
            }

            if (invite.channel.name === 'general') {
                bestInvite = invite;
            }
        }

        return bestInvite;
    }

    checkInviteUpdate(server, callback) {
        callback = typeof callback === 'function' ? callback : () => {
        };
        if (server.inviteCode) {
            return;
        }

        if (!server.id) {
            console.log(server);
            throw new Error("Server doesn't have an ID?");
        }

        InviteUpdate.find({serverId: server.id}, (error, requests) => {
            let fifteenDaysAgo = new Date();
            fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

            if (requests.length === 0) {
                let update = new InviteUpdate({serverId: server.id});

                return update.save(error => {
                    if (error) {
                        return this.logger.error(error);
                    }

                    this.sendUpdateRequest(server);
                    callback();
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

            this.sendUpdateRequest(server);
            callback();
        });
    }

    sendUpdateRequest(server) {
        this.logger.debug("Sending update request to " + server.name);
        this.client.sendMessage(
            server.owner,
            `Hey there! Your server (${_.trim(server.name)}) is currently has either no invite code, or an old invite code for \<http://discordservers.com\>. If you don't update this,
we can't show your server. If you don't wish to recieve these messages, either kick me form your server, or type \`|delist\` in your server.

***Notice: This bot is not affiliated with Discord, and is an unofficial bot. Message \`Aaron\` in Discord Bots, or tweet \`@aequasi\` for help/issues.***

Please reply with a new invite link (preferably a permanent link), in the following format.

\`\`\`
update ${server.id} <new invite url>
\`\`\``
        ).catch(this.logger.error);
    }
}

module.exports = InviteChecker;
