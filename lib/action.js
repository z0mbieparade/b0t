
var Entities = require("html-entities").AllHtmlEntities,
    flatfile = require('flat-file-db'),
    db       = flatfile(__dirname + '/db.db');

db.on('open', function() {
    log.debug('DB Loaded');
});

var ACT = exports.ACT = function(){
    this.chan = null;
    this.nick = null;
    this.bot = null;
}

//level 1: always say in chat
//level 2: only say in chat if less_chan_spam = false, otherwise send a notice
//level 3: notice only
ACT.prototype.say = function(msg, level, options){
    var default_options = {
        skip_verify: false, //will attempt to say the message AS IS
        to: null, //only set if you want to override default and say something to a specific user
        url: '' //if you have a url you want tacked on to the end of message after it's been verified (like a read more)
    };

    options = options || {};
    for(var key in default_options){
        options[key] = (options[key] === undefined ? default_options[key] : options[key]);
    }

    if(msg.err){
        action.say(this.er(msg.err), 2, options);
        return;
    }

    msg = options.skip_verify === true ? msg : action.verify_string(msg, options.url);

    if(level === 2 && config.less_chan_spam){
        level = 3;
    } else if (level === 2 && !config.less_chan_spam){
        level = 1;
    }

    if(level === 1){
        if(options.to !== null){
            this.bot.say(options.to, msg);
            return;
        }

        if(!action.chan) log.error('Invalid Channel: ', action.chan);
        this.bot.say(action.chan, msg);
    } else {
        if(options.to !== null){
            this.bot.notice(options.to, msg);
            return;
        }

        if(!action.nick) log.error('Invalid Nick: ', action.nick);
        this.bot.notice(action.nick, msg)
    }
}

ACT.prototype.send = function(cmd, command_string){
    this.bot.send(cmd, action.chan, command_string);
}

ACT.prototype.get_url = function(url, type, callback){
    request(url, function (error, response, body) {
        //Check for error
        if(error){
            return log.error('Error:', error);
        }

        //Check for right status code
        if(response.statusCode !== 200){
            return log.error('Invalid Status Code Returned:', response.statusCode);
        }

        if(type === 'json') callback(JSON.parse(body));

        if(type === 'sup') {

            var titleRegex = new RegExp("<title>(.*?)(</title>|\n|\r)", "im");
            var match = body.match(titleRegex);

            // fill titleTag if there is data, otherwise leave it blank
            var titleTag = "";
            if(match && match[0]) {
                titleTag = match[0].replace(/(<([^>]+)>)/ig, "").replace(/\n/ig, "");
            }
            // if we came out of that with a title tag, say it in the channel
            if(titleTag.length > 0) {
                // change any html entities to their corresponding characters
                var entities = new Entities();
                titleTag = entities.decode(titleTag);

                // set up the message and then say it in the channel
                callback(c.underline(titleTag));
            }
        }
    });
}

//error handling
ACT.prototype.er = function(err){
    log.error(err);
    return c.red('Error: ' + err);
}


