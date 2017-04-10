var Entities        = require("html-entities").AllHtmlEntities,
    entities        = new Entities(),
    xml2js          = require('xml2js').parseString,
    htmlparser      = require("htmlparser2"),
    stripAnsi       = require('strip-ansi'),
    ytInfo          = require('youtube-info'),
    request         = require('request'),
    dateWithOffset  = require("date-with-offset"),
    jsonfile        = require("jsonfile");


function USE(){
	//this.SAY = new Say(true);
    //this.say = this.SAY.say;

    try {
	   words = require(__botdir + '/./words.json');
	   b.log.info('Custom words engaged!');
	}
	catch (e) {
		b.log.warn('No custom words.json, reverting to auxiliary words');
	    words = require(__botdir + '/config/./words_default.json');
	}
}

USE.prototype.init_config = function()
{
    this.t = new Theme(config.chan_default.theme, config.chan_default.disable_colors);
}

USE.prototype.techno = function(ing, adj_count, noun_count){
	var _this = this;
	adj_count = adj_count !== undefined ? adj_count : 1;
	noun_count = noun_count !== undefined ? noun_count : 1;

	var tech_arr = [];

	if(ing){
		tech_arr.push(this.cap_first_letter(_this.ing(words.techverb[_this.rand_number_between(0, words.techverb.length - 1)])));
	} else {
		tech_arr.push(words.techverb[_this.rand_number_between(0, words.techverb.length - 1)]);
	}

	tech_arr.push('the');

	for(var i = 0; i < adj_count; i++){
		tech_arr.push(words.techadj[_this.rand_number_between(0, words.techadj.length - 1)]);
	}

	for(var i = 0; i < noun_count; i++){
		tech_arr.push(words.technoun[_this.rand_number_between(0, words.technoun.length - 1)]);
	}

	return tech_arr.join(' ');
}

USE.prototype.join_and = function(arr){
    if(arr.length === 0) return ''; 
    if(arr.length === 1) return arr[0];
    if(arr.length === 2) return arr[0] + ' and ' + arr[1]; // x and x

    var pre_and = arr.splice(0, arr.length - 1);
    return pre_and.join(', ') + ', and ' + arr;//x, x, and x
}

//verb -> verbing
USE.prototype.ing = function(adj){
	adj = adj.toLowerCase();
	var special = {
		'hell': 'hella'
	};

	if(special[adj]) return special[adj];

	//ends in s, remove the s
	var ends_in_s = adj.match(/(\w+)s$/i);
	if(ends_in_s !== null) adj = ends_in_s[1];

	//ends in ie, remove the ie and add ying
	var ends_in_ie = adj.match(/(\w+)ie$/i);
	if(ends_in_ie !== null) return ends_in_ie[1] + 'ying'

	//ends in e, remove the e and add ing
	var ends_in_e = adj.match(/(\w+)e$/i);
	if(ends_in_e !== null) return ends_in_e[1] + 'ing';

	//consonant + vowel + consonant (except w, x, y), double the final consonant and add ing
	var c_v_c = adj.match(/\w*[bcdfghjklmnpqrstvwxyz][aeiou]([bcdfghjklmnpqrstvz])$/i); 
	if(c_v_c !== null) return adj + c_v_c[1] + 'ing';

	//consonant + vowel + consonant + s, remove the s and double the final consonant and add ing
	var c_v_c_s = adj.match(/(\w*[bcdfghjklmnpqrstvwxyz][aeiou])([bcdfghjklmnpqrstvwxyz])s$/i); 
	if(c_v_c_s !== null) return c_v_c_s[1] + c_v_c_s[2] + c_v_c_s[2] + 'ing';

	return adj + 'ing';
}

USE.prototype.article_adj = function(adj, info){
    if(adj !== ''){
        var article = info.match(/^(one|a|an|your|you|he|his|she|her|them|their|the|that|those|it|its)\s(.*)/i);
        if(article !== null){
            return article[1] + ' ' + adj + article[2];
        } else {
            return adj + info;
        }
    } else {
        return info;
    }
}

