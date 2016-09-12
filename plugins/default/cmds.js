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
