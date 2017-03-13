//On discord user speak, create this
function DUSER(nick, CHAN) {
	this.nick = nick;
	this.perm = '';
	this.chan_owner = false;
	this.bot_owner = false;
	this.log = CHAN.log;
	this.t = CHAN.t;
	this.CHAN = CHAN;
	this.is_discord_user = true;

	this.log.info('> Synchronizing', nick, 'in', CHAN.chan, '(discord)');
}

/* data = { col: data, col2: data2 } */
DUSER.prototype.update_user = function(data, callback) {
    var _this = this;

    db.update_db("/nicks/" + _this.nick, data, false, function(act){
        if(act === 'remove'){
            callback({succ: _this.CHAN.t.highlight(_this.nick) + '\'s ' + (Object.keys(data)).join(', ') + ' has now been removed', act: 'remove'});
        } else {
            callback({succ: _this.CHAN.t.highlight(_this.nick) + '\'s ' + (Object.keys(data)).join(', ') + ' has now been set', act: 'add'});
        }
    });
}

DUSER.prototype.say_tagline = function(){
    return;
}


module.exports = DUSER;