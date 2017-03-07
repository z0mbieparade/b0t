var info = {
    name: 'Default',
    about: 'built in system commands'
}
exports.info = info;

var cmds = {
    commands: { 
        action: 'list all of the available bot commands',
        params: ['*-list'],
        func: function(CHAN, USER, say, args, command_string){
            var list = (args.length > 0 && args[0] === '-list');
            var cmd_obj = x.verify_commands(USER, list, true, CHAN.is_pm);

            if(Object.keys(cmd_obj).length === 0)
            {
                say({'err': 'No commands avaliable'});
                return;
            }

            if(list) {
                if(USER.is_discord_user){
                    say({err: 'Discord users cannot use the -list param.'});
                } else {
                    var cmd_arr = [];

                    if(USER.nick !== config.owner && CHAN.is_pm) cmd_arr.push(CHAN.t.fail('Note: When using in a PM, only shows base privileges'));

                    for(var plugin in cmd_obj){
                        cmd_arr.push(CHAN.t.warn('--- ' + CHAN.t.term(plugin + ': ' + (commands[plugin].info.about ? commands[plugin].info.about : '')) + ' ---'));
                        cmd_arr = cmd_arr.concat(cmd_obj[plugin]);
                    }

                    say(cmd_arr, 3, {skip_verify: true, join: '\n'});
                }
            } else {
                var cmd_arr = [];

                if(USER.nick !== config.owner && CHAN.is_pm) cmd_arr.push(CHAN.t.fail('Note: When using in a PM, only shows base privileges'));

                for(var plugin in cmd_obj){
                    cmd_arr.push(CHAN.t.warn(plugin + ':') + ' ' + cmd_obj[plugin].join(', '));
                }

                var str = cmd_arr.join(CHAN.t.highlight(' | '));
                str += CHAN.t.fail(' (for more info, you can type any command followed by help)');

                if(CHAN.is_pm) str += CHAN.t.null(' (cannot be used in a PM)');

                say(str, 2, {skip_verify: true});
            }
        }
    },
    help: { 
        action: 'help the user',
        params: ['*topic'],
        perms: '+',
        discord: false,
        func: function(CHAN, USER, say, args, command_string){

            var help_topics = {
                'colors': [
                    'If a command accepts colors, you can use various short cuts to format text preceded by an &:',
                    '\u0002b bold\u000f | \u0016i italic\u000f | \u001fu\u000f \u001funderline\u000f | r reset | ' + c.white.bgblack(' 0 ')+c.black.bgwhite(' 1 ')+c.navy(' 2 ')+c.green(' 3 ')+c.red(' 4 ')+c.brown(' 5 ')+c.purple(' 6 ')+c.olive(' 7 ')+c.yellow(' 8 ')+c.lime(' 9 ')+c.teal(' 10 ')+c.cyan(' 11 ')+c.blue(' 12 ')+c.pink(' 13 ')+c.grey(' 14 ')+c.silver(' 15 '), 
                    'color codes are 0-15 see https://github.com/z0mbieparade/b0t/wiki/Colors for a complete list of color names',
                    'typing `&lime>green text here` or `&9>green text here` will return \u00039>green text here'
                ],
                'commands': [
                    'For any command, you can type ' + CHAN.t.highlight(config.command_prefix + 'command help') + ' to receive full usage instructions.',
                    'To view all commands and their help syntax, you can type ' + CHAN.t.highlight(config.command_prefix + 'commands -list'),
                    'For example, typing ' + CHAN.t.highlight(config.command_prefix + 'tag help') + ' will return the following syntax:',
                    x.cmd_syntax('tag', {t: CHAN.t}),
                    'To break this down, that means there are 4 things you can do with the tag command: ',
                    '1. ' + CHAN.t.highlight(config.command_prefix + 'tag -list') + ' will return a list of all taglines currently for your user account',
                    '2. ' + CHAN.t.highlight(config.command_prefix + 'tag -delete 4') + ' will delete the 4th tagline (which you know the id of because you did list first)',
                    '3. ' + CHAN.t.highlight(config.command_prefix + 'tag -edit 3 new tagline') + ' will edit the 2nd tagline (which you know the id of because you did list first)',
                    '4. ' + CHAN.t.highlight(config.command_prefix + 'tag &lime>i feel pretty, oh so pretty') + ' will add ' + c.lime('>i feel pretty, oh so pretty') + ' as a tagline when you enter the room. (for more info about colors, type ' + config.command_prefix + 'help colors)'
                ],
                'infobot': [
                    'See https://github.com/z0mbieparade/b0t/wiki/Info-Bot for more info.'
                ]
            }

            if(args.length > 0 && help_topics[args[0]] !== undefined){
                say(help_topics[args[0]] , 3, {skip_verify: true, skip_buffer: true, join: '\n'});
            } else {
                var str = 'What do you need help with? You can say ' + CHAN.t.highlight(x.cmd_syntax('help', {short: true, micro: true, t: CHAN.t})) + ' with any of the following topics: \n';
                    str += (Object.keys(help_topics)).join(', ');

                say(str, 3, {skip_verify: true, skip_buffer: true});
            }
        }
    },
    set: {
        action: 'set the channel topic',
        params: ['topic'],
        perm: '+',
        discord: false,
        colors: true,
        no_pm: true,
        func: function(CHAN, USER, say, args, command_string){ 
            db.update_db('/', {topic: [command_string]}, false, function(){
                CHAN.update_topic();
            });
        }
    },
    pin: {
        action: 'pin the last topic, or a topic by id',
        params: ['*id'],
        perm: '~',
        discord: false,
        no_pm: true,
        func: function(CHAN, USER, say, args, command_string){ 
            x.search_arr(USER, '/topic', args, command_string, false, function(data, found){
                if(found && found > 1){
                    say({succ: found + " items found matching '" + command_string.trim() + "'"}, 2, {skip_verify: true});
                    say(data, 3, {skip_verify: true, join: '\n'});
                } else if(found && found === 1){
                    db.update_db('/pinned/' + CHAN.chan, data, true, function(act){
                        CHAN.update_topic();
                    });
                } else {
                    say(data, 2, {skip_verify: true});
                }
            });
        }
    },
    unpin: {
        action: 'unpin the channel topic',
        perm: '~',
        discord: false,
        no_pm: true,
        func: function(CHAN, USER, say, args, command_string){ 
            db.delete_from_db('/pinned/' + CHAN.chan, function(act){
                if(act){
                    CHAN.update_topic();
                } else {
                    say({err: 'unable to unpin topic'});
                }
            });
        }
    },
    updatetopic: {
        action: 'update channel topic from qotd',
        perm: 'owner',
        discord: false,
        no_pm: true,
        func: function(CHAN, USER, say, args, command_string){ 
            CHAN.update_topic();
        }
    },
    qotd: {
        action: 'get random topic, or enter a search term to search for a specific topic. if more than one found, will list by ID number. Enter id number to read specific topic',
        params: ['*<search term> | <id>'],
        func: function(CHAN, USER, say, args, command_string){ 
            x.search_arr(USER, '/topic', args, command_string, true, function(data, found){
                if(found && found > 1){
                    say({succ: found + " items found matching '" + command_string.trim() + "'"}, 2, {skip_verify: true});
                    say(data, 3, {skip_verify: true, join: '\n'});
                } else if(found && found === 1){
                    say({succ: data}, 1, {skip_verify: true});
                } else {
                    say(data, 2, {skip_verify: true});
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
        func: function(CHAN, USER, say, args, command_string){ 
            if(args[0] === 'tags' || args[0] === 'tag'){
                var match = command_string.match(/^[\w]+\s[\w]+\s(.+)$/);
                if(match.length && match.length > 0){
                    x.manage_arr(USER, '/nicks/'+args[1]+'/tags', args.slice(2), match[1], 'reg', say);
                } else {
                    say({err: 'nothing to match'});
                }
            } else {
                var data = command_string.split(' ');
                data.splice(0, 2);
                var data_str = data.join(' ');
                USER.update_user({
                    col: args[0],
                    data: data_str
                }, function(msg){
                    say(msg, 2);
                });
            }
        }
    },
    unreg: {
        action: 'unregister a user for any service (lastfm, trakt, location, untappd)',
        params: ['service', 'irc USER.nick'],
        perm: 'owner',
        discord: false,
        func: function(CHAN, USER, say, args, command_string){ 
            if(args[0] === 'tags' || args[0] === 'tag'){
                say({err: 'use reg command to modify user tags'});
            } else {
                USER.update_user({
                        col: args[0],
                        data: ''
                }, function(msg){
                    say(msg, 2)
                });
            }
        }
    },
    tell: {
        action: 'tell another user something when they they are next active',
        params: ['irc nick', 'message'],
        colors: true,
        func: function(CHAN, USER, say, args, command_string){ 
            USER.update_user({
                    col: 'msg/'+USER.nick,
                    data: command_string
            }, function(msg){
                if(msg.act === 'remove') say('Your message has been removed', 2);
                if(msg.act === 'add') say('Your message will be sent when ' + args[0] + ' is next seen', 2);
            });
        }
    },
    speak: {
        action: 'allows owner to speak through bot to channel or to user',
        params: ['to', 'message'],
        perm: 'owner',
        colors: true,
        discord: false,
        func: function(CHAN, USER, say, args, command_string){ 
            if(args[0].indexOf('#') === 0){}
            say(command_string.slice(args[0].length), 1, {to: args[0], skip_verify: true, ignore_bot_speak: true})
        }
    },
    tag: {
        action: 'create a tagline for the bot to say when you enter the room',
        params: ['-list | -delete <id> | -edit <id> | <tagline>'],
        colors: true,
        discord: false,
        func: function(CHAN, USER, say, args, command_string){
            x.manage_arr(USER, '/nicks/' + USER.nick + '/tags', args, command_string, 'tag', say);
        }
    },
    updates: {
        action: 'check for updates to b0t script',
        perm: '@',
        discord: false,
        func: function(CHAN, USER, say, args, command_string){ 
            x.get_url(
                'https://raw.githubusercontent.com/z0mbieparade/b0t/master/package.json', 
                'json',
                function(data){
                    if(data.version === pkg.version){
                        say('I am up to date!', 1);
                    } else {
                        var str = 'Please update me! My version: ' + pkg.version + ' Current version: ' + data.version;
                        say(str, 2)
                    }
               });
        }
    },
    bug: {
        action: 'send a bug report to the owner or lists current bugs',
        params: ['-list | -delete <id> | -edit <id> | <bug>'],
        colors: true,
        func: function(CHAN, USER, say, args, command_string){ 
            x.manage_arr(USER, '/bugs', args, command_string, 'bug', say);
        }
    },
    request: {
        action: 'send a feature request to the owner or list current requests',
        params: ['-list | -delete <id> | -edit <id> | <request>'],
        colors: true,
        func: function(CHAN, USER, say, args, command_string){ 
             x.manage_arr(USER, '/requests', args, command_string, 'request', say);
        }
    },
    next: {
        action: 'Page next thru avaliable buffer, lines is 5 by default, join is a new line by default',
        params: ['*lines', '*join'],
        discord: false,
        func: function(CHAN, USER, say, args, command_string){ 
            var opt = {
                nick: USER.nick,
                skip_buffer: true,
                skip_verify: true,
                page_buffer: true,
                copy_buffer_to_user: true
            };

            if(args.length > 0){
                if(isNaN(args[0]) === false){
                    opt.lines = +args[0], 
                    opt.join = args[1] ? args[1] : undefined;
                } else {
                    opt.join = args[0];
                }
            }

            say(null, 2, opt)
        }
    },
    list: {
        action: 'List all users in channel (useful with discord relay mostly)',
        no_pm: true,
        func: function(CHAN, USER, say, args, command_string){ 
            CHAN.get_all_users_in_chan_data(null, function(data){
                data = data.filter(function(val){ return val !== config.bot_nick && (!CHAN.config.discord_relay_bot || val !== CHAN.config.discord_relay_bot) });
                data = data.map(x.no_highlight);
                say(data, 1, {skip_verify: true, join: ', ', skip_buffer: true, ignore_discord_formatting: true});
            });
        }
    },
    seen: {
        action: 'Check when a user was last seen',
        params: ['irc nick'],
        func: function(CHAN, USER, say, args, command_string){ 
            x.get_user_data(args[0], {
                col: 'seen',
                ignore_err: true,
                skip_say: true
            }, function(seen){
                if(seen === false){
                    say({err: args[0] + ' has never been seen'});
                } else {
                    var str = x.no_highlight(CHAN.t.term(args[0])) + ' ';
                    switch(seen.action){
                        case 'speak':
                            str += 'last spoke in';
                            break;
                        case 'pm':
                            str += 'last PMed';
                            break;
                        case 'part':
                            str += 'last parted from';
                            break;
                        case 'join':
                            str += 'last joined';
                            break;
                        case 'kick':
                            str += 'was last kicked from'; 
                            break;
                        case 'kill':
                            str += 'was last killed from'; 
                            break;
                        default: 
                            str += 'last ' + seen.action + 'ed in';
                            break;
                    }

                    str += ' ' + seen.chan + ' (' + seen.where + ') on ' + x.epoc_to_date(seen.date, 'date') + ' at ' + x.epoc_to_date(seen.date, 'time');

                    say({succ: str});
                }
            });
        }
    },

}
exports.cmds = cmds;
