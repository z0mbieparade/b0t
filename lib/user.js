//On user join channel
module.exports = class USER{
    constructor(nick, who, chan, perm, joined) {
        this.perm = perm || '';

    	this.nick = nick;
        this.chan = chan;

    	this.is_chan_owner = false;
    	this.is_discord_user = false;

    	b.channels[chan].log.info('> Weaponizing', nick);

        this.set_user_modes();

        if(joined){
            this.say_tagline();
            b.users.update_last_seen(nick, chan, 'join');
        }
    }

    get t(){
        if(this.chan && b.channels[this.chan]){
            return b.channels[this.chan].t;
        } else {
            return new Theme(config.chan_default.theme, config.chan_default.disable_colors);
        }
    }

    get config(){
        if(this.chan && b.channels[this.chan]){
            return b.channels[this.chan].config;
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
    
    set_user_modes(){
        var _this = this;
        b.users.user_data_from_who(b.channels[_this.chan].config.chan_owner, true, function(chan_owner_regex){
            if(_this.who.match(chan_owner_regex) !== null){
                b.channels[_this.chan].log.info(_this.who, 'make chan owner');
                _this.is_chan_owner = true;

                if(b.is_op){
                    if(b.channels[_this.chan].config.make_owner_chan_owner && _this.perm !== '~'){
                        bot.send('samode', _this.chan, '+q', _this.nick);
                        b.channels[_this.chan].log.info(_this.who, 'chan owner +q');
                        _this.perm = '~';
                    } 
                } else {
                    b.channels[_this.chan].log.trace(bot.nick, 'is not opper, cannot samode +q');
                } 
            } else {
                if(b.is_op && _this.perm === '' && b.channels[_this.chan].config.voice_users_on_join){
                    bot.send('samode', _this.chan, '+v', _this.nick);
                    _this.perm = '+';
                } else {
                    b.channels[_this.chan].log.trace(bot.nick, 'is not opper, cannot samode +v');
                }
            }
        });
    }

    nick_change(new_nick){
        var _this = this;

        b.channels[this.chan].log.warn('USER nick_change', this.nick, '->', new_nick);
        try {
            b.channels[this.chan].users[new_nick] = b.channels[this.chan].users[this.nick];
            delete b.channels[this.chan].users[this.nick];
            this.nick = new_nick;
        } catch(e) {
            b.channels[this.chan].log.error('Unable to change nick', this.nick, '->', new_nick, 'in', this.chan);
        }
    }

    say_tagline(){
        var _this = this;
        b.users.get_user_data(_this, {
            col: 'tags',
            ignore_err: true,
            skip_say: true,
            use_nick_org: false
        }, function(tags){
            var enter_msg = '';

            if(b.channels[_this.chan].config.discord_relay_channel){
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
                b.channels[_this.chan].SAY.say(enter_msg, 1, {skip_verify: true, ignore_bot_speak: true, skip_buffer: true});
            }
        });
    }
}