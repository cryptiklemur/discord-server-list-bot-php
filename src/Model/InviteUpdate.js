// Must have all the fields of: https://github.com/aequasi/discord-server-list/blob/master/src/ApiBundle/Document/InviteUpdate.php

const mongoose = require('mongoose'),
      Schema   = mongoose.Schema;

const InviteUpdate = new Schema({
    serverId:     {type: String},
    inviteCode:   {type: String},
    insertDate:   {type: Date, default: Date.now()}
});

module.exports = mongoose.model('InviteUpdate', InviteUpdate, 'invite_update');

