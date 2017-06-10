#!/usr/bin/env node

//This is for testing various bot stuff, forever a WIP
//.start [id] to start tests
//.stop to stop tests
//.pause to pause tests

__botdir                = __dirname + '/..';

var irc                 = require('irc'),
	log4js              = require('log4js'),
    dateWithOffset      = require("date-with-offset"),
    config 				= {},
    b0t_config 			= {},
    test_id				= 0,
    timer;


log4js.configure({
    appenders: [
        { 
            type: 'file', 
            filename: __botdir + '/logs/te5t_' + get_date() + '.log',
            category: [ 'te5t','console' ]
        },
        {
            type: 'console'
        }
    ],
    replaceConsole: true
});

var log = log4js.getLogger('te5t');
log.setLevel('ALL');

log.info("------------------------------------------------------------");
log.info("Starting te5t");

try {
   config = require(__dirname + '/./test_config.json');
   b0t_config = require(__botdir + '/./config.json');

   log.setLevel(config.debug_level);

	var bot = new irc.Client(
	    config.network_name, 
	    config.bot_nick, 
	    config.bot_config
	);

	bot.addListener('message', function(nick, chan, text, message) {
	 	log.debug('msg', nick, chan, text);
        if(nick === bot.nick && chan === bot.nick) return;

        var args = text.split(' ');

        if(args[0] === '.start'){
        	if(args.length > 1 && isNaN(args[1]) === false && test_arr[+args[1]] !== undefined) test_id = +args[1];
        	start_timer(chan, nick);

        } else if (args[0] === '.pause') {
        	log.debug('Pausing tests', test_id);
        	clearInterval(timer);
        	test_id = test_id === 0 ? 0 : test_id - 1;

        } else if (args[0] === '.stop') {
        	log.debug('Stopping tests', test_id);
        	clearInterval(timer);
        	test_id = 0;
        }
    });


	bot.addListener('error', function(message){});

} catch (e) {
	log.error(e);
}

