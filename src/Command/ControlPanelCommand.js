const AbstractCommand = require('discord-bot-base').AbstractCommand;
const Server          = require('../Model/Server');

class ControlPanelCommand extends AbstractCommand {
    static get name() {
        return 'cp';
    }

    static get description() {
        return `Gives you a link to your control panel for DiscordServers.com.`;
    }

    handle() {
        return this.responds(/^(cp|control|controlpanel|panel)$/, matches => {
            Server.findOne({identifier: this.server.id}, (error, server) => {
                if (error) {
                    return this.reply("Unable to get a control panel link at this time");
                }

                this.reply('The DiscordServers control panel is located here: https://discordservers.com/panel');
            })
        });
    }
}

module.exports = ControlPanelCommand;