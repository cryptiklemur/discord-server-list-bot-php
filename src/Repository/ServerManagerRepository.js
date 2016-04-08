const EventEmitter = require('events').EventEmitter;

class ServerManagerRepository extends EventEmitter {
    constructor() {
        super();

        this.items = [];
    }

    count() {
        return this.items.length;
    }

    add(serverManager) {
        this.items.push(serverManager);

        this.emit('add', serverManager);
    }

    has(identifier) {
        for (let index in this.items) {
            if (this.items.hasOwnProperty(index)) {
                if (this.items[index].clientServer.id === identifier) {
                    return true;
                }
            }
        }

        return false;
    }

    remove(serverManager) {
        for (let index in this.items) {
            if (this.items.hasOwnProperty(index)) {
                if (this.items[index].clientServer.id === serverManager.clientServer.id) {
                    this.items.splice(index, 1);

                    return this.emit('remove', serverManager);
                }
            }
        }
    }

    find() {
        return this.items.find.apply(this.items, arguments);
    }

    filter() {
        return this.items.filter.apply(this.items, arguments);
    }
}

module.exports = ServerManagerRepository;