//On user join channel
module.exports = class USER{
	constructor(nick, chan, perm, joined) {
		var _this = this;
		this.perm = perm || '';

		this.nick = nick;
		this.chan = chan;

		this.is_chan_owner = false;
		this.is_discord_user = false;

		this.log.info('> Weaponizing', nick, chan, perm, joined);

		if(chan !== 'PM') this.set_user_modes();

		if(joined){
			if(chan !== 'PM'){
				this.say_tagline();
				b.users.update_last_seen(nick, chan, 'join');
			} else {
				b.users.update_last_seen(nick, chan, 'pm');
			}
		}
	}

	get where(){
	   if(this.chan !== 'PM'){
			return b.channels[this.chan];
		} else {
			return b.pm;
		} 
	}

	get log(){
		return this.where.log
	}

	get t(){
		if(this.where.t){
			return this.where.t;
		} else {
			return new Theme(config.chan_default.theme, config.chan_default.disable_colors);
		}
	}

	get config(){
		if(this.where.config){
			return this.where.config;
		} else {
			return config.chan_default;
		}
	}

	get is_owner(){
		for(var who in b.users.on_server){
			if(b.users.on_server[who].nick === this.nick){
				return b.users.on_server[who].is_owner
				break;
			}
		}
		return false;
	}

	get nick_org(){ 
		for(var who in b.users.on_server){
			if(b.users.on_server[who].nick === this.nick){
				return b.users.on_server[who].nick_org;
				break;
			}
		}
		return null;
	}

	get who(){ 
		for(var who in b.users.on_server){
			if(b.users.on_server[who].nick === this.nick){
				return who;
				break;
			}
		}
		return null;
	}

	get who_org(){ 
		for(var who in b.users.on_server){
			if(b.users.on_server[who].nick === this.nick){
				return b.users.on_server[who].who_org;
				break;
			}
		}
		return null;
	}

	get registered(){ 
		for(var who in b.users.on_server){
			if(b.users.on_server[who].nick === this.nick){
				return b.users.on_server[who].registered;
				break;
			}
		}
		return null;
	}

	check_reg_update_user(reg_test, callback){
		var _this = this;
		if(config.require_nickserv_to_edit_user_data && reg_test){
			b.users.single_nickserv_check(_this.nick, function(cb){
				cb();
				callback();
			});
		} else {
			callback();
		}
	}
	
	//chan only
	set_user_modes(){
		var _this = this;
		if(this.chan !== 'PM'){

			if( _this.config.voice_users_on_join && b.is_op){
				bot.send('mode', _this.chan, '+v', _this.nick);
				_this.perm = '+';
			} else {
				b.log.info(bot.nick, 'is not opper, cannot /mode +v');
			}

			b.users.user_data_from_who(_this.config.chan_owner, true, function(chan_owner_regex){

				if(_this.who.match(chan_owner_regex) !== null){
					_this.log.info(_this.who, 'make chan owner');
					_this.is_chan_owner = true;

					if(b.is_op){
						if(_this.config.make_owner_chan_owner && _this.perm !== '~'){
							bot.send('samode', _this.chan, '+q', _this.nick);
							_this.log.info(_this.who, 'chan owner +q');
							_this.perm = '~';
						} 
					} else {
						_this.log.trace(bot.nick, 'is not opper, cannot samode +q');
					} 
				} else {
					if(b.is_op && _this.perm === '' && _this.config.voice_users_on_join){
						bot.send('mode', _this.chan, '+v', _this.nick);
						//bot.send('samode', _this.chan, '+v', _this.nick);
						_this.perm = '+';
					} else {
						_this.log.trace(bot.nick, 'is not opper, cannot /mode +v');
					}
				}
			});
		}
	}

	nick_change(new_nick){
		this.log.warn('USER nick_change', this.nick, '->', new_nick);
		try {
			this.where.users[new_nick] = this.where.users[this.nick];
			delete this.where.users[this.nick];
			this.nick = new_nick;
		} catch(e) {
			this.log.error('Unable to change nick', this.nick, '->', new_nick, 'in', this.chan);
		}
	}

	//chan only
	say_tagline(){
		var _this = this;
		if(this.chan !== 'PM'){
			var _this = this;
			b.users.get_user_data(_this, {
				col: 'tags',
				ignore_err: true,
				skip_say: true,
				use_nick_org: false
			}, function(tags){
				var enter_msg = '';

				if(_this.config.discord_relay_channel){
					enter_msg += '→ ' + x.no_highlight(_this.nick) + ' joined';
				} else {
					if(tags !== false && tags.length && tags.length > 0){
						enter_msg += x.no_highlight(_this.nick) + ' says';
					}
				}

				if(tags !== false && tags.length && tags.length > 0){
					if(enter_msg !== '') enter_msg += ': ';
					enter_msg += x.rand_arr(tags);
				}

				if(enter_msg !== ''){
					_this.where.say(enter_msg, 1, {skip_verify: true, ignore_bot_speak: true, skip_buffer: true});
				}
			});
		}
	}
}
