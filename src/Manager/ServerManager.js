const _            = require('lodash'),
      Server       = require('../Model/Server'),
      EventEmitter = require('events').EventEmitter;

class ServerManager extends EventEmitter {
    constructor(container, server) {
        super();

        this.dispatcher = container.get('dispatcher');
        this.client     = container.get('client');
        this.logger     = container.get('logger');

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
        });

        this.updateServer();

        this.container.get('checker.invite').addServerManager(this);
        this.container.get('listener.server').addServerManager(this);
    }

    updateServer() {
        return new Promise((resolve, reject) => {
            if (!this.clientServer || !this.clientServer.name) {
                reject(new Error("No client server. Not supposed to happen"));
            }

            if (!this.databaseServer) {
                return reject(new Error("Uh, no database server for " + this.clientServer.id));
            }

            let owner = this.clientServer.owner === null
                ? {}
                : {id: this.clientServer.owner.id, name: this.clientServer.owner.username};

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

                resolve();
            });
        });
    }
}

module.exports = ServerManager;