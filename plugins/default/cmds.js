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
                action.say(str, 2);
            }
        }
    },
    set: {
        action: 'set the channel topic',
        params: ['topic'],
        perm: '+',
        func: function(action, nick, chan, args, command_string){ 
            log.debug(action)
            action.send('topic', command_string);
            action.say('Topic set!', 2);
        }
    },
    reg: {
        action: 'register a user for any service (lastfm, trakt, location, untappd)',
        params: ['service', 'irc nick', 'data'],
        perm: '@',
        func: function(action, nick, chan, args, command_string){ 
            action.update_user(args[1], {
                col: args[0],
                data: args[2]
            }, function(msg){
                action.say(msg.msg, 2);
            });
        }
    },
    unreg: {
        action: 'unregister a user for any service (lastfm, trakt, location, untappd)',
        params: ['service', 'irc nick'],
        perm: '@',
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
        params: ['*-list', 'explain'],
        func: function(action, nick, chan, args, command_string){ 

            var loop_thru = function(){
                action.get_db_data('/bugs', function(data){
                    var bug_count = 1;
                    for(var un in data){
                        for(var i = 0; i < data[un].length; i++){
                            var str = bug_count + ') ' + c.teal(un) + ': ' + data[un][i];
                            action.say(str, 2)
                        }
                    }
                });
            }

            if(args[0] === '-list'){
                loop_thru();
                return;
            }

            action.update_db('/bugs/'+nick, [command_string], true, function(act){
                var str = 'Bug added by ' + c.teal(nick) + ': ' + command_string;
                action.say(str, 3, {to: config.owner})
            })
        }
    },
    request: {
        action: 'send a feature request to the owner or list current requests',
        params: ['*-list', 'explain'],
        func: function(action, nick, chan, args, command_string){ 
             var loop_thru = function(){
                action.get_db_data('/requests', function(data){
                    var bug_count = 1;
                    for(var un in data){
                        for(var i = 0; i < data[un].length; i++){
                            var str = bug_count + ') ' + c.teal(un) + ': ' + data[un][i];
                            action.say(str, 2)
                        }
                    }
                });
            }

            if(args[0] === '-list'){
                loop_thru();
                return;
            } 

            action.update_db('/requests/'+nick, [command_string], true, function(act){
                var str = 'Feature request added by ' + c.teal(nick) + ': ' + command_string;
                action.say(str, 3, {to: config.owner})
            });
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
