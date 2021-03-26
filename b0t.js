#!/usr/bin/env node

__botdir			= __dirname,

irc				= require('irc'),
fs				= require('fs'),
c				= require('irc-colors'),
log4js			= require('log4js'),
merge			= require('deepmerge'),
dateWithOffset	= require('date-with-offset'),

DB				= require(__dirname + '/lib/db.js'),
X				= require(__dirname + '/lib/x.js'),
CMDS			= require(__dirname + '/lib/commands.js'),
Users			= require(__dirname + '/lib/users.js'),
Theme			= require(__dirname + '/lib/colortheme.js'),
Say				= require(__dirname + '/lib/say.js'),
pkg				= require(__dirname + '/./package.json');

let config_default	= require(__dirname + '/config/./default_config.js').default,
	config_custom	= {};

log4js.configure({
	appenders: [{
		type: 'file',
		filename: __dirname + '/logs/b0t_' + get_date() + '.log',
		category: [ 'b0t','console' ]
	},{
		type: 'console'
	}],
	replaceConsole: true
});

b				   = {
	log: log4js.getLogger('b0t'),
	is_op: false,
	waiting_for_pong: [],
	log_date: get_date(),
	channels: {},
	users: new Users(),
	cbs: {},
	whois_queue: []
},

words			   = {};

b.log.setLevel('ALL');
b.log.info("------------------------------------------------------------");
b.log.info("Initializing the quantum b0t clutch assembly...");


