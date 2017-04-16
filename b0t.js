#!/usr/bin/env node

__botdir                = __dirname;

var irc                 = require('irc'),
    fs                  = require('fs'),
    JsonDB              = require('node-json-db'),
    merge               = require('merge'),
    Use                 = require(__dirname + '/lib/useful.js'),
    dateWithOffset      = require("date-with-offset"),

    config_default      = require(__dirname + '/config/./config_default.json'),
    config_custom       = {},
    part_queue          = {};

    c                   = require('irc-colors'),
    Theme               = require(__dirname + '/lib/colortheme.js'),
    b                   = { is_op: false, log_date: get_date(), channels: {}, cbs: {} },
    Say                 = require(__dirname + '/lib/say.js');

    commands            = {},
    command_by_plugin   = {},
    pkg                 = require(__dirname + '/./package.json'),

    log4js              = require('log4js');
    log4js.configure({
        appenders: [
            { 
                type: 'file', 
                filename: __dirname + '/logs/b0t_' + b.log_date + '.log',
                category: [ 'b0t','console' ]
            },
            {
                type: 'console'
            }
        ],
        replaceConsole: true
    });

    b.log = log4js.getLogger('b0t');
    b.log.setLevel('ALL');

    b.log.info("------------------------------------------------------------");
    b.log.info("Initializing the quantum b0t clutch assembly...");

    x                   = new Use();

try {
   config_custom = require(__dirname + '/./config.json');
   init_plugins(init_bot);
} catch (e) {
    if(e.message.match(/^Cannot find module (.*?)config.json/i) !== null){
        //if there's no config.json, run command line basic config
        b.log.warn('No config.json file, starting config');
        var prompt       = require('prompt'),
            config_setup = require(__dirname + '/config/./config_setup.json'),
            config_db    = new JsonDB('config.json', true, true);

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
                b.log.error(e);
            }
        });

        function onErr(err) {
            b.log.error(err);
            return 1;
        }
    } else {
        b.log.error(e);
    }
}
    
function init_bot(){
    //load db
    var DB  = require(__dirname + '/lib/db.js');
    db      = new DB();

    x.init_config();

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

        //check for part_queue entry, remove if exists
        if(part_queue[chan] && part_queue[chan].indexOf(nick) > -1){
            delete part_queue[chan].splice(part_queue[chan].indexOf(nick), 1);
        }

        //bot joins channel
        if(nick === config.bot_nick){
            b.channels[chan] = b.channels[chan] || new CHAN(chan);
            b.channels[chan].init_chan();
        } else { //user joins channel
            var nicks = [];
            nicks[nick] = '';
            if(b.channels[chan]){
                b.channels[chan].update_nick_list(nicks, true);
            } else {
                b.channels[chan] = b.channels[chan] || new CHAN(chan);
                b.channels[chan].init_chan();
                b.channels[chan].update_nick_list(nicks, true);
            }

            b.channels[chan].users[nick].say_tagline();
            x.update_last_seen(nick, chan, 'join');
        }
    });

    bot.addListener('registered', function(message) {
        b.log.trace(message);
        b.log.info('b0t registered on network:', message.args[1]);
        if(config.ircop_password){
            b.is_op = true;
            bot.send('oper', config.bot_nick, config.ircop_password);
        }
        if(config.nickserv_password) bot.say('NickServ', 'identify ' + config.nickserv_password);
    });

    //we use raw messages instead
    bot.addListener('error', function(message){});
    bot.addListener('netError', function(exception) {
        b.log.error(exception);
    });
    bot.addListener('raw', function(message){
        var ignore = ['PING','MODE','JOIN','NOTICE','PRIVMSG','001','002','003','004','005','042','422','251','252','254',
                      '255','265','266','396','311','378','313','312','317','318','319','353','366','329','332','333',
                      '372','373','375','376','379'];
        if(ignore.indexOf(message.rawCommand) > -1) return;

        switch(message.rawCommand){
            case 'PART': //when a user leaves, we want to add them to the queue to be deleted on next PONG
            case 'KICK':
            case 'KILL':
            case 'QUIT':
                var nick = message.args[1] ? message.args[1] : message.nick;
                var chan = message.args[0];
                part_queue[chan] = part_queue[chan] || [];
                part_queue[chan].push(nick);
                x.update_last_seen(nick, chan, message.rawCommand.toLowerCase());
                break;
            case 'PONG':
                x.pong();
                queue_run();
                break;
            case 'NICK': //user changes nickname
                //TODO update channel or something idk
                b.log.warn('changed nick', message.nick, '->', message.args[0]);
                break;
            case '491': //Permission Denied - You do not have the required operator privileges
            case '481':
                b.is_op = false;
                b.log.error(config.bot_nick, 'does not have required operator privileges, disabling oper commands.');
                break;
            case '381': //opper up
                b.is_op = true;
                b.log.info(config.bot_nick, 'opped up!');
                break;
            case '324': //get chan modes
                if (b.channels[message.args[1]]) b.channels[message.args[1]].set_modes(message.args[2]);
                break;
            case '401':
                b.log.warn('No such nick:', message.args[1]);
                break;
            case '404': //can't send colors
                if (b.channels[message[1]]) b.channels[message[1]].disable_colors(true);
                break;
            default: 
                b.log.warn(message.rawCommand, message);
                break;
        }
    });

    bot.addListener('names', function(chan, nicks) {
        b.channels[chan].update_nick_list(nicks);

        for(var user in b.channels[chan].users){
            if((Object.keys(nicks)).indexOf(user) < 0){
                part_queue[chan] = part_queue[chan] || [];
                part_queue[chan].push(user);
            }
        }
    });

    bot.addListener('+mode', function(chan, by, mode, argument, message)  {
        bot.send('names', chan);
    });

    bot.addListener('-mode', function(chan, by, mode, argument, message)  {
        bot.send('names', chan);
    });

    bot.addListener('action', function(nick, chan, text, message){
       if(nick === config.bot_nick && chan === config.bot_nick) return; //ignore bot messages in pms

        if(chan === config.bot_nick){ //this is a pm to the bot

            if(config.send_owner_bot_pms && nick !== config.owner){ //send pms to bot to owner
               bot.say(config.owner, '*' + nick + text + '*');
            } 

            x.update_last_seen(nick, chan, 'pm');

        } else { //this is a message in a chan

            x.update_last_seen(nick, chan, 'speak');
            b.channels[chan].action(nick, text);
        }

    });

    bot.addListener('message', function(nick, chan, text, message) {
        if(nick === config.bot_nick && chan === config.bot_nick) return; //ignore bot messages in pms

        if(chan === config.bot_nick){ //this is a pm to the bot

            if(config.send_owner_bot_pms && nick !== config.owner){ //send pms to bot to owner
               bot.say(config.owner, nick + ': ' + text);
            } 


            x.update_last_seen(nick, chan, 'pm');
            b.pm.message(nick, text);

        } else { //this is a message in a chan

            //if this is a discord channel
            if(b.channels[chan].config.discord_relay_channel && nick === b.channels[chan].config.discord_relay_bot){
                var discord_arr = text.match(/^<(.+?)> (.+)$/);
                if(discord_arr === null || discord_arr.length < 2){
                    b.log.error('Invalid discord bot relay input!', discord_arr);
                    return;
                }

                nick = c.stripColorsAndStyle(discord_arr[1]);
                nick = nick.replace('\u000f', '');
                text = discord_arr[2];

                x.update_last_seen(nick, chan, 'speak', 'discord');

                var is_action = text.match(/^_(.*?)_$/);

                if(is_action !== null){
                    b.channels[chan].action(nick, is_action[1], true);
                } else {
                    b.channels[chan].message(nick, text, true);
                }
            } else {

                x.update_last_seen(nick, chan, 'speak');
                b.channels[chan].message(nick, text);
            }

            
        }
    });
}

