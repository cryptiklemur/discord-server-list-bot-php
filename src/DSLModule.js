const AbstractModule = require('discord-bot-base').AbstractModule;

class DSLModule extends AbstractModule {
    get commandsDir() {
        return __dirname + '/Command';
    }
}

module.exports = DSLModule;
