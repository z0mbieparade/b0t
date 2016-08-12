#!/usr/bin/env node

//require ALL OF THE THINGS
var config   = require('./config.json'),
    pkg      = require('./package.json'),
    ball     = require(__dirname + '/inc/8ball.js'),
    CMD      = require(__dirname + '/inc/./commands.js'),
    commands = CMD.commands,
    respond  = CMD.respond,
    mLog4js  = require('log4js'),
    irc      = require('irc'),
    c        = require('irc-colors'),
    flatfile = require('flat-file-db'),
    db       = flatfile(__dirname + '/db.db'),
    urban    = require('urban'),
    request  = require('request'),
    Entities = require("html-entities").AllHtmlEntities,
    TVMaze   = require(__dirname + '/inc/tvmaze.js').TVM,
    stock    = require(__dirname + '/inc/stock.js'),
    tvm      = new TVMaze();

//start logs
mLog4js.loadAppender('file');
mLog4js.addAppender(mLog4js.appenders.file(__dirname + '/logs/' + config.bot_nick + '.log'));
if (config.debug) { mLog4js.replaceConsole(); }
global.log = mLog4js.getLogger('logfile');
log.setLevel('ALL');
log.debug("------------------------------------------------------------");
log.debug("Initializing...");
 
//only add these things if user has an API key
if(config.API.LastFM && config.API.LastFM.api_key !== '') {
    var lastFM = require(__dirname + '/inc/lastfm.js').LFM,
        lfm = new lastFM();
}
if(config.API.YouTube && config.API.YouTube.api_key !== ''){
    var yt_search = require('youtube-search'),
        yt_opts = {
            maxResults: 1,
            key: config.API.YouTube.api_key
        };
} else { //disable yt command, doesn't work manually since yt is under lastfm
    commands.LastFM.yt.disabled = true;
}
if(config.API.TraktTV && config.API.TraktTV.api_key !== '') {
    var traktTV = require(__dirname + '/inc/trakt.js').TTV,
        ttv = new traktTV();
}
if(config.API.Weather && config.API.Weather.api_key !== '') {
    var Weather = require(__dirname + '/inc/weather.js').WU,
        wu = new Weather();
}
if(config.API.UNTAPPD.api_key !== '') {
    var m_UNTAPPD = require(__dirname + '/inc/untappd.js').UTPD,
        m_untappd = new m_UNTAPPD();
}

var bot = new irc.Client(config.network_name, config.bot_nick, {
    debug: true,
    channels: config.channels
});

db.on('open', function() {
    log.debug('DB Loaded');
});

var names = {}; // { channel : { nick: rank }}

bot.addListener('error', function(message) {
    log.error('ERROR: %s: %s', message.command, message.args.join(' '));
});

bot.addListener('registered', function(message) {
    if(config.reg_password !== '') bot.say('NickServ', 'identify ' + config.reg_password);
    if(config.op_password !== '') bot.send('oper', config.bot_nick, config.op_password);
});

bot.addListener('join', function(chan, nick, message) {
    log.debug('JOIN', chan, nick);
    if (nick === config.bot_nick) {
        bot.say(chan, respond.enter_room());
        bot.send('samode', chan, '+a', config.bot_nick);
    }
    bot.send('names', chan);
});

bot.addListener('names', function(chan, nicks) {
    names[chan] = nicks;

    for(var nick in nicks){
        if (nick === config.owner && nicks[nick] !== '~') {
            bot.send('samode', chan, '+q', config.owner);
        } else if(nicks[nick] === ''){
            if(config.voice_users_on_join) bot.send('samode', chan, '+v', nick);
        }
    }
});

bot.addListener('+mode', function(chan, by, mode, argument, message)  {
    bot.send('names', chan);
});
bot.addListener('+mode', function(chan, by, mode, argument, message)  {
    bot.send('names', chan);
});

