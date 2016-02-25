// Must have all the fields of: https://github.com/aequasi/discord-server-list/blob/master/src/ApiBundle/Document/Server.php

const mongoose = require('mongoose'),
      Schema   = mongoose.Schema;

const Bot = new Schema({
    name:       {type: String},
    identifier: {type: String, index: {unique: true}},
    library:    {type: String},
    prefix:     {type: String},
    notes:      {type: String},
    enabled:    {type: Boolean, default: true},
    owner:      {type: String}
});

module.exports = mongoose.model('Bot', Bot, 'bots');

