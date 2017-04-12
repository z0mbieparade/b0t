var merge       = require('merge'),
    User        = require(__botdir + '/lib/user.js'),
    DUser       = require(__botdir + '/lib/discord_user.js');

//On bot join channel
function CHAN(chan) {
    var _this = this;
	this.chan = chan;
	this.users = {};
    this.discord_users = {};
	this.modes = null;

	var config_default = JSON.parse(JSON.stringify(config.chan_default));

    log4js.addAppender(log4js.appenders.file(__botdir + '/logs/' + chan + '_' + b.log_date + '.log'), chan);
    this.log = log4js.getLogger(chan);
    this.log.setLevel(config.debug_level);

    this.log.info('#### Entering', chan, 'quadrant ####');

	//check if there's a custom chan specific config to load, otherwise load the default one.
	var config_custom = {}; 
	try {
	   config_custom = require(__botdir + '/chan_config/./config_' + chan + '.json');
	   this.log.info('loaded custom config_' + chan + '.json');
	} catch (e) {
		this.log.warn('No custom config_' + chan + '.json, loading config.chan_default');
	}

	this.config = merge.recursive(true, config_default, config_custom);
	this.t = new Theme(this.config.theme, this.config.disable_colors);

    x.add_pong('nicklist' + chan, 900000, function(){
        bot.send('names', chan);
    })
}

CHAN.prototype.init_chan = function(){
    var _this = this;
    this.SAY = new Say(false, _this.chan);

    if(_this.config.info_bot){
        var INFO    = require(__botdir + '/lib/infobot.js').INFO;
        _this.infobot = new INFO();
        _this.log.info('Infobot drive online!');
    }

    //on chan join, say some stuff
    if(this.config.speak_on_channel_join){
        var enter_msg = _this.config.speak_on_channel_join.split('|');
        if(enter_msg.length > 1 && enter_msg[0].toLowerCase() === 'qotd'){
            db.get_db_data('/topic', function(data){
               if(data && data.length > 0){
                    var msg = x.rand_color(data[x.rand_number_between(0, data.length - 1)], _this.config.discord_relay_channel || _this.config.disable_colors);
                     _this.SAY.say(msg, 1, {to: _this.chan, skip_verify: true, ignore_bot_speak: true, skip_buffer: true});
                } else {
                    var msg = x.rand_color(enter_msg[1], _this.config.discord_relay_channel || _this.config.disable_colors);
                    _this.SAY.say(msg, 1, {to: _this.chan, skip_verify: true, ignore_bot_speak: true, skip_buffer: true});
                }
            });
        } else {
            _this.SAY.say(_this.config.speak_on_channel_join, 1, {to: _this.chan, skip_verify: true, ignore_bot_speak: true, skip_buffer: true});
        }
    }

    if(b.is_op){
        bot.send('samode', _this.chan, '+a', config.bot_nick);
    }
}

CHAN.prototype.uninit_chan = function(){
    var _this = this;
    this.log.info('# Leaving', _this.chan, 'quadrant #')
    x.remove_pong('nicklist' + _this.chan);
    delete b.channels[_this.chan];
}


CHAN.prototype.set_modes = function(modes){
	this.modes = modes;
}

CHAN.prototype.disable_colors = function(disable){
	this.config.disable_colors = disable;
}

CHAN.prototype.add_or_update_user = function(nick, perm, send_tell_msgs){
	if(nick === config.bot_nick) return;
	var _this = this;

	perm = perm || '';
	if(!this.users[nick]){
		this.users[nick] = new User(nick, _this);
	}

	this.users[nick].perm = perm;

    if(send_tell_msgs) x.send_tell_messages(nick);

	if(nick === this.config.chan_owner) this.users[nick].chan_owner = true;
	if(nick === config.owner) this.users[nick].bot_owner = true;

	if(b.is_op){
		if(this.config.make_owner_chan_owner && nick === this.config.chan_owner && perm !== '~'){
			bot.send('samode', _this.chan, '+q', _this.config.chan_owner);
		} else if(_this.users[nick].perm === '' && _this.config.voice_users_on_join){
            bot.send('samode', _this.chan, '+v', nick);
        }
	} else {
		this.log.trace('b0t is not opper, cannot samode');
	}
}

CHAN.prototype.update_nick_list = function(nicks, send_tell_msgs){
	var _this = this;
	for(var nick in nicks){
		_this.add_or_update_user(nick, nicks[nick], send_tell_msgs);
	}
}

