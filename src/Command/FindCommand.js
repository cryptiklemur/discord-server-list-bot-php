const AbstractCommand = require('discord-bot-base').AbstractCommand;
const _               = require('lodash');

class FindCommand extends AbstractCommand {
    static get name() { return 'find'; }

    static get description() { return "Search for servers using regex."; }

    static get help() { return `Use this command to search for servers. e.g. \`|find Discord\``}

    initialize() {
        this.es                  = this.container.get('search');
        this.search              = this.search.bind(this);
        this.handleSearchResults = this.handleSearchResults.bind(this);
    }

    handle() {
        this.responds(/^find$/, () => this.reply(FindCommand.help));

        return this.responds(/^find (.*)/g, this.search);
    }

    search(matches) {
        let filters      = [
            {"query": {"match_phrase_prefix": {"name": matches[1].toLowerCase()}}},
            {"bool": {"must": {"term": {"enabled": true}}}}
        ];
        let searchParams = {
            index: 'app',
            from:  0,
            size:  50,
            body:  {
                "sort":  [{"premium": "desc"}],
                "query": {"filtered": {"query": {"match_all": {}}, "filter": {"and": filters}}}
            }
        };

        this.es.search(searchParams, this.handleSearchResults.bind(this));
    }

    handleSearchResults(err, response) {
        if (err) { this.logger.error(err); }

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

        let message = "I found the following servers for you: \n\n",
            delay   = 0,
            added   = 0;

        for (let server of servers) {
            let msg  = '',
                name = _.truncate(_.trim(server.name), {length: padLength});

            name = _.padEnd(name, padLength);

            msg += "**" + name + "**\n";
            msg += server.online + "/" + server.members + " members - <http://discservs.co/v/" + server.id + ">\n";

            if (message.length + msg.length + 1 > 1997) {
                break;
            }

            added++;
            message += msg + "\n";
        }

        if (added > 0) {
            this.reply(message + "", delay);
        } else {
            this.reply("I couldn't find any servers");
        }
    }
}

module.exports = FindCommand;