var get_url = function(url, nick, type, callback){
    request(url, function (error, response, body) {
        //Check for error
        if(error){
            return log.error('Error:', error);
        }

        //Check for right status code
        if(response.statusCode !== 200){
            return log.error('Invalid Status Code Returned:', response.statusCode);
        }

        if(type === 'json') callback(JSON.parse(body));

        if(type === 'sup') {

            var titleRegex = new RegExp("<title>([^<]+)(</title>)", "im");
            var match = body.match(titleRegex);

            // fill titleTag if there is data, otherwise leave it blank
            var titleTag = "";
            if(match && match[0]) {
                titleTag = match[0].replace(/(<\/?title>|\r|\n)/ig, "");
            }
            // if we came out of that with a title tag, say it in the channel
            if(titleTag.length > 0) {
                // change any html entities to their corresponding characters
                var entities = new Entities();
                titleTag = entities.decode(titleTag);

                // limit title to 140 characters
                titleTag = titleTag.substr(0, 140);

                // set up the message and then say it in the channel
                callback(c.underline(titleTag));
            }
        }
    });
}

/* data = {
    label: 'name name',
    cat: 'Command Category',
    col: 'db_col_name'
} */
var get_user_data = function(chan, nick, data, callback) {
    var user_data = db.get(nick);
    if(user_data && user_data[data.col] && user_data[data.col] !== ''){
        callback(user_data[data.col]);
    } else {
        bot.say(chan, respond.not_registered(data));
    }
}

/* data = {
    label: 'name name',
    col: 'db_col_name'
} */
var get_all_users_in_chan_data = function(chan, nick, data, callback) {
    var rows = {},
        count = 0;

    if(!names[chan]){
        bot.say(chan, respond.no_users_registered(data));
    }

    Object.keys(names[chan]).forEach(function(key) {
        var user_data = db.get(key);
        if(user_data && user_data[data.col] && user_data[data.col] !== '')
        {
            rows[key] = user_data[data.col];
            count++;
        }
    });

    if (count === 0) {
        bot.say(chan, respond.no_users_registered(data));
    } else {
        callback(rows);
    }
}

/* data = {
    col: 'db_col_name',
    data: 'data to update col to'
} */
var update_user = function(chan, nick, data, callback) {
    var user_data = db.get(nick) || {};
    user_data[data.col] = data.data;

    log.debug(nick, user_data);

    db.put(nick, user_data, function() {
        log.debug('Updated');
        callback({irc_nick: nick, label: data.col});
    });
}

var verify_command = function(chan, nick, command, command_args, callback) {
    var command_data = null;
    var command_category = null;
    for(var category in commands) {
        for(var cmd in commands[category]) {
            if(cmd === command){
                command_data = commands[category][cmd];
                command_category = category;
            }
        }
    }

    //if not exists, return
    if(!command_data) {
        log.error('No command with that name in commands object');
        //bot.say(chan, respond.err({'err': 'No command with that name in commands object'}));
        return;
    }

    //if disabled, return
    if(command_data.disabled){
        log.error('Command disabled');
        return;
    }

    //if API key required but not in config, return
    if(config.API[command_category] && config.API[command_category].api_key === ''){
        log.error('No API key');
        return;
    }

    //if this is say, a pm, and there are no user perms, look for the user in another chan
    //and choose the highest permission. If they aren't in one, just asume they're unvoiced with
    //lowest permissions.
    if(!names[chan] || !names[chan][nick]){
        names[chan] = names[chan] || {};
        names[chan][nick] = "";
        for(var c in names){
            for(var n in names[c]){
                if( n === nick && 
                    config.permissions.indexOf(names[c][n]) > 
                    config.permissions.indexOf(names[chan][nick])) names[chan][nick] = names[c][n];
            }
        }
    }

    //if bad permissions, return
    if(command_data.perm){
        var nick_perm = config.permissions.indexOf(names[chan][nick]);
        var cmd_perm = config.permissions.indexOf(command_data.perm);

        if(nick_perm < cmd_perm)
        {
            bot.notice(nick, respond.err({'err': 'You do not have permission to use this command!'}));
            return;
        }
    }

    var command_args = command_args.filter(function(value) {
      var val = value.replace(/^\s+|\s+$/g, '');
      return val !== '';
    })

    var syntax = config.command_prefix + command + ' <' + command_data.commands.join('> <') + '>';

    var required_commands = 0;
    for(var i = 0; i < command_data.commands.length; i++) {
        if (command_data.commands[i].indexOf('*') !== 0) required_commands++;
    }

    if (command_args.length < required_commands) {
        var data = {
            syntax: syntax,
            action: command_data.action
        }
        bot.notice(nick, respond.syntax(data));
    } else {
        callback(command_data, command_args);
    }
};

