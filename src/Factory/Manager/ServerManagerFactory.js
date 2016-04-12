const ServerManager = require('../../Manager/ServerManager');

class ServerManagerFactory {
    constructor(container) {
        this.container = container;

        this.create = this.create.bind(this);
    }

    create(server, delayed) {
        if (server.large && delayed === undefined) {
            return setTimeout(() => this.create(server, true), 5000);
        }

        if (this.container.get('repository.server_manager').has(server.id)) {
            throw new Error("Server already exists: " + server.id + ' - ' + server.name);
        }

        //this.container.get('logger').debug("Creating server manager for: " + server.name);

        let manager = new ServerManager(this.container, server);

        this.container.get('repository.server_manager').add(manager);

        return manager;
    }


}

module.exports = ServerManagerFactory;
