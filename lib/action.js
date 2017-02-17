
var Entities    = require("html-entities").AllHtmlEntities,
    flatfile    = require('flat-file-db'),       //remove eventually
    db          = flatfile(__dirname + '/db.db'), //remove eventually
    entities    = new Entities(),
    xml2js      = require('xml2js').parseString,
    htmlparser  = require("htmlparser2"),
    JsonDB      = require('node-json-db'),
    jdb         = new JsonDB(__dirname + '/../db.json', true, true),
    stripAnsi   = require('strip-ansi'),
    ytInfo      = require('youtube-info');

db.on('open', function() {
    log.debug('DB Loaded');

    //clean db
    action.get_db_data('/', function(db_root){
        var filter_empty = function(data){
          for(var key in data){
            if(typeof(data[key]) === 'object'){
              if(Array.isArray(data[key])){
                        if(data[key].length === 0){ 
                    delete data[key];
                } else {
                    filter_empty(data[key]);
                }
              } else {
                if(Object.keys(data[key]).length === 0){
                    delete data[key];
                } else {
                    filter_empty(data[key]);
                }
              }
            }
          }
          return data;
        }

        if(db_root.buffer) delete db_root.buffer;
        if(db_root.speak) delete db_root.speak;

        action.update_db('/', filter_empty(db_root), true, function(action){
            log.debug('DB Cleaned');
        });
    });
});

var ACT = exports.ACT = function(){
    this.chan = null;
    this.nick = null;
    this.is_pm = function(){ return action.chan === action.nick };
    this.bot = null;
    this.is_cmd = false;
    this.max_str_len = 340;
    this.whois = {};
    this.is_discord = false;
}

//error handling
ACT.prototype.er = function(err){
    log.error(err);
    return c.red('Error: ' + err);
}