last_np = '';
function youtube_search_url_for_users(users, bot, chan, nick) {
    console.log("yt search for ", users);
    users.forEach( user => {

                    get_user_data(chan, user, {
                        label: 'last.fm username',
                        cat: 'LastFM',
                        col: 'lastfm'
                    }, function(lastfm_un){
                        lfm.getRecent(user, lastfm_un, false, function(d) {
                            if(d && d.err){
                                bot.notice(nick, command_data.format(d))
                            } else {
                                youtube_search_url_for_last_np(bot, chan, `${d.artist} - ${d.name}`);
                            }
                        });
                    });
    });
}

function youtube_search_url_for_last_np(bot, chan, last_np) {
    console.log("yt search for ", last_np);
    if(last_np!=='') {
        bot.say(chan, 'https://www.youtube.com/results?search_query=' + encodeURIComponent(last_np));
    }
}

bot.addListener('message', function(nick, chan, text, message) {
    if(nick === config.bot_nick && chan === config.bot_nick) return;
    //var spam_chan = config.less_chan_spam || message.args[0] === config.bot_nick ? nick : chan;
    var chan = message.args[0] === config.bot_nick ? nick : chan;

    var links = text.match(/(\b(https?|http):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig);
    if(links && links.length && links.length > 0 && config.parse_links)
    {
        for(var i = 0; i < links.length; i++) {
            get_url(links[i], nick, 'sup', function(data){
                bot.say(chan, data);
            }); 
        }
    } else if (text.indexOf(config.bot_nick) === 0) {
        var command_args_org = text.split(' ');
        command_args_org.shift();

        bot.say(chan, respond.say_my_name(command_args_org));
    } else if (text.indexOf(config.command_prefix) === 0) {
        var command_args_org = text.split(' ');
        var command = command_args_org[0].slice(1);
        command_args_org.shift();

        log.debug('CMD', command, command_args_org);

        verify_command(chan, nick, command, command_args_org, function(command_data, command_args){
            if(command_args[0] === 'help')
            {
                bot.notice(nick, respond.cmd_help(command));
                return;
            }

            //OTHER
            switch (command) {
                case '8ball':
                    bot.say(chan, ball.shake());
                    break;
                case 'commands':
                    var cmd_arr = [];
                    for(var category in commands) {
                        for(var cmd in commands[category]) {
                            if( cmd === 'commands' ||
                                commands[category][cmd].disabled ||
                                (config.API[category] && config.API[category].api_key === '') ||
                                (commands[category][cmd].perm && config.permissions.indexOf(names[chan][nick]) < config.permissions.indexOf(commands[category][cmd].perm)))
                                continue;

                            if(command_args[0] === '-list') {
                                bot.notice(nick, respond.cmd_help(cmd));
                            } else {
                                cmd_arr.push(config.command_prefix + cmd)
                            }
                        }
                    }

                    if(command_args[0] !== '-list'){
                        bot.notice(nick, command_data.format({commands: cmd_arr}));
                    }
                    
                    break;
                case 'set':
                    bot.send('topic', chan, command_args_org.join(' '));
                    bot.notice(nick, command_data.format());
                    break;
                case 'reg':
                    update_user(chan, command_args[1], {
                            label: command_args[0],
                            col: command_args[0],
                            data: command_args[2]
                    }, function(data){
                        bot.notice(nick, command_data.format(data));
                    });
                    break;
                case 'unreg':
                    update_user(chan, command_args[1], {
                            label: command_args[0],
                            col: command_args[0],
                            data: ''
                    }, function(data){
                        bot.notice(nick, command_data.format(data));
                    });
                    break;
                case 'updates':
                    var data = get_url(
                        'https://raw.githubusercontent.com/z0mbieparade/b0t/master/package.json', 
			             nick,
                        'json',
                        function(data){
                           bot.notice(nick, command_data.format(data.version));
                       });
                    break;
                //LAST.FM
                case 'np':
                    get_user_data(chan, nick, {
                        label: 'last.fm username',
                        cat: 'LastFM',
                        col: 'lastfm'
                    }, function(lastfm_un){
                        lfm.getRecent(nick, lastfm_un, false, function(d) {
                            if(d && d.err){
                                bot.notice(nick, command_data.format(d))
                            } else {
                                bot.say(chan, command_data.format(d));
                                last_np = `${d.artist} - ${d.name}`;
                                console.log("set last_np to ", last_np);
                            }
                        });
                    });
                    break;
                case 'yt':
                    get_user_data(chan, nick, {
                        label: 'last.fm username',
                        cat: 'LastFM',
                        col: 'lastfm'
                    }, function(lastfm_un){
                        lfm.getRecent(nick, lastfm_un, false, function(data) {
                            var title = [];
                            if(data.artist !== '') title.push(data.artist);
                            if(data.name !== '') title.push(data.name);
                            yt_search(title.join(' '), yt_opts, function(err, results) {
                                if(err){
                                    log.error(err);
                                    bot.notice(config.owner, err);
                                    bot.notice(nick, command_data.format({'err': 'an error has occured'}))
                                    return;
                                }

                             if(!results || results.length === 0){
                                bot.notice(nick, command_data.format({'err': 'no youtube video found for last played song'}))
                                return;
                             }

                              var d = data;
                              for(var key in results[0]){
                                d[key] = results[0][key];
                              }

                              bot.say(chan, command_data.format(d));
                            });
                        });
                    });
                    break;
                case 'yts':
                    if(command_args.length > 0){
                        console.log("command_args.length", command_args.length, command_args);
                        youtube_search_url_for_users(command_args, bot, chan, nick);
                        break;
                    }
                    youtube_search_url_for_last_np(bot, chan, last_np);
                    break;
                case 'wp':
                    get_all_users_in_chan_data(chan, nick, {
                        label: 'last.fm',
                        col: 'lastfm'
                    }, function(data)
                    {
                        var user_dups = {};
                        for(var irc_un in data){
                            var lastfm_un = data[irc_un];

                            if(user_dups[lastfm_un]){
                                user_dups[lastfm_un].push(irc_un);
                            } else {
                                user_dups[lastfm_un] = [irc_un];
                            }
                        }

                        for(var lastfm_un in user_dups){
                            lfm.getRecent(user_dups[lastfm_un].join('|'), lastfm_un, true, function(d){
                                if(d && d.err){
                                    bot.notice(nick, command_data.format(d))
                                } else {
                                    bot.say(chan, command_data.format(d));
                                }
                            });
                        }
                    });
                    break;
                case 'sa':
                    lfm.getSimilarArtists(command_args.join(' '), function(d){
                        if(d && d.err){
                            bot.notice(nick, command_data.format(d))
                        } else {
                            bot.say(chan, command_data.format(d));
                        }
                    });
                    break;
                case 'bio':
                    lfm.getArtistInfo(command_args.join(' '), function(d){
                        if(d && d.err){
                            bot.notice(nick, command_data.format(d))
                        } else {
                            bot.say(chan, command_data.format(d));
                        }
                    });
                    break;
                case 'lastfm':
                    update_user(chan, nick, {
                            label: 'last.fm username',
                            col: 'lastfm',
                            data: command_args[0]
                    }, function(d){
                        bot.notice(nick, command_data.format(d));
                    });
                    break;

                //TRAKT
                case 'nw':
                    get_user_data(chan, nick, {
                        label: 'trakt.tv username',
                        cat: 'TraktTV',
                        col: 'trakt'
                    }, function(trakt_un){
                        ttv.getRecent(nick, trakt_un, function(d) {
                            if(d && d.err){
                                bot.notice(nick, command_data.format(d))
                            } else {
                                bot.say(chan, command_data.format(d));
                            }
                        });
                    });
                    break;
                case 'ww':
                    get_all_users_in_chan_data(chan, nick, {
                        label: 'trakt.tv',
                        col: 'trakt'
                    }, function(data){
                        log.debug(data);
                        var user_dups = {};
                        for(var irc_un in data){
                            var trakt_un = data[irc_un];

                            if(user_dups[trakt_un]){
                                user_dups[trakt_un].push(irc_un);
                            } else {
                                user_dups[trakt_un] = [irc_un];
                            }
                        }

                        for(var trakt_un in user_dups){
                            ttv.getRecent(user_dups[trakt_un].join('|'), trakt_un, function(d) {
                                if(d && d.err){
                                    bot.notice(nick, command_data.format(d))
                                } else {
                                    bot.say(chan, command_data.format(d));
                                }
                            });
                        }
                    });
                    break;
                case 'trend':
                    ttv.getTrending(command_args[0], function(d) {
                        if(d && d.err){
                            bot.notice(nick, command_data.format(d))
                        } else {
                            bot.say(chan, command_data.format(d));
                        }
                    });
                    break;
                case 'trakt':
                    update_user(chan, nick, {
                            label: 'trakt.tv username',
                            col: 'trakt',
                            data: command_args[0]
                    }, function(d){
                        if(d && d.err){
                            bot.notice(nick, command_data.format(d))
                        } else {
                            bot.say(chan, command_data.format(d));
                        }
                    });
                    break;

                //UNTAPPD
                case 'ut':
                    get_user_data(chan, nick, {
                        label: 'untappd username',
                        cat: 'UNTAPPD',
                        col: 'untappd'
                    }, function(untappd_un){
                        m_untappd.getBeer(nick, untappd_un, false, function(d) {
                            if(d && d.err){
                                bot.notice(nick, command_data.format(d))
                            } else {
                                bot.say(chan, command_data.format(d));
                            }
                        });
                    });
                    break;
                case 'wu':
                    get_all_users_in_chan_data(chan, nick, {
                        label: 'untappd',
                        col: 'untappd'
                    }, function(data){
                        var user_dups = {};
                        for(var irc_un in data){
                            var untappd_un = data[irc_un];

                            if(user_dups[untappd_un]){
                                user_dups[untappd_un].push(irc_un);
                            } else {
                                user_dups[untappd_un] = [irc_un];
                            }
                        }

                        for(var untappd_un in user_dups){
                            m_untappd.getBeer(irc_un, user_dups[untappd_un].join('|'), true, function(d) {
                                if(d && d.err){
                                    bot.notice(nick, command_data.format(d))
                                } else {
                                    bot.say(chan, command_data.format(d));
                                }
                            });
                        }
                    });
                    break;
                case 'untappd':
                    update_user(chan, nick, {
                            label: 'untappd username',
                            col: 'untappd',
                            data: command_args[0]
                    }, function(d){
                        bot.notice(nick, command_data.format(d));
                    });
                    break;

                //WEATHER
                case 'w':
                    if(command_args.length === 0) {
                        get_user_data(chan, nick, {
                            label: 'location',
                            cat: 'Weather',
                            col: 'location'
                        }, function(user_data){
                            wu.get_weather(user_data, false, function(d){
                                if(d && d.err){
                                    bot.notice(nick, command_data.format(d))
                                } else {
                                    bot.say(chan, command_data.format(d));
                                }
                            });
                        });
                    } else {
                        wu.get_weather(command_args.join(' '), nick, function(d){
                            if(d && d.err){
                                bot.notice(nick, command_data.format(d))
                            } else {
                                bot.say(chan, command_data.format(d));
                            }
                        });
                    }
                    break;
                case 'location':
                    wu.set_location(command_args.join(' '), nick, function(d){
                        update_user(chan, nick, {
                            label: 'location',
                            col: 'location',
                            data: d.location
                        }, function(){
                            bot.notice(nick, command_data.format(d));
                        });
                    });
                    break;
                case 'stock':
                    stock.get_quote(command_args, function(d) {
                        if(d && d.err) {
                            bot.notice(nick, command_data.format(d));
                        } else {
                            bot.say(chan, stock.format(d));
                        }
                    });
                    break;
		      //TVMAZE
                case 'tvmaze':
                    var search = command_args.join('%20');
                    tvm.getNextAirdate(nick, search, function(d) {
                        if(d && d.err){
                            bot.notice(nick, command_data.format(d))
                        } else {
                            bot.say(chan, command_data.format(d));
                        }
                    });
                    break;

                //URBAN DICTIONARY
                case 'ud':
                    var ud = urban(command_args.join(' '));
                    ud.first(function(json) {
                        if(json){
                            var d = {
                                term: command_args.join(' '),
                                definition: json.definition,
                                example: json.example
                            };

                            bot.say(chan, command_data.format(d));
                        } else {
                             bot.notice(nick, command_data.format({'err': 'Nothing found'}));
                        }
                    });
                    break;

                default:
                    break;
            }
        });
    }
});
