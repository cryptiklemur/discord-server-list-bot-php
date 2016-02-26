// Must have all the fields of: https://github.com/aequasi/discord-server-list/blob/master/src/ApiBundle/Document/Server.php

const mongoose = require('mongoose'),
      Schema   = mongoose.Schema;

const Owner = new Schema({
    id:   {type: String},
    name: {type: String}
});

const Server = new Schema({
    name:         {type: String},
    identifier:   {type: String, index: {unique: true}},
    inviteCode:   {type: String},
    icon:         {type: String},
    region:       {type: String},
    private:      {type: Boolean, default: false},
    bid:          {type: Number, default: 0},
    premium:      {type: Boolean, default: false},
    members:      {type: Number},
    online:       {type: Number},
    insertDate:   {type: Date, default: Date.now()},
    modifiedDate: {type: Date, default: Date.now()},
    enabled:      {type: Boolean, default: true},
    owner:        Owner
});

module.exports = mongoose.model('Server', Server, 'servers');