USE.prototype.vars = function(CHAN, str){
    var _this = this;
    var users = ['nobody', 'somebody'];
    CHAN.get_all_users_in_chan_data(null, function(data){
        users = data;
    });

    str = str.replace(/([\w\d]+\|)+([\w\d]+)/ig, function(xx){
        var or_vars = xx.split('|');
        return or_vars[_this.rand_number_between(0,or_vars.length - 1)];
    });

    for(var word in words)
    {
        var w = word.split('|');
        var var_reg = new RegExp('\\$' + w.join('[s]*|\\$') + '[s]*', 'ig');

        str = str.replace(var_reg, function(xx){
            var new_word = words[word][_this.rand_number_between(0,words[word].length - 1)];
            if(xx[xx.length - 1] === 's' && new_word[new_word.length - 1] !== 's') return new_word + 's';
            return new_word;
        });
    }

    str = str.replace(/\$user/ig, function(xx){
        return users[_this.rand_number_between(0, users.length - 1)]
    });

    return str;
}

USE.prototype.cap_first_letter = function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

USE.prototype.rand_number_between = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;;
};

//formats a string or array with a random color (excludes white, black, bold, italic, underline, reset)
USE.prototype.rand_color = function(data, disable_colors) {
    var _this = this;
    if(data === undefined){
        b.log.error('data undefined could not color');
        return;
    }

    if(disable_colors){
        return data;
    } else {
        var col_arr = [3,4,6,7,8,9,10,11,13,15];
        var c = '\u0003' + col_arr[_this.rand_number_between(0, col_arr.length - 1)];

        if(typeof data === 'string'){
            return c + data + '\u000f';
        } else {
            for(var i = 0; i < data.length; i++){
                data[i] = c + data[i] + '\u000f';
            }
            return data;
        }
    }
};

//generate unique id
USE.prototype.guid = function(){
  var s4 = function() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
};

//strip ANSI escape codes
USE.prototype.strip_ansi = function(str){
    return stripAnsi(str);
}

//converts offset -0600 -> -360 min
USE.prototype.convert_offset_to_min = function(gmt_offset){
    return (parseInt(gmt_offset, 10) / 100) * 60;
}