var test_arr = [
//Default
	{ cmd: 'commands help' },
	{ cmd: 'commands' },
	{ cmd: 'commands -list' },

	{ cmd: 'help help' },
	{ cmd: 'help' },
	{ cmd: 'help -colors' },

	{ cmd: 'set help' },
	{ cmd: 'set' },
	{ cmd: 'set testtesttest' },

	{ cmd: 'pin help' },
	{ cmd: 'pin' },
	{ cmd: 'pin 5' },

	{ cmd: 'unpin help' },
	{ cmd: 'unpin' },
	{ cmd: 'updatetopic' },

	{ cmd: 'qotd help' },
	{ cmd: 'qotd' },
	{ cmd: 'qotd 5' },
	{ cmd: 'qotd test' },

	{ cmd: 'ping help' },
	{ cmd: 'ping' },

	{ cmd: 'reg help' },
	{ cmd: 'reg' },

	{ cmd: 'unreg help' },
	{ cmd: 'unreg' },

	{ cmd: 'tell help' },
	{ cmd: 'tell' },
	{ func: function(chan, nick){
		bot.say(chan, b0t_config.command_prefix + 'tell ' + nick + ' test test test');
	}},

	{ cmd: 'speak help' },
	{ cmd: 'speak' },
	{ func: function(chan, nick){
		bot.say(chan, b0t_config.command_prefix + 'speak ' + chan + ' test test test');
	}},
	{ func: function(chan, nick){
		bot.say(chan, b0t_config.command_prefix + 'speak ' + nick + ' test test test');
	}},

	{ cmd: 'tag help' },
	{ cmd: 'tag' },

	{ cmd: 'tag -delete 1' },
	{ cmd: 'tag -delete 1' },

	{ cmd: 'tag &limetest tag' },
	{ cmd: 'tag -list' },
	{ cmd: 'tag -edit 1 &redtest tag update' },
	{ cmd: 'tag -delete 1' },

	{ cmd: 'updates help' },
	{ cmd: 'updates' },

	{ cmd: 'bug help' },
	{ cmd: 'bug' },

	{ cmd: 'request help' },
	{ cmd: 'request' },

	{ cmd: 'next help' },
	{ cmd: 'next' },

	{ cmd: 'list help' },
	{ cmd: 'list' },

	{ cmd: 'whois help' },
	{ cmd: 'whois' },

	{ cmd: 'seen help' },
	{ cmd: 'seen' },
	{ func: function(chan, nick){
		bot.say(chan, b0t_config.command_prefix + 'seen ' + nick);
	}},

	{ cmd: 'nicks help' },
	{ cmd: 'nicks' },

//GetInfo
	{ cmd: 'ud help' },
	{ cmd: 'ud' },
	{ cmd: 'ud gold' },
	{ cmd: 'ud (94./9(#*$#![]' },

	{ cmd: 'd help' },
	{ cmd: 'd' },
	{ cmd: 'd gold' },

	{ cmd: 'wiki help' },
	{ cmd: 'wiki' },
	{ cmd: 'wiki gold' },

	{ cmd: 'next' },
	{ cmd: 'next 10' },
	{ cmd: 'next 10 |' },
	{ cmd: 'next |' },

	{ cmd: 'wiki (94./9(#*$#![]' },

	{ cmd: 'wr help' },
	{ cmd: 'wr' },
	{ cmd: 'wr who\'s your daddy?' },
	{ cmd: 'wr (94./9(#*$#![]' },

	{ cmd: 'stock help' },
	{ cmd: 'stock' },
	{ cmd: 'stock AAPL' },
	{ cmd: 'stock (94./9(#*$#![]' },

	{ cmd: 'yts help' },
	{ cmd: 'yts' },
	{ cmd: 'yts test test' },
	{ cmd: 'yts (94./9(#*$#![]  943lFDISUFKfldl)' },

//LastFM
	{ cmd: 'np help' },
	{ cmd: 'np' },
	{ func: function(chan, nick){
		bot.say(chan, b0t_config.command_prefix + 'np ' + nick);
	}},

	{ cmd: 'lastfm help' },
	{ cmd: 'lastfm' },
	{ cmd: 'lastfm z0mbieparade' },

	{ cmd: 'np' },
	{ cmd: 'np (94./9(#*$#![]  943lFDISUFKfldl)' },

	{ cmd: 'yt help' },
	{ cmd: 'yt' },
	{ func: function(chan, nick){
		bot.say(chan, b0t_config.command_prefix + 'yt ' + nick);
	}},
	{ cmd: 'yt (94./9(#*$#![]  943lFDISUFKfldl)' },

	{ cmd: 'wp help' },
	{ cmd: 'wp' },

	{ cmd: 'sa help' },
	{ cmd: 'sa' },
	{ cmd: 'sa die antwoord' },
	{ cmd: 'sa (94./9(#*$#![]  943lFDISUFKfldl)' },

	{ cmd: 'bio help' },
	{ cmd: 'bio' },
	{ cmd: 'bio die antwoord' },
	{ cmd: 'bio (94./9(#*$#![]  943lFDISUFKfldl)' },

//Weather
	{ cmd: 'w help' },
	{ cmd: 'w' },
	{ cmd: 'w ann arbor, MI' },
	{ cmd: 'w L5M 2K5' },
	{ cmd: 'w L5M2K5' },
	{ cmd: 'w berlin, DE' },

	{ cmd: 'location help' },
	{ cmd: 'location' },
	{ cmd: 'location denver, co' },

	{ cmd: 'w' },

	{ cmd: 'f help' },
	{ cmd: 'f' },
	{ cmd: 'f ann arbor, MI -long' },
	{ cmd: 'f -long hell, MI' },
	{ cmd: 'f L5M 2K5' },
	{ cmd: 'f L5M2K5' },

	{ cmd: '8ball help' },
	{ cmd: '8ball' },
	{ cmd: '8ball some dumb thing' },

	{ cmd: 'potd help' },
	{ cmd: 'potd' },

	{ cmd: 'oontz help' },
	{ cmd: 'oontz' },

	{ cmd: 'insult help' },
	{ cmd: 'insult' },
	{ cmd: 'insult your face' },
	{ cmd: 'insult -add [some dumb insult]' },
	{ cmd: 'insult -list' },
	{ cmd: 'insult -edit 1 [some dumb insult 2]' },
	{ cmd: 'insult -delete AAA' },
	{ cmd: 'insult -delete 1' },

//Trakt
	{ cmd: 'nw help' },
	{ cmd: 'nw' },
	{ func: function(chan, nick){
		bot.say(chan, b0t_config.command_prefix + 'nw ' + nick);
	}},

	{ cmd: 'trakt help' },
	{ cmd: 'trakt' },
	{ cmd: 'trakt z0mbieparade' },

	{ cmd: 'nw' },
	{ cmd: 'nw (94./9(#*$#![]  943lFDISUFKfldl)' },

	{ cmd: 'ww help' },
	{ cmd: 'ww' },

	{ cmd: 'show help' },
	{ cmd: 'show' },
	{ cmd: 'show (94./9(#*$#![]  943lFDISUFKfldl)' },
	{ cmd: 'show game of thrones' },

	{ cmd: 'movie help' },
	{ cmd: 'movie' },
	{ cmd: 'movie (94./9(#*$#![]  943lFDISUFKfldl)' },
	{ cmd: 'movie fight club' },

	{ cmd: 'trend help' },
	{ cmd: 'trend' },
	{ cmd: 'trend -(94./9(#*$#![]  943lFDISUFKfldl)' },
	{ cmd: 'trend -movies' },
	{ cmd: 'trend -shows' },

//Untappd
	{ cmd: 'ut help' },
	{ cmd: 'ut' },
	{ func: function(chan, nick){
		bot.say(chan, b0t_config.command_prefix + 'ut ' + nick);
	}},

	{ cmd: 'untappd help' },
	{ cmd: 'untappd' },
	{ cmd: 'untappd z0mbieparade' },

	{ cmd: 'ut' },
	{ cmd: 'ut (94./9(#*$#![]  943lFDISUFKfldl)' },

	{ cmd: 'wt help' },
	{ cmd: 'wt' },

];

function start_timer(chan, nick){
	log.debug('Starting tests', test_id);
	clearInterval(timer);
	timer = setInterval(function(){ 
		if(test_arr[test_id] !== undefined){
			log.debug('** running test_id', test_id);
			if(test_arr[test_id].cmd){
				bot.say(chan, b0t_config.command_prefix + test_arr[test_id].cmd);
			}
			if(test_arr[test_id].func){
    			test_arr[test_id].func(chan, nick);
    		}
    		test_id++;
		} else {
			log.debug('>> clearing tests');
			test_id = 0;
			clearInterval(timer);
		}
	}, 6000);
}


function get_date(){
    //create date for logs
    var today = new dateWithOffset(0);
    var month = today.getUTCMonth() + 1; //months from 1-12
    var day = today.getUTCDate();
    var year = today.getUTCFullYear();
    return year + '_' + (month < 10 ? '0' + month : month) + '_' + (day < 10 ? '0' + day : day);
}