//this verifies string length and such, 
//and anything else that needs to be verified before
//having the bot send it back.
ACT.prototype.verify_string = function(str, link) {

    if(typeof str !== 'string'){
        log.error('verify_string: str is a', typeof str, str)
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

    var breaks = str.match(/\r?\n|\r/g) || [];

    //if there are more than 3 new line breaks, remove them.
    if(breaks.length > 3){
        str = str.replace(/\r?\n|\r/g, ' ');
    }

    //if a str is long than 430 char, cut it.
    if(str.length > 300){
        str = str.slice(0, 300) + '...';
    }

    //if there is a 'read more' link, add it here
    if(link){
        str += ' ' + link;
    }

    return str;
};

ACT.prototype.get_command = function(command){
    for(category in commands){
        for(var cmd in commands[category].cmds) {
            if(cmd === command){
                var command_data = commands[category].cmds[cmd];
                command_data.category = category;
                command_data.info = commands[category].info;
                return command_data;
            }
        }   
    }

    return {'err': 'No command found.'};
}

//returns an array of all commands avaliable for a nick
//if help = true, returns with command syntax
ACT.prototype.verify_commands = function(help){

    var cmd_arr = [];
    for(category in commands){
        for(var cmd in commands[category].cmds) {
            var cmd_str = action.verify_command(category, cmd, help);
            if(cmd_str !== false) cmd_arr.push(cmd_str);
        }   
    }

    return cmd_arr;
};

ACT.prototype.verify_command = function(category, cmd, help){
    
    //if not exists, return
    if(!commands[category]) {
        log.error('No category with that name in commans object');
        return false;
    }

    //if not exists, return
    if(!commands[category].cmds[cmd]) {
        log.error('No command with that name in commands object');
        return false;
    }


    //skip if command has disabled = true
    if(commands[category].cmds[cmd].disabled){
        log.debug('skipping ' + config.command_prefix + cmd + ' because disabled');
        return false;
    }

    //skip if missing api key in info that is required in command api arr
    if(commands[category].cmds[cmd].API){
        for(var i = 0; i < commands[category].cmds[cmd].API.length; i++){
            var api_cat = commands[category].cmds[cmd].API[i];
            if(!config.API || !config.API[api_cat] || !config.API[api_cat].key){
                log.debug('skipping ' + config.command_prefix + cmd + ' because requires ' + api_cat + ' api key, but none is provided');
                return false;
            }
        }
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

    //skip if required perms not met
    if(commands[category].cmds[cmd].perm && config.permissions.indexOf(names[action.chan][action.nick]) < config.permissions.indexOf(commands[category].cmds[cmd].perm)){
        log.debug('skipping ' + config.command_prefix + cmd + ' because ' + action.nick + ' does not have required permissions');
        return false;
    } 

    if(help) {
        var syntax = config.command_prefix + cmd;

        if(commands[category].cmds[cmd].params.length > 0) {
            syntax += ' <' + commands[category].cmds[cmd].params.join('> <') + '>';
        }
        if (syntax.indexOf('*') > -1) syntax += ' (* params are optional)';

        return c.teal('Usage: ') + syntax + ' ' + c.teal('Description: ') + commands[category].cmds[cmd].action + '.';
    } else {
        return config.command_prefix + cmd;
    }
}

/* data = {
    label: 'name name',
    cat: 'Command Category',
    col: 'db_col_name'
} */
ACT.prototype.get_user_data = function(nick, data, callback) {
    var user_data = db.get(nick);
    if(user_data && user_data[data.col] && user_data[data.col] !== ''){
        callback(user_data[data.col]);
    } else {
        var register_syntax = config.command_prefix + data.col + ' <' + commands[data.cat].cmds[data.col].params.join('> <') + '>'; 
        var str = 'Your ' + c.teal(data.label) + ' is not registered! Please type ' + c.teal(register_syntax) + ' to register it';

        action.say({'err': str}, 2, {skip_verify: true});
    }
}

/* data = {
    label: 'name name',
    col: 'db_col_name'
} */
ACT.prototype.get_all_users_in_chan_data = function(data, callback) {
    var rows = {},
        count = 0;

    if(!names[action.chan]){
        action.say({'err': 'No users registered with ' + c.teal(data.label) + ' currently in the channel'}, 2, {skip_verify: true});
    }

    Object.keys(names[action.chan]).forEach(function(key) {
        var user_data = db.get(key);
        if(user_data && user_data[data.col] && user_data[data.col] !== '')
        {
            rows[key] = user_data[data.col];
            count++;
        }
    });

    if (count === 0) {
        action.say({'err': 'No users registered with ' + c.teal(data.label) + ' currently in the channel'}, 2, {skip_verify: true});
    } else {
        callback(rows);
    }
}

/* data = {
    col: 'db_col_name',
    data: 'data to update col to'
} */
ACT.prototype.update_user = function(nick, data, callback) {
    var user_data = db.get(nick) || {};
    user_data[data.col] = data.data;

    log.debug(nick, user_data);

    db.put(nick, user_data, function() {
        log.debug('Updated');

        if(data.data === ''){
            callback(c.teal(nick) + '\'s ' + data.col + ' has now been removed');
        } else {
            callback(c.teal(nick) + '\'s ' + data.col + ' has now been set');
        }
    });
}

ACT.prototype.score = function(score, max, end){
    max = parseInt(max, 10) || 100;
    end = end || '';
    
    if(end === '%'){
        score = Number((parseFloat(score) * 100).toFixed(1));
    } else {
        score = parseInt(score, 10);
    }

    var score_color = c.teal;

    if (score < (max * .25)) score_color = c.red;
    else if (score < (max * .50)) score_color = c.brown;
    else if (score < (max * .75)) score_color = c.olive;
    else if (score < (max * .95)) score_color = c.green;

    score_str = score_color(score + end);

    return score_str;
}
