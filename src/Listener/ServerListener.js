const EventEmitter = require('events').EventEmitter;

class ServerListener extends EventEmitter {
    constructor(client, repository, logger) {
        super();

        this.client     = client;
        this.repository = repository;
        this.logger     = logger;

        this.client.on('message', (message) => {
            if (!message.channel.server) {
                return;
            }

            this.serverEmit(message.channel.server, 'messageCreated', message);
        });

        this.client.on('messageDeleted', (message, channel) => {
            if (!message || !message.channel || !message.channel.server) {
                return;
            }

            this.serverEmit(channel.server, 'messageDeleted', message, channel);
        });

        this.client.on('serverDeleted', (server) => {
            this.serverEmit(server, 'serverDeleted', server);
        });

        this.client.on('serverUpdated', (beforeChange, afterChange) => {
            this.serverEmit(beforeChange, 'serverUpdated', beforeChange, afterChange);
        });

        this.client.on('channelCreated', (channel) => {
            this.serverEmit(channel.server, 'channelCreated', channel);
        });

        this.client.on('channelDeleted', (channel) => {
            this.serverEmit(channel.server, 'channelDeleted', channel);
        });

        this.client.on('channelUpdated', (beforeChange, afterChange) => {
            this.serverEmit(beforeChange.server, 'channelUpdated', beforeChange, afterChange);
        });

        this.client.on('serverRoleCreated', (role) => {
            this.serverEmit(role.server, 'roleCreated', role);
        });

        this.client.on('serverRoleDeleted', (role) => {
            this.serverEmit(role.server, 'roleDeleted', role);
        });

        this.client.on('serverRoleUpdated', (beforeChange, afterChange) => {
            this.serverEmit(beforeChange.server, 'roleUpdated', beforeChange, afterChange);
        });

        this.client.on('serverNewMember', (server, user) => {
            this.serverEmit(server, 'memberCreated', user);
        });

        this.client.on('serverMemberRemoved', (server, user) => {
            this.serverEmit(server, 'memberRemoved', user);
        });

        this.client.on('serverMemberUpdated', (server, user) => {
            this.serverEmit(server, 'memberUpdated', user);
        });

        this.client.on('presence', (beforeChange, afterChange) => {
            let servers = this.client.servers.filter(server => server.members.find(user => user.id === beforeChange.id));

            for (let index in servers) {
                if (servers.hasOwnProperty(index)) {
                    this.serverEmit(servers[index], 'memberPresence', beforeChange, afterChange);
                }
            }
        });
    }

    serverEmit(server, event, ...args) {
        let serverManager = this.repository.find(manager => this.serversEqual(manager, server));
        if (!serverManager) {
            return;
        }

        //this.logger.debug(`Emitting ${event} to ${serverManager.clientServer.name}`);
        args.unshift(event);
        serverManager.emit.apply(serverManager, args);
    }

    serversEqual(serverManager, server) {
        return server && serverManager.clientServer.id === server.id;
    }
}

module.exports = ServerListener;