const _ = require('lodash');

class ServerManager {
    constructor(bot, api) {
        this.bot = bot;
        this.api = api;

        this.checkServer = this.checkServer.bind(this);
    }

    manage() {
        let servers = [];
        this.bot.servers.forEach(server => {
            let pretty = {
                id:         server.id,
                name:       server.name,
                region:     server.region,
                members:    server.members.length,
                online:     server.members.filter(user => user.status != 'offline').length,
                icon:       server.iconURL,
                owner_id:   server.owner.id,
                owner_name: server.owner.username
            };

            servers.push(pretty);
        });

        this.updateServers(servers);
    }

    updateServers(servers) {
        this.api.call('/servers', 'post', {servers: servers}, (error, response, body) => {
            if (error) { console.log("Error Updating: ", error, body); }

            let databaseServers = JSON.parse(body);
            databaseServers.forEach(this.checkServer);
        })
    }

    checkServer(databaseServer) {
        let server = this.bot.servers.get('id', databaseServer.identifier);

        if (databaseServer.invite_code === undefined) {
            return this.getNewInviteCode(server);
        }

        this.bot.getInvite(databaseServer.invite_code, (error) => {
            if (error) {
                return this.getNewInviteCode(server);
            }
        });
    }

    getNewInviteCode(server) {
        this.api.call('/invite/update/' + server.id, 'get', {}, (error, response, body) => {
            try {
                let json = JSON.parse(body);
                if (json.message === 'has-request') {
                    return;
                }

                console.log(server.name.trim() + " has an old invite id");

                this.bot.sendMessage(
                    server.owner,
                    `Hey there! Your server (${_.trim(server.name)}) is currently using an old invite code for \<http://discordservers.com\>. If you don't update this,
we can't show your server.

***Notice: This bot is not affiliated with Discord, and is an unofficial bot. Message \`Aaron\` in Discord Bots, or tweet \`@aequasi\` for help/issues.***

Please reply with a new invite link (preferably a permanent link), in the following format.

\`\`\`
update ${server.id} <new invite url>
\`\`\``
                );
            } catch (e) {
                console.error(e, body);
            }

        });
    }
}

module.exports = ServerManager;