//level 1: always say in chat
//level 2: only say in chat if less_chan_spam = false, otherwise send a notice
//level 3: notice only
ACT.prototype.say = function(msg, level, options){
    options = Object.assign({}, {
        skip_verify: false, //will attempt to say the message AS IS
        to: null, //only set if you want to override default and say something to a specific user
        url: '', //if you have a url you want tacked on to the end of message after it's been verified (like a read more)
        ignore_bot_speak: false, //doesn't update bot speak interval, and ignores limit_bot_speak_when_busy if true
        skip_buffer: false, //if true, says string without adding it to buffer
        copy_buffer_to_user: false, //if true, copy buffer from action.chan to action.nick before speaking to user
        page_buffer: false, //if true, instead of saying message, pages the buffer
        join: ' ', //join buffer
        lines: 5, //lines to display from buffer
        force_lines: false, //if true, then overrides any line setting options
        ellipsis: null //if true add ... after text in buffer cutoff
    }, options);

    if(msg && msg.err){
        action.say(this.er(msg.err), 2, {skip_verify: true, skip_buffer: true, ellipsis: false});
        return;
    }

    if(level === 2 && config.less_chan_spam){
        level = 3;
    } else if (level === 2 && !config.less_chan_spam){
        level = 1;
    }

    if(options.to === null){
        options.to = level === 1 ? action.chan : action.nick;
        options.lines = level === 1 && !action.is_pm() && options.force_lines === false ? 2 : options.lines;
    }

    options.ellipsis = options.ellipsis === null ? options.join !== '\n' : options.ellipsis;

    if(options.page_buffer === true){
        options.skip_buffer = true;
        options.skip_verify = true;
    }

    if(!options.to){
        log.error('Invalid send to: ', options.to);
        return;
    }

    var get_buffer = function(callback){
        if(options.page_buffer === true){
            action.page_buffer(options, function(data, buffer_opt){
                callback(data, buffer_opt);
            });
        } else {
            callback();
        }
    }

    //when chan is busy, send bot speak to notice, unless user is owner, or ignore_bot_speak = true
    var check_chan_busy_status = function(callback){
        if(options.ignore_bot_speak === false &&
           config.limit_bot_speak_when_busy && 
           config.wait_time_between_commands_when_busy &&
           action.nick !== config.owner && 
           level === 1){ 

            action.check_busy(function(busy_status){
                log.warn('busy_status', busy_status);
                if (busy_status !== false){

                    //check how long it's been since a user has used a command
                    action.check_command_count(function(user_cmd_count){
                        if(user_cmd_count){
                            log.warn(action.chan, 'busy, wait', action.ms_to_time(user_cmd_count), 'sending to notice.');
                            log.warn(action.chan, 'avr time between chan speak', action.ms_to_time(busy_status));
                            action.say({'err': 'busy, wait ' + action.ms_to_time(user_cmd_count) + ' before you can use a command in chat.'}, 3, {ignore_bot_speak: true, skip_verify: true})

                            level = 3;

                            callback();
                        }
                    });
                } else {
                    callback();
                }
            });
        } else {
            callback();
        }
    }

    //this is a command, update command speak
    var update_chan_speak_status = function(){
        if(options.ignore_bot_speak === false &&
           action.is_cmd === true && 
           action.nick !== config.owner && 
           level === 1){
           action.update_chan_speak('cmd/'+action.nick);
        } 
    }
    
    var say_str = function(str, opt){
        str = str.trim();

        var more = '';
        if(opt.ellipsis && opt.skip_buffer !== undefined && opt.skip_buffer !== true){
            if(opt.join === '\n'){
                str += '...';
            } else {
                str += '...\n';
            }
        }

        var end = more + (opt.url === '' ? '' : opt.url) + (opt.next_info ? ' ' + opt.next_info : '');
        if(end.trim() !== '') str += '\n' + end;

        var do_action = false;
        if(str.indexOf('/me') === 0){
            do_action = true;
            str = str.slice(3, str.length);
            str = str.trim();
        }

        if(action.is_discord === true)
        {
            str = c.stripColorsAndStyle(str);
        }

        if(level === 1){
            if(!options.ignore_bot_speak && options.to !== action.nick) action.update_chan_speak('chan');
            //do_action ? action.bot.action(options.to, str) : action.bot.say(options.to, str);
            //return;
        //} else {
            //do_action ? action.bot.action(options.to, str): action.bot.notice(options.to, str);
            //return;
        }

        do_action ? action.bot.action(options.to, str) : action.bot.say(options.to, str);
    }

    var check_skip_buffer = function(buffer_opt){
        if(options.skip_buffer === true){
            var str = typeof msg !== 'string' ? msg.join(options.join) : msg;
            str = options.skip_verify === true ? str : action.verify_string(str, options.url);
            say_str(str, buffer_opt || options);
        } else {
            action.add_to_buffer(msg, options, function(data, opt){
                say_str(data, opt);
            });
        }
    }

    var init_speak = function(){
        get_buffer(function(data, buffer_opt){
            if(data) msg = data;
            check_chan_busy_status(function(){
                update_chan_speak_status();
                check_skip_buffer(buffer_opt);
            });
        });
    }

    if(options.copy_buffer_to_user === true && action.is_pm() === false){
        level = 3;
        options.to = action.nick;
        action.copy_buffer(action.chan, action.nick, function(){
            init_speak();
        });
    } else {
        init_speak();
    }
    
}

//verifies and strips strings before speaking them
ACT.prototype.verify_string = function(str) {
 if(typeof str !== 'string'){
        log.error('verify_string: str is a', typeof str, str);
        if(typeof str === 'object'){
            var tmp_str = '';
            for(var key in str){
                tmp_str += key + ': ' + str[key] + '\n';
            }
            str = tmp_str;
        } else {
            str = JSON.stringify(str);
        } 
    } 

    //strip tags
    str = str.replace(/<\/?[^>]+(>|$)/g, "");
    str = str.trim();

    var breaks = str.match(/\r?\n|\r/g) || [];

    //if there are more than 3 new line breaks, remove them.
    if(breaks.length > 3){
        str = str.replace(/\r?\n|\r/g, ' ');
    }

    return str; 
};

