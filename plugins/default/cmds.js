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
                action.say(cmd_arr.join('\n'), 3, {skip_verify: true});
            } else {
                var str = c.teal('Avaliable commands: ') + cmd_arr.join(', ');
                str += c.red(' (for more info, you can type any command followed by help)');
                action.say(str, 2, {skip_verify: true});
            }
        }
    },
    set: {
        action: 'set the channel topic',
        params: ['topic'],
        perm: '+',
        func: function(action, nick, chan, args, command_string){ 
            action.get_db_data('/topic', function(data){
                prev_topics = [];
                if(data.length > 0){
                    prev_topics = data.slice(-2);
                } 

                log.debug(prev_topics);

                action.update_db('/', {topic: [command_string]}, false, function(){
                    prev_topics.push(command_string);
                    prev_topics.reverse();
                    action.send('topic', prev_topics.join(' | '));
                    action.say('Topic set!', 2);
                });
            });
        }
    },
    qotd: {
        action: 'get random topic, or enter a search term to search for a specific topic. if more than one found, will list by ID number. Enter id number to read specific topic',
        params: ['*search term', '*id'],
        func: function(action, nick, chan, args, command_string){ 
            action.get_db_data('/topic', function(data){
                if(data.length > 0){
                    if(args.length > 0 && isNaN(args[0]) === false){
                        var id = parseInt(args[0], 10);
                        if(data[id] === undefined){
                            action.say({err: 'no topic with that id found!'}, 2);
                        } else {
                            action.say(c.green(data[id]), 1, {skip_verify: true});
                        }
                    } else if(args.length > 0 && isNaN(args[0]) === true){
                        var search_topics = {};
                        var count_found = 0;
                        var msg_found = [];
                        for(var i = 0; i < data.length; i++){
                            if(data[i].toLowerCase().indexOf(command_string.toLowerCase().trim()) > -1){
                                count_found++;
                                search_topics[i] = data[i];
                                msg_found.push(c.olive('[' + i + '] ') + data[i]);
                            }
                        }

                        if(count_found === 0 ){
                            action.say({err: 'no topic with that search term found!'}, 2);
                        } else if (count_found === 1) {
                            for(idd in search_topics){
                                action.say(c.green(data[idd]), 1, {skip_verify: true});
                            }
                        } else {
                            action.say(c.green(count_found + " QOtD's found matching '" + command_string.trim() + "'"), 1, {skip_verify: true});
                            action.add_to_buffer(msg_found);
                        }
                    } else {
                        action.say(c.green(data[Math.floor(Math.random()*data.length)]), 1, {skip_verify: true});
                    }
                } else {
                    action.say({err: 'no topics have been set yet!'}, 2);
                }
            });
        }
    },
    reg: {
        action: 'register a user for any service (lastfm, trakt, location, untappd)',
        params: ['service', 'irc nick', 'data'],
        perm: 'owner',
        func: function(action, nick, chan, args, command_string){ 
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
    },
    unreg: {
        action: 'unregister a user for any service (lastfm, trakt, location, untappd)',
        params: ['service', 'irc nick'],
        perm: 'owner',
        func: function(action, nick, chan, args, command_string){ 
            action.update_user(args[1], {
                    col: args[0],
                    data: ''
            }, function(msg){
                action.say(msg.msg, 2)
            });
        }
    },
    tell: {
        action: 'tell another user something when they they are next active',
        params: ['irc nick', 'message'],
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
        func: function(action, nick, chan, args, command_string){ 
            if(args[0].indexOf('#') === 0){}
            action.say(command_string.slice(args[0].length), 1, {to: args[0], skip_verify: true, ignore_bot_speak: true})
        }
    },
    tag: {
        action: 'create a tagline for the bot to say when you enter the room',
        params: ['tagline'],
        func: function(action, nick, chan, args, command_string){
            action.update_user(nick, {
                    col: 'tag',
                    data: command_string
            }, function(msg){
                action.say(msg.msg, 2);
            });
        }
    },
    updates: {
        action: 'check for updates to b0t script',
        params: [],
        perm: '@',
        func: function(action, nick, chan, args, command_string){ 
            var data = action.get_url(
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
        params: ['*-list', '*-delete', 'explain'],
        func: function(action, nick, chan, args, command_string){ 
             var loop_thru = function(delete_id){
                action.get_db_data('/bugs', function(data){
                    var bug_count = 1;
                    for(var un in data){
                        for(var i = 0; i < data[un].length; i++){
                            log.debug(data[un][i]);
                            var str = bug_count + ') ' + c.teal(un) + ': ' + data[un][i];

                            if(delete_id !== null && delete_id !== undefined){
                                if(bug_count == delete_id){
                                    action.delete_from_db('/bugs/' + un + '[' + i + ']', function(deleted){
                                        if(deleted){
                                            action.say(str + c.green(' Deleted!'), 2);
                                        } else {
                                            action.say({err: 'no request found for id ' + delete_id}, 2);
                                        }
                                    })
                                }
                            } else {
                                action.say(str, 2)
                            }
                            bug_count++;
                        }
                    }
                });
            }

            if(args[0] === '-list'){
                loop_thru();
                return;
            } 

            if(args[0] === '-delete') {
                if(isNaN(args[1]) === false){
                    loop_thru(args[1]);
                } else {
                    action.say({err: 'please also enter a bug id to delete!'}, 2);
                }
                return;
            } 

            var merge = {};
            merge[nick] = [command_string];
            action.update_db('/bugs', merge, false, function(act){
                var str = 'Bug added by ' + c.teal(nick) + ': ' + command_string;
                action.say(str, 3, {to: config.owner})
            });
        }
    },
    request: {
        action: 'send a feature request to the owner or list current requests',
        params: ['*-list', '*-delete', 'explain'],
        func: function(action, nick, chan, args, command_string){ 
             var loop_thru = function(delete_id){
                action.get_db_data('/requests', function(data){
                    var bug_count = 1;
                    for(var un in data){
                        for(var i = 0; i < data[un].length; i++){
                            log.debug(data[un][i]);
                            var str = bug_count + ') ' + c.teal(un) + ': ' + data[un][i];

                            if(delete_id !== null && delete_id !== undefined){
                                if(bug_count == delete_id){
                                    action.delete_from_db('/requests/' + un + '[' + i + ']', function(deleted){
                                        if(deleted){
                                            action.say(str + c.green(' Deleted!'), 2);
                                        } else {
                                            action.say({err: 'no request found for id ' + delete_id}, 2);
                                        }
                                    })
                                }
                            } else {
                                action.say(str, 2)
                            }
                            bug_count++;
                        }
                    }
                });
            }

            if(args[0] === '-list'){
                loop_thru();
                return;
            } 

            if(args[0] === '-delete') {
                if(isNaN(args[1]) === false){
                    loop_thru(args[1]);
                } else {
                    action.say({err: 'please also enter a request id to delete!'}, 2);
                }
                return;
            } 

            var merge = {};
            merge[nick] = [command_string];
            action.update_db('/requests', merge, false, function(act){
                var str = 'Feature request added by ' + c.teal(nick) + ': ' + command_string;
                action.say(str, 3, {to: config.owner})
            });
        }
    },
    next: {
        action: 'Page next thru avaliable buffer, lines is 5 by default, join is a new line by default',
        params: ['*lines', '*join'],
        perm: '',
        func: function(action, nick, chan, args, command_string){ 
            var lines = 5;
            var join = '\n';

            log.warn(args)

            if(args.length > 0){
                if(isNaN(args[0]) === false){
                    lines = +args[0];
                    join = args[1] ? args[1] : join;
                } else {
                    join = args[0];
                }
            }

            action.page_buffer(lines, join);
        }
    },
    setup: {
        action: 'Setup the bot, or make changes to settings',
        params: ['commands|settings'],
        perm: 'owner',
        func: function(action, nick, chan, args, command_string){ 
            if(args[0] === 'commands')
            {
                action.update_cmd_override();
            }
        }
    },
    mergedb: {
        action: 'merge old flatfile db into new json db (needed when upgrading from 0.0.* -> 0.1.*',
        params: [],
        perm: 'owner',
        func: function(action, nick, chan, args, command_string){ 
            var obj = action.export_db();
            action.say(JSON.stringify(obj), 3, {skip_verify: true})
        }
    }


}
exports.cmds = cmds;
