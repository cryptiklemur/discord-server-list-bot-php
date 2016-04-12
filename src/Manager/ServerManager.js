const _            = require('lodash'),
      Server       = require('../Model/Server'),
      EventEmitter = require('events').EventEmitter;

class ServerManager extends EventEmitter {
    constructor(container, server) {
        super();

        this.container  = container;
        this.dispatcher = container.get('dispatcher');
        this.client     = container.get('client');
        this.elastic    = container.get('search');
        this.logger     = container.get('logger');

        this.updateServer = _.debounce(this.updateServer.bind(this), 5000);

        this.clientServer = server;
        Server.findOne({identifier: server.id}, (error, databaseServer) => {
            if (error) {
                return this.logger.error(error);
            }

            if (!databaseServer) {
                databaseServer            = new Server();
                databaseServer.identifier = this.clientServer.id;

                return databaseServer.save(error => {
                    if (error) {
                        return this.logger.error(error);
                    }

                    this.databaseServer = databaseServer;
                    this.updateServer()
                });
            }

            this.databaseServer = databaseServer;
            this.updateServer();

            this.emit('loaded', this);
        });

        this.on('messageCreated', message => {
            //this.logger.debug("NEW MESSAGE DETECTED ON " + this.clientServer.name);
            //this.logger.debug(`${message.author.name} - ${message.content}`);
        });
        this.on('serverDeleted', this.onServerDeleted.bind(this));
        this.on('serverUpdated', this.updateServer);
        this.on('channelCreated', this.updateServer);
        this.on('channelUpdated', this.updateServer);
        this.on('channelDeleted', this.updateServer);
        this.on('memberCreated', this.updateServer);
        this.on('memberDeleted', this.updateServer);
        this.on('memberUpdated', this.updateServer);
    }

    onServerDeleted() {
        this.logger.debug("Deleting server: " + this.clientServer.id + ' - ' + this.clientServer.name);
        this.databaseServer.remove(() => {
                this.container.get('repository.server_manager').remove(this);
        });
    }

    updateServer() {
        this.logger.debug("Updating server: " + this.clientServer.id + ' - ' + this.clientServer.name);

        return new Promise((resolve, reject) => {
            if (!this.clientServer || !this.clientServer.name) {
                reject(new Error("No client server. Not supposed to happen"));
            }

            if (!this.databaseServer) {
                let databaseServer        = new Server();
                databaseServer.identifier = this.clientServer.id;

                return databaseServer.save(error => {
                    if (error) {
                        return this.logger.error(error);
                    }

                    this.databaseServer = databaseServer;
                    this.updateServer().then(resolve).catch(reject);
                });
            }

            let owner = this.clientServer.owner === null ? 0 : this.clientServer.owner.id;

            this.databaseServer.name         = this.clientServer.name;
            this.databaseServer.region       = this.clientServer.region;
            this.databaseServer.members      = this.clientServer.members.length;
            this.databaseServer.online       = this.clientServer.members.filter(user => user.status != 'offline').length;
            this.databaseServer.icon         = this.clientServer.iconURL;
            this.databaseServer.enabled      = true;
            this.databaseServer.owner        = owner;
            this.databaseServer.modifiedDate = Date.now();

            this.databaseServer.save(error => {
                if (error) {
                    return reject(new Error(error));
                }

                let data = {
                    "id":            this.databaseServer.id,
                    "identifier":    this.clientServer.id,
                    "invite_code":   this.databaseServer.inviteCode,
                    "name":          this.databaseServer.name,
                    "region":        this.databaseServer.region,
                    "members":       this.databaseServer.members,
                    "online":        this.databaseServer.online,
                    "icon":          this.databaseServer.icon,
                    "enabled":       this.databaseServer.enabled,
                    "owner":         owner,
                    "private":       this.databaseServer.private,
                    "premium":       this.databaseServer.premium,
                    "billing":       {bid: this.databaseServer.billing.bid},
                    "insert_date":   this.databaseServer.insertDate.toISOString(),
                    "modified_date": this.databaseServer.modifiedDate.toISOString()
                };
                this.elastic.exists({index: 'app', type: 'Server', id: data.id}, (error, exists) => {
                    if (exists) {
                        if (!data.enabled || data.private || !data.inviteCode) {
                            return this.elastic.delete({index: 'app', type: 'Server', id: data.id})
                                .then(resolve).catch(error => {
                                    this.logger.error('Error Deleting Item: ' + data.id);
                                    this.logger.error(error);
                                });
                        }

                        return this.elastic.update({index: 'app', type: 'Server', id: data.id, body: {doc: data}})
                            .then(resolve).catch(error => {
                                this.logger.error('Error Updating Item: ' + data.id);
                                this.logger.error(error);
                            });
                    }

                    return this.elastic.create({index: 'app', type: 'Server', id: data.id, body: data})
                        .then(resolve).catch(error => {
                            this.logger.error('Error Adding Item: ' + data.id);
                            this.logger.error(error);
                        });
                });
            });
        });
    }
}

module.exports = ServerManager;