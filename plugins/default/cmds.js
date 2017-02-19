var info = {
    name: 'Default'
}
exports.info = info;

var cmds = {
    commands: { 
        action: 'list all of the available bot commands',
        params: ['*-list'],
        func: function(action, nick, chan, args, command_string){
            var list = (args.length > 0 && args[0] === '-list');
            var cmd_arr = action.verify_commands(list);

            if(cmd_arr.length === 0)
            {
                action.say({'err': 'No commands avaliable'}, 2);
                return;
            }

            if(list) {
                if(action.is_discord_user){
                    action.say({err: 'Discord users cannot use the -list param.'});
                } else {
                    action.say(cmd_arr, 3, {skip_verify: true, join: '\n'});
                }
            } else {
                var str = c.teal('Avaliable commands: ') + cmd_arr.join(', ');
                str += c.red(' (for more info, you can type any command followed by help)');
                action.say(str, 2, {skip_verify: true});
            }
        }
    },
    help: { 
        action: 'help the user',
        params: ['*topic'],
        perms: '+',
        discord: false,
        func: function(action, nick, chan, args, command_string){

            var help_topics = {
                'colors': [
                    'If a command accepts colors, you can use various short cuts to format text preceded by an &:',
                    '\u0002b bold\u000f | \u0016i italic\u000f | \u001fu\u000f \u001funderline\u000f | r reset | ' + c.white.bgblack(' 0 ')+c.black.bgwhite(' 1 ')+c.navy(' 2 ')+c.green(' 3 ')+c.red(' 4 ')+c.brown(' 5 ')+c.purple(' 6 ')+c.olive(' 7 ')+c.yellow(' 8 ')+c.lime(' 9 ')+c.teal(' 10 ')+c.cyan(' 11 ')+c.blue(' 12 ')+c.pink(' 13 ')+c.grey(' 14 ')+c.silver(' 15 '), 
                    'color codes are 0-15 see https://github.com/z0mbieparade/b0t/wiki/Colors for a complete list of color names',
                    'typing `&lime>green text here` or `&9>green text here` will return \u00039>green text here'
                ],
                'commands': [
                    'For any command, you can type ' + c.teal(config.command_prefix + 'command help') + ' to receive full usage instructions.',
                    'To view all commands and their help syntax, you can type ' + c.teal(config.command_prefix + 'commands -list'),
                    'For example, typing ' + c.teal(config.command_prefix + 'tag help') + ' will return the following syntax:',
                    action.cmd_syntax('tag'),
                    'To break this down, that means there are 3 things you can do with the tag command: ',
                    '1. ' + c.teal(config.command_prefix + 'tag -list') + ' will return a list of all taglines currently for your user account',
                    '2. ' + c.teal(config.command_prefix + 'tag -delete 4') + ' will delete the 4th tagline (which you know the id of because you did list first)',
                    '3. ' + c.teal(config.command_prefix + 'tag &lime>i feel pretty, oh so pretty') + ' will add ' + c.lime('>i feel pretty, oh so pretty') + ' as a tagline when you enter the room. (for more info about colors, type ' + config.command_prefix + 'help colors)'
                ],
                'infobot': [
                    'Based on this old bot script http://www.infobot.org/guide-0.43.x.html Basic usage:',
                    'setting: `X is/are Y`, `no, X is/are Y`',
                    'accessing: `What is/are X`, `X?`',
                    'appending: `X is/are also Z`',
                    'erasing: `forget X`',
                    'locking: `lock X` (only works for ~ users, if set, non-~ users cannot change, delete, or append to factoid.)'
                ]
            }

            if(args.length > 0 && help_topics[args[0]] !== undefined){
                action.say(help_topics[args[0]] , 3, {skip_verify: true, skip_buffer: true, join: '\n'});
            } else {
                var str = 'What do you need help with? You can say ' + c.teal(action.cmd_syntax('help', true, true)) + ' with any of the following topics: \n';
                    str += (Object.keys(help_topics)).join(', ');

                action.say(str, 3, {skip_verify: true, skip_buffer: true});
            }
        }
    },
    set: {
        action: 'set the channel topic',
        params: ['topic'],
        perm: '+',
        discord: false,
        colors: true,
        func: function(action, nick, chan, args, command_string){ 
            action.update_db('/', {topic: [command_string]}, false, function(){
                action.update_topic(chan);
            });
        }
    },
    pin: {
        action: 'pin the last topic, or a topic by id',
        params: ['*id'],
        perm: '~',
        discord: false,
        func: function(action, nick, chan, args, command_string){ 
            action.search_arr('/topic', args, command_string, false, function(data, found){
                if(found && found > 1){
                    action.say(c.green(found + " items found matching '" + command_string.trim() + "'"), 2, {skip_verify: true});
                    action.say(data, 3, {skip_verify: true, join: '\n'});
                } else if(found && found === 1){
                    action.update_db('/pinned/' + chan, data, true, function(act){
                        action.update_topic(chan);
                    });
                } else {
                    action.say(data, 2, {skip_verify: true});
                }
            });
        }
    },
    unpin: {
        action: 'unpin the channel topic',
        perm: '~',
        discord: false,
        func: function(action, nick, chan, args, command_string){ 
            action.delete_from_db('/pinned/' + chan, function(act){
                if(act){
                    action.update_topic(chan);
                } else {
                    action.say({err: 'unable to unpin topic'});
                }
            });
        }
    },
    updatetopic: {
        action: 'update channel topic from qotd',
        perm: 'owner',
        discord: false,
        func: function(action, nick, chan, args, command_string){ 
            action.update_topic(chan);
        }
    },
    qotd: {
        action: 'get random topic, or enter a search term to search for a specific topic. if more than one found, will list by ID number. Enter id number to read specific topic',
        params: ['*search term', '*id'],
        func: function(action, nick, chan, args, command_string){ 
            action.search_arr('/topic', args, command_string, true, function(data, found){
                if(found && found > 1){
                    action.say(c.green(found + " items found matching '" + command_string.trim() + "'"), 2, {skip_verify: true});
                    action.say(data, 3, {skip_verify: true, join: '\n'});
                } else if(found && found === 1){
                    action.say(c.green(data), 1, {skip_verify: true});
                } else {
                    action.say(data, 2, {skip_verify: true});
                }
            });
        }
    },
    reg: {
        action: 'register a user for any service (lastfm, trakt, location, untappd)',
        params: ['service', 'irc nick', 'data'],
        perm: 'owner',
        discord: false,
        colors: true,
        func: function(action, nick, chan, args, command_string){ 
            if(args[0] === 'tags' || args[0] === 'tag'){
                var match = command_string.match(/^[\w]+\s[\w]+\s(.+)$/);
                if(match.length && match.length > 0){
                    action.manage_arr('/nicks/'+args[1]+'/tags', args.slice(2), match[1]);
                } else {
                    action.say({err: 'nothing to match'});
                }
            } else {
                var data = command_string.split(' ');
                data.splice(0, 2);
                var data_str = data.join(' ');
                action.update_user(args[1], {
                    col: args[0],
                    data: data_str
                }, function(msg){
                    action.say(msg.msg, 2);
                });
            }
        }
    },
    unreg: {
        action: 'unregister a user for any service (lastfm, trakt, location, untappd)',
        params: ['service', 'irc nick'],
        perm: 'owner',
        discord: false,
        func: function(action, nick, chan, args, command_string){ 
            if(args[0] === 'tags' || args[0] === 'tag'){
                action.say({err: 'use reg command to modify user tags'});
            } else {
                action.update_user(args[1], {
                        col: args[0],
                        data: ''
                }, function(msg){
                    action.say(msg.msg, 2)
                });
            }
        }
    },
    tell: {
        action: 'tell another user something when they they are next active',
        params: ['irc nick', 'message'],
        colors: true,
        func: function(action, nick, chan, args, command_string){ 
            action.update_user(args[0], {
                    col: 'msg/'+nick,
                    data: command_string
            }, function(msg){
                if(msg.act === 'remove') action.say('Your message has been removed', 2);
                if(msg.act === 'add') action.say('Your message will be sent when ' + args[0] + ' is next seen', 2);
            });
        }
    },
    speak: {
        action: 'allows owner to speak through bot to channel or to user',
        params: ['to', 'message'],
        perm: 'owner',
        colors: true,
        discord: false,
        func: function(action, nick, chan, args, command_string){ 
            if(args[0].indexOf('#') === 0){}
            action.say(command_string.slice(args[0].length), 1, {to: args[0], skip_verify: true, ignore_bot_speak: true})
        }
    },
    tag: {
        action: 'create a tagline for the bot to say when you enter the room',
        params: ['*-list|*-delete (id)|*-edit (id)', '*tagline'],
        colors: true,
        discord: false,
        func: function(action, nick, chan, args, command_string, usage){
            action.manage_arr('/nicks/'+nick+'/tags', args, command_string);
        }
    },
    updates: {
        action: 'check for updates to b0t script',
        params: [],
        perm: '@',
        discord: false,
        func: function(action, nick, chan, args, command_string){ 
            action.get_url(
                'https://raw.githubusercontent.com/z0mbieparade/b0t/master/package.json', 
                'json',
                function(data){
                    if(data.version === pkg.version){
                        action.say('I am up to date!', 1);
                    } else {
                        var str = 'Please update me! My version: ' + pkg.version + ' Current version: ' + data.version;
                        action.say(str, 2)
                    }
               });
        }
    },
    bug: {
        action: 'send a bug report to the owner or lists current bugs',
        params: ['*-list|*-delete (id)|*-edit (id)', '*explain'],
        colors: true,
        func: function(action, nick, chan, args, command_string){ 
            action.manage_arr('/bugs', args, command_string);
        }
    },
    request: {
        action: 'send a feature request to the owner or list current requests',
        params: ['*-list|*-delete (id)|*-edit (id)', '*explain'],
        colors: true,
        func: function(action, nick, chan, args, command_string){ 
             action.manage_arr('/requests', args, command_string);
        }
    },
    next: {
        action: 'Page next thru avaliable buffer, lines is 5 by default, join is a new line by default',
        params: ['*lines', '*join'],
        discord: false,
        func: function(action, nick, chan, args, command_string){ 
            var opt = {
                to: chan,
                skip_buffer: true,
                skip_verify: true,
                page_buffer: true,
                copy_buffer_to_user: true
            };

            if(args.length > 0){
                if(isNaN(args[0]) === false){
                    opt = {lines: +args[0], join: args[1] ? args[1] : undefined};
                } else {
                    opt = {join: args[0]};
                }
            }

            action.say(null, 2, opt)
        }
    },
    list: {
        action: 'List all users in channel (useful with discord relay mostly)',
        perm: 'owner',
        func: function(action, nick, chan, args, command_string){ 
            action.get_all_users_in_chan_data(null, function(data){
                data = data.map(action.no_highlight);
                action.say(data, 1, {skip_verify: true, join: ', ', skip_buffer: true, ignore_discord_formatting: true});
            });
        }
    },
    ip: {
        action: 'Lookup ip address of user',
        params: ['irc nick'],
        perm: 'owner',
        discord: false,
        func: function(action, nick, chan, args, command_string){ 
            action.bot.whois(args[0], function(){  
                log.warn('ip', action.whois);
                if(action.whois[args[0]] && action.whois[args[0]].host){
                    action.get_url(
                        'http://ip-api.com/json/' + action.whois[args[0]].host,
                        'json',
                        function(data){
                            action.say(data, 3, {to: config.owner});
                       });
                } else {
                    action.say({'err': 'No IP found'});
                }
            });
        }
    },
    //TODO: this
    /*setup: {
        action: 'Setup the bot, or make changes to settings',
        params: ['commands|settings'],
        perm: 'owner',
        func: function(action, nick, chan, args, command_string){ 
            if(args[0] === 'commands')
            {
                action.update_cmd_override();
            }
        }
    }, */
    mergedb: {
        action: 'merge old flatfile db into new json db (needed when upgrading from 0.0.* -> 0.1.*',
        params: [],
        perm: 'owner',
        discord: false,
        func: function(action, nick, chan, args, command_string){ 
            var obj = action.export_db();
            action.say(JSON.stringify(obj), 3, {skip_verify: true})
        }
    }


}
exports.cmds = cmds;
