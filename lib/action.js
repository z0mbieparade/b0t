
var Entities = require("html-entities").AllHtmlEntities,
    flatfile = require('flat-file-db'),       //remove eventually
    db       = flatfile(__dirname + '/db.db'), //remove eventually
    xml2js   = require('xml2js').parseString,
    JsonDB   = require('node-json-db'),
    jdb      = new JsonDB(__dirname + '/../db.json', true, true);

db.on('open', function() {
    log.debug('DB Loaded');
});

var ACT = exports.ACT = function(){
    this.chan = null;
    this.nick = null;
    this.bot = null;
    this.is_cmd = false;
}

//level 1: always say in chat
//level 2: only say in chat if less_chan_spam = false, otherwise send a notice
//level 3: notice only
ACT.prototype.say = function(msg, level, options){
    var default_options = {
        skip_verify: false, //will attempt to say the message AS IS
        to: null, //only set if you want to override default and say something to a specific user
        url: '', //if you have a url you want tacked on to the end of message after it's been verified (like a read more)
        ignore_bot_speak: false //doesn't update bot speak interval, and ignores limit_bot_speak_when_busy if true
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
    //when chan is busy, send bot speak to notice, unless user is owner, or ignore_bot_speak = true
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

                        var str = 'busy, wait ' + action.ms_to_time(user_cmd_count) + ' before you can use a command in chat.';
                        action.say(str, 3, {ignore_bot_speak: true, skip_verify: true})

                        level = 3;
                    }
                });
            }
        });
    }

    //this is a command, update command speak
    if(options.ignore_bot_speak === false &&
       action.is_cmd === true && 
       action.nick !== config.owner && 
       level === 1){
       action.update_chan_speak('cmd/'+action.nick);
    }


    if(level === 1){
        if(options.to !== null){
            if(!options.ignore_bot_speak) action.update_bot_speak();
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

//input milliseconds, returns hh:mm:ss
ACT.prototype.ms_to_time = function(duration) {

    var milliseconds = parseInt((duration%1000)/100)
        , seconds = parseInt((duration/1000)%60)
        , minutes = parseInt((duration/(1000*60))%60)
        , hours = parseInt((duration/(1000*60*60))%24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}


ACT.prototype.update_chan_speak = function(type){
    var epoc = (new Date()).getTime();

    log.debug(epoc, new Date());
    try{
        var msg_arr = jdb.getData("/speak/"+action.chan+'/'+type);
        msg_arr.push(epoc);
        if(msg_arr.length > 5){
            msg_arr.shift();
        }
    }catch(e){
        log.error(e.stack);
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
        log.debug(msg_arr);
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
                    log.debug(i, (msg_arr[i] - msg_arr[i-1]));
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
       log.error(e.stack); 
    }
}

ACT.prototype.send = function(cmd, command_string){
    this.bot.send(cmd, action.chan, command_string);
}

ACT.prototype.get_url = function(url, type, callback){
    request({url: url, followRedirect: false}, function (error, response, body) {

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
        } else if(type === 'sup') {

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
        } else {
            callback(body);
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

    //if this is the owner of the bot, they can run owner only commands, and gain all permissions, otherwise check permissions
    if(action.nick !== config.owner){
        //if this is a command with 'owner' for permissions, and this is not the owner, skip
        if(commands[category].cmds[cmd].perm && commands[category].cmds[cmd].perm === 'owner'){
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

        //skip if required perms not met
        if(commands[category].cmds[cmd].perm && config.permissions.indexOf(names[action.chan][action.nick]) < config.permissions.indexOf(commands[category].cmds[cmd].perm)){
            log.debug('skipping ' + config.command_prefix + cmd + ' because ' + action.nick + ' does not have required permissions');
            return false;
        } 
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

ACT.prototype.export_db = function(){
    var obj = {};
    var keys = db.keys();
    for(var i = 0; i < keys.length; i++){
        obj[keys[i]] = db.get(keys[i]);
    }

    jdb.push("/nicks/", obj, true);

    return obj;
}

/* data = {
    label: 'name name',
    cat: 'Command Category',
    col: 'db_col_name'
} */
ACT.prototype.get_user_data = function(nick, data, callback, skip_say) {
    try{
        var user_data = jdb.getData("/nicks/"+nick+'/'+data.col);
        callback(user_data);
    } catch(e) {
        log.error('no user data found for ', nick, ' in ', data.col);
        if(!skip_say){
            var register_syntax = config.command_prefix + data.col + ' <' + commands[data.cat].cmds[data.col].params.join('> <') + '>'; 
            var str = 'Your ' + c.teal(data.label) + ' is not registered! Please type ' + c.teal(register_syntax) + ' to register it';

            action.say({'err': str}, 2, {skip_verify: true});
        } else {
            callback(false);
        }
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
        action.get_user_data(key, data, function(user_data){
            if(user_data !== false){
                rows[key] = user_data;
                count++;
            }
        }, true);
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
    try{
        jdb.push("/nicks/"+nick+'/'+data.col, data.data);
        if(data.data === ''){
            callback({msg: c.teal(nick) + '\'s ' + data.col + ' has now been removed', act: 'remove'});
        } else {
            callback({msg: c.teal(nick) + '\'s ' + data.col + ' has now been set', act: 'add'});
        }
    } catch(e) {
        log.error(e);
    }
}

ACT.prototype.send_tell_messages = function(nick){
    action.get_user_data(nick, {
        label: 'mesages',
        col: 'msg'
    }, function(messages){
        for(var sender in messages){
            log.debug(sender, messages[sender]);

            if(messages[sender]){
                action.say(sender + ' said to tell ' + messages[sender], 3, {to: nick});
                action.say('told ' + messages[sender], 3, {to: sender});
            }
        }

        try{
            jdb.delete("/nicks/"+nick+'/msg');
        } catch(e) { }
    }, true);
}

ACT.prototype.get_db_data = function(path, callback){
    try{
        var data = jdb.getData(path);
        callback(data);
    }catch(e){
        log.error(e.stack)
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
        log.error(e.stack);
    }
}

ACT.prototype.delete_from_db = function(path, callback){
    try{
        var data = jdb.delete(path);
        callback(true);
    }catch(e){
        log.error(e.stack)
        callback(false);
    }
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
