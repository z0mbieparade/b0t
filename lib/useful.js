var User            = require(__botdir + '/lib/user.js'),
    Entities        = require("html-entities").AllHtmlEntities,
    entities        = new Entities(),
    xml2js          = require('xml2js').parseString,
    htmlparser      = require("htmlparser2"),
    stripAnsi       = require('strip-ansi'),
    ytInfo          = require('youtube-info'),
    request         = require('request'),
    dateWithOffset  = require("date-with-offset"),
    jsonfile        = require("jsonfile"),
    clones          = require("clones");


function USE(){
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

/* -------------- LANGUAGE STUFF --------------------- */

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
//short if true 00:15:01.9 = 15m1s9ms
USE.prototype.ms_to_time = function(duration, ms, short) {
    ms = ms === false ? false : true;
    var milliseconds    = parseInt((duration%1000)/100), 
        seconds         = parseInt((duration/1000)%60), 
        minutes         = parseInt((duration/(1000*60))%60), 
        hours           = parseInt((duration/(1000*60*60))%24);

    if(short){
        return  (hours > 0 ? hours + 'h' : '') + 
                (minutes > 0 ? minutes + 'm' : '') + 
                (seconds > 0 ? seconds + 's' : '') +
                (ms && milliseconds > 0 ? milliseconds + 'ms' : ''); 
    } else {
        hours = (hours < 10) ? "0" + hours : hours;
        minutes = (minutes < 10) ? "0" + minutes : minutes;
        seconds = (seconds < 10) ? "0" + seconds : seconds;

        return hours + ":" + minutes + ":" + seconds + (ms ? "." + milliseconds : '');
    }
}

//input epoc, returns hh:mm:ss
//ms if false, ignore milliseconds
USE.prototype.epoc_to_date = function(epoc, offset, type){
    var date = new dateWithOffset(epoc, offset);
    return date.toString();
}

//date string to mm/dd/yy
USE.prototype.date_string_to_mdy = function(date_str){
    var date    = new dateWithOffset(date_str, 0);
    var month   = (date.getMonth() + 1),
        day     = date.getDate(),
        year    = (date.getFullYear() - 2000);

    return (month < 9 ? '0' + month : month) + '/' + (day < 9 ? '0' + day : day) + '/' + year;
}

USE.prototype.get_url = function(url, type, callback, options){
    options = Object.assign({}, {
        only_return_text: false, //if true and type = html, instead of returning an array of dom object, returns an array of text only.
        only_return_nodes: null, //{attr: {'class': 'zoom'}} {tag: ['tag_name']} searched for only these values and returns them
        return_err: false
    }, options);

    var _this = this;

    if (type === 'youtube') {
        ytInfo(url, function (err, videoInfo) {
            if (err) return;
            callback(videoInfo);
        });
    } else {

        request({url: url, maxRedirects: 3}, function (error, response, body) {

            //Check for error
            if(error){
                if(options.return_err) callback({err: error})
                return b.log.error('Error:', error);
            }

            //Check for right status code
            if(response.statusCode !== 200){
                if(options.return_err) callback({err: response.statusCode})
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

//update speak array with now, rotate if max count is reached
USE.prototype.update_speak_time = function(path, count, case_insensitive){
    var _this = this;
    var now = (new dateWithOffset(0)).getTime();

    db.get_db_data('/speak/' + path, function(time_arr){
        if(time_arr !== null){
            time_arr.push(now);
            if(time_arr.length > count){
                time_arr.shift();
            } 

            db.update_db('/speak/' + path, time_arr, true, undefined, case_insensitive);
        } else {
            time_arr = [now];
            db.update_db('/speak/' + path, time_arr, true, undefined, case_insensitive);
        }
    }, true, case_insensitive);
}

//check last time speak happened
//return false if no speak, or now > last spoke + wait time, or return ms until can speak again
USE.prototype.check_speak_timeout = function(path, wait_time, callback, case_insensitive){
    var _this = this;
    db.get_db_data('/speak/' + path, function(time_arr){
        if(time_arr !== null && time_arr.length > 0){
            var now = (new dateWithOffset(0)).getTime();
            var timeout = time_arr[time_arr.length - 1] + wait_time;

            if(now < timeout){
                b.log.debug('check_speak_timeout 1', path, _this.ms_to_time(timeout - now))
                callback(timeout - now);
            } else {
                b.log.debug('check_speak_timeout 2', path, false);
                callback(false);
            }
        } else {
            b.log.debug('check_speak_timeout 3', path, false, time_arr);
            callback(false);
        }
    }, true, case_insensitive);
}

/* -------------- COMMANDS --------------------- */

USE.prototype.parse_command_input = function(USER, CHAN, cmd, text){
    var _this = this;
    USER = Object.assign({}, {
        t: _this.t,
        perm: ''
    }, USER);

    if(text === 'help'){
        return {err: 'help'};
    }

    var errors = [];
    var params = commands[command_by_plugin[cmd]].cmds[cmd].params || [];

    var copy_params = clones(params)
    var mapped = map_input(copy_params, text, false);
    //console.log('mapped', require('util').inspect(mapped, true, 10));

    if(errors.length > 0){
        //b.log.error(errors);
        return {err: errors};
    }
    
    var flat = {};
    flatten_map(mapped, false);

    b.log.debug('flat', flat);
    return flat;

    function flatten_map(ps, or){
        for(var p = 0; p < ps.length; p++){
            var param = ps[p];

            if(param.value){
                if(param.key !== undefined){
                    flat[param.key] = param.type && param.type === 'number' ? Number(param.value) : param.value;
                } else if(or === true){
                    if(param.type !== undefined && flat[param.type] === undefined){
                        flat[param.type] = param.type && param.type === 'number' ? Number(param.value) : param.value;
                    } else {
                        flat[param.name.replace(' ', '_')] = param.type && param.type === 'number' ? Number(param.value) : param.value;
                    } 
                } else {
                    if(param.name !== undefined && flat[param.name.replace(' ', '_')] === undefined){
                        flat[param.name.replace(' ', '_')] = param.type && param.type === 'number' ? Number(param.value) : param.value;
                    } else {
                        flat[param.type] = param.type && param.type === 'number' ? Number(param.value) : param.value;
                    } 
                }

                if(param.fake) flat = Object.assign({}, param.fake, flat);
            }

            if(param.or) flatten_map(param.or, true);
            if(param.and) flatten_map(param.and);
        }
    }

    function map_input(ps, input, or, or_tree){
        //b.log.debug('input', input, 'or', or);
        var skip_reset = false;

        for(var p = 0; p < ps.length; p++){
            var param = ps[p];
            var opt = false;
            var def = undefined;
            var and_input = input;
            var perm = true;

            function delete_param(reason){
                b.log.warn('DELETE', reason);
                ps.splice(p, 1);
                p--;
            }

            if(param.perm && param.perm !== '' && !_this.check_perm(USER.perm, param.perm)) perm = false;

            if(or === true && skip_reset === true){
                delete_param('skip_reset:' + skip_reset + ' or: ' + or);
                continue;
            }

            if(param.optional !== undefined){
                if(typeof param.optional === 'boolean') opt = param.optional;
                if(typeof param.optional === 'function') opt = param.optional();
            }

            if(param.default !== undefined){
                if(typeof param.default === 'function') def = param.default(USER);
                if(typeof param.default !== 'function') def = param.default;
            }

            if(param.type && param.type !== ''){

                var regex = '^\\s*';

                switch(param.type){
                    case 'string':
                        if(param.name && param.name !== '') regex += '(\\S' + (opt ? '*' : '+') + ')';
                        break;
                    case 'number':
                        if(param.name && param.name !== '') regex += '(\\d' + (opt ? '*' : '+') + ')';
                        break;
                    case 'flag':
                        if(param.name && param.name !== '') regex += '(-' + param.name  + ')';
                        break;
                    case 'text':
                        if(param.name && param.name !== '') regex += '(.' + (opt ? '*' : '+') + ')';
                        break;
                    default: 
                        if(param.name && param.name !== '') regex += '(' + param.type + ')';
                        break;
                }

                regex += '(?:\\s+|$)(.*)';

                var matched = input.match(new RegExp(regex));

                if(matched !== null){

                    if(matched[1] === '' && def !== '' && def !== null && def !== undefined){
                        param.value = def;
                    } else {
                        param.value = matched[1];
                    }

                    //opt === false && 
                    if(or !== true){
                        input = matched[2];
                    } else {
                        skip_reset = true;
                    }

                    and_input = matched[2];


                    if(perm === false){
                        errors.push('You don\'t have permission to use ' + (param.name ? param.name : 'this param'));
                        delete_param('not enough permission');
                        continue;
                    }

                    if(param.discord === false && USER.is_discord_user === true){
                        errors.push('Discord users cannot use ' + (param.name ? param.name : 'this param'));
                        delete_param('discord user, discord: false');
                        continue;
                    }
                } else {

                    if(def !== undefined && def !== null && def !== ''){
                        param.value = def;
                    } else {

                        if(opt === false && or !== true && or_tree !== true){ //not optional, not OR
                            param.error = ps[p].error || [];
                            param.error.push('REQUIRED');
                            errors.push('Missing ' + param.name);
                        } else {
                            delete_param('no match, optional:' + opt + ' or:' + or + ' or_tree:' + or_tree);
                            continue;
                        } 

                        //can delete: optional, any OR
                        //cannot delete: not optional
                    }                
                }

                //b.log.debug(param.name, regex, matched, input);
            } 

            if(perm === false){
                errors.push('You don\'t have permission to use ' + (param.name ? param.name : 'this param'));
                delete_param('not enough permission');
                continue;
            }

            if(param.discord === false && USER.is_discord_user === true){
                errors.push('Discord users cannot use ' + (param.name ? param.name : 'this param'));
                delete_param('discord user, discord: false');
                continue;
            }

            if(param.colors === true && param.value !== undefined && param.value !== null && param.value !== '' && typeof param.value === 'string'){
                param.value = _this.format(param.value, CHAN);
            }

            if(param.or){
                var orr = map_input(param.or, input, true, true); 
                param.or = orr;
                
                if(orr.length < 1){

                    if(opt === true){
                        delete_param('orr 0, optional');
                        continue;
                    } else {
                        param.error = ps[p].error || [];
                        param.error.push('No matched OR params');
                        errors.push('No matched OR params');
                    }
                } else if(orr.length > 1){
                    param.error = ps[p].error || [];
                    param.error.push('Too many OR params: ', orr.length);
                    errors.push('Too many OR params');
                }
            } 

            if(param.and) param.and = map_input(param.and, and_input, false, or_tree);
        }

        return ps;
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
USE.prototype.cmd_syntax = function(USER, cmd, options){
    var _this = this;
    USER = Object.assign({}, {
        t: _this.t,
        perm: ''
    }, USER);
    options = Object.assign({}, {
        short: false, //short default false, returns full syntax, true returns just !cmd <*param> (*optional) (colors)
        micro: false, //micro default false, returns full syntax, true returns just !cmd <*param>
        is_pm: false, //if true, display which commands cannot be used in PM
    }, options);
    options.short = options.short === true || options.micro === true ? true : false;

    var cm = commands[command_by_plugin[cmd]].cmds[cmd];
    var syntax = config.command_prefix + cmd;
    var syntax_arr = [];
    var optional = false;
    var colors = false;
    var orr = false;

    function parse_params(params){
        var param_arr = [];
        for(var i = 0; i < params.length; i++) {
            var str = '';
            var param = params[i];
            var and = [];
            var or = [];
            var opt = false;

            if(param.optional !== undefined){
                if(typeof param.optional === 'boolean') opt = param.optional;
                if(typeof param.optional === 'function') opt = param.optional();
            }

            if(param.colors === true) colors = true;

            if(param.perm && param.perm !== '' && !_this.check_perm(USER.perm, param.perm)) continue;

            if(param.discord === false && USER.is_discord_user === true) continue;

            if(param.name && param.name !== '') str = param.name;

            if(param.and) and = parse_params(param.and);
            if(param.or) or = parse_params(param.or);

            if(param.name && param.name !== '' && 
                (!opt || (opt && (and.length > 0 || or.length > 0))) &&
                (!param.type || param.type !== 'flag') ){
                str = '<' + (colors ? USER.t.highlight2(str) : str) + '>';
            }

            if(param.type && param.type !== ''){
                switch(param.type){
                    case 'string':
                        break;
                    case 'text':
                        break;
                    case 'number':
                        break;
                    case 'flag':
                        str = '-' + str;
                        break;
                    default:
                        break;
                }
            }

            if(param.perm && param.perm !== '') str += USER.t.success('(' + param.perm + ')');

            if(param.name && param.name !== '' && (params.or || param.and)){
                str += ' ';
            }

            if(and.length > 0) str += and.join(' ');
            if(or.length > 0) str += '(' + or.join(' | ') + ')';

            if(opt){
                str = USER.t.warn('[') + str + USER.t.warn(']');
                optional = true;
            }
            param_arr.push(str);
        }

        return param_arr;
    }
    
    syntax += ' ' + (parse_params(cm.params || [])).join(' ');

    if(options.micro){
        return syntax;
    } else if(options.short){
        if (optional) syntax += USER.t.warn(' [optional]');
        if (colors) syntax += USER.t.highlight2(' colors');
        if (cm.perm && cm.perm !== '') syntax += USER.t.success(' ' + cm.perm)
        if (options.is_pm && cm.no_pm === true) syntax += USER.t.null(' no PMs');
        return syntax;
    } else {
        if (optional) syntax += USER.t.warn(' [params are optional]');
        if (colors) syntax += USER.t.highlight2(' (accepts colors)');
        if (cm.perm && cm.perm !== '') syntax += USER.t.success(' (' + cm.perm + ')')
        if (options.is_pm && cm.no_pm === true) syntax += USER.t.null(' cannot use in PM');

        return USER.t.highlight('Usage: ') + syntax + ' ' + USER.t.highlight('Description: ') + cm.action + '.';
    }
}

//verifies and strips strings before speaking them
USE.prototype.verify_string = function(str) {
 if(typeof str !== 'string'){
        //b.log.error('verify_string: str is a', typeof str, str);
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
USE.prototype.verify_commands = function(USER, options, callback){
    var _this = this;
    var cmd_arr = [];
    var cmd_obj = {};

    USER = Object.assign({}, {
        t: _this.t,
        perm: ''
    }, USER);

    options = Object.assign({}, {
        help: false, //if true, returns with command syntax
        by_plugin: false, //if true, organizes return object by plugin, instead of alphabetically
        is_pm: false, //if true, warn which commands can't be used in a PM
        ignore_spammy: false //if true, we treat spammy commands like normal commands
    }, options);

    let requests = (Object.keys(command_by_plugin)).map((cmd) => {
        return new Promise((resolve) => {
            _this.verify_command(USER, cmd, options, function(cmd_str){
                if(cmd_str !== false && cmd_str !== undefined){
                    if(options.by_plugin){
                       cmd_obj[command_by_plugin[cmd]] = cmd_obj[command_by_plugin[cmd]] || [];
                       cmd_obj[command_by_plugin[cmd]].push(cmd_str);
                    } else {
                        cmd_arr.push(cmd_str);
                    }
                }
                resolve();
            });
        });
    });

    Promise.all(requests).then(() => { 
        if(options.by_plugin){
            for(var plugin in cmd_obj){
                if(cmd_obj[plugin].length < 1) delete cmd_obj[plugin];
            }

            callback(cmd_obj);
        } else {
            cmd_arr = cmd_arr.sort();
            callback(cmd_arr);
        }
    });
};

USE.prototype.verify_command = function(USER, cmd, options, callback){

    if(USER === undefined){
        b.log.error('Wait for USER init');
        callback(false);
        return;
    }

    var _this = this;

    USER = Object.assign({}, {
        t: _this.t,
        perm: ''
    }, USER);

    options = Object.assign({}, {
        help: false, //if true, returns with command syntax
        is_pm: false, //if true, warn which commands can't be used in a PM
        ignore_spammy: false //if true, we treat spammy commands like normal commands
    }, options);

    var category = command_by_plugin[cmd];
    var chan_config = USER.CHAN.config;

    //if not exists, return
    if(!commands[category]) {
        b.log.error('No category with that name in commands object');
        callback(false);
        return;
    }

    //if not exists, return
    if(!commands[category].cmds[cmd]) {
        b.log.error('No command with that name in commands object');
        callback(false);
        return;
    }

    var command = commands[category].cmds[cmd];

    //skip if command has disabled = true
    if(command.disabled || (chan_config.cmd_override[cmd] && chan_config.cmd_override[cmd] === "disabled")){
        b.log.debug('skipping ' + config.command_prefix + cmd + ' because disabled');
        callback(false);
        return;
    }

    //if user is a discord user, and discord:false is set, skip command
    if(command.discord !== undefined && command.discord === false && USER.is_discord_user === true){
        b.log.debug('skipping ' + config.command_prefix + cmd + ' because disabled for discord users');
        callback(false);
        return;
    }

    //skip if missing api key in info that is required in command api arr
    if(command.API){
        for(var i = 0; i < command.API.length; i++){
            var api_cat = command.API[i];
            if(!config.API || !config.API[api_cat] || !config.API[api_cat].key){
                b.log.debug('skipping ' + config.command_prefix + cmd + ' because requires ' + api_cat + ' api key, but none is provided');
                callback(false);
                return;
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
                callback(false);
                return;
            } 

            var setting = chan_config.plugin_settings[setting_arr[0]];
            if(setting_arr.length > 1){
                for(var s = 1; s < setting_arr.length; s++){
                    if(setting[setting_arr[s]] !== '' && setting[setting_arr[s]] !== null && setting[setting_arr[s]] !== undefined){
                        setting = setting[setting_arr[s]];
                    } else {
                        b.log.debug('skipping ' + config.command_prefix + cmd + ' because requires ' + setting_cat + ' plugin_setting, but none is provided');
                        callback(false);
                        return;
                    }
                }
            }
        }
    } 

    var return_true;
    if(options.help){ //show long syntax
        return_true = _this.cmd_syntax(USER, cmd, options);
    } else {
        if(options.is_pm && command.no_pm){
            return_true = _this.t.null(config.command_prefix + cmd);
        } else {
            return_true = config.command_prefix + cmd;
        }

        if(command.perm && command.perm !== '') return_true += _this.t.success('(' + command.perm + ')');
    }

    //if this is the owner of the bot, they can run owner only commands, and gain all permissions, otherwise check permissions
    if(USER.is_discord_user || !b.users[USER.nick].bot_owner){
        //if this is a command with 'owner' for permissions, and this is not the owner, skip
        if(command.perm && command.perm === 'owner'){
            b.log.debug('skipping ' + config.command_prefix + cmd + ' because ' + USER.nick + ' is not the owner');
            callback(false);
            return;
        }

        var need_perm = command.perm || '';
        if(chan_config.cmd_override[cmd]){
            need_perm = chan_config.cmd_override[cmd];
        } 

        //skip if required perms not met
        if(_this.check_perm(USER.perm, need_perm) === false){
            b.log.debug('skipping ' + config.command_prefix + cmd + ' because ' + USER.nick + ' does not have permission (has:' + USER.perm + ' needs:' + need_perm + ')');
            callback(false);
            return;
        } 

        //check if command is 'spammy' and if so, see when it was last called
        if(command.spammy && options.is_pm !== true && options.ignore_spammy === false){
            _this.check_speak_timeout(USER.CHAN.chan + '/spammy/' + cmd, USER.CHAN.config.limit_spammy_commands, function(wait_ms){
                if(wait_ms){
                    b.log.warn(USER.CHAN.chan, 'spammy, wait', _this.ms_to_time(wait_ms));
                    USER.CHAN.SAY.say({err: 'spammy, wait ' + _this.ms_to_time(wait_ms, false) + ' before you can use ' + config.command_prefix + cmd + ' in chat.'});
                    callback(false);
                    return;
                } else {
                    _this.update_speak_time(USER.CHAN.chan + '/spammy/' + cmd, 1);
                    callback(return_true)
                    return;
                }
            })
        } else {
            callback(return_true)
        }
        return;
    }

    callback(return_true);
}

//user_perm = user permission to test
//need_perm = permission needed (at least)
USE.prototype.check_perm = function(user_perm, need_perm){
    return need_perm !== '' && config.permissions.indexOf(user_perm) < config.permissions.indexOf(need_perm) ? false : true;
}


/* -------------- PONG TIMERS --------------------- */
// functions that need timers, runs off server ping/pong

USE.prototype.pong_exists = function(cb_name, callback){
    db.get_db_data('/pong/cbs/' + cb_name, function(cb_last){
        callback(cb_last !== null)
    });
}

//timers that run on intervals based off ping/pong on server
USE.prototype.add_pong = function(cb_name, ms, cb_func, run_once){
    var _this = this;
    var pong_epoc = (new dateWithOffset(0)).getTime(); //now

    b.log.debug('PONG ADD', cb_name, 'time:', _this.ms_to_time(ms, true, true));
    b.cbs[cb_name] = {
        ms: ms,
        func: cb_func,
        run_once: run_once
    };

    db.update_db('/pong/cbs/' + cb_name, pong_epoc, true);
}

USE.prototype.remove_pong = function(cb_name){
    b.log.debug('PONG DELETE', cb_name);
    delete b.cbs[cb_name];
    db.delete_from_db('/pong/cbs/' + cb_name)
}

//update pong time, run any pong timers in queue
USE.prototype.pong = function(){
    var _this = this;
    var pong_epoc = (new dateWithOffset(0)).getTime(); //now
    db.update_db('/pong/now', pong_epoc, true); //set now

    for(var cb_func in b.cbs){ //loop thru open pong cbs
        db.get_db_data('/pong/cbs/' + cb_func, function(cb_last){
            if(cb_last !== null){ //if last loop time is not null...
                b.log.trace(cb_func, _this.ms_to_time(b.cbs[cb_func].ms, true, true), _this.ms_to_time(pong_epoc - cb_last, true, true))
                if(pong_epoc >= (cb_last + b.cbs[cb_func].ms)){ //if now >= last loop time + pong cb time length, run function
                    b.cbs[cb_func].func(cb_func);
                    b.log.debug('PONG RUN:', (b.cbs[cb_func].run_once ? 'once' : 'loop') , cb_func);

                    if(b.cbs[cb_func].run_once){
                        _this.remove_pong(cb_func);
                    } else {
                        b.log.debug('PONG SET:NOW', cb_func);
                        db.update_db('/pong/cbs/' + cb_func, pong_epoc, true);
                    }
                } else {
                    //b.log.debug('PONG SKIP', cb_func, 'wait:', _this.ms_to_time((cb_last + b.cbs[cb_func].ms) - pong_epoc, true, true));
                }
            } else { //if pong cb last loop time has never been updated, set to now
                b.log.debug('PONG SET:NOW (was null)', cb_func);
                db.update_db('/pong/cbs/' + cb_func, pong_epoc, true);
            }
        });
    }
}

/* -------------- CACHE DATA --------------------- */
// for saving data to pull later, good for API calls that have limits on them

USE.prototype.add_cache = function(path, data, timer, case_insensitive){
    var cache_data = {
        date: (new dateWithOffset(0)).getTime(),
        timer: timer,
        data: data
    };

    db.update_db(path, cache_data, true, undefined, case_insensitive);
}

USE.prototype.get_cache = function(path, succ, fail, case_insensitive){
    db.get_db_data(path, function(d){
        if(d !== null){
            var now = (new dateWithOffset(0)).getTime();
            if(now >= (d.timer + d.date)){
                db.delete_from_db(path, function(act){
                    b.log.debug('get_cache fail 1', path);
                    fail();
                });
            } else {
                b.log.debug('get_cache succ', path);
                succ(d.data);
            }
        } else {
            b.log.debug('get_cache fail 2', path);
            fail();
        }
    }, true, case_insensitive);
}

USE.prototype.delete_cache = function(path){
    db.delete_from_db(path, function(act){});
}


/* -------------- User Functions --------------------- */

USE.prototype.update_last_seen = function(nick, chan, action, where){
    var seen_data = {
        date: (new dateWithOffset(0)).getTime(),
        chan: chan,
        action: action,
        where: where ? where : 'irc'
    };

    db.update_db("/nicks/" + nick + '/seen', seen_data, true, undefined, nick);
}

/* data = { col: data, col2: data2 } */
USE.prototype.update_user = function(nick, data, callback) {
    var _this = this;
    db.update_db("/nicks/" + nick, data, false, function(act){
        if(act === 'remove'){
            callback({succ: nick + '\'s ' + _this.join_and(Object.keys(data)) + ' has now been removed', act: 'remove'});
        } else {
            callback({succ: nick + '\'s ' + _this.join_and(Object.keys(data)) + ' has now been set', act: 'add'});
        }
    }, nick);
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
            commands[command_by_plugin[options.col]].cmds[options.col].params[0] &&
            commands[command_by_plugin[options.col]].cmds[options.col].params[0].name){
                options.label = commands[command_by_plugin[options.col]].cmds[options.col].params[0].name;
            }

        if(options.label === null && 
            commands[command_by_plugin[options.col]].cmds[options.col].params && 
            commands[command_by_plugin[options.col]].cmds[options.col].params[0] &&
            commands[command_by_plugin[options.col]].cmds[options.col].params[0].or &&
            commands[command_by_plugin[options.col]].cmds[options.col].params[0].or[0] &&
            commands[command_by_plugin[options.col]].cmds[options.col].params[0].or[0].key){
                options.label = commands[command_by_plugin[options.col]].cmds[options.col].params[0].or[0].key;
        } 


        if(options.label === null && options.col !== '') options.label = options.col;

        if(options.register_syntax === null && 
            !options.skip_say &&
            command_by_plugin[options.col] !== undefined) options.register_syntax = _this.cmd_syntax({}, options.col, {short: true});
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

USE.prototype.split_whois = function(split, hard, callback){
    var host = '';
    var nick = '';
    var user = '';

    if(split.indexOf('@') > -1){ //there is an host
        var split_host = split.split('@');
        host = split_host[1];
        if(split_host[0].indexOf('!') > -1){ //there is a user
            var split_user = split_host[0].split('!');
            nick = split_user[0];
            user = split_user[1];
        } else { //there is only a nick
            nick = split_host[0];
            if(!hard) user = '*';
        }
    } else { //no host
        if(!hard) host = '*';
        if(split.indexOf('!') > -1){ //there is a user
            var split_user = split[0].split('!');
            nick = split_user[0];
            user = split_user[1];
        } else { //there is only a nick
            nick = split;
            if(!hard) user = '*';
        }
    }
    callback({nick: nick, user: user, host: host});
}

//return an array of all the matching whois data
//hard = true, match hard (nick = nick) else soft (nick = nick!*@*) 
//if you want to match a specific whois_short or object, set here
USE.prototype.get_user_whois = function(whois_short, hard, whois_match, callback){
    var _this = this;

    function match_whois(match, all){
        var matched = [];
        for(var i = 0; i < all.length; i++){
            if(all[i].nick !== match.nick && match.nick !== '*' && all[i].nick !== '*') continue; 
            if(all[i].user !== match.user && match.user !== '*' && all[i].user !== '*') continue; 
            if(all[i].host !== match.host && match.host !== '*' && all[i].host !== '*') continue; 
            matched.push(all[i].whois);
        }
        return matched;
    }
    
    _this.split_whois(whois_short, hard, function(whois_data){
        if(whois_match && typeof whois_match === 'string'){
            _this.split_whois(whois_match, hard, function(data){
                data.whois = JSON.parse(JSON.stringify(data));
                var match_data = match_whois(whois_data, [data]);
                callback(match_data.length > 0);
                return;
            });
        } else if(whois_match && typeof whois_match === 'object'){
            whois_data.whois = JSON.parse(JSON.stringify(whois_data));
            var match_data = match_whois(whois_data, [whois_match]);
            callback(match_data.length > 0);
            return;
        } else {
            var all_whois = [];
            let requests = (Object.keys(b.users)).map((user) => {
                return new Promise((resolve) => {
                    _this.split_whois(b.users[user].whois_short, hard, function(data){
                        data.whois = b.users[user].whois;
                        all_whois.push(data);
                        resolve();
                    });
                });
            });

            Promise.all(requests).then(() => { 
                var match_data = match_whois(whois_data, all_whois);
                callback(match_data);
            });
        }
    });
}

//if force = true, if the owner is not on the server, returns owner nick set in config
USE.prototype.owner_nick = function(force, callback){
    var _this = this;

    for(var user in b.users){
        if(b.users[user].bot_owner){
            return callback(b.users[user].nick);
            break;
        }
    }

    _this.get_user_whois(config.owner, false, undefined, function(whois_owner){
        if(whois_owner.length > 1){
            if(force){
                _this.split_whois(config.owner, false, function(split){
                    b.log.error('Your config.owner is insecure, there are more than one users on the server that match', config.owner);

                    if(split.nick !== '*') return callback(split.nick);
                    if(split.user !== '*') return callback(split.user);
                    if(split.host !== '*') return callback(split.host);
                    return callback(config.owner);
                }); 
            } else {
                return callback(null);
            }
        } else if(whois_owner.length === 0){
            if(force){
                _this.split_whois(config.owner, false, function(split){
                    b.log.warn('The owner is not currently on the server', config.owner);

                    if(split.nick !== '*') return callback(split.nick);
                    if(split.user !== '*') return callback(split.user);
                    if(split.host !== '*') return callback(split.host);
                    return callback(config.owner);
                }); 
            } else {
                return callback(null);
            }
        } else {
            return callback(whois_owner[0].nick);
        }
    });
}


USE.prototype.whois = function(nick, callback, options){
    var _this = this;
    options = Object.assign({}, {
        force: false, //force new whois call, otherwise check for existing whois data
        user_on_whois: false //only create user after whois call finishes
    }, options);

    function get_whois(nick, callback){
        if(!b.users[nick] && !options.user_on_whois) b.users[nick] = new User(nick); 
        if(b.whois_queue.indexOf(nick) < 0) b.whois_queue.push(nick);

        bot.whois(nick, function(info){
            b.whois_queue.splice(b.whois_queue.indexOf(nick), 1);

            //b.log.debug('whois', info, !info.user);

            if(!info.user && b.users[info.nick]){
                b.log.warn(nick, 'not on server');

                if(b.users[info.nick]){
                    b.log.warn(nick, 'deleting all channel entries');
                    delete b.users[info.nick];
                    for(chan in b.channels){
                        delete b.channels[chan].users[info.nick];
                    }
                }

                callback(null, null);
            } else if(!info.user && !b.users[info.nick]){
                b.log.warn(nick, 'not on server');
                callback(null, null);
            } else {
                if(!b.users[nick]) b.users[nick] = new User(nick); 
                b.users[info.nick].update_whois(info);

                var whois_short = info.nick + '!' + info.user + '@' + info.host;
                _this.get_user_whois(whois_short, false, config.owner, function(result){
                    if(result){
                        b.log.debug('set owner', info.nick);
                        b.users[info.nick].bot_owner = true;
                    } 
                    callback(info, whois_short);
                });
            }
        });
    }

    if((b.users[nick] && !options.force) || b.whois_queue.indexOf(nick) > -1){
        if(b.whois_queue.indexOf(nick) > -1) {
            function wait_whois(nick, callback, count) {
                b.log.trace('waiting for whois....', nick, count);
                setTimeout(function() {
                    if(count > 10){
                        get_whois(nick, callback);
                    } else {
                        if (b.whois_queue.indexOf(nick) > -1) {
                            count++;
                            wait_whois(nick, callback, count);
                        } else {
                            b.log.trace('Got whois!', nick);
                            callback(b.users[nick].whois, b.users[nick].whois_short);
                        }
                    }
                }, 3000);
            };
            wait_whois(nick, callback, 0);
        } else {
            callback(b.users[nick].whois, b.users[nick].whois_short);
        }
    } else {
        get_whois(nick, callback);
    }
}

USE.prototype.send_tell_messages = function(nick){
    var _this = this;
    _this.get_user_data(nick, {
        label: 'mesages',
        col: 'msg',
        ignore_err: true,
        skip_say: true
    }, function(messages){
        if(messages !== false){
            for(var sender in messages){
                b.pm.SAY.say(sender + ' said to tell ' + nick + ' ' + messages[sender].join(' | '), 3, {to: nick});
                b.pm.SAY.say({succ: 'told ' + nick + ' ' + messages[sender].join(' | ')}, 3, {to: sender});
            }
            db.delete_from_db("/nicks/" + nick + '/msg');
        }
    });
}

/* -------------- Formatting bot output --------------------- */
//colors, scores, monospace, etc

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
        var col_count = 0;
        for(var cid in cobj){
            for(var i = 0; i < cobj[cid].length; i++){
                var reg_col = new RegExp('&' + cobj[cid][i], 'g');
                if(str.match(reg_col) !== null) col_count++;
                str = str.replace(reg_col, cid);
            }
        }

        return str + (col_count > 0 ? '\u000f' : '');
    }
}

//convert text to unicode monospace
USE.prototype.to_monospace = function(text){
    var monospace = {
        a: '𝚊', b: '𝚋', c: '𝚌', d: '𝚍', e: '𝚎', f: '𝚏', g: '𝚐', h: '𝚑', i: '𝚒', j: '𝚓', k: '𝚔', l: '𝚕', m: '𝚖',
        n: '𝚗', o: '𝚘', p: '𝚙', q: '𝚚', r: '𝚛', s: '𝚜', t: '𝚝', u: '𝚞', v: '𝚟', w: '𝚠', x: '𝚡', y: '𝚢', z: '𝚣',
        A: '𝙰', B: '𝙱', C: '𝙲', D: '𝙳', E: '𝙴', F: '𝙵', G: '𝙶', H: '𝙷', I: '𝙸', J: '𝙹', K: '𝙺', L: '𝙻', M: '𝙼',
        N: '𝙽', O: '𝙾', P: '𝙿', Q: '𝚀', R: '𝚁', S: '𝚂', T: '𝚃', U: '𝚄', V: '𝚅', W: '𝚆', X: '𝚇', Y: '𝚈', Z: '𝚉',
        0: '𝟶', 1: '𝟷', 2: '𝟸', 3: '𝟹', 4: '𝟺', 5: '𝟻', 6: '𝟼', 7: '𝟽', 8: '𝟾', 9: '𝟿', ' ': ' ', '．': '﹒', '-': '—'
    }

    var mono_txt = [...text].map(function(letter){
        return monospace[letter] ? monospace[letter] : letter;
    });
    return mono_txt.join('');
}



/* -------------- Interacting with Obj/Arr --------------------- */

//path to array to manage in db, ie: /bugs, /username/tags
//args are the args from the command
//id is required by -delete and -edit
USE.prototype.manage_arr = function(USER, path, args, cmd, callback, case_insensitive){
    var _this = this;

    var loop_thru = function(){
        db.get_db_data(path, function(d){

            if(d === null || d.length < 1){
                b.log.warn('nothing to loop thru in ' + path);
                callback({err: 'No data to ' + args.flag}, 3);
                return;
            }

            var matched = false;
            var matched_arr = [];

            for(var i = 0; i < d.length; i++){
                var str = USER.t.warn('[' + (i + 1) + '] ') + d[i];

               if(args.id !== undefined && (i + 1) === args.id){
                    if(args.flag === '-delete'){
                        db.delete_from_db(path + '[' + i + ']', function(deleted){
                            if(deleted){
                                matched = true;
                                callback({succ: 'Deleted: '  + d[i]}, 3);
                                return;
                            } 
                        })
                    } else if(args.flag === '-edit'){
                        d[i] = args.new_val;
                        db.update_db(path, d, true, function(act){
                            matched = true;
                            callback({succ: 'Updated ' + str + ' -> ' + args.new_val}, 3);
                            return;
                        });
                    }
                } else if (args.id === undefined) {
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
        }, true, case_insensitive);
    }


    if(args.flag !== '-add'){
        loop_thru();
    } else {
        db.update_db(path, [args.new_val], false, function(act){
            callback({succ: 'Added: ' + args.new_val});
        });
    }
};

//rand = true, send back a random value if no id or search term set
//rand = false, send back the last item in the array
USE.prototype.search_arr = function(USER, path, args, rand, callback, case_insensitive){
    var _this = this;

    if(args.query !== undefined){
        if(USER.is_discord_user){
            callback({err: 'Discord users cannot search.'});
            return;
        }
    }

    db.get_db_data(path, function(data){
        if(data && data.length > 0){
            if(args.id !== undefined){
                if(data[args.id] === undefined){
                    callback({err: 'No item with that id found!'}, 0);
                } else {
                    callback(data[args.id], 1);
                }
            } else if(args.query !== undefined){
                var search_vals = {};
                var count_found = 0;
                var msg_found = [];
                for(var i = 0; i < data.length; i++){
                    if(data[i].toLowerCase().indexOf(args.query.toLowerCase().trim()) > -1){
                        count_found++;
                        search_vals[i] = data[i];
                        msg_found.push(USER.t.warn('[' + i + '] ') + data[i]);
                    }
                }

                if(count_found === 0){
                    callback({err: 'No values with that search term found!'}, 0);
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
    }, true, case_insensitive);
};


//speak object
USE.prototype.input_object = function(obj, key_arr, new_val, callback, options){
    var _this = this;
    options = Object.assign({}, {
        ignore: [], //keys to ignore
        skip_keys: false //skip key label
    }, options);

    var response = [];
    var last_key = key_arr && key_arr.length > 0 ? key_arr[key_arr.length - 1] : '';

    function search_obj(objj, keys, i, callback){
        if(keys[i] !== undefined && objj[keys[i]] !== undefined && options.ignore.indexOf(key_arr[i]) < 0){
            b.log.debug(keys[i], i, objj[keys[i]]);
            if(keys[i + 1] !== undefined){
                search_obj(objj[keys[i]], key_arr, i + 1);
            } else {
                if(typeof objj[keys[i]] === 'object'){
                    for(var key in objj[keys[i]]){
                        if(options.ignore.indexOf(key) > -1) continue;
                        parse_val(key, objj[keys[i]][key], typeof objj[keys[i]][key], 1);
                    }
                    return true;
                } else {
                    parse_val(last_key, objj[keys[i]], typeof objj[keys[i]], 2);
                    return true;
                }
            }
        } else if (keys.length === 0){
            if(typeof objj === 'object'){
                for(var key in objj){
                    if(options.ignore.indexOf(key) > -1) continue;
                    parse_val(key, objj[key], typeof objj[key], 3);
                }
                return true;
            } else {
                parse_val(last_key, objj, typeof objj, 4);
                return true;
            }
        } else {
            return false;
        }

        return true;
    }

    function validate(old_val, new_val){
        if(typeof old_val === 'number'){
            return +new_val;
        } else if(typeof old_val === 'boolean'){
            if(new_val.toLowerCase() === 't' || new_val.toLowerCase() === 'true') return true;
            if(new_val.toLowerCase() === 'f' || new_val.toLowerCase() === 'false') return false;
        } else if(typeof old_val === 'string' && new_val !== null){
            return new_val + '';
        } else if(typeof old_val === 'object' && Array.isArray(old_val)){
            return new_val.split(/,\s*/g);
        }
        return null;
    }

    function parse_val(key, val, type, n){
        b.log.debug(key, val, type, n)
        switch(type){
            case 'object': 
                if(Array.isArray(val)){
                    var sub = (_this.input_object(val, [], {skip_keys: true})).join(', ');
                    if(sub.length > 50) sub = sub.slice(0, 100) + '\u000f...';
                    response.push(c.red('(arr) ' + (options.skip_keys ? '' : key + ': ')) + '[' + sub + ']');
                } else {
                    var sub = (_this.input_object(val, [], {ignore: options.ignore})).join(', ');
                    if(sub.length > 50) sub = sub.slice(0, 100) + '\u000f...';
                    response.push(c.olive('(obj) ' + (options.skip_keys ? '' : key + ': ')) + '{' + sub + '}');
                }

                break;
            case 'string':
                response.push(c.teal('(str) ' + (options.skip_keys ? '' : key + ': ')) + '\'' + val + '\'');
                break;
            case 'boolean':
                response.push(c.green('(bool) ' + (options.skip_keys ? '' : key + ': ')) + val);
                break;
            case 'number':
                response.push(c.yellow('(int) ' + (options.skip_keys ? '' : key + ': ')) + '\u000f' + val);
                break;
            default:
                response.push(c.purple('(' + typeof val + ') ' + (options.skip_keys ? '' : key + ': ')) + val);
                break;
        }
    }


    var rtn = search_obj(obj, key_arr || [], 0);
    return rtn === false ? {err: key_arr[0] + ' not found in object'} : response;
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

/* -------------- POLLING (for !poll and !vote) --------------------- */

USE.prototype.say_poll = function(CHAN, poll, callback){
    var say_arr = [];
    var results = poll.answers.map(function(answer, i){
        return {
            id: i,
            answer: answer,
            score: 0
        }
    });
    var total_votes = 0;

    if(poll.votes){
        for(var user in poll.votes){
            results[poll.votes[user]].score++;
            total_votes++;
        }
    }

    if(poll.status === 'open'){
        say_arr.push(CHAN.t.highlight('To vote, please type ' + config.command_prefix + 'vote <id of answer> (in PM to bot or chan)'));
        say_arr.push(CHAN.t.warn(poll.question));

        for(var i = 0; i < poll.answers.length; i++){
           say_arr.push(CHAN.t.highlight2('[' + (i+1) + ']' ) + ' ' + poll.answers[i] + ' ' + (total_votes > 0 ? x.score(results[i].score, {max: total_votes, config: CHAN.config, score_str: '(' + results[i].score + ')'}) : '')); 
        }
    } else if (poll.status === 'closed'){

        results.sort(function(a, b) { return a.score - b.score; });
        var score_arrs = {};

        say_arr.push(CHAN.t.highlight('Poll results for: ') + CHAN.t.warn(poll.question));

        for(var i = 0; i < results.length; i++){
            score_arrs[results[i].score] = score_arrs[results[i].score] || [];
            score_arrs[results[i].score].push(results[i].answer);
        }

        var scores = (Object.keys(score_arrs)).sort(function(a, b){return b-a});

        if(total_votes === 0){
            say_arr.push(CHAN.t.null('No Votes :( ' + score_arrs[0].join('/')));
        } else {
            for(var i = 0; i < scores.length; i++){
                if(i === 0){
                    say_arr.push(CHAN.t.success('WINNER: (' + scores[i] + '/' + total_votes + ') ' + score_arrs[scores[i]].join('/')));
                } else {
                    say_arr.push(CHAN.t.null('(' + scores[i] + '/' + total_votes + ') ' + score_arrs[scores[i]].join('/')));
                }
            }
        }
        
    }

    callback(say_arr);
} 

USE.prototype.add_poll = function(CHAN, args, callback){
    var _this = this;
    var answers = args.answers.split(/\s*-\d\s*/g);
    answers = answers.filter(function(x){ return x !== '' });

    var poll = {
        question: args.question,
        answers: answers,
        status: 'open',
        time: (new dateWithOffset(0)).getTime(),
        votes: { }
    };

    db.update_db('/polls/' + CHAN.chan + '[]', poll, true, function(act){
        _this.add_pong('polls' + CHAN.chan, 600000, function(cb_func){
            var chan = (cb_func.split('polls'))[1];
            _this.close_current_poll(b.channels[chan], function(result){
                b.channels[chan].SAY.say(result, 1, {to: chan, skip_verify: true, ignore_bot_speak: true, skip_buffer: true, join: '\n'});
            });
        }, true);

        _this.say_poll(CHAN, poll, callback);
    });
}

USE.prototype.vote = function(CHAN, USER, args, poll, callback){
    var answer_id = args.answer_id - 1;

    if(poll.answers[answer_id] === undefined){
        callback({err: 'No answer with id ' + args.answer_id});
        return;
    }

    var nick = b.users[USER.nick].nick_org ? b.users[USER.nick].nick_org : USER.nick;
    var key_search_regex = '^' + nick.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$';
    var case_insensitive_regex = new RegExp(key_search_regex, 'i');

    if(!poll.votes){
        poll.votes = {};
        poll.votes[nick] = (args.answer_id - 1)
    } else {
        var match_key = false;
        for(var key in poll.votes){
            if(key.match(case_insensitive_regex)){
                poll.votes[key] = answer_id;
                match_key = true;
                break;
            }
        }

        if(match_key === false) poll.votes[nick] = (args.answer_id - 1);
    }

    db.update_db('/polls/' + CHAN.chan + '[-1]', poll, true, function(){
        callback({succ: 'voted for ' + args.answer_id + ': ' + poll.answers[answer_id]});
    });
}

USE.prototype.get_poll = function(CHAN, USER, args, callback){
    var _this = this;
    db.get_db_data('/polls/' + CHAN.chan + '[-1]', function(poll){
        if(poll !== null){
            if(Object.keys(args).length === 0){
                _this.say_poll(CHAN, poll, callback);
            } else if (args.question !== undefined && args.answers !== undefined){
                if(poll.status === 'open'){
                    callback({err: 'There is currently an open poll, please type ' + config.command_prefix + 'poll -close before creating a new poll'});
                } else {
                    _this.add_poll(CHAN, args, callback);
                }
            } else if(args.answer_id !== undefined){
                _this.vote(CHAN, USER, args, poll, callback)
            }
        } else {
            if(Object.keys(args).length === 0 || args.answer_id !== undefined){
                callback({err: 'There are currently no polls'});
            } else if (args.question !== undefined && args.answers !== undefined){
                _this.add_poll(CHAN, args, callback);
            } 
        }
    }, true);
}

USE.prototype.close_current_poll = function(CHAN, callback){
    var _this = this;
    db.get_db_data('/polls/' + CHAN.chan + '[-1]', function(poll){
        if(poll !== null && poll.status !== 'closed'){
            poll.status = 'closed';
            db.update_db('/polls/' + CHAN.chan + '[-1]/status', 'closed', true, function(){
                _this.say_poll(CHAN, poll, callback);
            });
        } else {
            callback({err: 'no poll to close'});
        }
    });
}

module.exports = USE;