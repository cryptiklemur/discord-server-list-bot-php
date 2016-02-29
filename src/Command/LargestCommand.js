const AbstractCommand = require('discord-bot-base').AbstractCommand;
const _               = require('lodash');

class LargestCommand extends AbstractCommand {
    static get name() {
        return 'largest';
    }

    static get description() {
        return "Finds the largest servers";
    }

    initialize() {
        this.es                  = this.container.get('search');
        this.search              = this.search.bind(this);
        this.handleSearchResults = this.handleSearchResults.bind(this);
    }

    handle() {
        this.responds(/^largest$/g, this.search);
    }

    search() {
        let searchParams = {
            index: 'app',
            from:  0,
            size:  10,
            body:  {
                "sort":  [{"members": "desc"}],
                "query": {"filtered": {"query": {"match_all": {}}}}
            }
        };

        this.logger.info(searchParams);
        this.es.search(searchParams, this.handleSearchResults.bind(this));
    }

    handleSearchResults(err, response) {
        if (err) {
            return this.logger.error(err);
        }

        this.logger.info(response);

        let data      = response.hits,
            servers   = data.hits.map((hit) => {
                let server = hit._source;

                return {
                    id:      server.id,
                    name:    server.name,
                    premium: server.premium,
                    members: server.members,
                    online:  server.online
                };
            }),
            padLength = 36;

        let message = "The largest discord servers I'm in are: \n\n```";
        for (let server of servers) {
            let msg  = '',
                name = _.truncate(_.trim(server.name), {length: padLength});

            name = _.padEnd(name, padLength);
            msg += name + " - " + server.online + "/" + server.members + " members";
            message += msg + "\n";
        }

        this.sendMessage(this.message.channel, message + "```");
    }
}

module.exports = LargestCommand;