let words_db = new DB({db_name: 'words'});
words_db.get_data('/', function(w){
	words   = w,
	x	   = new X();

	try {
	   config_custom = require(__dirname + '/./config.json');
	   init_plugins(init_bot);
	} catch (e) {
		if(e.message.match(/^Cannot find module (.*?)config.json/i) !== null){
			//if there's no config.json, run command line basic config
			b.log.warn('No config.json file, starting config');
			var prompt	   = require('prompt'),
				JsonDB	   = require('node-json-db'),
				config_setup = require(__dirname + '/config/./setup_config.json'),
				config_db	= new JsonDB('config.json', true, true);

			prompt.start();

			prompt.get(config_setup, function (err, result) {
				if (err) { return onErr(err); }

				var chan_arr = result.channels.split(/,\s*/);
				chan_arr = chan_arr.filter(function(x){ return x !== '' && x !== null});
				chan_arr = chan_arr.map(function(x){ return x.match(/^#/) === null ? '#' + x : x});

				config_custom = {
					bot_nick: result.bot_nick,
					owner: result.owner,
					network_name: result.network_name,
					nickserv_password: result.nickserv_password,
					ircop_password: result.ircop_password,

					bot_config: {
						port: result.port,
						channels: chan_arr,
						secure: result.secure
					}
				};

				try {
				   config_db.push("/", config_custom, false);

				   if(result.start){
						init_plugins(init_bot);
				   }
				} catch(e) {
					b.log.error('load config db', e.message, e);
				}
			});

			function onErr(err) {
				b.log.error(err);
				return 1;
			}
		} else {
			b.log.error('load custom config.json', e.message, e);
		}
	}
});

function init_bot(){
	//load db
	polls_db = new DB({readable: true, db_name: 'polls'});
	topic_db = new DB({
		readable: true,
		db_name: 'topic',
		on_load: function(db_root)
		{
			if(typeof(db_root) === 'object' && Array.isArray(db_root))
			{
				var new_root = {};
				config.bot_config.channels.forEach(function(chan){
					new_root[chan] = {
						topic: db_root
					};
				});
				return new_root;
			}
			else
			{
				return db_root;
			}
		}
	});
	db = new DB({
		readable: true,
		on_load: function(db_root){
			if(db_root){
				if(db_root.buffer) delete db_root.buffer;
				if(db_root.speak) delete db_root.speak;
				if(db_root.pong) delete db_root.pong;

				if(db_root.polls)
				{
					polls_db.update('/', db_root.polls, true);
					delete db_root.polls;
				}

				if(db_root.topic)
				{
					config.bot_config.channels.forEach(function(chan){
						topic_db.update('/' + chan + '/topic', db_root.topic, true);
					});
					delete db_root.topic;
				}

				if(db_root.pinned)
				{
					for(var chan in db_root.pinned)
					{
						topic_db.update('/' + chan + '/pinned' , db_root.pinned[chan], true);
					}

					delete db_root.pinned;
				}

				if(db_root.nicks){
					for(var nick in db_root.nicks){
						delete db_root.nicks[nick].cache;
					}
				}
			}
			return db_root
		}
	});

	b.log.info("Initiating", config.bot_nick, "animatter shields...");
	bot = new irc.Client(
		config.network_name,
		config.bot_nick,
		config.bot_config
	);

	var CHAN = require(__dirname + '/lib/chan.js'),
		PM   = require(__dirname + '/lib/pm.js');

	b.pm = new PM();

	bot.addListener('join', function(chan, nick, message) {

		if(!b.channels[chan]){
			b.channels[chan] = b.channels[chan] || new CHAN(chan);
			b.channels[chan].init_chan();
		}

		if(nick !== bot.nick){
			b.users.join_server(chan, nick, message);
		}
	});

	bot.addListener('registered', function(message) {
		b.log.trace(message);
		b.log.info(bot.nick, 'registered on network:', message.args[1]);
		if(config.ircop_password){
			b.is_op = true;
			bot.send('oper', config.bot_nick, config.ircop_password);
		}
		if(config.nickserv_password) bot.say(config.nickserv_nick, 'identify ' + config.nickserv_password);
	});

	//we use raw messages instead
	bot.addListener('error', function(message){});
	bot.addListener('netError', function(exception) {
		b.log.error(exception);
	});
	bot.addListener('raw', function(message){
		var ignore = ['TOPIC','PING','MODE','JOIN','PRIVMSG','001','002','003','004','005','042',
					  '250','251','252','253','254','255','265','266','307','315','318','329','330','332',
					  '333','353','366','372','373','375','376','378','379','396','422','671'];
		if(ignore.indexOf(message.rawCommand) > -1) return;

		switch(message.rawCommand){
			case 'PART': //when a user leaves, delete them from the channels
			case 'KICK':


				if(message.rawCommand === 'PART') var nick = message.nick;
				if(message.rawCommand === 'KICK') var nick = message.args[1];
				var chan = message.args[0];

				b.users.leave_channel(nick, chan, message.rawCommand.toLowerCase());
				break;
			case 'KILL':
			case 'QUIT':
				b.users.leave_server(message.nick, message.rawCommand.toLowerCase());
				break;
			case 'PONG':
				for(var i = b.waiting_for_pong.length; i--;){
					// this could be undefined if "!ping" is sent in a bot PM, which would cause the "say" line to crash
					if(typeof b.waiting_for_pong[i] != 'undefined') {
						bot.say(b.waiting_for_pong[i], 'pong');
					}
					b.waiting_for_pong.splice(i, 1)
				}
				x.pong();
				break;
			case 'NICK': //user changes nickname
				b.users.nick_changed(message.nick, message.args[0]);
				break;
			case '491': //Permission Denied - You do not have the required operator privileges
			case '481':
				b.is_op = false;
				b.log.error(bot.nick, 'does not have required operator privileges, disabling oper commands.');
				break;
			case '381': //opper up
				b.is_op = true;
				b.log.info(bot.nick, 'opped up!');
				break;
			case '324': //get chan modes
				if (b.channels[message.args[1]]) b.channels[message.args[1]].set_modes(message.args[2]);
				break;
			case '401':
				b.log.warn('No such nick:', message.args[1]);
				b.users.who_reply(message);
				break;
			case '404': //can't send colors
				if (b.channels[message[1]]) b.channels[message[1]].disable_colors(true);
				break;
			case 'NOTICE': //for nickserv
				if(message.nick !== config.nickserv_nick) break;
			case '311': //whoisuser
			case '312': //whoisserver
			case '313': //whoisoperator
			case '317': //whoisidle
			case '319': //whoischannels
			case '352': //who
				b.users.who_reply(message);
				break;
			default:
				b.log.warn(message.rawCommand, message);
				break;
		}
	});

	bot.addListener('names', function(chan, nicks) {
		b.log.debug('names', chan, nicks);

		var nicks_arr = [];

		for(var nick in nicks){
			if(nick === bot.nick) continue;
			if(nicks[nick] === undefined) continue;

			var chans = {};
			chans[chan] = nicks[nick];

			b.users.add_or_update_user(nick, {nick: nick, chans: chans});

			nicks_arr.push(nick);
		}

		if(config.require_nickserv_to_edit_user_data) b.users.nickserv_check_list(nicks_arr, chan, 'names');
		if(b.channels[chan].config.autokb_users_inactive_for > 0) b.users.autokb_check_list(nicks_arr, chan);

		//check for extra users, delete them if they exist
		if(b.channels[chan]){
			for(var user in b.channels[chan].users){
				if(!nicks[user]){
					b.log.debug('nick cleanup, deleting', user, 'from', chan);
					delete b.channels[chan].users[user];
				}
			}
		}
	});

	bot.addListener('+mode', function(chan, by, mode, argument, message)  {
		if(argument !== undefined && argument !== bot.nick){
			//b.log.warn('+mode', chan, by, mode, argument, message);
			bot.send('names', chan);
		}
	});

	bot.addListener('-mode', function(chan, by, mode, argument, message)  {
		if(argument !== undefined && argument !== bot.nick){
			//b.log.warn('+mode', chan, by, mode, argument, message);
			bot.send('names', chan);
		}
	});

	bot.addListener('action', function(nick, chan, text, message){
	   if(nick === bot.nick && chan === config.bot_nick) return; //ignore bot messages in pms

		if(chan === bot.nick){ //this is a pm to the bot
			b.users.owner(false, function(owner_nicks){

				if(config.send_owner_bot_pms && owner_nicks.indexOf(nick) < 0 && owner_nicks !== null){ //send pms to bot to owner
					owner_nicks.forEach(function(owner_nick){
						bot.say(owner_nick, '*' + nick + text + '*');
					});
				}

				b.users.update_last_seen(nick, chan, 'pm', 'irc', text);
				b.pm.action(nick, text);
			});
		} else { //this is a message in a chan

			b.users.update_last_seen(nick, chan, 'speak', 'irc', text);
			b.channels[chan].action(nick, text);
		}

	});

	bot.addListener('message', function(nick, chan, text, message) {
		if(nick === bot.nick && chan === bot.nick) return; //ignore bot messages in pms

		if(chan === bot.nick){ //this is a pm to the bot
			b.users.owner(false, function(owner_nicks){
				b.log.debug('owner_nicks', owner_nicks);
				if(owner_nicks !== null && config.send_owner_bot_pms && owner_nicks.indexOf(nick) < 0 && owner_nicks !== null){ //send pms to bot to owner
					owner_nicks.forEach(function(owner_nick){
						bot.say(owner_nick, nick + ': ' + text);
					});
				}

				b.users.update_last_seen(nick, chan, 'pm', 'irc', text);
				b.pm.message(nick, text);
			});
		} else { //this is a message in a chan
			b.users.update_last_seen(nick, chan, 'speak', 'irc', text);
			b.channels[chan].message(nick, text);
		}
	});
}

function init_plugins(complete){
	var error = function(err){
		b.log.error('Error getting plugins', err);
	}

	config  = merge.all([config_default, config_custom],
		{ arrayMerge: function(destArr, srcArr, options){
			return srcArr;
		}}
	);

	//rename weather API keys, delete this eventually
	if(config.API.weather){
		config.API.wunderground = config.API.weather;
	}

	b.log.setLevel(config.debug_level);
	b.log.info('*** Reversing polarity on plugins array ***');
	b.t = new Theme(config.chan_default.theme, config.chan_default.disable_colors);
	b.cmds = new CMDS(complete);
}

function get_date(){
	//create date for logs
	var today = new dateWithOffset(0);
	var month = today.getUTCMonth() + 1; //months from 1-12
	var day = today.getUTCDate();
	var year = today.getUTCFullYear();
	return year + '_' + (month < 10 ? '0' + month : month) + '_' + (day < 10 ? '0' + day : day);
}
