var info = {
    name: 'Default',
    about: 'built in system commands'
}
exports.info = info;

var DEFAULT         = require(__dirname + '/func.js').DEF,
    def             = new DEFAULT()

var cmds = {
    commands: { 
        action: 'list all of the available bot commands',
        params: [{
            optional: true,
            discord: false,
            name: 'list',
            type: 'flag'
        }],
        func: function(CHAN, USER, say, args, command_string){
            x.verify_commands(USER, {help: (args.list !== undefined), is_pm: CHAN.is_pm, by_plugin: true, ignore_spammy: true}, function(cmd_obj){

                if(Object.keys(cmd_obj).length === 0)
                {
                    say({'err': 'No commands avaliable'});
                    return;
                }

                if(args.list !== undefined) {
                    var cmd_arr = [];

                    if(!b.users[USER.nick].bot_owner && CHAN.is_pm) cmd_arr.push(CHAN.t.fail('Note: When using in a PM, only shows base privileges'));

                    for(var plugin in cmd_obj){
                        cmd_arr.push(CHAN.t.warn('--- ' + CHAN.t.term(plugin + ': ' + (commands[plugin].info.about ? commands[plugin].info.about : '')) + ' ---'));
                        cmd_arr = cmd_arr.concat(cmd_obj[plugin]);
                    }

                    say(cmd_arr, 3, {skip_verify: true, join: '\n'});
                } else {
                    var cmd_arr = [];

                    if(!USER.is_discord_user && !b.users[USER.nick].bot_owner && CHAN.is_pm) cmd_arr.push(CHAN.t.fail('Note: When using in a PM, only shows base privileges'));

                    for(var plugin in cmd_obj){
                        cmd_arr.push(CHAN.t.warn(plugin + ':') + ' ' + cmd_obj[plugin].join(', '));
                    }

                    var str = cmd_arr.join(CHAN.t.highlight(' | '));
                    str += CHAN.t.fail(' (for more info, you can type any command followed by help)');

                    if(CHAN.is_pm) str += CHAN.t.null(' (cannot be used in a PM)');

                    say(str, 2, {skip_verify: true});
                }

            });
        }
    },
    help: { 
        action: 'help the user',
        params: [{
            or: [{
                    name: 'colors',
                    type: 'flag',
                    key: 'topic'
                },{
                    name: 'commands',
                    type: 'flag',
                    key: 'topic'
                },{
                    name: 'infobot',
                    type: 'flag',
                    key: 'topic'
                }
            ]
        }],
        perm: '+',
        discord: false,
        func: function(CHAN, USER, say, args, command_string){

            var help_topics = {
                '-colors': [
                    'If a command accepts colors, you can use various short cuts to format text preceded by an &:',
                    '\u0002b bold\u000f | \u0016i italic\u000f | \u001fu\u000f \u001funderline\u000f | r reset | ' + c.white.bgblack(' 0 ')+c.black.bgwhite(' 1 ')+c.navy(' 2 ')+c.green(' 3 ')+c.red(' 4 ')+c.brown(' 5 ')+c.purple(' 6 ')+c.olive(' 7 ')+c.yellow(' 8 ')+c.lime(' 9 ')+c.teal(' 10 ')+c.cyan(' 11 ')+c.blue(' 12 ')+c.pink(' 13 ')+c.grey(' 14 ')+c.silver(' 15 '), 
                    'color codes are 0-15 see https://github.com/z0mbieparade/b0t/wiki/Colors for a complete list of color names',
                    'typing `&lime>green text here` or `&9>green text here` will return \u00039>green text here'
                ],
                '-commands': [
                    'For any command, you can type ' + CHAN.t.highlight(config.command_prefix + 'command help') + ' to receive full usage instructions.',
                    'To view all commands and their help syntax, you can type ' + CHAN.t.highlight(config.command_prefix + 'commands -list'),
                    'For example, typing ' + CHAN.t.highlight(config.command_prefix + 'tag help') + ' will return the following syntax:',
                    x.cmd_syntax(USER, 'tag'),
                    'To break this down, that means there are 4 things you can do with the tag command: ',
                    '1. ' + CHAN.t.highlight(config.command_prefix + 'tag -list') + ' will return a list of all taglines currently for your user account',
                    '2. ' + CHAN.t.highlight(config.command_prefix + 'tag -delete 4') + ' will delete the 4th tagline (which you know the id of because you did list first)',
                    '3. ' + CHAN.t.highlight(config.command_prefix + 'tag -edit 3 new tagline') + ' will edit the 2nd tagline (which you know the id of because you did list first)',
                    '4. ' + CHAN.t.highlight(config.command_prefix + 'tag &lime>i feel pretty, oh so pretty') + ' will add ' + c.lime('>i feel pretty, oh so pretty') + ' as a tagline when you enter the room. (for more info about colors, type ' + config.command_prefix + 'help colors)'
                ],
                '-infobot': [
                    'See https://github.com/z0mbieparade/b0t/wiki/Info-Bot for more info.'
                ]
            }

            say(help_topics[args.topic] , 3, {skip_verify: true, skip_buffer: true, join: '\n'});
        }
    },
    set: {
        action: 'set the channel topic',
        params: [{
            name: 'topic',
            type: 'text',
            colors: true
        }],
        perm: '+',
        discord: false,
        no_pm: true,
        func: function(CHAN, USER, say, args, command_string){ 
            db.update_db('/', {topic: [args.topic]}, false, function(){
                CHAN.update_topic();
            });
        }
    },
    pin: {
        action: 'pin a topic',
        params: [{
            optional: true,
            or: [{
                    name: 'topic id',
                    type: 'number',
                    key: 'id'
                },{
                    name: 'search term',
                    type: 'text',
                    key: 'query'
                }
            ]
        }],
        perm: '~',
        discord: false,
        no_pm: true,
        func: function(CHAN, USER, say, args, command_string){ 
            x.search_arr(USER, '/topic', args, false, function(data, found){
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
        params: [{
            optional: true,
            or: [{
                    name: 'topic id',
                    type: 'number',
                    key: 'id'
                },{
                    name: 'search term',
                    type: 'text',
                    key: 'query'
                }
            ]
        }],
        func: function(CHAN, USER, say, args, command_string){ 
            x.search_arr(USER, '/topic', args, true, function(data, found){
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
    ping: {
        action: 'Send ping and get pong',
        func: function(CHAN, USER, say, args, command_string){ 
            if(b.waiting_for_pong.indexOf(CHAN.chan) < 0) b.waiting_for_pong.push(CHAN.chan);
            bot.send('ping', config.network_name);
        }
    },
    reg: {
        action: 'register a user for any service (lastfm, trakt, location, untappd)',
        params: [
            {
                name: 'service',
                type: 'string'
            },
            {
                name: 'irc nick',
                type: 'string'
            },
            {
                or: [{
                    name: 'list',
                    type: 'flag',
                    key: 'flag',
                },
                {
                    name: 'delete',
                    type: 'flag',
                    key: 'flag',
                    and: [ { name: 'id', type: 'number' } ]
                },
                {
                    name: 'edit',
                    type: 'flag',
                    key: 'flag',
                    and: [ { name: 'id', type: 'number' }, { name: 'data', type: 'text', key: 'new_val', colors: true } ]
                },
                {
                    name: 'data',
                    type: 'text',
                    key: 'new_val',
                    colors: true,
                    fake: {flag: '-add'}
                }]
            }
        ],
        perm: 'owner',
        discord: false,
        func: function(CHAN, USER, say, args, command_string){ 
            if(args.service === 'tags' || args.service === 'tag'){
                x.manage_arr(USER, '/nicks/'+args.irc_nick+'/tags', args, 'reg', say, args.irc_nick);
            } else {
                var data = command_string.split(' ');
                data.splice(0, 2);

                var data_obj = {};
                data_obj[args.service] = args.new_val;

                db.update_db("/nicks/" + args.irc_nick, data_obj, false, function(act){
                    if(act === 'remove'){
                        say({succ: args.irc_nick + '\'s ' + args.service + ' has now been removed'}, 2);
                    } else {
                        say({succ: args.irc_nick + '\'s ' + args.service + ' has now been set'}, 2);
                    }
                }, args.irc_nick);
            }
        }
    },
    unreg: {
        action: 'unregister a user for any service (lastfm, trakt, location, untappd)',
        params: [
            {
                name: 'service',
                type: 'string'
            },
            {
                name: 'irc nick',
                type: 'string'
            }
        ],
        perm: '~',
        discord: false,
        func: function(CHAN, USER, say, args, command_string){ 
            if(args.service === 'tags' || args.service === 'tag'){
                say({err: 'use reg command to modify user tags'});
            } else {
                db.delete_from_db('/nicks/' + args.irc_nick + '/' + args.service, function(act){
                    if(act === true){
                        say({succ: args.irc_nick + '\'s ' + args.service + ' has now been removed'});
                    } else {
                        say({err: 'Unable to delete'});
                    }
                });
            }
        }
    },
    tell: {
        action: 'tell another user something when they they are next active',
        params: [
            {
                name: 'irc nick',
                type: 'string'
            },
            {
                name: 'message',
                type: 'text',
                colors: true
            }
        ],
        func: function(CHAN, USER, say, args, command_string){ 
            command_string = command_string.replace(/^.*?\s/i, '');
            db.update_db('/nicks/' + args.irc_nick + '/msg/' + USER.nick + '[]', args.message, true, function(act){
                if(act === 'remove'){
                    say({succ: 'Your message has been removed'}, 2)
                } else {
                    say({succ: 'Your message will be sent when ' + args.irc_nick + ' is next seen'}, 2);
                }
            }, args.irc_nick);
        }
    },
    speak: {
        action: 'allows owner to speak through bot to channel or to user',
        params: [
            {
                name: 'to',
                type: 'string'
            },
            {
                name: 'message',
                type: 'text',
                colors: true
            }
        ],
        perm: 'owner',
        discord: false,
        func: function(CHAN, USER, say, args, command_string){ 
            say(args.message, 1, {to: args.to, skip_verify: true, ignore_bot_speak: true})
        }
    },
    tag: {
        action: 'create a tagline for the bot to say when you enter the room',
        params: [{
            or: [
                {
                    name: 'list',
                    type: 'flag',
                    key: 'flag',
                },
                {
                    name: 'delete',
                    type: 'flag',
                    key: 'flag',
                    and: [ { name: 'id', type: 'number' } ]
                },
                {
                    name: 'edit',
                    type: 'flag',
                    key: 'flag',
                    and: [ { name: 'id', type: 'number' }, { name: 'new tagline', type: 'text', key: 'new_val', colors: true } ]
                },
                {
                    name: 'new tagline',
                    type: 'text',
                    key: 'new_val',
                    colors: true,
                    fake: {flag: '-add'}
                }

            ]
        }],
        discord: false,
        func: function(CHAN, USER, say, args, command_string){
            x.manage_arr(USER, '/nicks/' + USER.nick + '/tags', args, 'tag', say, USER.nick);
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
        perm: '%',
        params: [{
            or: [
                {
                    name: 'list',
                    type: 'flag',
                    key: 'flag',
                },
                {
                    name: 'delete',
                    type: 'flag',
                    perm: 'owner',
                    key: 'flag',
                    and: [ { name: 'id', type: 'number' } ]
                },
                {
                    name: 'edit',
                    type: 'flag',
                    perm: 'owner',
                    key: 'flag',
                    and: [ { name: 'id', type: 'number' }, { name: 'new bug', type: 'text', key: 'new_val', colors: true } ]
                },
                {
                    name: 'new bug',
                    type: 'text',
                    key: 'new_val',
                    colors: true,
                    fake: {flag: '-add'}
                }

            ]
        }],
        func: function(CHAN, USER, say, args, command_string){ 
            x.manage_arr(USER, '/bugs', args, 'bug', say);
        }
    },
    request: {
        action: 'send a feature request to the owner or list current requests',
        params: [{
            or: [
                {
                    name: 'list',
                    type: 'flag',
                    key: 'flag',
                },
                {
                    name: 'delete',
                    type: 'flag',
                    perm: 'owner',
                    key: 'flag',
                    and: [ { name: 'id', type: 'number' } ]
                },
                {
                    name: 'edit',
                    type: 'flag',
                    perm: 'owner',
                    key: 'flag',
                    and: [ { name: 'id', type: 'number' }, { name: 'new request', type: 'text', key: 'new_val', colors: true } ]
                },
                {
                    name: 'new request',
                    type: 'text',
                    key: 'new_val',
                    colors: true,
                    fake: {flag: '-add'}
                }

            ]
        }],
        func: function(CHAN, USER, say, args, command_string){ 
             x.manage_arr(USER, '/requests', args, 'request', say);
        }
    },
    next: {
        action: 'Page next thru avaliable buffer, lines is 5 by default, join is a new line by default',
        params: [
            {
                optional: true,
                name: 'lines',
                type: 'number'
            },
            {
                optional: true,
                name: 'join',
                type: 'string',
            }
        ],
        discord: false,
        func: function(CHAN, USER, say, args, command_string){ 
            var opt = {
                nick: USER.nick,
                skip_buffer: true,
                skip_verify: true,
                page_buffer: true,
                copy_buffer_to_user: true
            };

            if(args.lines !== undefined) opt.lines = args.lines;
            if(args.name !== undefined) opt.name = args.name;

            say(null, 2, opt)
        }
    },
    list: {
        action: 'List all users in channel (useful with discord relay mostly)',
        no_pm: true,
        params: [
            {
                optional: true,
                name: 'chan',
                type: '#\\w+'
            }
        ],
        func: function(CHAN, USER, say, args, command_string){ 
            if(args.chan !== undefined){
                if(b.channels[args.chan] === undefined || b.channels[args.chan].config === undefined){
                    say({err: 'No channel by that name'}, 3);
                    return;
                } else {
                    bot.send('names', args.chan);
                    b.channels[args.chan].get_all_users_in_chan_data(null, function(data){
                        data = data.filter(function(val){ return val !== bot.nick && (!b.channels[args.chan].config.discord_relay_bot || val !== b.channels[args.chan].config.discord_relay_bot) });
                        data = data.map(x.no_highlight);
                        say(data, 1, {skip_verify: true, join: ', ', skip_buffer: true, ignore_discord_formatting: true});
                    });
                }
            } else {
                bot.send('names', CHAN.chan);
                CHAN.get_all_users_in_chan_data(null, function(data){
                    data = data.filter(function(val){ return val !== bot.nick && (!CHAN.config.discord_relay_bot || val !== CHAN.config.discord_relay_bot) });
                    data = data.map(x.no_highlight);
                    say(data, 1, {skip_verify: true, join: ', ', skip_buffer: true, ignore_discord_formatting: true});
                });
            }
        }
    },
    whois: {
        action: 'whois info about a user',
        params: [{
            name: 'irc nick',
            type: 'string' 
        }],
        perm: 'owner',
        func: function(CHAN, USER, say, args, command_string){ 
            x.whois(args.irc_nick, function(whois, whois_short){
                if(whois !== null){
                    CHAN.log.debug(whois_short, whois);
                    x.owner_nick(false, function(owner_nick){
                        if(owner_nick !== null){
                            say(whois, 3, {to: owner_nick});
                        }
                    });
                } else {
                    x.owner_nick(false, function(owner_nick){
                        if(owner_nick !== null){
                             say({err: args.irc_nick + ' not on server'}, 3, {to: owner_nick});
                        }
                    });
                }
            }, {force: true});
        }
    },
    seen: {
        action: 'Check when a user was last seen',
        params: [{
            name: 'irc nick',
            type: 'string' 
        }],
        func: function(CHAN, USER, say, args, command_string){ 
            x.get_user_data(args.irc_nick, {
                col: 'seen',
                ignore_err: true,
                skip_say: true
            }, function(seen){
                if(seen === false){
                    say({err: args.irc_nick + ' has never been seen'});
                } else {
                    var str = x.no_highlight(CHAN.t.term(args.irc_nick)) + ' ';
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
                        case 'quit':
                            str += 'last quit the server'; 
                            break;
                        default: 
                            str += 'last ' + seen.action + 'ed in';
                            break;
                    }

                    x.get_user_data(USER.nick, {
                        label: 'timezone offset',
                        col: 'offset',
                        ignore_err: true,
                        skip_say: true
                    }, function(d){
                        if(seen.chan !== null){
                            str += ' ' + seen.chan + ' (' + seen.where + ')';
                        } 
                        str += ' on ' + x.epoc_to_date(seen.date, (!d ? 0 : x.convert_offset_to_min(d)));
                        say({succ: str});
                    });
                }
            });
        }
    },
    nicks: {
        action: 'Update nicks on server',
        params: [{
            or: [{
                name: 'revert',
                type: 'flag'
            },{
                name: 'set',
                type: 'flag'
            }]
        }],
        perm: '~',
        discord: false,
        func: function(CHAN, USER, say, args, command_string){ 
            if(args.flag === '-revert'){
                if(b.is_op){
                    function test_nick(new_nick, callback){
                        x.whois(new_nick, function(whois, whois_short){
                            if(whois !== null){ //there is a user on the server with this nick
                                test_nick('user' + x.rand_number_between(0, 1000), callback);
                            } else {
                                callback(new_nick);
                            }
                        }, {user_on_whois: true});
                    }

                    var repeat = 0;
                    var revert_nicks = {};

                    function revert(){

                        let requests = (Object.keys(b.users)).map((user) => {
                            return new Promise((resolve) => {

                                var nick = b.users[user].nick;
                                var orginal_nick = b.users[user].nick_org;

                                if(nick !== orginal_nick){
                                    test_nick(orginal_nick, function(new_nick){
                                        revert_nicks[nick] = new_nick; 
                                        if(new_nick !== orginal_nick) repeat++;
                                        resolve();
                                    });
                                } else {
                                    resolve();
                                }
                            });
                        });

                        Promise.all(requests).then(() => { 
                            //CHAN.log.debug(revert_nicks);
                            for(var user in revert_nicks){
                                bot.send('sanick', user, revert_nicks[user]);
                            }
 
                            if(repeat > 0){
                                repeat = 0;
                                revert_nicks = {};
                                revert();
                            } else {
                                say({succ: 'Nicks reverted!'});
                            }
                        });
                    }

                    revert();

                } else {
                    say({err: bot.nick + ' is not opper'}, 3);
                }
            } else if (args.flag === '-set'){
                for(var user in b.users){
                    b.users[user].update_org_to_current();
                }
                say({succ: 'Original nicks updated!'});
            } 
        }
    },
    poll: {
        action: 'Create a poll and have users vote on it',
        params: [{
            optional: true,
            or: [{
                    name: 'close',
                    key: 'close',
                    perm: '~',
                    type: 'flag'
                },{
                    and: [{
                        name: 'question',
                        type: '.+?(?=\\s-\\d)'
                    },{
                        name: '-1 answer -2 answer...',
                        key: 'answers',
                        type: '-\\d.+-\\d.+'
                    }]
                }
            ]
        }],
        func: function(CHAN, USER, say, args, command_string){
            if(args.close !== undefined){
                x.close_current_poll(function(result){
                    say(result);
                });
            } else {
                def.get_poll(CHAN, USER, args, function(result){
                    say(result, {skip_buffer: true, skip_verify: true, join: '\n'});
                });
            }
        }
    },
    vote: {
        action: 'Vote on the current poll',
        params: [{
            optional: true,
            name: 'answer id',
            type: 'number'
        }],
        func: function(CHAN, USER, say, args, command_string){
            def.get_poll(CHAN, USER, args, function(result){
                say(result, {skip_buffer: true, skip_verify: true, join: '\n'});
            });
        }
    },
    //TODO: need a way to add/edit/delete obj/arr items
    /*config: {
        action: 'Update config on the fly',
        params: [{
            optional: true,
            or: [{
                and: [{
                    optional: true,
                    name: '#chan',
                    type: '#\\w+',
                    key: 'chan',
                },{
                    optional: true,
                    name: 'setting:setting:setting',
                    type: 'string',
                    key: 'settings',
                    and: [{
                        optional: true,
                        name: 'value',
                        type: 'text'
                    }]
                }]
            },{
                name: 'save',
                type: 'flag',
                key: 'save'
            }]
        }],
        perm: 'owner',
        discord: false,
        func: function(CHAN, USER, say, args, command_string){ 
            var arr = [];
            var err = '';
            var succ = '';

            var key_arr = args.settings === undefined ? [] : args.settings.split(':');

            if(args.chan !== undefined && (b.channels[args.chan] === undefined || b.channels[args.chan].config === undefined)){
                say({err: 'No channel by that name'}, 3);
                return;
            }
            
            if(args.save !== undefined){
                if(args.chan === undefined){
                    x.update_config(config);
                } else {
                    x.update_config(b.channels[args.chan].config, args.chan);
                }
            } else {
                if(args.chan === undefined){
                    x.input_object(config, key_arr, args.value, function(resp){
                        say(resp, 3, {join: '\n', lines: 15});
                        //if(conf) config = conf;

                        //TODO: prolly need to have a few more actions here when specific settings are updated.
                        //if(key_arr[0] === 'bot_nick'){
                        //    bot.send('nick', conf['bot_nick']);
                        //} 

                    },{
                        ignore: ['network_name', 'nickserv_password', 'ircop_password', 'bot_config', 'debug_level']
                    });
                } else {
                    x.input_object(b.channels[args.chan].config, key_arr, args.value, function(resp){
                        say(response, 3, {join: '\n', lines: 15});
                        //if(conf) config = conf;

                    });
                }
            }

        }
    }*/

}
exports.cmds = cmds;
