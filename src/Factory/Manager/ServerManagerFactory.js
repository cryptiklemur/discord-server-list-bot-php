const ServerManager = require('../../Manager/ServerManager');

class ServerManagerFactory {
    contructor(container) {
        this.container = container;
    }

    create(server) {
        this.container.get('logger').debug("Creating server manager for: " + server.name);

        return new ServerManager(this.container, server);
    }
}

module.exports = ServerManagerFactory;
