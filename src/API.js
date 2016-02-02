const request     = require('request');
const querystring = require('querystring');

class API {
    constructor(dev, apiKey) {
        this.url    = 'http://' + (dev ? 'dev.' : '') + 'api.discordservers.com';
        this.apiKey = apiKey;
    }

    call(url, method, data, callback) {
        method   = method === undefined ? 'get' : method;
        data     = data === undefined ? {} : data;
        callback = callback === undefined ? () => {} : callback;

        if (method === undefined) {
            method = 'get';
        }

        if (data === undefined) {
            data = {};
        }

        let getParams   = method.toLowerCase() === 'get' ? '?' + querystring.stringify(data) : '',
            uri         = this.url + url + getParams,
            requestData = {
                method: method.toUpperCase(),
                uri:    uri,
                auth:   {bearer: this.apiKey}
            };

        if (method.toLowerCase() === 'post') {
            requestData.form = data;
        }

        request(requestData, callback);
    }
}

module.exports = API;