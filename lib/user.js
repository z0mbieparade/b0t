//On user join channel
function USER(nick, CHAN) {
	this.nick = nick;
	this.perm = '';
	this.chan_owner = false;
	this.bot_owner = false;
	this.log = CHAN.log;
	this.t = CHAN.t;
	this.CHAN = CHAN;
	this.is_discord_user = false;

	this.log.info('> Weaponizing', nick, 'in', CHAN.chan);
}

/* data = { col: data, col2: data2 } */
USER.prototype.update_user = function(data, callback) {
    var _this = this;

    db.update_db("/nicks/" + _this.nick, data, false, function(act){
        if(act === 'remove'){
            callback({succ: _this.nick + '\'s ' + x.join_and(Object.keys(data)) + ' has now been removed', act: 'remove'});
        } else {
            callback({succ: _this.nick + '\'s ' + x.join_and(Object.keys(data)) + ' has now been set', act: 'add'});
        }
    });
}

USER.prototype.say_tagline = function(){
    var _this = this;
    x.get_user_data(_this.nick, {
        col: 'tags',
        ignore_err: true,
        skip_say: true
    }, function(tags){
        if(tags !== false && tags.length && tags.length > 0){
            if(config.discord_relay_channels && config.discord_relay_channels.indexOf(chan) > -1){
                 _this.CHAN.SAY.say(x.no_highlight(nick)  + ' has joined', 1, {skip_verify: true, ignore_bot_speak: true, skip_buffer: true, ignore_discord_formatting: true});
            }

            _this.CHAN.SAY.say(tags[x.rand_number_between(0, tags.length - 1)], 1, {skip_verify: true, ignore_bot_speak: true, skip_buffer: true});
        }
    });
}


module.exports = USER;