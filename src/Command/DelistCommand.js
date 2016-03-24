const AbstractCommand = require('discord-bot-base').AbstractCommand;
const _               = require('lodash');

class UpdateCommand extends AbstractCommand {
    static get name() { return 'delist'; }

    static get description() { return 'Delist this server'}

    initialize() {
        this.brain = this.container.get('brain.memory');
    }

    handle() {
        if (this.isPm()) {
            return false
        }

        return this.responds(/^delist$/i, (matches) => {
            if (!this.isOwner()) {
                this.reply("You aren't the owner of this server.");

                return;
            }

            this.brain.get('delist.confirmation', (error, confirmations) => {
                if (confirmations === undefined) {
                    confirmations = [];
                }

                if (confirmations.indexOf(this.server.id) >= 0) {
                    this.reply(
                        "Alright! It should delist within the hour. If you want to be added back, just add me the same way you did before."
                    );
                    setTimeout(() => this.client.leaveServer(this.server), 1000);
                    confirmations.splice(confirmations.indexOf(this.server.id), 1);

                    return;
                }

                this.reply("Are you sure you wan't to delist this server? If so, Just run this command again.");
                confirmations.push(this.server.id);

                this.brain.set('delist.confirmation', confirmations);
            });
        });
    }
}

module.exports = UpdateCommand;