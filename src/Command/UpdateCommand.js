const AbstractCommand = require('discord-bot-base').AbstractCommand;
const _               = require('lodash');
const Server          = require('../Model/Server');

class UpdateCommand extends AbstractCommand {
    static get name() {
        return 'update';
    }

    static get description() {
        return 'Update a server id with a new invite code'
    }

    handle() {
        this.responds(/^update (\d+)$/, matches => {
            if (!this.isAdmin()) {
                return;
            }

            let repo    = this.container.get('repository.server_manager'),
                id      = matches[1],
                manager = repo.find(manager => manager.clientServer.id === id);

            manager.emit('serverUpdated');
            this.reply("Queuing update.");
        });

        return this.responds(
            /^update (\d+) (?:<?)(?:(?:https?:\/\/)?(?:discord.gg|discordapp.com\/invite)\/)?([A-Za-z0-9]+)(?:>?)$/gmi,
            (matches) => {
                let id     = matches[1],
                    server = this.client.servers.get('id', id);

                if (server === null) {
                    this.reply("Bad server id");

                    return;
                }

                if ([server.owner.id, this.client.admin.id].indexOf(this.author.id) === -1) {
                    this.reply("You aren't the owner of this server.");

                    return;
                }

                Server.findOne({identifier: server.id}, (error, server) => {
                    if (error) {
                        this.logger.error(error);

                        return this.reply("There was an error updating your server. Try again later.");
                    }

                    if (!server) {
                        this.reply("Bad server id");

                        return;
                    }

                    server.inviteCode = matches[2];
                    server.enabled    = true;
                    server.private    = false;
                    server.save(error => {
                        if (error) {
                            this.logger.error(error);

                            return this.reply("There was an error updating your server. Try again later.");
                        }

                        this.reply("Updating " + _.trim(server.name) + " with new invite code: " + matches[2]);
                        let repo    = this.container.get('repository.server_manager'),
                            id      = matches[1],
                            manager = repo.find(manager => manager.clientServer.id === id);

                        manager.emit('serverUpdated');
                    });
                });
            });
    }
}

module.exports = UpdateCommand;