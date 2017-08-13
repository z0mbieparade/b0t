//On user join channel
module.exports = class USER{
    constructor(nick, chan, perm, joined) {
        this.perm = perm || '';

    	this.nick = nick;
        this.chan = chan;

    	this.is_chan_owner = false;
    	this.is_discord_user = false;

    	this.log.info('> Weaponizing', nick);

        if(joined){
            if(chan !== 'PM'){
                this.set_user_modes();
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
    
    //chan only
    set_user_modes(){
        var _this = this;
        if(this.chan !== 'PM'){
            b.users.user_data_from_who(b.channels[_this.chan].config.chan_owner, true, function(chan_owner_regex){
                if(_this.who.match(chan_owner_regex) !== null){
                    _this.log.info(_this.who, 'make chan owner');
                    _this.is_chan_owner = true;

                    if(b.is_op){
                        if(b.channels[_this.chan].config.make_owner_chan_owner && _this.perm !== '~'){
                            bot.send('samode', _this.chan, '+q', _this.nick);
                            _this.log.info(_this.who, 'chan owner +q');
                            _this.perm = '~';
                        } 
                    } else {
                        _this.log.trace(bot.nick, 'is not opper, cannot samode +q');
                    } 
                } else {
                    if(b.is_op && _this.perm === '' && b.channels[_this.chan].config.voice_users_on_join){
                        bot.send('samode', _this.chan, '+v', _this.nick);
                        _this.perm = '+';
                    } else {
                        _this.log.trace(bot.nick, 'is not opper, cannot samode +v');
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
        if(this.chan !== 'PM'){
            var _this = this;
            b.users.get_user_data(_this, {
                col: 'tags',
                ignore_err: true,
                skip_say: true,
                use_nick_org: false
            }, function(tags){
                var enter_msg = '';

                if(this.config.discord_relay_channel){
                    enter_msg += '→ ' + x.no_highlight(_this.nick) + ' joined';
                } else {
                    if(tags !== false && tags.length && tags.length > 0){
                        enter_msg += x.no_highlight(_this.nick) + ' says';
                    }
                }

                if(tags !== false && tags.length && tags.length > 0){
                    if(enter_msg !== '') enter_msg += ': ';
                    enter_msg += tags[x.rand_number_between(0, tags.length - 1)];
                }

                if(enter_msg !== ''){
                    this.where.say(enter_msg, 1, {skip_verify: true, ignore_bot_speak: true, skip_buffer: true});
                }
            });
        }
    }
}