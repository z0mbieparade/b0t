#!/usr/bin/env node

//require ALL OF THE THINGS
var config   = require('./config.json'),
    CMD      = require(config.path + 'inc/./commands.js'),
    commands = CMD.commands,
    respond  = CMD.respond,
    //log    = require('log-simple')(null, {debug: config.debug}),
    mLog4js  = require('log4js'),
    irc      = require('irc'),
    c        = require('irc-colors'),
    flatfile = require('flat-file-db'),
    db       = flatfile(config.path + 'db.db'),
    urban    = require('urban');

mLog4js.loadAppender('file');
mLog4js.addAppender(mLog4js.appenders.file(config.path + 'logs/' + config.bot_nick + '.log'));
if (config.debug) { mLog4js.replaceConsole(); }
global.log = mLog4js.getLogger('logfile');
log.setLevel('ALL');
log.debug("------------------------------------------------------------");
log.debug("Initializing...");
 
//only add these things if user has an API key
if(config.API.LastFM.api_key !== '') {
    var lastFM = require(config.path + 'inc/lastfm.js').LFM,
        lfm = new lastFM();
}
if(config.API.TraktTV.api_key !== '') {
    var traktTV = require(config.path + 'inc/trakt.js').TTV,
        ttv = new traktTV();
}
if(config.API.UNTAPPD.api_key !== '') {
    var m_UNTAPPD = require(config.path + 'inc/untappd.js').UTPD,
        m_untappd = new m_UNTAPPD();
}
if(config.API.Weather.api_key !== '') {
    var wunderbar = require('wunderbar'),
        weather = new wunderbar(config.API.Weather.api_key);
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
    bot.say('NickServ', 'identify ' + config.reg_password);
    bot.send('oper', config.bot_nick, config.op_password);
});

bot.addListener('join', function(chan, nick, message) {
    log.debug('JOIN', chan, nick);
    if (nick === config.bot_nick) {
        bot.say(chan, respond.enter_room());
        bot.send('samode', chan, '+a', config.bot_nick);
    } else if (nick === config.owner) {
        bot.send('samode', chan, '+q', config.owner);
    } else {
        //bot.send('samode', chan, '+v', nick);
    }

    bot.send('names', chan);
});

bot.addListener('names', function(chan, nicks) {
    names[chan] = nicks;
});

bot.addListener('+mode', function(chan, by, mode, argument, message)  {
    bot.send('names', chan);
});
bot.addListener('+mode', function(chan, by, mode, argument, message)  {
    bot.send('names', chan);
});


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

    //if bad permissions, return
    if(command_data.perm)
    {
        var nick_perm = config.permissions.indexOf(names[chan][nick]);
        var cmd_perm = config.permissions.indexOf(command_data.perm);

        if(nick_perm < cmd_perm)
        {
            bot.say(chan, respond.err({'err': 'You do not have permission to use this command!'}));
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
        bot.say(chan, respond.syntax(data));
    } else {
        callback(command_data, command_args);
    }
};

var get_weather = function(chan, loc, set_loc, nick, callback) {
    weather.conditions(loc, function(err, res) {
        if(err) {
            log.error(err);
            bot.say(chan, 'error');
        } else {
            if(res.response.error)
            {
                bot.say(chan, res.response.error.description);
            }
            else if(res.current_observation)
            {
                var say_weather = function()
                {
                    log.debug(res.current_observation);

                    var data = {
                        irc_nick: nick,
                        location: res.current_observation.display_location.full,
                        weath: res.current_observation.weather,
                        temp: res.current_observation.temperature_string,
                        humid: res.current_observation.relative_humidity,
                        icon: res.current_observation.icon
                    }

                    callback(data);
                }

                if(set_loc)
                {
                    var loc_set = res.current_observation.display_location.zip !== '00000' ? 
                        res.current_observation.display_location.zip : res.current_observation.display_location.full;
                    
                    update_user(chan, nick, {
                        label: 'location',
                        col: 'location',
                        data: loc_set
                    }, function(){
                        say_weather();
                    });

                } else {
                    say_weather()
                }
            } else if (res.response.results) {
                bot.say(chan, respond.err({'err': 'There are ' + res.response.results.length + ' locations with that name. Please be more specific.'}));
            }
        }
    });
}