CHAN.prototype.message = function(nick, text, is_discord_user){
	var _this = this;

    if(!is_discord_user){
        if(!_this.users[nick])  _this.add_or_update_user(nick);
        x.send_tell_messages(nick);
    } else {
        if(!_this.discord_users[nick]) _this.discord_users[nick] = new DUser(nick, _this);
    }

	var links = text.match(/(\b(https?|http):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig);
    if(links !== null && _this.config.parse_links){
        for(var i = 0; i < links.length; i++) {

            //var is_yt = links[i].match(/^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/);
            var is_yt = links[i].match(/^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/i);

            //this is a youtube link
            if(is_yt !== null){
                 x.get_url(is_yt[5], 'youtube', function(data){
                    var str =  _this.t.highlight(data.title) + _this.t.null(' | Uploader: ') + _this.t.highlight(data.owner);
                        str += _this.t.null(' | Time: ') + _this.t.highlight(x.ms_to_time(data.duration * 1000, false)) + _this.t.null(' | Views: ') + _this.t.highlight(data.views);  
                    _this.SAY.say(str, 1, {to: _this.chan, ignore_bot_speak: true});
                });

            } else if(links[i].indexOf('imgur.com') > -1) {

                 x.get_url(links[i], 'html', function(data){
                    var str_arr = [];
                    for(var j = 0; j < data.length; j++){
                        if(data[j].tag === 'title' &&  data[j].text !== 'Imgur: The most awesome images on the Internet'){
                            str_arr.push(_this.t.highlight(data[j].text));
                        } else if (data[j].tag === 'meta' && data[j].attr && data[j].attr.property && 
                            data[j].attr.property === 'og:description' &&  data[j].attr.content !== 'Imgur: The most awesome images on the Internet.' &&
                            data[j].attr.content) {
                            str_arr.push(_this.t.highlight(data[j].attr.content));
                        }
                    }

                    if(str_arr.length < 1) str_arr.push('Imgur: The most awesome images on the Internet');

                    var str = str_arr.join(_this.t.null(' | '));
                    _this.SAY.say(str, 1, {to: _this.chan, ignore_bot_speak: true});
                },{
                    only_return_nodes: {tag: ['title', 'meta']}
                }); 

            } else {
                if(!_this.config.discord_relay_channel){
                    x.get_url(links[i], 'sup', function(data){
                    	_this.SAY.say(_this.t.null(data), 1, {to: _this.chan, ignore_bot_speak: true});
                    }); 
                }
            }
        }
    }

    //say the bots name
    if (text.indexOf(config.bot_nick) > -1 && this.config.respond_to_bot_name) { 
        var command_args_org = text.split(' ');
        command_args_org.shift();

        var say_my_name = '';
        if(command_args_org[0] == '-version') {
            say_my_name = 'verson: ' + pkg.version;
        } else if(command_args_org[0] == '-owner') {
            say_my_name = 'owner: ' + c.rainbow(config.owner);
        } else if(command_args_org[0] === '-link') {
            say_my_name = 'link: https://github.com/z0mbieparade/b0t';
        } else {
            say_my_name = 'for more info try ' + config.command_prefix + 'help, ' + config.command_prefix + 'commands, or ' + _this.t.highlight(config.bot_nick + ' -version|-owner|-link');
        }   

        _this.SAY.say(say_my_name, 2, {ignore_bot_speak: true});

    //respond to command
    } else if (text.indexOf(config.command_prefix) === 0) {

        _this.log.debug('attempt command:', nick, "'"+text+"'", is_discord_user);
        
        var command_args_org = text.split(' ');
        var command = command_args_org[0].slice(1);
        command_args_org.shift();
        var command_data = x.get_command(command);

        if(command_data.err){
            this.log.error(command_data.err);
            return;
        }
        
        var cmd = x.verify_command((is_discord_user ? _this.discord_users[nick] : _this.users[nick]), command, true);
        if(cmd === false) return;

        //remove blank commands
        var command_args = command_args_org.filter(function(value) {
          var val = value.replace(/^\s+|\s+$/g, '');
          return val !== '';
        })

        var required_commands = 0;
        if(command_data.params && command_data.params.length > 0){
            for(var i = 0; i < command_data.params.length; i++) {
                if (command_data.params[i].indexOf('*') !== 0) required_commands++;
            }
        }

        if (command_args.length < required_commands) {
           this.SAY.say(cmd, 2, {skip_verify: true});
        } else {

            if(command_args[0] === 'help'){
                _this.SAY.say(cmd, 2, {skip_verify: true});
                return;
            }

            var command_str = command_args_org.join(' ');
            command_str = command_str.trim();
            if(command_data.colors){
                command_str = x.format(command_str, this);
            }



            try {
                command_data.func(_this, (is_discord_user ? _this.discord_users[nick] : _this.users[nick]), function(){
                    if(!arguments || arguments.length < 1){
                        return;
                    } else if(arguments.length === 2){
                        var level = typeof arguments[1] === "number" ? arguments[1] : 1;
                        var options = typeof arguments[1] === "object" ? arguments[1] : {};
                    } else {
                        var level = typeof arguments[1] === "number" ? arguments[1] : 1;
                        var options = typeof arguments[2] === "object" ? arguments[2] : {};
                    }
                    var msg = arguments[0];

                    options = Object.assign({}, {
                        is_cmd: true,
                        nick: nick,
                        chan: _this.chan,
                        is_discord_user: is_discord_user
                    }, options);

                    _this.SAY.say(msg, level, options);
                }, command_args, command_str);
            } catch(e) {
                _this.log.error(e);
                _this.SAY.say({'err': 'Something went wrong'});
            }
        }

    //everything else
    } else {
        //this is a message in the chan, and we're limiting bot chan speak to only when not busy
        //so we need to log when messages are sent
        if(nick !== config.bot_nick){
            _this.SAY.update_chan_speak('chan');
        }

        //if this is enabled it does a basic replication of an infobot
        if(_this.config.info_bot){
            _this.infobot.check_message(_this, text, (_this.users[nick] && _this.users[nick].perm === '~' ? true : false), nick);
        }
    }
}

CHAN.prototype.action = function(nick, text, is_discord_user){
    var _this = this;

    if(!is_discord_user){
        if(!_this.users[nick])  _this.add_or_update_user(nick);
        x.send_tell_messages(nick);
    } else {
        if(!_this.discord_users[nick]) _this.discord_users[nick] = new DUser(nick, _this);
    }

    var actions = {
        'licks': 'takes a bath, gross',
        'hugs': 'glomps ' + nick,
        'pets': 'purrrs',
        'kicks': 'slaps ' + nick,
        'slaps': 'punches ' + nick,
        'punches': 'kicks ' + nick,
        'loves': 'hugs ' + nick
    };

    var action_regex = new RegExp('^(' + (Object.keys(actions)).join('|') + ')\\s' + config.bot_nick, 'i');
    var get_action = text.match(action_regex);
    if (get_action !== null && this.config.respond_to_bot_name) { 
        _this.SAY.say('/me ' + actions[get_action[1]])
    }
}

CHAN.prototype.get_all_users_in_chan_data = function(options, callback) {
    var _this = this;
    options = Object.assign({}, {
        label: null,
        col: null,
        chan: _this.chan,
        no_highlight: true, //inserts zero width no-break space character in irc nick so it doesn't ping users
        merge_dupes: true, //merges dup nicks, so if user1:foo & user2:foo, returns foo:user1|user2 instead of foo:[user1,user2]
        skip_say: true,
        ignore_err: true
    }, options);

    var rows = {},
        count = 0;

    if(options.col === null){
        callback(Object.keys(b.channels[options.chan].users));
        return;
    } else {
        Object.keys(_this.users).forEach(function(nick) {
            x.get_user_data(nick, options, function(user_data){
                if(user_data !== false){
                    rows[nick] = user_data;
                    count++;
                }
            });
        });
    }

    if (count === 0) {
        _this.SAY.say({'err': 'No users registered with ' + _this.t.highlight(options.label) + _this.t.errors(' currently in the channel')});
    } else {

        var user_dups = {};
        for(var irc_un in rows){
            var un = rows[irc_un];
            irc_un = options.no_highlight ? x.no_highlight(irc_un) : irc_un;
            user_dups[un] ? user_dups[un].push(irc_un) : user_dups[un] = [irc_un];
        }

        if(options.merge_dupes){
            var dup_merge = {};
            for(var un in user_dups){
                dup_merge[un] = user_dups[un].join('|');
            }
            callback(dup_merge);
        } else {
            callback(user_dups);
        }
    }
}

CHAN.prototype.update_topic = function(){
    var _this = this;
    db.get_db_data('/topic', function(data){
        db.get_db_data('/pinned/'+_this.chan, function(pinned){
            _this.log.debug('pinned', pinned);
            
            var topic = data ? data.slice(-3) : [];

            if(pinned && typeof pinned === 'string') pinned = [pinned];
            if(pinned){

                if(topic.indexOf(pinned[0]) > -1){
                    topic.splice(topic.indexOf(pinned[0]), 1);
                } else {
                    topic.splice(0, 1);
                }

                var pin_topic = '📌 ' + _this.t.fail(c.stripColorsAndStyle(pinned[0]));

                topic.push(pin_topic);

            } 

            topic.reverse();
            bot.send('topic', _this.chan, topic.join(' | '));
            _this.SAY.say({succ: 'Topic updated!'});
        });
    });
};

module.exports = CHAN;