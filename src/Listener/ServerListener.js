const EventEmitter  = require('events').EventEmitter;

class ServerListener extends EventEmitter {
    constructor(client, logger) {
        super();

        this.client = client;
        this.logger = logger;

        this.serverManagers = [];
    }

    addServerManager(serverManager) {
        this.serverManagers.push(serverManager);

        this.client.on('message', (message) => {
            if (this.serversEqual(serverManager, message.channel.server)) {
                serverManager.emit('message', message);
            }
        });

        this.client.on('messageDeleted', (message, channel) => {
            if (this.serversEqual(serverManager, channel.server)) {
                serverManager.emit('message', message);
            }
        });

        this.client.on('serverDeleted', (server) => {
            if (this.serversEqual(serverManager, server)) {
                serverManager.emit('deleted');
            }
        });

        this.client.on('serverUpdated', (beforeChange, afterChange) => {
            if (this.serversEqual(serverManager, beforeChange)) {
                serverManager.emit('updated', beforeChange, afterChange);
            }
        });

        this.client.on('channelCreated', (channel) => {
            if (this.serversEqual(serverManager, channel.server)) {
                serverManager.emit('channelCreated', server);
            }
        });

        this.client.on('channelDeleted', (channel) => {
            if (this.serversEqual(serverManager, channel.server)) {
                serverManager.emit('channelDeleted', server);
            }
        });

        this.client.on('channelUpdated', (beforeChange, afterChange) => {
            if (this.serversEqual(serverManager, beforeChange)) {
                serverManager.emit('channelUpdated', beforeChange, afterChange);
            }
        });

        this.client.on('serverRoleCreated', (role) => {
            if (this.serversEqual(serverManager, role.server)) {
                serverManager.emit('roleCreated', role);
            }
        });

        this.client.on('serverRoleDeleted', (role) => {
            if (this.serversEqual(serverManager, role.server)) {
                serverManager.emit('roleDeleted', role);
            }
        });

        this.client.on('serverRoleUpdated', (beforeChange, afterChange) => {
            if (this.serversEqual(serverManager, beforeChange.server)) {
                serverManager.emit('roleUpdated', beforeChange, afterChange);
            }
        });

        this.client.on('serverNewMember', (server, user) => {
            if (this.serversEqual(serverManager, server)) {
                serverManager.emit('newMember', user);
            }
        });

        this.client.on('serverMemberRemoved', (server, user) => {
            if (this.serversEqual(serverManager, server)) {
                serverManager.emit('memberRemoved', user);
            }
        });

        this.client.on('serverMemberUpdated', (server, user) => {
            if (this.serversEqual(serverManager, server)) {
                serverManager.emit('memberUpdated', user);
            }
        });

        this.client.on('presence', (beforeChange, afterChange) => {
            if (serverManager.clientServer.members.find(user => user.id === beforeChange)) {
                serverManager.emit('memberPresence', beforeChange, afterChange);
            }
        });
    }

    serversEqual(serverManager, server) {
        return server && serverManager.clientServer.id === server.id;
    }
}

module.exports = ServerListener;