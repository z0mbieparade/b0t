//for PM msgs
function PM() {
    var _this = this;
    this.is_pm = true;
    this.chan = bot.nick;
	this.config = JSON.parse(JSON.stringify(config.chan_default));
    this.t = new Theme(config.chan_default.theme, config.chan_default.disable_colors);

    log4js.addAppender(log4js.appenders.file(__botdir + '/logs/PM_' + b.log_date + '.log'), 'PM');
    this.log = log4js.getLogger('PM');
    this.log.setLevel(config.debug_level);

    this.SAY = new Say(true, bot.nick);

    this.log.info('Private Message receiver activated!');
}



PM.prototype.message = function(nick, text){
	var _this = this;

    x.send_tell_messages(nick);

    var text_split = text.match(new RegExp('^' + config.command_prefix + '(\\S+)\\s*(.*)$'));

    //say the bots name
    if (text.match(new RegExp('^' + bot.nick)) !== null && this.config.respond_to_bot_name) { 
        var command_args_org = text.split(' ');
        command_args_org.shift();

        var say_my_name = '';
        if(command_args_org[0] == '-version') {
            say_my_name = 'verson: ' + pkg.version;
        } else if(command_args_org[0] == '-owner') {
            x.owner_nick(true, function(owner_nick){
                _this.SAY.say('owner: ' + c.rainbow(owner_nick), 2, {ignore_bot_speak: true});
                return;
            });
        } else if(command_args_org[0] === '-link') {
            say_my_name = 'link: https://github.com/z0mbieparade/b0t';
        } else {
            say_my_name = 'for more info try ' + config.command_prefix + 'help, ' + config.command_prefix + 'commands, or ' + _this.t.highlight(bot.nick + ' -version|-owner|-link');
        }   

        _this.SAY.say(say_my_name, 2, {ignore_bot_speak: true, to: nick});

    //respond to command
    } else if (text_split !== null && text_split.length > 1) {

        _this.log.debug('attempt command (PM):', nick, "'"+text+"'");

        var command = text_split[1];
        var command_str = text_split[2].trim();

        var command_data = x.get_command(command);

        if(command_data.err){
            _this.log.error(command_data.err);
            return;
        }

        var fake_user = {
            nick: nick,
            t: _this.t,
            perm: '',
            CHAN: {
                config: _this.config,
            }
        }
        
        x.verify_command(fake_user, command, {help: true, is_pm: true}, function(cmd){
            if(cmd !== false){

                 var command_args = x.parse_command_input(fake_user, _this, command, command_str);

                if(command_args.err){
                    _this.log.error(command_args.err);
                    _this.SAY.say(command_args.err === 'help' ? cmd : cmd + ' ' + _this.t.errors( '(' + command_args.err.join(', ') + ')'), 2, {to: nick, skip_verify: true});
                } else {

                    try {
                        if(command_data.no_pm){
                            _this.SAY.say({err: 'This command can only be used in a channel!'}, 3, {to: nick});
                        } else {
                            command_data.func(_this, fake_user, function(){
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

                                _this.SAY.say(msg, level, options);
                            }, command_args, command_str);
                        }
                    } catch(e) {
                        _this.log.error(e);
                        _this.SAY.say({'err': 'Something went wrong'}, 3, {to: nick});
                    }
                }
            }

        });

    //everything else
    } else {

        //this is a bot PM with no recognized command
        var str = 'Type ' + _this.t.highlight(config.command_prefix + 'commands') + ' for list of commands. For more info about a specific command, type ';
            str += _this.t.highlight(config.command_prefix + 'command help');
    	_this.SAY.say(str , 3, {skip_verify: true, to: nick});
    }
}

module.exports = PM;