//add a large amount of data to user buffer
//good if you need the bot to say a huge amount of data
//overwites current user buffer
//data_obj should be an array. Array items over options.max_str_len chars are converted to another array item
ACT.prototype.add_to_buffer = function(data, options, callback){
    options = Object.assign({}, {
        skip_verify: false, 
        to: action.nick,
        join: ' ',
        ellipsis: null
    }, options);

    if(!options.to || options.to === 'undefined'){
        log.error('undefined to');
        return;
    }

    options.ellipsis = options.ellipsis === null ? options.join !== '\n' : options.ellipsis;

    var new_data_obj = [];

    var split_string = function(str){
        if(options.join !== '\n' && options.skip_verify !== true) str = action.verify_string(str);
        var pat = new RegExp('.{' + action.max_str_len + '}\w*\W*|.*.', 'g');
        str.match(pat).forEach(function(entry) {
            if(entry === '' || entry === null || entry === undefined) return;
            entry = options.skip_verify ? entry : action.verify_string(entry);
            new_data_obj.push(entry);
        });
    }

    if(data === null || data === false || data === '' || data.length < 1){ //no data
        new_data_obj = '';
    } else if (typeof data === 'string'){ //string
        split_string(data);
    } else if(typeof data === 'object' && Array.isArray(data)){ //array
        data.forEach(function(item, i){
            split_string(item);
        });
    } else if(typeof data === 'object' && !Array.isArray(data)){ //object
        for(var key in data){
            var temp_str = key + ': ' + data[key];
            split_string(temp_str);
        }
    } else {
        log.error('verify_string: str is a', typeof data, data)
        split_string(JSON.stringify(data));
    }

    if(new_data_obj.length <= options.lines){
        options.ellipsis = false;
        callback(new_data_obj.join(options.join), options);
    } else {
        new_data_obj.unshift({
            first_len: new_data_obj.length, 
            join: options.join,
            id: action.guid(),
            ellipsis: options.ellipsis
        });

        this.update_db('/buffer/' + options.to, new_data_obj, true, function(act){
            if(act === 'add'){
                action.page_buffer(options, function(data, new_opt){

                   if(action.is_pm()){
                        data = c.teal('To page through buffer, type ' + config.command_prefix + 'next. (type ' + config.command_prefix + 'next help for more info)\n') + data;
                    }

                    log.debug('added to ' + options.to + '\'s buffer!')
                    callback(data, new_opt);
                });
            } else {
                log.debug('cleared ' + options.to + '\'s buffer!')
            }
        });
    }
}

//activated when user sends !next in PM to bot
//pages thru buffer, removes paged buffer lines
ACT.prototype.page_buffer = function(options, callback){
    options = Object.assign({}, {
        lines: undefined, //lines to send, default 5. Max 10, unless join is not a new line. Then max is 20.
        join: ' ', //what to join lines by
        to: action.nick,
        url: '',
        ellipsis: null
    }, options);

    if(options.join === '\n'){
        options.lines = options.lines !== undefined && +options.lines < 11 && +options.lines > 0 ? options.lines : 5; 
    } else if(options.join === ' ') {
        options.lines = options.lines !== undefined && +options.lines < 21 && +options.lines > 0 ? options.lines : 5;
    } else {
        options.join = ' ' + c.teal(options.join) + ' ';
        options.lines = options.lines !== undefined && +options.lines < 21 && +options.lines > 0 ? options.lines : 5; 
    }

    options.ellipsis = options.ellipsis === null ? options.join !== '\n' : options.ellipsis;

    this.get_db_data('/buffer/' + options.to, function(old_buffer){
        if(old_buffer !== null && old_buffer !== undefined && old_buffer !== '' && old_buffer.length > 1){
            var send_data = old_buffer.splice(1, options.lines);

            options.next_info = c.teal('(' + (old_buffer[0].first_len - (old_buffer.length - 1)) + '/' + old_buffer[0].first_len + ')');
            options.join = options.join === ' ' && old_buffer[0].join !== ' ' ? old_buffer[0].join : options.join;
            options.ellipsis = old_buffer[0].ellipsis !== undefined && old_buffer[0].ellipsis !== null ? old_buffer[0].ellipsis : options.ellipsis;

            old_buffer = old_buffer.length === 1 ? '' : old_buffer;
            action.update_db('/buffer/' + options.to, old_buffer, true, function(act){
                if(act === 'add'){
                    log.debug('updated ' + options.to + '\'s buffer!')
                } else {
                    log.debug('cleared ' + options.to + '\'s buffer!')
                }
                callback(send_data.join(options.join), options);
            });
        } else {
            action.say({'err': 'No buffer to page through.'});
        }
    });
}