function init_plugins(complete){
    var error = function(err){
        b.log.error('Error getting plugins', err);
    }
    
    config  = merge.recursive(true, config_default, config_custom);
    b.log.setLevel(config.debug_level);
    b.log.info('*** Reversing polarity on plugins array ***');
    b.t = new Theme(config.chan_default.theme, config.chan_default.disable_colors);

    var plugin_dir = __dirname + '/plugins/';

    fs.readdir(plugin_dir, function(err, filenames) {
        if (err) {
            error(err); 
            return;
        }

        filenames.forEach(function(filename) {
            
            if(filename.indexOf('.') === 0) return;

            var Plugin = require(plugin_dir + filename + '/cmds.js');
            var info = Plugin.info
            var cmds = Plugin.cmds;

            for(var cmd in cmds){

                if(command_by_plugin[cmd] && command_by_plugin[cmd] !== info.name){
                    b.log.error('Duplicate command name error, plugin ' + info.name + ' contains a command by the same name! Overwriting command.' )
                }

                command_by_plugin[cmd] = info.name;
                commands[info.name] = commands[info.name] || {info: info, cmds: {}};
                commands[info.name].cmds[cmd] = cmds[cmd];
            }

            b.log.info('*', x.techno(true), info.name, 'Plugin...') 
        });


        complete();
    });
}

//when a user leaves the channel, we wait for the next PONG event
//before we delete chan/user objects just in case they rejoin quickly
function queue_run(){
    for(var chan in part_queue){
        //if the bot left, delete the whole channel
        if(part_queue[chan].indexOf(config.bot_nick) > -1){
            b.log.debug(config.bot_nick, 'left channel, deleting', chan);
            b.channels[chan].uninit_chan();
            delete part_queue[chan];

            b.log.debug(Object.keys(b.channels));
        } else {
            part_queue[chan].forEach(function(nick){
                b.log.debug(nick, 'left channel', chan, 'deleting');
                delete b.channels[chan].users[nick];
                delete part_queue[chan].splice(part_queue[chan].indexOf(nick), 1);

                b.log.debug(Object.keys(b.channels[chan].users));
            });
        }
    }

    
}

function get_date(){
    //create date for logs
    var today = new dateWithOffset(0);
    var month = today.getUTCMonth() + 1; //months from 1-12
    var day = today.getUTCDate();
    var year = today.getUTCFullYear();
    return year + '_' + (month < 10 ? '0' + month : month) + '_' + (day < 10 ? '0' + day : day);
}





