// Must have all the fields of: https://github.com/aequasi/discord-server-list/blob/master/src/ApiBundle/Document/InviteRequest.php

const mongoose = require('mongoose'),
      Schema   = mongoose.Schema;

const InviteRequest = new Schema({
    serverId:     {type: String},
    authorId:     {type: String},
    inviteCode:   {type: String},
    insertDate:   {type: Date, default: Date.now()}
});

module.exports = mongoose.model('InviteRequest', InviteRequest, 'invite_requests');