ACT.prototype.copy_buffer = function(from, to, callback){
    if(!from || from === 'undefined' || !to || to === 'undefined'){
        log.error('from and to required');
        callback();
        return;
    }
    action.get_db_data('/buffer/' + from, function(from_buffer){
        if(from_buffer === null){
            log.debug('no buffer to copy from', from);
            callback();
            return;
        }

        action.get_db_data('/buffer/' + to, function(to_buffer){

            log.debug('copy_buffer from:', from, 'to:', to, 'from_buffer_id:', from_buffer[0].id, 'to_buffer_id:', to_buffer && to_buffer[0] && to_buffer[0].id ? to_buffer[0].id : null);

            //don't copy buffer again if it's already got the same buffer
            if(to_buffer !== null && from_buffer[0].id === to_buffer[0].id){
                log.debug('skipping copy, buffer from ', from, 'already coppied to ', to);
                callback();
                return;
            }

            if(from_buffer !== null && from_buffer !== undefined && from_buffer !== '' && from_buffer.length > 1){
                var new_buffer = from_buffer.slice(0);
                new_buffer[0].coppied = true;
                action.update_db('/buffer/' + to, new_buffer, true, function(act){
                    if(act === 'add'){
                        log.debug('copied ' + from + ' to ' + to + '\'s buffer!')
                    } else {
                        log.debug('cleared ' + to + '\'s buffer!')
                    }

                    callback();
                });
            } else {
                callback({'err': 'No buffer to page through.'});
            }
        });
    }, true);
}

//TODO: this
//update cmd_override.json during runtime
ACT.prototype.update_cmd_override = function(){
    var cmd_db = new JsonDB(__dirname + '/../cmd_override.json', true, true);
    try {
        var data = cmd_db.getData('/');
    } catch(e) {
        log.error(e.stack)
    }

}

ACT.prototype.update_chan_speak = function(type){
    var epoc = (new Date()).getTime();

    try{
        var msg_arr = jdb.getData("/speak/"+action.chan+'/'+type);
        msg_arr.push(epoc);
        if(msg_arr.length > 5){
            msg_arr.shift();
        }
    }catch(e){
        log.error(e.message);
        var msg_arr = [epoc];
    }
    jdb.push("/speak/"+action.chan+'/'+type, msg_arr, true);
}