//input milliseconds, returns hh:mm:ss
//ms if false, ignore milliseconds
USE.prototype.ms_to_time = function(duration, ms) {
    ms = ms === false ? false : true;
    var milliseconds    = parseInt((duration%1000)/100), 
        seconds         = parseInt((duration/1000)%60), 
        minutes         = parseInt((duration/(1000*60))%60), 
        hours           = parseInt((duration/(1000*60*60))%24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return hours + ":" + minutes + ":" + seconds + (ms ? "." + milliseconds : '');
}

//input epoc, returns hh:mm:ss
//ms if false, ignore milliseconds
USE.prototype.epoc_to_date = function(epoc, offset, type){
    var date = new dateWithOffset(epoc, offset);
    return date.toString();
}

USE.prototype.get_url = function(url, type, callback, options){
    options = Object.assign({}, {
        only_return_text: false, //if true and type = html, instead of returning an array of dom object, returns an array of text only.
        only_return_nodes: null //{attr: {'class': 'zoom'}} {tag: ['tag_name']} searched for only these values and returns them
    }, options);

    var _this = this;

    if (type === 'youtube') {
        ytInfo(url, function (err, videoInfo) {
            if (err) return;
            callback(videoInfo);
        });
    } else {

        request({url: url, maxRedirects: 4}, function (error, response, body) {

            //Check for error
            if(error){
                return b.log.error('Error:', error);
            }

            //Check for right status code
            if(response.statusCode !== 200){
                return b.log.error('Invalid Status Code Returned:', response.statusCode);
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


USE.prototype.get_command = function(cmd){
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


USE.prototype.cmd_syntax = function(cmd, options){
    var _this = this;
    options = Object.assign({}, {
    	t: _this.t,
        short: false, //short default false, returns full syntax, true returns just !cmd <*param> (*optional) (colors)
        micro: false, //micro default false, returns full syntax, true returns just !cmd <*param>
        is_pm: false  //if true, display which commands cannot be used in PM
    }, options);
    options.short = options.short === true || options.micro === true ? true : false;

    var cm = commands[command_by_plugin[cmd]].cmds[cmd];
    var syntax = config.command_prefix + cmd;
    var syntax_arr = [];
    var optional = false;
    var orr = false;

    if(cm.params && cm.params.length > 0) {
        for(var i = 0; i < cm.params.length; i++){
            var p = cm.params[i];

            if (p.indexOf('|') > -1){
                p = '(' + p + ')';
                orr = true;
            }

            if (p.indexOf('*') > -1){
                p = '[' + p.replace('*', '') + ']';
                optional = true;
            }

            if(!orr && !optional)  p = '<' + p + '>';

            syntax_arr.push(p);
        }
        syntax += ' ' + syntax_arr.join(' ');
    }

    if(options.micro){
        return syntax;
    } else if(options.short){
        if (optional) syntax += options.t.warn(' [optional]');
        if (cm.colors) syntax += c.rainbow(' colors');
        if (options.is_pm && cm.no_pm === true) syntax += options.t.null(' no PMs');
        return syntax;
    } else {
        if (optional) syntax += options.t.warn(' [params are optional]');
        if (cm.colors) syntax += c.purple(' (accepts ') + c.rainbow('colors!') + c.purple(')');
        if (options.is_pm && cm.no_pm === true) syntax += options.t.null(' cannot used in PM');

        return options.t.highlight('Usage: ') + syntax + ' ' + options.t.highlight('Description: ') + cm.action + '.';
    }
}

//verifies and strips strings before speaking them
USE.prototype.verify_string = function(str) {
 if(typeof str !== 'string'){
        b.log.error('verify_string: str is a', typeof str, str);
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

//returns an array of all commands avaliable for a nick
//if help = true, returns with command syntax
//if by_plugin = true, organizes return object by plugin, instead of alphabetically
//if is_pm = true, warn which plugins can't be used in a PM
USE.prototype.verify_commands = function(USER, help, by_plugin, is_pm){
    var _this = this;
    var cmd_arr = [];
    var cmd_obj = {};
    for(cmd in command_by_plugin){
        var cmd_str = _this.verify_command(USER, cmd, help, is_pm);
        if(cmd_str !== false && cmd_str !== undefined){
            if(by_plugin){
               cmd_obj[command_by_plugin[cmd]] = cmd_obj[command_by_plugin[cmd]] || [];
               cmd_obj[command_by_plugin[cmd]].push(cmd_str);
            } else {
                cmd_arr.push(cmd_str);
            }
        }
    }

    if(by_plugin){
        for(var plugin in cmd_obj){
            if(cmd_obj[plugin].length < 1) delete cmd_obj[plugin];
        }

        return cmd_obj;
    } else {
        cmd_arr = cmd_arr.sort();
        return cmd_arr;
    }
};

USE.prototype.verify_command = function(USER, cmd, help, is_pm){
    var _this = this;
    var category = command_by_plugin[cmd];
    var chan_config = USER.CHAN.config;

    //if not exists, return
    if(!commands[category]) {
        b.log.error('No category with that name in commands object');
        return false;
    }

    //if not exists, return
    if(!commands[category].cmds[cmd]) {
        b.log.error('No command with that name in commands object');
        return false;
    }

    var command = commands[category].cmds[cmd];

    //skip if command has disabled = true
    if(command.disabled || (chan_config.cmd_override[cmd] && chan_config.cmd_override[cmd] === "disabled")){
        b.log.debug('skipping ' + config.command_prefix + cmd + ' because disabled');
        return false;
    }

    //if user is a discord user, and discord:false is set, skip command
    if(command.discord !== undefined && command.discord === false && USER.is_discord_user === true){
        b.log.debug('skipping ' + config.command_prefix + cmd + ' because disabled for discord users');
        return false;
    }

    //skip if missing api key in info that is required in command api arr
    if(command.API){
        for(var i = 0; i < command.API.length; i++){
            var api_cat = command.API[i];
            if(!config.API || !config.API[api_cat] || !config.API[api_cat].key){
                b.log.debug('skipping ' + config.command_prefix + cmd + ' because requires ' + api_cat + ' api key, but none is provided');
                return false;
            }
        }
    } 

     //skip if missing plugin setting in info that is required in settings arr
    if(command.settings){
        for(var i = 0; i < command.settings.length; i++){
            var setting_cat = command.settings[i];
            var setting_arr = setting_cat.split('/');

            if(!chan_config.plugin_settings || !chan_config.plugin_settings[setting_arr[0]]){
                b.log.debug('skipping ' + config.command_prefix + cmd + ' because requires ' + setting_arr[0] + ' plugin_setting, but none is provided');
                return false;
            } 

            var setting = chan_config.plugin_settings[setting_arr[0]];
            if(setting_arr.length > 1){
                for(var s = 1; s < setting_arr.length; s++){
                    if(setting[setting_arr[s]] !== '' && setting[setting_arr[s]] !== null && setting[setting_arr[s]] !== undefined){
                        setting = setting[setting_arr[s]];
                    } else {
                        b.log.debug('skipping ' + config.command_prefix + cmd + ' because requires ' + setting_cat + ' plugin_setting, but none is provided');
                        return false;
                    }
                }
            }
        }
    } 

    //if this is the owner of the bot, they can run owner only commands, and gain all permissions, otherwise check permissions
    if(USER.nick !== config.owner){
        //if this is a command with 'owner' for permissions, and this is not the owner, skip
        if(command.perm && command.perm === 'owner'){
            b.log.debug('skipping ' + config.command_prefix + cmd + ' because ' + USER.nick + ' is not the owner');
            return false;
        }

        var test_perm = command.perm || '';
        if(chan_config.cmd_override[cmd]){
            test_perm = chan_config.cmd_override[cmd];
        } 

        //skip if required perms not met
        if(test_perm !== '' && config.permissions.indexOf(USER.perm) < config.permissions.indexOf(test_perm)){
            b.log.debug('skipping ' + config.command_prefix + cmd + ' because ' + USER.nick + ' does not have required permissions');
            return false;
        } 

    }

    return help ? this.cmd_syntax(cmd, {t: USER.t, is_pm: is_pm}) : 
        (is_pm && command.no_pm ? _this.t.null(config.command_prefix + cmd) : config.command_prefix + cmd);
}

//timers that run on intervals based off ping/pong on server
USE.prototype.add_pong = function(cb_name, ms, cb_func){
    b.cbs[cb_name] = {
        ms: ms,
        func: cb_func
    };
}

USE.prototype.remove_pong = function(cb_name){
    delete b.cbs[cb_name];
    db.delete_from_db('/pong/cbs/' + cb_name)
}

//update pong time, run any pong timers in queue
USE.prototype.pong = function(){
    var pong_epoc = (new dateWithOffset(0)).getTime();
    db.update_db('/pong/now', pong_epoc, true);

    for(var cb_func in b.cbs){
        db.get_db_data('/pong/cbs/' + cb_func, function(cb_last){
            if(cb_last !== null){
                b.log.trace(cb_func, x.ms_to_time(b.cbs[cb_func].ms, true), x.ms_to_time(pong_epoc - cb_last, true))
                if(pong_epoc >= (cb_last + b.cbs[cb_func].ms)){
                    b.log.debug('Running PONG callback timer');
                    b.cbs[cb_func].func(cb_func);
                    db.update_db('/pong/cbs/' + cb_func, pong_epoc, true);
                }
            } else {
                db.update_db('/pong/cbs/' + cb_func, pong_epoc, true);
            }
        });
    }
}


USE.prototype.update_last_seen = function(nick, chan, action, where){
    var seen_data = {
        date: (new dateWithOffset(0)).getTime(),
        chan: chan,
        action: action,
        where: where ? where : 'irc'
    };

    db.update_db("/nicks/" + nick + '/seen', seen_data, true);
}

//get user data
USE.prototype.get_user_data = function(nick, options, callback) {
    var _this = this;
     options = Object.assign({}, {
        label: null, // name name, purely for speaking purposes
        col: '', // command name usually (the one used to register data, not the one calling it), but can be any data column under user name in db
        register_syntax: null, //by default, tries to get syntax for col as command. if col is not a command and skip_say:true, this should not be null
        skip_say: false, //return false instead of error message if not registered
        ignore_err: false,
        return_all: false //if true, return an object of all the user data (if col is set, throws error if col doesn't exist in user data) 
    }, options);

    if(command_by_plugin[options.col]){
        //if no label provided, but col is a command with at least 1 param, use the first param as the label
        if(options.label === null && 
            commands[command_by_plugin[options.col]].cmds[options.col].params && 
            commands[command_by_plugin[options.col]].cmds[options.col].params[0]) 
                options.label = commands[command_by_plugin[options.col]].cmds[options.col].params[0];

        if(options.register_syntax === null && 
            !options.skip_say &&
            command_by_plugin[options.col] !== undefined) options.register_syntax = _this.cmd_syntax(options.col, {short: true});
    }

    var path = "/nicks/" + nick + '/' + (options.return_all ? '' : options.col);
    db.get_db_data(path, function(user_data){
        if(options.return_all === false && user_data !== null && user_data !== ''){
            callback(user_data);
            return;
        } else if (options.return_all === true && user_data !== null && user_data !== '' && 
                    user_data[options.col] !== undefined && user_data[options.col] !== '' && user_data[options.col] !== null){
            callback(user_data[options.col], user_data);
            return;
        } else {
            if(!options.ignore_err) b.log.error('no user data found for', nick, 'in', path);
            if(!options.skip_say){
                var str = nick + ', your ' + options.label + ' is not registered, please type ' + options.register_syntax + ' to register it';
                callback({'err': str});
                return;
            } else {
                callback(false);
                return;
            }
        }
    }, true, nick);
}

USE.prototype.send_tell_messages = function(nick){
    var _this = this;
    _this.get_user_data(nick, {
        label: 'mesages',
        col: 'msg',
        ignore_err: true,
        skip_say: true
    }, function(messages){
        for(var sender in messages){
            if(messages[sender]){
                _this.say(sender + ' said to tell ' + messages[sender], 3, {to: nick});
                _this.say({succ: 'told ' + messages[sender]}, 3, {to: sender});
            }
        }
        db.delete_from_db("/nicks/" + nick + '/msg');
    });
}


//generate color coded 'score'
//red <= 25%, brown <= 50%, orange <= 75%, green <= 95%, teal > 95%
USE.prototype.score = function(score, options){
    options = Object.assign({}, {
        config: config.chan_default,
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
    
    if(options.config.disable_colors){
        
        return (options.score_str === null ? score : options.score_str) + options.end;
    
    } else {

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
};

//inserts zero width no-break space character in irc nick so it doesn't ping users
USE.prototype.no_highlight = function(nick){
    if(nick === undefined) return '';
    return nick.slice(0,1) + "\uFEFF" + nick.slice(1, nick.length);
};


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
USE.prototype.format = function(str, CHAN){
    var cobj = {
        '\u00030':  [ '0', 'white'],
        '\u00031':  [ '1', 'black'],
        '\u00032':  [ '2', 'navy', 'darkblue'],
        '\u00033':  [ '3', 'green', 'darkgreen', 'forest'],
        '\u00034':  [ '4', 'red'],
        '\u00035':  [ '5', 'brown', 'maroon', 'darkred'],
        '\u00036':  [ '6', 'purple', 'violet'],
        '\u00037':  [ '7', 'olive', 'orange'],
        '\u00038':  [ '8', 'yellow'],
        '\u00039':  [ '9', 'lightgreen', 'lime'],
        '\u000310': [ '10', 'teal'],
        '\u000311': [ '11', 'cyan', 'aqua'],
        '\u000312': [ '12', 'blue', 'royal'],
        '\u000313': [ '13', 'pink', 'lightpurple', 'fuchsia'],
        '\u000314': [ '14', 'gray', 'grey'],
        '\u000315': [ '15', 'lightgray', 'lightgrey', 'silver'],
        '\u001f':   ['underline', 'u'],
        '\u0016':   ['italic', 'i'],
        '\u0002':   ['bold', 'b'],
        '\u000f':   ['reset', 'r']
    };


    if(CHAN.config.disable_colors){
        for(var cid in cobj){
            for(var i = 0; i < cobj[cid].length; i++){
                str = str.replace(new RegExp('&' + cobj[cid][i], 'g'), '');
            }
        }

        return str;

    } else {
        for(var cid in cobj){
            for(var i = 0; i < cobj[cid].length; i++){
                str = str.replace(new RegExp('&' + cobj[cid][i], 'g'), cid);
            }
        }

        return str + '\u000f';
    }
}


//path to array to manage in db, ie: /bugs, /username/tags
//args are the args from the command
//id is required by -delete and -edit
USE.prototype.manage_arr = function(USER, path, args, new_data, cmd, callback){
    var _this = this;
    var type = args[0] === '-list' || args[0] === '-edit' || args[0] === '-delete' ? args[0] : '-add';
    var id = null;
    new_data = type === '-edit' && new_data !== 'undefined' && new_data !== '' && new_data !== null ? new_data.replace(/^-edit\s\d+\s/, '') : new_data;

    if((type === '-list' || type === '-edit' || type === '-delete') && _this.is_discord_user){
        callback({err: 'Discord users cannot use the ' + type + ' param.'}, 1);
        return;
    }

    if((type === '-edit' || type === '-delete') && (args.length < 2 || isNaN(args[1]) === true)){
        callback({err: 'id is required to use ' + type + '!'}, 2);
        return;
    } else {
        id = args[1];
    }   

    if(type === '-edit' && (args.length < 3 || new_data === undefined || new_data === '' || new_data === null)){
        callback({err: 'correct usage of command with edit is -edit <id> <new value>'}, 2);
        return;
    }

    if(type === '-add' && (new_data.length < 2 || new_data === '' || new_data === undefined || new_data === null)){
        callback({err: _this.cmd_syntax(cmd, {short: true, t: USER.t})});
        return;
    }

    var loop_thru = function(){
        db.get_db_data(path, function(d){

            if(d === null || d.length < 1){
                b.log.warn('nothing to loop thru in ' + path);
                callback({err: 'No data to ' + type}, 3);
                return;
            }

            var matched = false;
            var matched_arr = [];

            for(var i = 0; i < d.length; i++){
                var str = USER.t.warn('[' + (i + 1) + '] ') + d[i];

               if(id !== null && (i + 1) == id){
                    if(type === '-delete'){
                        db.delete_from_db(path + '[' + i + ']', function(deleted){
                            if(deleted){
                                matched = true;
                                callback({succ: 'Deleted!'}, 3);
                                return;
                            } 
                        })
                    } else if(type === '-edit'){
                        d[i] = new_data;
                        db.update_db(path, d, true, function(act){
                            matched = true;
                            callback({succ: 'Updated ' + str + ' -> ' + new_data}, 3);
                            return;
                        });
                    }
                } else if (id == null) {
                    matched = true;
                    matched_arr.push(str);
                } 
            }

            if (matched === false) {
                callback({err: 'No value by that id found'}, 2);
                return;
            } else if(matched === true && matched_arr.length > 0) {
                callback(matched_arr, 3);
                return;
            }
        }, true);
    }


    if(type !== '-add'){
        loop_thru();
    } else {
        db.update_db(path, [new_data], false, function(act){
            callback({succ: 'Added!'});
        });
    }
};

//rand = true, send back a random value if no id or search term set
//rand = false, send back the last item in the array
USE.prototype.search_arr = function(USER, path, args, search_for, rand, callback){
    var type = '-random';
    var id = null;
    var _this = this;

    if(args.length > 0 && isNaN(args[0]) === false){
        type = '-id';
        id = parseInt(args[0], 10);


    } else if(args.length > 0 && isNaN(args[0]) === true){
        type = '-search';

        if(_this.is_discord_user){
            callback({err: 'Discord users cannot search.'});
            return;
        }
    }

    db.get_db_data(path, function(data){
        if(data && data.length > 0){
            if(type === '-id'){
                if(data[id] === undefined){
                    callback({err: 'no item with that id found!'}, 0);
                } else {
                    callback(data[id], 1);
                }
            } else if(type === '-search'){
                var search_vals = {};
                var count_found = 0;
                var msg_found = [];
                for(var i = 0; i < data.length; i++){
                    if(data[i].toLowerCase().indexOf(search_for.toLowerCase().trim()) > -1){
                        count_found++;
                        search_vals[i] = data[i];
                        msg_found.push(USER.t.warn('[' + i + '] ') + data[i]);
                    }
                }

                if(count_found === 0){
                    callback({err: 'no values with that search term found!'}, 0);
                } else if (count_found === 1) {
                    for(idd in search_vals){
                        callback(data[idd], 1);
                    }
                } else {
                    callback(msg_found, count_found);
                }
            } else {
                if(rand){
                    callback(data[_this.rand_number_between(0, data.length - 1)], 1);
                } else {
                    callback(data.slice(-1), 1);
                }
            }
        } else {
            callback({err: 'no values have been set yet!'}, 0);
        }
    });
};

USE.prototype.input_object = function(obj, options){
    var _this = this;
    options = Object.assign({}, {
        ignore: [] //keys to ignore
    }, options);

    var response = [];

    for(var key in obj){
        if(options.ignore.indexOf(key) > -1) continue;
        if(typeof obj[key] === 'object'){
            if(Array.isArray(obj[key])){
                var arr = _this.input_object(obj[key]);

                response.push(c.red('(arr) ' + (Array.isArray(obj) ? '' : key + ': ')) + '[' + arr.join(', ') + ']');
            } else {
                response.push(c.olive('(obj) ' + (Array.isArray(obj) ? '' : key + ': ')) + '>>');
            }
        } else if(typeof obj[key] === 'string'){
            response.push(c.teal('(str) ' + (Array.isArray(obj) ? '' : key + ': ')) + '\'' + obj[key] + '\'');
        } else if(typeof obj[key] === 'boolean'){
            response.push(c.green('(bool) ' + (Array.isArray(obj) ? '' : key + ': ')) + obj[key]);
        } else if(typeof obj[key] === 'number'){
            response.push(c.yellow('(int) ' + (Array.isArray(obj) ? '' : key + ': ')) + '\u000f' + obj[key]);
        } else {
            response.push(c.purple('(' + typeof obj[key] + ') ' + (Array.isArray(obj) ? '' : key + ': ')) + obj[key]);
        }
    }
    return response;
}

USE.prototype.update_config = function(conf_data, chan){
    if(chan){
        var file = __botdir + '/chan_config/config_' + chan + '.json';
    } else {
        var file = __botdir + '/config.json';
    }

    jsonfile.writeFile(file, conf_data, {spaces: 4}, function(err) {
      console.error(err)
    });
}

module.exports = USE;