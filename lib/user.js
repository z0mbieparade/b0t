//On user join channel
function USER(nick) {

	this.nick = nick;
    this.nick_org = nick;

    this.whois_short = nick + '!*@*';
    this.whois_short_org = nick + '!*@*';

    this.whois = {nick: nick};
    this.whois_org = {nick: nick};

	this.chan_owner = [];
	this.bot_owner = false;
	this.is_discord_user = false;

	b.log.info('> Weaponizing', nick);
}

USER.prototype.update_whois = function(whois){
    this.whois_short = whois.nick + '!' + whois.user + '@' + whois.host;
    this.whois = whois;

    if(this.whois_short_org === whois.nick + '!*@*'){
        this.whois_short_org = whois.nick + '!' + whois.user + '@' + whois.host;
        this.whois_org = whois;
    }
}

USER.prototype.test_chan_owner = function(chan){
    var _this = this;
    x.get_user_whois(_this.whois_short, false, b.channels[chan].config.chan_owner, function(result){
        if(result && b.channels[chan].config.chan_owner !== ''){
            if(_this.chan_owner.indexOf(chan) < 0){
                _this.chan_owner.push(chan);
                b.channels[chan].log.info(_this.whois_short, 'make chan owner');
            }
            if(b.is_op){
                if(b.channels[chan].config.make_owner_chan_owner && b.channels[chan].users[_this.nick].perm !== '~'){
                    bot.send('samode', chan, '+q', _this.nick);
                    b.channels[chan].log.info(_this.whois_short, 'chan owner +q');
                } 
            } else {
                b.channels[chan].log.trace(bot.nick, 'is not opper, cannot samode +q');
            } 
        }
    });
}

USER.prototype.update_org_to_current = function(){
    this.nick_org = this.nick;
    this.whois_short_org = this.whois_short;
    this.whois_org = this.whois;
}

USER.prototype.nick_change = function(old_nick, new_nick){
    var _this = this;

    this.nick = new_nick;
    this.whois_short = new_nick + '!' + (_this.whois_short.split('!'))[1];
    this.whois.nick = new_nick;

    b.users[new_nick] = b.users[old_nick];
    delete b.users[old_nick];

    for(var chan in b.channels){
        if(b.channels[chan].users[old_nick]){
            b.channels[chan].users[old_nick].nick = new_nick;
            b.channels[chan].users[new_nick] = b.channels[chan].users[old_nick];
            delete b.channels[chan].users[old_nick];
        }
    }
}

USER.prototype.say_tagline = function(chan){
    var _this = this;
    x.get_user_data(_this.nick, {
        col: 'tags',
        ignore_err: true,
        skip_say: true
    }, function(tags){
        var enter_msg = '';

        if(b.channels[chan].config.discord_relay_channel){
            enter_msg += '→ ' + x.no_highlight(_this.nick) + ' joined';
        }

        if(tags !== false && tags.length && tags.length > 0){
            if(enter_msg !== '') enter_msg += ': ';
            enter_msg += tags[x.rand_number_between(0, tags.length - 1)];
        }

        if(enter_msg !== ''){
            b.channels[chan].SAY.say(enter_msg, 1, {skip_verify: true, ignore_bot_speak: true, skip_buffer: true});
        }
    });
}


module.exports = USER;