//check when the last time a user used a command
//return milliseconds left before user can use a command again
//otherwise return false
ACT.prototype.check_command_count = function(callback){
    try{
        var cmd_arr = jdb.getData("/speak/"+action.chan+'/cmd/'+action.nick);
        if(cmd_arr.length > 0){
            var epoc = (new Date()).getTime();
            var cmd_timeout = cmd_arr[cmd_arr.length - 1] + config.wait_time_between_commands_when_busy; //default 10min

            if(epoc < cmd_timeout){
                callback(cmd_timeout - epoc);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    }catch(e){
       log.error(e.stack); 
    }
}

//returns average seconds between last 5 messages in the channel if busy,
//otherwise returns false if not busy
ACT.prototype.check_busy = function(callback){
    try{
        var msg_arr = jdb.getData("/speak/"+action.chan+'/chan');
        if(msg_arr.length > 4){
            var epoc = (new Date()).getTime();
            var since_last_speak = epoc - msg_arr[msg_arr.length - 1];

            //if the time since the last time someone spoke in chat is 2x limit_chan_speak_when_busy,
            //let the bot speak in chat
            if(since_last_speak < (config.busy_interval * 2)){ //1 min

                //otherwise average all of the speaking
                //and if the average of the last 5 lines in chat is
                //less than half the limit_chan_speak_when_busy setting, 
                //send to notice.
                var sum = 0;
                for(var i = 1; i < msg_arr.length; i++){
                    sum = sum + (msg_arr[i] - msg_arr[i-1]);
                }

                var avr = Math.floor(sum / (msg_arr.length - 1));
                if(avr <= config.busy_interval){ //30 sec
                    callback(avr);
                } else {
                    log.debug('FALSE speak avr', action.ms_to_time(avr), 'is <= config.busy_interval', action.ms_to_time(config.busy_interval / 2));
                    callback(false);
                }
            } else {
                log.debug('FALSE since last speak', action.ms_to_time(since_last_speak), 'is <', action.ms_to_time((config.busy_interval * 2)));
                callback(false);
            }
        } else {
            log.warn('FALSE less than 4 messages in db');
            callback(false);
        }
    }catch(e){
       log.error(e.message); 
       callback(false);
    }
}

ACT.prototype.send = function(cmd, command_string){
    this.bot.send(cmd, action.chan, command_string);
}

ACT.prototype.get_url = function(url, type, callback, options){
    options = Object.assign({}, {
        only_return_text: false, //if true and type = html, instead of returning an array of dom object, returns an array of text only.
        only_return_nodes: null //{attr: {'class': 'zoom'}} {tag: ['tag_name']} searched for only these values and returns them
    }, options);

    if (type === 'youtube') {
        ytInfo(url, function (err, videoInfo) {
            if (err) return;
            callback(videoInfo);
        });
    } else {

        request({url: url, maxRedirects: 4}, function (error, response, body) {

            //Check for error
            if(error){
                return log.error('Error:', error);
            }

            //Check for right status code
            if(response.statusCode !== 200){
                return log.error('Invalid Status Code Returned:', response.statusCode);
            }

            if(type === 'json'){
                callback(JSON.parse(body));
            } else if(type === 'xml'){
                xml2js(body, function(err, result) {
                    callback(result);
                });
            } else  if(type === 'html' || type === 'sup') {
                var parsed = [];

                var push_tag = null;
                var parser = new htmlparser.Parser({
                    onopentag: function(name, attribs){
                        if(type === 'sup' && name !== 'title') return;
                        if(name === 'br' || name == 'hr' || options.only_return_text) return;

                        if(options.only_return_nodes){
                            if(options.only_return_nodes.attr){
                                for(var attr in options.only_return_nodes.attr){
                                    if(attribs[attr] === undefined || attribs[attr] !== options.only_return_nodes.attr[attr]) return;
                                }
                            }

                            if(options.only_return_nodes.tag){
                                if(options.only_return_nodes.tag.indexOf(name) < 0) return;
                            }
                        }

                        push_tag = {
                            tag: name
                        };

                        if(attribs){
                            push_tag.attr = attribs;
                        }
                    },
                    ontext: function(text){
                        text = text.trim();

                        if(push_tag && type === 'sup' && push_tag.tag === 'title' && text.length > 0){
                            callback(text);
                            parser.parseComplete();
                        }

                        if(text.length > 0){
                            if(options.only_return_text === true){
                                parsed.push(text);
                            } else if(options.only_return_nodes !== undefined) {
                                if(push_tag === null){
                                    return;
                                } else {
                                    push_tag.text = text;
                                }
                            } else {
                                push_tag ? push_tag.text = text : push_tag = {text: text};
                            }
                        } else {
                            return;
                        }
                    },
                    onclosetag: function(tagname){
                       if(push_tag && !options.only_return_text) {
                            parsed.push(push_tag);
                            push_tag = null;
                       }
                    },
                    onend: function() {
                        if(type !== 'sup'){
                            callback(parsed);
                        }
                    }
                }, {decodeEntities: false});
                body = entities.decode(body);
                parser.write(body);
                parser.end();
            } else {
                callback(body);
            }
        });
    }
}


ACT.prototype.get_command = function(cmd){
    if(command_by_plugin[cmd]){
        var command_data = Object.assign({}, commands[command_by_plugin[cmd]].cmds[cmd], {
            category: command_by_plugin[cmd],
            info: commands[command_by_plugin[cmd]].info
        });

        return command_data;
    }

    return {'err': 'No command found.'};
}

//get syntax for command
//short default false, returns full syntax, true returns just !cmd <*param> (*optional) (colors)
//micro default false, returns full syntax, true returns just !cmd <*param>
ACT.prototype.cmd_syntax = function(cmd, short, micro){
    micro = micro || false;
    short = short === true || micro === true ? true : false;

    var cm = commands[command_by_plugin[cmd]].cmds[cmd];
    var syntax = config.command_prefix + cmd;

    if(cm.params && cm.params.length > 0) {
        syntax += ' <' + cm.params.join('> <') + '>';
    }



    if(micro){
        return syntax;
    } else if(short){
        if (syntax.indexOf('*') > -1) syntax += c.olive(' (* optional)');
        if (cm.colors) syntax += c.rainbow(' colors');
        return syntax;
    } else {
        if (syntax.indexOf('*') > -1) syntax += c.olive(' (* params are optional)');
        if (cm.colors) syntax += c.purple(' (accepts ') + c.rainbow('colors!') + c.purple(')');

        return c.teal('Usage: ') + syntax + ' ' + c.teal('Description: ') + cm.action + '.';
    }
}

//returns an array of all commands avaliable for a nick
//if help = true, returns with command syntax
ACT.prototype.verify_commands = function(help){
    var cmd_arr = [];
    for(cmd in command_by_plugin){
        var cmd_str = action.verify_command(cmd, help);
        if(cmd_str !== false && cmd_str !== undefined) cmd_arr.push(cmd_str);
    }

    cmd_arr = cmd_arr.sort();
    return cmd_arr;
};

ACT.prototype.verify_command = function(cmd, help){

    var category = command_by_plugin[cmd];
    
    //if not exists, return
    if(!commands[category]) {
        log.error('No category with that name in commands object');
        return false;
    }

    //if not exists, return
    if(!commands[category].cmds[cmd]) {
        log.error('No command with that name in commands object');
        return false;
    }

    var command = commands[category].cmds[cmd];

    //skip if command has disabled = true
    if(command.disabled || (cmd_override[cmd] && cmd_override[cmd] === "disabled")){
        log.debug('skipping ' + config.command_prefix + cmd + ' because disabled');
        return false;
    }

    //skip if missing api key in info that is required in command api arr
    if(command.API){
        for(var i = 0; i < command.API.length; i++){
            var api_cat = command.API[i];
            if(!config.API || !config.API[api_cat] || !config.API[api_cat].key){
                log.debug('skipping ' + config.command_prefix + cmd + ' because requires ' + api_cat + ' api key, but none is provided');
                return false;
            }
        }
    } 

     //skip if missing plugin setting in info that is required in settings arr
    if(command.settings){
        for(var i = 0; i < command.settings.length; i++){
            var setting_cat = command.settings[i];
            var setting_arr = setting_cat.split('/');

            if(!config.plugin_settings || !config.plugin_settings[setting_arr[0]]){
                log.debug('skipping ' + config.command_prefix + cmd + ' because requires ' + setting_arr[0] + ' plugin_setting, but none is provided');
                return false;
            } 

            var setting = config.plugin_settings[setting_arr[0]];
            if(setting_arr.length > 1){
                for(var s = 1; s < setting_arr.length; s++){
                    if(setting[setting_arr[s]] !== '' && setting[setting_arr[s]] !== null && setting[setting_arr[s]] !== undefined){
                        setting = setting[setting_arr[s]];
                    } else {
                        log.debug('skipping ' + config.command_prefix + cmd + ' because requires ' + setting_cat + ' plugin_setting, but none is provided');
                        return false;
                    }
                }
            }
        }
    } 

    //if this is the owner of the bot, they can run owner only commands, and gain all permissions, otherwise check permissions
    if(action.nick !== config.owner){
        //if this is a command with 'owner' for permissions, and this is not the owner, skip
        if(command.perm && command.perm === 'owner'){
            log.debug('skipping ' + config.command_prefix + cmd + ' because ' + action.nick + ' is not the owner');
            return;
        }

        //if this is say, a pm, and there are no user perms, look for the user in another chan
        //and choose the highest permission. If they aren't in one, just asume they're unvoiced with
        //lowest permissions.
        if(!names[action.chan] || !names[action.chan][action.nick]){
            names[action.chan] = names[action.chan] || {};
            names[action.chan][action.nick] = '';
            for(var ch in names){
                for(var n in names[ch]){
                    if( n === action.nick && 
                        config.permissions.indexOf(names[ch][n]) > 
                        config.permissions.indexOf(names[action.chan][action.nick])){

                        names[action.chan][action.nick] = names[ch][n];
                    }
                }
            }
        }

        var test_perm = command.perm || '';
        if(cmd_override[cmd]){
            test_perm = cmd_override[cmd];
        } 

        //skip if required perms not met
        if(test_perm !== '' && config.permissions.indexOf(names[action.chan][action.nick]) < config.permissions.indexOf(test_perm)){
            log.debug('skipping ' + config.command_prefix + cmd + ' because ' + action.nick + ' does not have required permissions');
            return false;
        } 

    }

    return help ? action.cmd_syntax(cmd) : config.command_prefix + cmd;
}

ACT.prototype.export_db = function(){
    var obj = {};
    var keys = db.keys();
    for(var i = 0; i < keys.length; i++){
        obj[keys[i]] = db.get(keys[i]);
    }

    jdb.push("/nicks/", obj, true);

    return obj;
}

//get user data
ACT.prototype.get_user_data = function(nick, options, callback) {
     options = Object.assign({}, {
        label: null, // name name, purely for speaking purposes
        col: '', // command name usually (the one used to register data, not the one calling it), but can be any data column under user name in db
        register_syntax: null, //by default, tries to get syntax for col as command. if col is not a command and skip_say:true, this should not be null
        skip_say: false, //return false instead of error message if not registered
        ignore_err: false 
    }, options);

     if(command_by_plugin[options.col]){
        //if no label provided, but col is a command with at least 1 param, use the first param as the label
        if(options.label === null && 
            commands[command_by_plugin[options.col]].cmds[options.col].params && 
            commands[command_by_plugin[options.col]].cmds[options.col].params[0]) 
                options.label = commands[command_by_plugin[options.col]].cmds[options.col].params[0];

        if(options.register_syntax === null && 
            !options.skip_say &&
            command_by_plugin[options.col] !== undefined) options.register_syntax = action.cmd_syntax(options.col, true);
     }
    

    var path = "/nicks/" + nick + '/' + options.col;
    try{
        var user_data = jdb.getData(path);
        callback(user_data);
    } catch(e) {
        if(!options.ignore_err) log.error('no user data found for', nick, 'in', path);
        if(!options.skip_say){
            var str = c.red(nick + ', your ') + c.teal(options.label) + c.red(' is not registered, please type ') + c.teal(options.register_syntax) + c.red(' to register it');
            action.say({'err': str}, 2, {skip_verify: true});
        } else {
            callback(false);
        }
    }
}



ACT.prototype.get_all_users_in_chan_data = function(options, callback) {
    options = Object.assign({}, {
        label: null,
        col: null,
        chan: action.chan,
        no_highlight: true, //inserts zero width no-break space character in irc nick so it doesn't ping users
        merge_dupes: true, //merges dup nicks, so if user1:foo & user2:foo, returns foo:user1|user2 instead of foo:[user1,user2]
        skip_say: true,
        ignore_err: true
    }, options);

    var rows = {},
        count = 0;

    if(!names[options.chan]){
        action.say({'err': 'No users registered with ' + c.teal(options.label) + ' currently in the channel'});
    }

    if(options.col === null){
        callback(Object.keys(names[options.chan]));
        return;
    } else {
        Object.keys(names[options.chan]).forEach(function(key) {
            action.get_user_data(key, options, function(user_data){
                if(user_data !== false){
                    rows[key] = user_data;
                    count++;
                }
            });
        });
    }
    

    if (count === 0) {
        action.say({'err': 'No users registered with ' + c.teal(options.label) + ' currently in the channel'});
    } else {

        var user_dups = {};
        for(var irc_un in rows){
            var un = rows[irc_un];
            irc_un = options.no_highlight ? action.no_highlight(irc_un) : irc_un;
            user_dups[un] ? user_dups[un].push(irc_un) : user_dups[un] = [irc_un];
        }

        if(options.merge_dupes){
            var dup_merge = {};
            for(var un in user_dups){
                dup_merge[un] = user_dups[un].join('|');
            }
            callback(dup_merge);
        } else {
            callback(user_dups);
        }
    }
}

/* data = {
    col: 'db_col_name',
    data: 'data to update col to'
} */
ACT.prototype.update_user = function(nick, data, callback) {
    try{
        jdb.push("/nicks/"+nick+'/'+data.col, data.data);
        if(data.data === ''){
            callback({msg: c.teal(nick) + '\'s ' + data.col + ' has now been removed', act: 'remove'});
        } else {
            callback({msg: c.teal(nick) + '\'s ' + data.col + ' has now been set', act: 'add'});
        }
    } catch(e) {
        log.warn(e.message);
    }
}

ACT.prototype.send_tell_messages = function(nick){
    action.get_user_data(nick, {
        label: 'mesages',
        col: 'msg',
        ignore_err: true,
        skip_say: true
    }, function(messages){
        for(var sender in messages){
            if(messages[sender]){
                action.say(sender + ' said to tell ' + messages[sender], 3, {to: nick});
                action.say('told ' + messages[sender], 3, {to: sender});
            }
        }

        try{
            jdb.delete("/nicks/"+nick+'/msg');
        } catch(e) { 
            log.warn(e.message)
        }
    });
}

ACT.prototype.get_db_data = function(path, callback, deep_copy){
    try{
        var data = jdb.getData(path);
        if(deep_copy === true){
            var new_data = JSON.parse(JSON.stringify(data));
        } else {
            var new_data = data;
        }
        callback(new_data);
    }catch(e){
        callback(null);
        log.warn(e.message)
    }
}


ACT.prototype.update_db = function(path, data, overwrite, callback) {
    try{
        if(data === '' || data === undefined || data === null){
            jdb.delete(path);
            callback('remove');
        } else {
            jdb.push(path, data, overwrite);
            callback('add');
        }
    } catch(e) {
        log.error(e.message);
    }
}

ACT.prototype.delete_from_db = function(path, callback){
    try{
        var data = jdb.delete(path);
        callback(true);
    }catch(e){
        log.error(e.message)
        callback(false);
    }
}

//generate color coded 'score'
//red <= 25%, brown <= 50%, orange <= 75%, green <= 95%, teal > 95%
ACT.prototype.score = function(score, options){
    options = Object.assign({}, {
        max: 100, //max score amount
        min: 0, //min score amount
        end: '', //what comes after score number. default none, if % used, score should be a decimal value, like .0563 will convert to 5.6%
        ignore_perc: false, //don't * 100 if end === %
        score_str: null,
        colors: [ //what colors to parse, must start with 100
            {'%':100, c:'teal'}, 
            {'%':95, c:'green'}, 
            {'%':75, c:'olive'}, 
            {'%':50, c:'brown'}, 
            {'%':25, c:'red'}
        ]
    }, options);
    
    if(options.end === '%' && options.ignore_perc === false){
        score = Number((parseFloat(score) * 100).toFixed(1));
    } else {
        score = parseInt(score, 10);
    }

    options.max = parseInt(options.max, 10); 
    options.min = parseInt(options.min, 10);

    var colors = JSON.parse(JSON.stringify(options.colors));
    var first_color = colors[0].c;
    var score_perc = (((score - options.min) / (options.max - options.min)) * 100).toFixed(2);
    colors.push({'%': score_perc});

    colors.sort(function(a, b){
        return b['%'] - a['%'];
    });

    var index = 0;
    for(var i = 0; i < colors.length; i++){
        if(!colors[i].c){
            index = i;
            break;
        }
    }

    var color = colors[i - 1] ? colors[i - 1].c : first_color;

    return c[color]((options.score_str === null ? score : options.score_str) + options.end);
}

//generate unique id
ACT.prototype.guid = function(){
  var s4 = function() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
};

//inserts zero width no-break space character in irc nick so it doesn't ping users
ACT.prototype.no_highlight = function(nick){
    if(nick === undefined) return '';
    return nick.slice(0,1) + "\uFEFF" + nick.slice(1, nick.length);
}


/* returns string formatted with color codes. 
if plugin has colors:true, then command_str will be formatted.

    &b &bold 
    &i &italic
    &u &underline
    &r &reset

    -colors can use color id, or any of the array values below
    &0 &white
    &11 &cyan &aqua
    etc.

    typing: &lime>green text here 
    returns: \u00039>green text here
    displays: >green text here (in green in irc window)
*/
ACT.prototype.format = function(str){
    var cobj = {
        0:  ['white'],
        1:  ['black'],
        2:  ['navy', 'darkblue'],
        3:  ['green', 'darkgreen', 'forest'],
        4:  ['red'],
        5:  ['brown', 'maroon', 'darkred'],
        6:  ['purple', 'violet'],
        7:  ['olive', 'orange'],
        8:  ['yellow'],
        9:  ['lightgreen', 'lime'],
        10: ['teal'],
        11: ['cyan', 'aqua'],
        12: ['blue', 'royal'],
        13: ['pink', 'lightpurple', 'fuchsia'],
        14: ['gray', 'grey'],
        15: ['lightgray', 'lightgrey', 'silver']
    }
    
    var reset = "\u000f";
    var bold = "\u0002";
    var italic = "\u0016";
    var underline = "\u001f";
    var cc = "\u0003";

    var cstr = str
        .replace(/&r/g, reset).replace(/&reset/g, reset)
        .replace(/&b/g, bold).replace(/&bold/g, bold)
        .replace(/&i/g, italic).replace(/&italic/g, italic)
        .replace(/&u/g, underline).replace(/&underline/g, underline);

    for(var cid in cobj){
        cstr = cstr.replace(new RegExp('&' + cid, 'g'), cc + cid);
        for(var i = 0; i < cobj[cid].length; i++){
            cstr = cstr.replace(new RegExp('&' + cobj[cid][i], 'g'), cc + cid);
        }
    }

    return cstr;
}

//strip ANSI escape codes
ACT.prototype.strip_ansi = function(str){
    return stripAnsi(str);
}

//input milliseconds, returns hh:mm:ss
//ms if false, ignore milliseconds
ACT.prototype.ms_to_time = function(duration, ms) {
    ms = ms === false ? false : true;
    var milliseconds = parseInt((duration%1000)/100)
        , seconds = parseInt((duration/1000)%60)
        , minutes = parseInt((duration/(1000*60))%60)
        , hours = parseInt((duration/(1000*60*60))%24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return hours + ":" + minutes + ":" + seconds + (ms ? "." + milliseconds : '');
}
