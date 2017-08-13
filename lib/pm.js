var User = require(__botdir + '/lib/user.js');

//for PM msgs
module.exports = class PM{
    constructor() {
        var _this = this;
        this.is_pm = true;
        this.users = {};
        this.chan = bot.nick;
    	this.config = JSON.parse(JSON.stringify(config.chan_default));
        this.t = new Theme(config.chan_default.theme, config.chan_default.disable_colors);

        log4js.addAppender(log4js.appenders.file(__botdir + '/logs/PM_' + b.log_date + '.log'), 'PM');
        this.log = log4js.getLogger('PM');
        this.log.setLevel(config.debug_level);

        this.SAY = new Say(true, bot.nick);

        this.log.info('Private Message receiver activated!');
    }

    say(){ this.SAY.say.apply( this.SAY, arguments ); }

    message(nick, text){
    	var _this = this;

        b.users.send_tell_messages(nick);

        var text_split = text.match(new RegExp('^' + config.command_prefix + '(\\S+)\\s*(.*)$'));

        //say the bots name
        if (text.match(new RegExp('^' + bot.nick)) !== null && this.config.respond_to_bot_name) { 
            var command_args_org = text.split(' ');
            command_args_org.shift();

            var say_my_name = '';
            if(command_args_org[0] == '-version') {
                say_my_name = 'verson: ' + pkg.version;
            } else if(command_args_org[0] == '-owner') {
                b.users.owner(true, function(owner_nicks){
                    _this.say('owner(s): ' + c.rainbow(owner_nicks.join(', ')), 2, {ignore_bot_speak: true});
                    return;
                });
            } else if(command_args_org[0] === '-link') {
                say_my_name = 'link: https://github.com/z0mbieparade/b0t';
            } else {
                say_my_name = 'for more info try ' + config.command_prefix + 'help, ' + config.command_prefix + 'commands, or ' + _this.t.highlight(bot.nick + ' -version|-owner|-link');
            }   

            _this.say(say_my_name, 2, {ignore_bot_speak: true, to: nick});

        //respond to command
        } else if (text_split !== null && text_split.length > 1) {

            _this.log.debug('attempt command (PM):', nick, "'"+text+"'");

            if(!_this.users[nick]){
                _this.users[nick] = new User(nick, 'PM', '', true);
            }

            var command = text_split[1];
            var command_str = text_split[2].trim();

            var command_data = b.cmds.command(command, _this.users[nick]);

            if(command_data.err){
                _this.log.error(command_data.err);
                return;
            }
            
            b.cmds.verify_command(_this.users[nick], command, {help: true, is_pm: true}, function(cmd){
                if(cmd !== false){

                     var command_args = b.cmds.parse_command_input(_this.users[nick], _this, command, command_str);

                    if(command_args.err){
                        _this.log.error(command_args.err);
                        _this.say(command_args.err === 'help' ? cmd : cmd + ' ' + _this.t.errors( '(' + command_args.err.join(', ') + ')'), 2, {to: nick, skip_verify: true});
                    } else {

                        try {
                            if(command_data.no_pm){
                                _this.say({err: 'This command can only be used in a channel!'}, 3, {to: nick});
                            } else {
                                command_data.func(_this, _this.users[nick], function(){
                                    if(!arguments || arguments.length < 1){
                                        return;
                                    } else if(arguments.length === 2){
                                        var level = typeof arguments[1] === "number" ? arguments[1] : 1;
                                        var options = typeof arguments[1] === "object" ? arguments[1] : {};
                                    } else {
                                        var level = typeof arguments[1] === "number" ? arguments[1] : 1;
                                        var options = typeof arguments[2] === "object" ? arguments[2] : {};
                                    }
                                    var msg = arguments[0];

                                    options = Object.assign({}, {
                                        is_cmd: true,
                                        nick: nick,
                                        to: nick,
                                    }, options);

                                    _this.say(msg, level, options);
                                }, command_args, command_str);
                            }
                        } catch(e) {
                            _this.log.error(e);
                            _this.say({'err': 'Something went wrong'}, 3, {to: nick});
                        }
                    }
                }

            });

        //everything else
        } else {

            //this is a bot PM with no recognized command
            var str = 'Type ' + _this.t.highlight(config.command_prefix + 'commands') + ' for list of commands. For more info about a specific command, type ';
                str += _this.t.highlight(config.command_prefix + 'command help');
        	_this.say(str , 3, {skip_verify: true, to: nick});
        }
    }

    action(nick, text){
        var _this = this;

        if(!_this.users[nick]){
            _this.users[nick] = new User(nick, 'PM', '', true);
        }

        var actions = {
            'licks': 'takes a bath, gross',
            'hugs': 'glomps ' + nick,
            'pets': 'purrrs',
            'kicks': 'slaps ' + nick,
            'slaps': 'punches ' + nick,
            'punches': 'kicks ' + nick,
            'loves': 'hugs ' + nick
        };

        var action_regex = new RegExp('^(' + (Object.keys(actions)).join('|') + ')\\s' + bot.nick, 'i');
        var get_action = text.match(action_regex);
        if (get_action !== null && this.config.respond_to_bot_name) { 
            _this.say('/me ' + actions[get_action[1]], {to: nick})
        }
    }
}