var dateWithOffset = require("date-with-offset");
const Twitter = require('twitter');
const path = require('path');

var twitterClient = new Twitter({
	consumer_key: process.env.TWITTER_CONSUMER_KEY,
	consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
	bearer_token: process.env.TWITTER_BEARER_TOKEN
});

module.exports = class CHAN {
	constructor(chan) {
		this.chan = chan;
		this.users = {};
		this.modes = null;
		this.enter_msg_emit = false;

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

		this.config = merge.all([config_default, config_custom],
			{ arrayMerge: function(destArr, srcArr, options){
				return srcArr;
			}}
		);

		this.t = new Theme(this.config.theme, this.config.disable_colors);
	}



	init_chan(){
		var _this = this;
		this.SAY = new Say(false, _this.chan);

		if(_this.config.info_bot){
			var INFO	= require(__botdir + '/lib/infobot.js');
			_this.infobot = new INFO();
			_this.log.info('Infobot drive online!');
		}

		/*if(_this.config.moody){
			var MOODY	= require(__botdir + '/lib/moody.js');
			_this.moody = new MOODY(_this.chan);
			_this.log.info('Moody algorithm loaded');
		}*/

		if(b.is_op){
			bot.send('samode', _this.chan, '+a', bot.nick);
		}

		//check if there are any open polls for the channel
		polls_db.get_data('/' + _this.chan + '[-1]', function(poll){
			if(poll !== null && poll.status === 'open'){
				var now = (new dateWithOffset(0)).getTime();
				var time_left = (poll.time + _this.config.plugin_settings.poll_timer) - now;

				_this.log.debug('time left', x.ms_to_time(time_left));

				if(time_left > 0){
					x.add_pong('polls' + _this.chan, time_left, function(cb_func){
						var chan = (cb_func.split('polls'))[1];
						x.close_current_poll(_this, function(result){
							_this.say(result, 1, {to: _this.chan, skip_verify: true, ignore_bot_speak: true, skip_buffer: true, join: '\n'});
						});
					}, true);
					if(time_left > 60000){
						x.add_pong('polls_reminder' + _this.chan, 540000, function(cb_func){
							var chan = (cb_func.split('polls_reminder'))[1];

							polls_db.get_data('/' + chan + '[-1]', function(poll){
								if(poll !== null && poll.status === 'open'){
									x.get_pong_time_left('polls' + chan, function(time_left){
										var str = _this.t.fail('Reminder, there is an open poll: ') + _this.t.warn(poll.question) + ' ' + _this.t.fail('Time left: ' + time_left);
										_this.say(str, 1, {to: chan, skip_verify: true, ignore_bot_speak: true, skip_buffer: true, join: '\n'});
									});
								} 
							});
						}, true);
					}
				} else {
					x.close_current_poll(_this, function(result){
						_this.say(result, 1, {to: _this.chan, skip_verify: true, ignore_bot_speak: true, skip_buffer: true, join: '\n'});
					});
				}
			}
		});
	}

	say(){ this.SAY.say.apply( this.SAY, arguments ); }

	enter_msg(){
		var _this = this;
		this.enter_msg_emit = true;

		//on chan join, say some stuff
		if(this.config.speak_on_channel_join){
			var enter_msg = _this.config.speak_on_channel_join.split('|');
			if(enter_msg.length > 1 && enter_msg[0].toLowerCase() === 'qotd'){
				topic_db.get_data('/' + _this.chan + '/topic', function(data){
				   if(data !== null){
						var msg = x.rand_color(x.rand_arr(data), _this.config.disable_colors);
						_this.log.debug(_this.chan, 'enter message qotd:', msg);
						_this.say(msg, 1, {to: _this.chan, skip_verify: true, ignore_bot_speak: true, skip_buffer: true});
					} else {
						var msg = x.rand_color(enter_msg[1], _this.config.disable_colors);
						_this.log.debug(_this.chan, 'enter message (no qotd):', msg);
						_this.say(msg, 1, {to: _this.chan, skip_verify: true, ignore_bot_speak: true, skip_buffer: true});
					}
				});
			} else {
				_this.log.debug(_this.chan, 'enter message:', _this.config.speak_on_channel_join);
				_this.say(_this.config.speak_on_channel_join, 1, {to: _this.chan, skip_verify: true, ignore_bot_speak: true, skip_buffer: true});
			}
		} else {
			_this.log.warn(_this.chan, 'no enter message');
		}
	}

	uninit_chan(){
		var _this = this;
		this.log.info('# Leaving', _this.chan, 'quadrant #')
		x.remove_pong('nicklist' + _this.chan);
		delete b.channels[_this.chan];
	}


	set_modes(modes){
		var _this = this;
		this.modes = modes;

		if(this.enter_msg_emit === false){
			if(modes.indexOf('m') > -1){ //moderated channel, verify bot has +v or more
				_this.log.debug('Attempting enter message, b0t must have +v or more, since channel has +m')
			} 

			_this.enter_msg();
		}
	}

	disable_colors(disable){
		this.config.disable_colors = disable;
	}

	message(nick, text){
		var _this = this;

		if(!_this.users[nick]){
			var chans = {};
			chans[_this.chan] = '';
			b.users.add_or_update_user(nick, {nick: nick, chans: chans});
		}
		b.users.send_tell_messages(nick);
		
		var cmd_regex = '^' + config.command_prefix.replace(/[-[\]{}()*+?.,\\^$|#\\s]/g, '\\$&') + '(\\S+)\\s*(.*)$';
		var text_split = text.match(new RegExp(cmd_regex));

		var links = text.match(/(\b(https?|http):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig);

		if(links !== null && _this.config.parse_links){
			for(var i = 0; i < links.length; i++) {

				//var is_yt = links[i].match(/^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/);
				var is_yt = links[i].match(/^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/i);

				//this is a youtube link
				if(is_yt !== null){
					 x.get_url(is_yt[5], 'youtube', function(data){
						var str =  _this.t.highlight(data.title) + _this.t.null(' | Uploader: ') + _this.t.highlight(data.owner);
							str += _this.t.null(' | Time: ') + _this.t.highlight(x.ms_to_time(data.duration * 1000, {short: false})) + _this.t.null(' | Views: ') + _this.t.highlight(x.abv_num(data.views));  
						_this.say(str, 1, {to: _this.chan, ignore_bot_speak: true});
					});

				} else if (links[i].indexOf('twitter.com') > -1) {
					let twu = new URL(links[i])
					_this.log.debug(twu)
					let twpath = path.basename(twu.pathname)
					_this.log.debug(twpath)
					// Use the full path so that twitter api doesn't insert api
					// version into the request.
					twitterClient.get('https://api.twitter.com/2/tweets/'
						+ twpath, function (error, tweets, response) {
						if (error) { return; } // Maybe log here?
						let str = tweets.data.text;
						_this.say(str, 1, { to: _this.chan, ignore_bot_speak: true });
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
						_this.say(str, 1, {to: _this.chan, ignore_bot_speak: true});
					},{
						only_return_nodes: {tag: ['title', 'meta']}
					}); 

				} else {
					x.get_url(links[i], 'sup', function(data){
						_this.say(_this.t.null(data), 1, {to: _this.chan, ignore_bot_speak: true});
					},{
						rand_user_agent: true,
						timeout: 10000
					}); 
				}
			}
		}

		//say the bots name
		if (text.match(new RegExp('^' + bot.nick)) !== null && this.config.respond_to_bot_name) { 
			var command_args_org = text.split(' ');
			command_args_org.shift();

			var say_my_name = '';
			if(command_args_org[0] == '-version') {
				say_my_name = 'version: ' + pkg.version;
			} else if(command_args_org[0] == '-owner') {
				b.users.owner(true, function(owner_nicks){
					_this.say('owner(s): ' + c.rainbow(owner_nicks.join(', ')), 2, {ignore_bot_speak: true});
					return;
				});
			} else if(command_args_org[0] === '-link') {
				say_my_name = 'link: https://github.com/z0mbieparade/b0t';
			} else if(command_args_org[0] === '-uptime') {
				var uptime_ms = process.uptime() * 1000;


				say_my_name = 'uptime: ' + x.ms_to_time(uptime_ms);
			} else {
				say_my_name = 'for more info try ' + config.command_prefix + 'help, ' + config.command_prefix + 'commands, or ' + _this.t.highlight(bot.nick + ' -version|-owner|-link|-uptime');
			}   

			_this.say(say_my_name, 2, {ignore_bot_speak: true});

		//respond to command
		} else if (text_split !== null && text_split.length > 1) {

			_this.log.debug('attempt command:', nick, "'"+text+"'");

			var USER = _this.users[nick];

			var command = text_split[1];
			var command_str = text_split[2].trim();

			var command_data = b.cmds.command(command, USER);

			if(command_data.err){
				_this.log.error(command_data.err);
				return;
			}
			
			USER.check_reg_update_user((command_data.registered && USER.registered === false), function(){
				b.cmds.verify_command(USER, command, {help: true, is_pm: false}, function(cmd){
					if(cmd !== false){

						var command_args = b.cmds.parse_command_input(USER, _this, command, command_str);

						if(command_args.err){
							_this.log.error(command_args.err);
							_this.say(command_args.err === 'help' ? cmd : cmd + ' ' + _this.t.errors( '(' + command_args.err.join(', ') + ')'), 2, {skip_verify: true});
						} else {

							try {
								command_data.func(_this, USER, function(){
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
										chan: _this.chan
									}, options);

									_this.say(msg, level, options);
								}, command_args, command_str);
							} catch(e) {
								_this.log.error(e);
								_this.say({'err': 'Something went wrong'});
							}
						}
					}

				});
			});
		// do replace s/old/new
		} else if(text.match(/^s\/(.+)\/(.+)/g) !== null){
			var replace = text.split('/');

			b.users.get_user_data(_this.users[nick].nick, {
				ignore_err: true,
				skip_say: true
			}, function(d){

				if(d && d.spoke && d.spoke.text && d.spoke.text.length)
				{
					var found = false;
					var replace_regex = new RegExp(replace[1], 'gi');
					d.spoke.text.forEach(function(line)
					{
						if(line.text != text && line.text.match(replace_regex) !== null && found === false)
						{
							found = line.text.replace(replace_regex, replace[2]);
						}
					});

					if(found !== false)
					{
						_this.say(found);
					}
				}

			});
		} else { //everything else
			//this is a message in the chan, and we're limiting bot chan speak to only when not busy
			//so we need to log when messages are sent
			if(nick !== bot.nick){
				x.update_speak_time(_this.chan + '/chan', 5);
			}

			//if this is enabled it does a basic replication of an infobot
			if(_this.config.info_bot){
				_this.infobot.check_message(_this, text, (_this.users[nick] && _this.users[nick].perm === '~' ? true : false), nick);
			}
		}
	}

	action(nick, text){
		var _this = this;

		if(!_this.users[nick]){
			var chans = {};
			chans[_this.chan] = '';
			b.users.add_or_update_user(nick, {nick: nick, chans: chans});
		}

		if(this.moody){
			this.moody.action(nick, text);
		} else if (get_action !== null && this.config.respond_to_bot_name) { 

			var actions = {
				'licks': 'takes a bath, gross',
				'hugs': 'glomps ' + nick,
				'pets': 'purrrs',
				'kicks': 'slaps ' + nick,
				'slaps': 'punches ' + nick,
				'punches': 'kicks ' + nick,
				'loves': 'hugs ' + nick
			};

			var action_regex = new RegExp('^(' + (Object.keys(actions)).join('|') + ')\\s' + bot.nick, 'i');
			var get_action = text.match(action_regex);

			if(!get_action) return;

			_this.say('/me ' + actions[get_action[1]])
		}
	}

	get_all_users_in_chan_data(options, callback) {
		var _this = this;
		options = Object.assign({}, {
			label: null,
			col: null,
			chan: _this.chan,
			no_highlight: true, //inserts zero width no-break space character in irc nick so it doesn't ping users
			merge_dupes: true, //merges dup nicks, so if user1:foo & user2:foo, returns foo:user1|user2 instead of foo:[user1,user2]
			return_rows: false, //if true skip all the merge stuff and just return the rows
			skip_say: true,
			ignore_err: true,
			use_nick_org: true
		}, options);

		var rows = {},
			count = 0;

		if(options.col === null){
			callback(Object.keys(b.channels[options.chan].users));
			return;
		} else if(typeof options.col === 'object' && Array.isArray(options.col)) {
			var new_options = JSON.parse(JSON.stringify(options));
			delete new_options.col;

			Object.keys(_this.users).forEach(function(nick) {
				b.users.get_user_data(_this.users[nick], new_options, function(udata){
					if(udata !== false){
						rows[nick] = rows[nick] || {};
						options.col.forEach(function(c){
							if(udata[c]){
								rows[nick][c] = udata[c];
							}
						});
					}
				})

				if(Object.keys(rows[nick]).length > 0){
					count++;
				} else {
					delete rows[nick];
				}

			});
		} else {
			Object.keys(_this.users).forEach(function(nick) {
				b.users.get_user_data(_this.users[nick], options, function(user_data){
					if(user_data !== false){
						rows[nick] = user_data;
						count++;
					}
				});
			});
		}

		if (count === 0) {
			_this.say({'err': 'No users registered with ' + _this.t.highlight(options.label) + _this.t.errors(' currently in the channel')});
		} else {

			if(options.return_rows)
			{
				callback(rows)
			}
			else
			{
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
	}

	update_topic(){
		var _this = this;

		topic_db.get_data('/'+_this.chan+'/topic', function(data){
			topic_db.get_data('/'+_this.chan+'/pinned', function(pinned){
				_this.log.debug('pinned', pinned);
				var topic = data ? data.slice(-4) : [];

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
				bot.send('topic', _this.chan, topic.join(' ¦ '));
				_this.say({succ: 'Topic updated!'});
			});
		});
	}
}
