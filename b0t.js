#!/usr/bin/env node

//require ALL OF THE THINGS
config   = require('./config.json'),
pkg      = require('./package.json'),
irc      = require('irc'),
c        = require('irc-colors'),
mLog4js  = require('log4js'),
request  = require('request'),
fs       = require('fs');

commands = {},
command_by_plugin = {},
respond = {},
respond_by_plugin = {},
names = {}; // { channel : { nick: rank }}

var get_plugins = function(complete) {

    var error = function(err)
    {
        log.error('Error getting plugins', err);
    }

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
            var ress = Plugin.respond ? Plugin.respond : {};
            var cmds = Plugin.cmds;

            for(var cmd in cmds){

                if(command_by_plugin[cmd] && command_by_plugin[cmd] !== info.name){
                    log.error('Duplicate command name error, plugin ' + info.name + ' contains a command by the same name! Overwriting command.' )
                }

                command_by_plugin[cmd] = info.name;
                commands[info.name] = commands[info.name] || {info: info, cmds: {}};
                commands[info.name].cmds[cmd] = cmds[cmd];
            }

            for(var res in ress){

                if(respond_by_plugin[res] && respond_by_plugin[res] !== info.name){
                    log.error('Duplicate response error, plugin ' + info.name + ' contains a response by the same name! Overwriting response.' )
                }

                respond_by_plugin[res] = info.name;
                respond[res] = ress[res];
            }

            log.debug('Loaded Plugin', info.name) 
        });

        complete();
    });
}

var setup_bot = function(){

    var bot = new irc.Client(config.network_name, config.bot_nick, {
        debug: config.debug,
        channels: config.channels
    });

    ACT        = require(__dirname + '/lib/action.js').ACT,
    action     = new ACT(),
    action.bot = bot

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

    var verify_command = function(command, command_args, callback) {
        
        var command_data = action.get_command(command);

        if(command_data.err){
            log.error(command_data.err);
            return;
        }
        
        var cmd = action.verify_command(command_data.category, command, true);
        if(cmd === false) return;

        //remove blank commands
        var command_args = command_args.filter(function(value) {
          var val = value.replace(/^\s+|\s+$/g, '');
          return val !== '';
        })

        var required_commands = 0;
        for(var i = 0; i < command_data.params.length; i++) {
            if (command_data.params[i].indexOf('*') !== 0) required_commands++;
        }

        if (command_args.length < required_commands) {
           action.say(cmd, 2, {skip_verify: true});
        } else {
            callback(command_data, command_args, cmd);
        }
    };


    bot.addListener('message', function(nick, chan, text, message) {
        if(nick === config.bot_nick && chan === config.bot_nick) return;
        var chan = message.args[0] === config.bot_nick ? nick : chan;

        action.chan = chan;
        action.nick = nick;

        var links = text.match(/(\b(https?|http):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig);
        if(links && links.length && links.length > 0 && config.parse_links)
        {
            for(var i = 0; i < links.length; i++) {
                action.get_url(links[i], 'sup', function(data){
                    action.say(data, 1);
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

            verify_command(command, command_args_org, function(command_data, command_args, usage){
                if(command_args[0] === 'help'){
                    action.say(usage, 2, {skip_verify: true});
                    return;
                }
               
                command_data.func(action, nick, chan, command_args, command_args_org.join(' '));

            });
        }
    });
} 

var init = function(){
    mLog4js.loadAppender('file');
    mLog4js.addAppender(mLog4js.appenders.file(__dirname + '/logs/' + config.bot_nick + '.log'));
    if (config.debug) { mLog4js.replaceConsole(); }
    global.log = mLog4js.getLogger('logfile');
    log.setLevel('ALL');
    log.debug("------------------------------------------------------------");
    log.debug("Initializing...");

    get_plugins(function(){
        setup_bot();
    });
}
init(); 