bot.addListener('message', function(nick, chan, text, message) {

    if (text.indexOf(config.command_prefix) === 0) {
        var command_args_org = text.split(' ');
        var command = command_args_org[0].slice(1);
        command_args_org.shift();

        log.debug('CMD', command, command_args_org);

        verify_command(chan, nick, command, command_args_org, function(command_data, command_args){
            if(command_args[0] === 'help')
            {
                var syntax = config.command_prefix + command;
                if(command_data.commands.length > 0)
                {
                    syntax += ' <' + command_data.commands.join('> <') + '>';
                }
                if (syntax.indexOf('*') > -1) syntax += ' (* commands are optional)';

                var data = {
                    usage: syntax,
                    description: command_data.action
                }

                bot.say(chan, respond.cmd_help(data));
                return;
            }

            //OTHER
            switch (command) {
                case 'commands':
                    var cmd_arr = [];
                    for(var category in commands) {
                        for(var cmd in commands[category]) {
                            if(cmd === 'commands' || 
                                commands[category][cmd].disabled ||
                                (config.API[category] && config.API[category].api_key === '')) 
                                continue;
                            cmd_arr.push(config.command_prefix + cmd)
                        }
                    }

                    var data = {
                        commands: cmd_arr
                    }

                    bot.say(chan, respond.commands(data));
                    break;
                case 'set':
                    bot.send('topic', chan, command_args_org.join(' '));
                    bot.say(chan, command_data.format());
                    break;
                case 'reg':
                    update_user(chan, command_args[1], {
                            label: command_args[0],
                            col: command_args[0],
                            data: command_args[2]
                    }, function(data){
                        bot.say(chan, command_data.format(data));
                    });
                    break;
                case 'unreg':
                    update_user(chan, command_args[1], {
                            label: command_args[0],
                            col: command_args[0],
                            data: ''
                    }, function(data){
                        bot.say(chan, command_data.format(data));
                    });
                    break;

                //LAST.FM
                case 'np':
                    get_user_data(chan, nick, {
                        label: 'last.fm username',
                        cat: 'LastFM',
                        col: 'lastfm'
                    }, function(lastfm_un){
                        var msg = lfm.getRecent(nick, lastfm_un, false, function(data) {
                            bot.say(chan, command_data.format(data));
                        });
                    });
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
                            lfm.getRecent(user_dups[lastfm_un].join('|'), lastfm_un, true, function(data){
                                bot.say(chan, command_data.format(data));
                            });
                        }
                    });
                    break;
                case 'sa':
                    lfm.getSimilarArtists(command_args.join(' '), function(data){
                        bot.say(chan, command_data.format(data));
                    });
                    break;
                case 'bio':
                    lfm.getArtistInfo(command_args.join(' '), function(data){
                        bot.say(chan, command_data.format(data));
                    });
                    break;
                case 'lastfm':
                    update_user(chan, nick, {
                            label: 'last.fm username',
                            col: 'lastfm',
                            data: command_args[0]
                    }, function(data){
                        bot.say(chan, command_data.format(data));
                    });
                    break;

                //TRAKT
                case 'nw':
                    get_user_data(chan, nick, {
                        label: 'trakt.tv username',
                        cat: 'TraktTV',
                        col: 'trakt'
                    }, function(trakt_un){
                        ttv.getRecent(nick, trakt_un, false, function(data) {
                            bot.say(chan, command_data.format(data));
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
                            ttv.getRecent(irc_un, user_dups[trakt_un].join('|'), true, function(data) {
                                bot.say(chan, command_data.format(data));
                            });
                        }
                    });
                    break;
                case 'trakt':
                    update_user(chan, nick, {
                            label: 'trakt.tv username',
                            col: 'trakt',
                            data: command_args[0]
                    }, function(data){
                        bot.say(chan, command_data.format(data));
                    });
                    break;

                //UNTAPPD
                case 'ut':
                    get_user_data(chan, nick, {
                        label: 'untappd username',
                        cat: 'UNTAPPD',
                        col: 'untappd'
                    }, function(untappd_un){
                        m_untappd.getBeer(nick, untappd_un, false, function(data) {
                            bot.say(chan, command_data.format(data));
                        });
                    });
                    break;
                case 'wu':
                    get_all_users_in_chan_data(chan, nick, {
                        label: 'untappd',
                        col: 'untappd'
                    }, function(data){
                        log.debug(data);
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
                            m_untappd.getBeer(irc_un, user_dups[untappd_un].join('|'), true, function(data) {
                                bot.say(chan, command_data.format(data));
                            });
                        }
                    });
                    break;
                case 'untappd':
                    update_user(chan, nick, {
                            label: 'untappd username',
                            col: 'untappd',
                            data: command_args[0]
                    }, function(data){
                        bot.say(chan, command_data.format(data));
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
                            get_weather(chan, user_data, false, nick, function(data){
                                bot.say(chan, command_data.format(data));
                            });
                        });
                    } else {
                        get_weather(chan, command_args.join(' '), false, nick, function(data){
                            bot.say(chan, command_data.format(data));
                        });
                    }
                    break;
                case 'location':
                    get_weather(chan, command_args.join(' '), true, nick, function(data){
                        bot.say(chan, command_data.format(data));
                    });
                    break;

                //URBAN DICTIONARY
                case 'ud':
                    var ud = urban(command_args.join(' '));
                    ud.first(function(json) {
                        if(json){
                            var data = {
                                term: command_args.join(' '),
                                definition: json.definition,
                                example: json.example
                            };

                            bot.say(chan, command_data.format(data));
                        } else {
                             bot.say(chan, command_data.format({'err': 'Nothing found'}));
                        }
                    });
                    break;

                default:
                    break;
            }
        });
    }
});
