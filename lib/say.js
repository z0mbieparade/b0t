var dateWithOffset      = require("date-with-offset");

function SAY(is_pm, key){
    this.is_pm = is_pm;
    this.chan = key;

    if(is_pm === true){
        this.CHAN = b.pm;
        this.t = b.t;
        this.config = config.chan_default;
    } else {
        this.CHAN = b.channels[key];
        this.t = b.channels[key].t;
        this.config = b.channels[key].config;
    }

    this.max_str_len = 400;
}

//level 1: always say in chat
//level 2: only say in chat if less_chan_spam = false, otherwise send a notice
//level 3: notice only

//msg, level, options
//msg, options (if no level set, set 1)
SAY.prototype.say = function(){
    var _this = this;
    var log = log4js.getLogger(_this.chan);
    log.setLevel(config.debug_level);

    if(!arguments || arguments.length < 1) return;

    var msg = arguments[0];
    var options = {};
    var level = 1;

    if(arguments.length > 1){
        level = typeof arguments[1] === "number" ? arguments[1] : (msg.succ || msg.err ? 2 : 1);
        options = typeof arguments[1] === "object" ? arguments[1] : {};
        if(arguments.length > 2){
            options = typeof arguments[2] === "object" ? arguments[2] : {};
        }
    }

    var lines_orj = options.lines;

    options = Object.assign({}, {
        is_pm: _this.is_pm,
        is_cmd: false, //set true if this is a reply to a command
        nick: null, //nick that initated speak
        chan: _this.chan, //chan spoken from
        to: null, //send message to user/chan
        url: '', //if you have a url you want tacked on to the end of message after it's been verified (like a read more)
        skip_verify: false, //will attempt to say the message AS IS 
        ignore_bot_speak: false, //doesn't update bot speak interval, and ignores limit_bot_speak_when_busy if true
        skip_buffer: false, //if true, says string without adding it to buffer
        copy_buffer_to_user: false, //if true, copy buffer from chan to nick before speaking to user
        page_buffer: false, //if true, instead of saying message, pages the buffer
        join: ' ', //join buffer
        lines: 5, //lines to display from buffer
        force_lines: false, //if true, then overrides any line setting options
        ellipsis: null, //if true add ... after text in buffer cutoff
        ignore_discord_formatting: false, //if true, we don't strip colors
        is_discord_user: false, //if true, set level to 1
        table: false, //if true, tries to take an array of object and convert them to a table
        table_opts: {} //set table = true, these are the options for tabeling, see this.table
    }, options);

    if(msg && msg.err){ //if this is an error
        msg = this.t.fail('Error: ' + msg.err);
        options.skip_verify = true;
        options.skip_buffer = true;
        options.ignore_bot_speak = true;
        options.ellipsis = false;
    }

    if(msg && msg.succ){ //if this is a success
        msg = this.t.success(msg.succ);
        options.skip_verify = true;
        options.skip_buffer = true;
        options.ignore_bot_speak = true;
        options.ellipsis = false;
    }

    if(options.is_discord_user){
        level = 1;
    } else {
        //if level = 2, and we want less chan spam, send to PM
        if(level === 2 && this.config.less_chan_spam){
            level = 3;
        } else if (level === 2 && !this.config.less_chan_spam){ //otherwise send to chan
            level = 1;
        }
    }

    if(options.table && Array.isArray(msg)){
        msg = _this.table(msg, options.table_opts);
        options.join = '\n';
    }

    //we're not forcing this to go anywhere in specific
    if(options.to === null){
        if(options.chan === null && options.nick !== null){ //this is a pm, send to the nick
            options.to = options.nick;
            options.is_pm = true;
            level = 3;
        } else if(options.chan === null && options.nick === null){ //nowhere to send this
            log.error(1, 'No where to send message: ' + msg);
            return;
        } else {
           if(level === 1){ //send to chan
                if(options.chan === null){ //well this should go to a chan, but we don't have a chan
                    log.error('No chan to send message to: ' + msg);
                } else {
                    options.to = options.chan;
                    options.is_pm = false;
                    level = 1;
                }
           } else { //send to pm
                if(options.nick === null){ //well this should go to a pm, but we don't have a nick
                    log.error('No user to send pm to: ' + msg);
                } else {
                    options.to = options.nick;
                    options.is_pm = true;
                    level = 3;
                }
           }
        }
    } 

    if(level === 1 && options.force_lines === false) options.lines = 2;
    if(lines_orj === undefined && options.is_pm === true && options.force_lines === false) options.lines = 5;

    //if there is nothing set to add after buffer text, add ...
    options.ellipsis = options.ellipsis === null && options.join !== '\n' && options.skip_buffer !== true ? true : false;

    //if we're paging the buffer, we've already got it in the buffer verified, so skip those things
    if(options.page_buffer){
        options.skip_buffer = true;
        options.skip_verify = true;
    }

    log.trace(msg, level);
    log.trace(options);

    if(options.copy_buffer_to_user === true && options.is_pm === false && options.nick !== null && options.chan !== null){
        level = 3;
        options.to = options.nick;
        copy_buffer(options.chan, options.nick, init_speak);
    } else {
        if(options.copy_buffer_to_user === true && options.is_pm === false && (options.nick === null || options.chan === null)){
            log.warn('This should likely be coppied to a user buffer, but options.nick or options.chan is null. chan:', options.chan, 'nick:', options.nick, 'msg:', msg);
        }

        init_speak();
    }

    function init_speak(){
        get_buffer(function(data){
            if(data) msg = data;
            check_chan_busy_status(function(){
                update_chan_speak_status();
                check_skip_buffer();
            });
        });
    }

    function get_buffer(callback){
        if(options.page_buffer === true){
            page_buffer(callback);
        } else {
            callback();
        }   
    }

    //when chan is busy, send bot speak to notice, unless user is owner, or ignore_bot_speak = true
    function check_chan_busy_status(callback){
        if(options.ignore_bot_speak === false &&
           _this.config.limit_bot_speak_when_busy && 
           _this.config.wait_time_between_commands_when_busy &&
           options.to !== config.owner && 
           options.is_pm === false){ 

            check_busy(function(busy_status){
                log.warn('busy_status', busy_status);
                if (busy_status !== false){

                    //check how long it's been since a user has used a command
                    x.check_speak_timeout(_this.chan + '/cmd/' + options.nick, _this.config.wait_time_between_commands_when_busy, function(wait_ms){
                        if(wait_ms){
                            log.warn(options.chan, 'busy, wait', x.ms_to_time(wait_ms), 'sending to notice.');
                            log.warn(options.chan, 'avr time between chan speak', x.ms_to_time(busy_status));
                            _this.say({err: 'busy, wait ' + x.ms_to_time(wait_ms) + ' before you can use a command in chat.'}, 3, options)

                            options.is_pm = false;

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

    //update command speak status IF we are not ignoring chan speak
    //this is a reply to a command, this is not from the owner, and
    //this is not in a pm
    function update_chan_speak_status(){
        if(options.ignore_bot_speak === false &&
           options.is_cmd === true && 
           options.nick !== config.owner && 
           options.is_pm === false){
           x.update_speak_time(_this.chan + '/cmd/' + options.nick, 5);
        } 
    }

    //if we are not skipping add to buffer, add to buffer first
    //otherwise attempt to say the string
    function check_skip_buffer(){
        if(options.skip_buffer === true){
            log.trace('skip_buffer true')
            var str = typeof msg !== 'string' ? msg.join(options.join + '\u000f') : msg;
            str = options.skip_verify === true ? str : x.verify_string(str, options.url);
            say_str(str);
        } else {
            log.trace('skip_buffer false')
            add_to_buffer(msg, function(data, opt){
                say_str(data);
            });
        }
    }
    
    function say_str(str){
        str = str.trim();

        log.trace('say_str', str);

        var more = '';
        if(options.ellipsis && options.skip_buffer !== undefined && options.skip_buffer !== true){
            if(options.join === '\n'){
                str += '...';
            } else {
                str += '...\n';
            }
        }

        var end = more + (options.url === '' ? '' : options.url) + (options.next_info ? ' ' + options.next_info : '');
        if(end.trim() !== '') str += '\n' + end;

        var do_action = false;
        if(str.indexOf('/me') === 0){
            do_action = true;
            str = str.slice(3, str.length);
            str = str.trim();
        }

        if(_this.config.disable_colors){
            str = c.stripColorsAndStyle(str);
        }

        if(!options.ignore_bot_speak && !options.is_pm) x.update_speak_time(_this.chan + '/chan', 5);

        do_action ? bot.action(options.to, str) : bot.say(options.to, str);
    }

    //add a large amount of data to user buffer
    //good if you need the bot to say a huge amount of data
    //overwites current user buffer
    //data_obj should be an array. Array items over options.max_str_len chars are converted to another array item
    function add_to_buffer(data, callback){
        if(!options.to || options.to === 'undefined'){
            log.error('undefined to');
            return;
        }

        log.trace('add_to_buffer data', data);

        var new_data_obj = [];

        var split_string = function(str){
            if(options.join !== '\n' && options.skip_verify !== true) str = x.verify_string(str);
            var pat = new RegExp('.{' + _this.max_str_len + '}\w*\W*|.*.', 'g');
            str.match(pat).forEach(function(entry) {
                if(entry === '' || entry === null || entry === undefined) return;
                entry = options.skip_verify ? entry : x.verify_string(entry);
                new_data_obj.push(entry);
            });
        }

        if(data === null || data === false || data === '' || data.length < 1){ //no data
            new_data_obj = [];
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

        log.trace('add_to_buffer new_data_obj', new_data_obj);

        if(new_data_obj.length <= options.lines){
            options.ellipsis = false;
            callback(new_data_obj.join(options.join + '\u000f'));
        } else {
            new_data_obj.unshift({
                first_len: new_data_obj.length, 
                join: options.join,
                id: x.guid(),
                ellipsis: options.ellipsis
            });

            log.trace('adding buffer to', '/buffer/' + options.to, new_data_obj.slice(0,3), '...');
            db.update_db('/buffer/' + options.to, new_data_obj, true, function(act){
                if(act === 'add'){
                    page_buffer(function(data){
                       if(options.is_pm){
                            data = _this.t.highlight('To page through buffer, type ' + config.command_prefix + 'next. (type ' + config.command_prefix + 'next help for more info)\n') + data;
                        }

                        log.trace('added to ' + options.to + '\'s buffer!')
                        callback(data);
                    });
                } else {
                    log.trace('cleared ' + options.to + '\'s buffer!')
                }
            });
        }
    }

    //activated when user sends !next in PM to bot
    //pages thru buffer, removes paged buffer lines
    function page_buffer(callback){
        if(options.join === '\n'){
            options.lines = options.lines !== undefined && +options.lines < 11 && +options.lines > 0 ? options.lines : options.force_lines ? options.lines : 5; 
        } else if(options.join === ' ') {
            options.lines = options.lines !== undefined && +options.lines < 21 && +options.lines > 0 ? options.lines : options.force_lines ? options.lines : 5;
        } else {
            options.join = ' ' + _this.t.highlight(options.join) + ' ';
            options.lines = options.lines !== undefined && +options.lines < 21 && +options.lines > 0 ? options.lines : options.force_lines ? options.lines : 5; 
        }

        log.trace('page_buffer', options);

        db.get_db_data('/buffer/' + options.to, function(old_buffer){
            log.trace('get buffer from', '/buffer/' + options.to, old_buffer === null ? null : old_buffer.slice(0, 3) +'...');
            if(old_buffer !== null && old_buffer.length > 1){
                options.join = options.join === ' ' && old_buffer[0].join !== ' ' ? old_buffer[0].join : options.join;

                //if we're joining with a space, then lines becomes about send messages, instead of data lines
                //by default the bot splits messages at 512 characters, so we'll round down to 400
                if(options.join === ' ') {
                    var send_data = [];
                    var send_data_i = 0;

                    function add_to(buff){
                        if(send_data.length < options.lines){
                            if(!send_data[send_data_i]){ //send data arr doesn't have this val yet
                                if(buff.length <= _this.max_str_len){ //buffer data is less than max char per line
                                    send_data.push(buff);
                                } else {
                                    send_data.push(buff.slice(0, _this.max_str_len));
                                    add_to(buff.slice((_this.max_str_len + 1), buff.length));
                                }
                            } else { //send data has existing data in this iteration
                                if(send_data[send_data_i].length < _this.max_str_len){ //data is under cutoff length
                                    if(buff.length <= _this.max_str_len){ //buffer data is less than max char per line
                                        send_data[send_data_i] = send_data[send_data_i] + buff;
                                    } else {
                                        send_data[send_data_i] = send_data[send_data_i] + buff.slice(0, _this.max_str_len);
                                        add_to(buff.slice((_this.max_str_len + 1), buff.length));
                                    }
                                } else {
                                    send_data_i++;
                                    add_to(buff);
                                }
                            }
                            return true;
                        } else {
                            return false;
                        }
                    }

                    var spliced = false;
                    for(var i = 1; i < old_buffer.length; i++){
                        if(!add_to(old_buffer[i] + ' ')){
                            log.trace('splice part old buffer 1 -> ', i);
                            old_buffer.splice(1, i);
                            spliced = true;
                            break;
                        }
                    }
                    if(spliced === false){
                        log.trace('splice full old buffer 1 -> ', old_buffer.length);
                        old_buffer.splice(1, old_buffer.length);
                    }
                } else {
                    var send_data = old_buffer.splice(1, options.lines);
                }

                if(old_buffer.length === 1){
                    old_buffer = '';
                    options.next_info = '';
                    options.ellipsis = false;
                    options.skip_buffer = true;

                } else {
                    options.next_info = _this.t.highlight('(' + (old_buffer[0].first_len - (old_buffer.length - 1)) + '/' + old_buffer[0].first_len + ')');
                    options.ellipsis = old_buffer[0].ellipsis !== undefined && old_buffer[0].ellipsis !== null ? old_buffer[0].ellipsis : options.ellipsis;
                }

                log.trace('update to buffer', '/buffer/' + options.to, old_buffer.slice(0, 3), '...');

                db.update_db('/buffer/' + options.to, old_buffer, true, function(act){
                    if(act === 'add'){
                        log.trace('updated ' + options.to + '\'s buffer!')
                    } else {
                        log.trace('cleared ' + options.to + '\'s buffer!')
                    }
                    callback(send_data.join(options.join + '\u000f'));
                });
            } else {
                _this.say({'err': 'No buffer to page through.'}, 2, {to: options.to});
            }
        }, true);
    }

    function copy_buffer(from, to, callback){
        log.trace('copy_buffer', from, '->', to);
        if(!from || from === 'undefined' || !to || to === 'undefined'){
            log.error('from and to required');
            callback();
            return;
        }

        db.get_db_data('/buffer/' + from, function(from_buffer){
            log.trace('/buffer/' + from, from_buffer === null ? null : from_buffer.slice(0, 3), '...');
            if(from_buffer === null){
                log.trace('no buffer to copy from', from);
                callback();
                return;
            }

            db.get_db_data('/buffer/' + to, function(to_buffer){
                log.trace('copy_buffer from:', from, 'to:', to, 'from_buffer_id:', from_buffer[0].id, 'to_buffer_id:', to_buffer && to_buffer[0] && to_buffer[0].id ? to_buffer[0].id : null);

                //don't copy buffer again if it's already got the same buffer
                if(to_buffer !== null && from_buffer[0].id === to_buffer[0].id){
                    log.trace('skipping copy, buffer from ', from, 'already coppied to ', to);
                    callback();
                    return;
                }

                //if there is a from buffer, set coppied to true, and update user buffer
                if(from_buffer.length > 1){
                    var new_buffer = from_buffer.slice(0);
                    new_buffer[0].coppied = true;
                    db.update_db('/buffer/' + to, new_buffer, true, function(act){
                        if(act === 'add'){
                            log.trace('copied ' + from + ' to ' + to + '\'s buffer!')
                        } else {
                            log.trace('cleared ' + to + '\'s buffer!')
                        }

                        callback();
                    });
                } else {
                    callback({'err': 'No buffer to page through.'});
                }
            }, true);
        }, true);
    }

    //returns average seconds between last 5 messages in the channel if busy,
    //otherwise returns false if not busy
    function check_busy(callback){
        db.get_db_data("/speak/"+_this.chan+'/chan', function(msg_arr){
            if(msg_arr !== null && msg_arr.length > 4){
                var epoc = (new dateWithOffset(0)).getTime();
                var since_last_speak = epoc - msg_arr[msg_arr.length - 1];

                //if the time since the last time someone spoke in chat is 2x limit_chan_speak_when_busy,
                //let the bot speak in chat
                if(since_last_speak < (_this.config.busy_interval * 2)){ //1 min

                    //otherwise average all of the speaking
                    //and if the average of the last 5 lines in chat is
                    //less than half the limit_chan_speak_when_busy setting, 
                    //send to notice.
                    var sum = 0;
                    for(var i = 1; i < msg_arr.length; i++){
                        sum = sum + (msg_arr[i] - msg_arr[i-1]);
                    }

                    var avr = Math.floor(sum / (msg_arr.length - 1));
                    if(avr <= _this.config.busy_interval){ //30 sec
                        callback(avr);
                    } else {
                        log.debug('FALSE speak avr', x.ms_to_time(avr), 'is <= config.busy_interval', x.ms_to_time(config.busy_interval / 2));
                        callback(false);
                    }
                } else {
                    log.debug('FALSE since last speak', x.ms_to_time(since_last_speak), 'is <', x.ms_to_time((_this.config.busy_interval * 2)));
                    callback(false);
                }
            } else {
                log.warn('FALSE less than 4 messages in db');
                callback(false);
            }
        }, true);
    }
}

SAY.prototype.table = function(data, options){
    var _this = this;
    options = Object.assign({}, {
        header: true, //if true, we add a header row with the col titles
        outline: true, //if true, we add a table outline
        divide: ' │ ', //what to divide columns with
        cluster: [c.red, c.olive, c.yellow, c.green, c.teal, c.blue, c.purple, c.pink],
        cluster_symbols: ['*'],
        sort_by: null,
        max_width: 100 //max table width
    }, options);

    var widths = {};
    var avr_widths = {};
    var title_widths = {};
    var new_data = [];

    function scsl(txt){
        var new_txt = txt === undefined ? '' : typeof txt === 'string' ? c.stripColorsAndStyle(txt) : txt + '';
        var new_txt = new_txt.replace(/\uFEFF|\u0002|\u0003/g, '');
        var new_txt_len = [...new_txt].length; //this seems to get rid of some weird issues with string length
        return new_txt_len;
    }

    //cluster
    if(Array.isArray(data[0])){
        var uncluster = [];
        data.map(function(cluster, i){
            if(options.sort_by !== null) cluster.sort(options.sort_by);
            cluster.map(function(row){
                if(_this.config.disable_colors !== true) row.cluster_id = i;
                uncluster.push(row);
            });
        });
        data = uncluster;
    } else {
        if(options.sort_by !== null) data.sort(options.sort_by);
    }

    for(var col in data[0]){
        var col_len = scsl(col);
        if(col !== 'cluster_id' && col.match(/.*?_hidden$/i) === null) title_widths[col] = col_len;
    }

    var total_rows = 0;
    if(options.header){
        total_rows++;
        for(var col in data[0]){
            var col_len = scsl(col);
            if(col !== 'cluster_id' && col.match(/.*?_hidden$/i) === null) avr_widths[col] = avr_widths[col] ? avr_widths[col] + col_len : col_len;
            if(((widths[col] !== undefined && widths[col] < col_len) || widths[col] === undefined) && 
                (col !== 'cluster_id' && col.match(/.*?_hidden$/i) === null)) widths[col] = col_len;
        }
    }

    for(var row in data){
        total_rows++;
        for(var col in data[row]){
            var col_len = scsl(data[row][col]);
            if(col !== 'cluster_id' && col.match(/.*?_hidden$/i) === null) avr_widths[col] = avr_widths[col] ? avr_widths[col] + col_len : col_len;
            if(((widths[col] !== undefined && widths[col] < col_len) || widths[col] === undefined) && 
                (col !== 'cluster_id' && col.match(/.*?_hidden$/i) === null)) widths[col] = col_len;
        }
    }

    //check if wider than max_width
    var total_width = 0;
    var total_avr_width = 0;
    var total_title_width = 0;
    for(var col in widths){
        total_width += widths[col];
        avr_widths[col] = Math.round(avr_widths[col] / total_rows) < title_widths[col] ? title_widths[col] : Math.round(avr_widths[col] / total_rows);
        total_avr_width += avr_widths[col];
        total_title_width += title_widths[col];
    }

    b.log.debug(total_width, widths);
    b.log.debug(total_avr_width, avr_widths);
    b.log.debug(total_title_width, title_widths);

    //total too big, avr/title too small
    if(total_width > options.max_width && total_avr_width < options.max_width && total_title_width < options.max_width){
        b.log.debug(1);
        while(total_avr_width < options.max_width && total_avr_width < total_width){
            for(var col in widths){
                var col_diff = widths[col] - avr_widths[col];
                if(col_diff > 0 && total_avr_width < options.max_width){
                    avr_widths[col]++;
                    total_avr_width++;
                }
            }
        }
        widths = avr_widths;

    //total/avr too big, title too small
    } else if(total_width > options.max_width && total_avr_width > options.max_width && total_title_width < options.max_width) {
        b.log.debug(2);
        while(total_title_width < options.max_width && total_title_width < total_width){
            for(var col in widths){
                var col_diff = widths[col] - title_widths[col];
                if(col_diff > 0 && total_title_width < options.max_width){
                    title_widths[col]++;
                    total_title_width++;
                }
            }
        }
        widths = avr_widths;

    //total/avr/title too big
    } else if (total_width > options.max_width && total_avr_width > options.max_width && total_title_width > options.max_width) { 
        b.log.debug(3);
        while(total_avr_width > options.max_width || total_avr_width <= total_rows * 6){
            for(var col in avr_widths){
                if(avr_widths[col] > 6){
                    avr_widths[col]--;
                    total_avr_width--;
                }
            }
        }
        widths = avr_widths;

    //total too big, avr = max, title too small
    } else if(total_width > options.max_width && total_avr_width === options.max_width && total_title_width < options.max_width){
        b.log.debug(4);
        widths = avr_widths;

    //total/avr too big, title = max
    } else if(total_width > options.max_width && total_avr_width > options.max_width && total_title_width === options.max_width){
        b.log.debug(5);
        widths = title_widths;
    }

     b.log.debug('new widths', widths);

    function resize_col(text, length, join){
        var txt_len = scsl(text);

        if(txt_len > length){
            var slice_off = txt_len - length + 1;

            var no_reset = text.match(/(.*?)\u0003$/);
            if(no_reset !== null){
                return no_reset[1].substring(0, no_reset[1].length - slice_off) + '…\u0003';
            } else {
                return text.substring(0, text.length - slice_off) + '…';
            }
        } else {
            join = join === undefined ? ' ' : join;
            return text + Array(length - txt_len + 1).join(join);
        }
    }

    function create_row(row){

        var div = options.divide;
        var pre = '';
        if(row.cluster_id !== undefined){
            div = options.cluster[0](div) + '\u000f';
            pre = options.cluster[0](options.cluster_symbols[0]) + '\u000f '; 
        } else if(row.cluster_id === undefined && data[0].cluster_id !== undefined){
            pre = '- '; 
        }

        var row_arr = [];
        if(Array.isArray(row)){
            for(var i in row){
                row_arr.push(resize_col(row[i], widths[row[i]]));
            }
        } else {
            for(var col in widths){
                var cell_data = row[col] === undefined || row[col] === null || row[col] === '' ? '-' : row[col];
                if(typeof cell_data === 'string') cell_data = cell_data.replace(/undefined|null/i, '-');
                row_arr.push(resize_col(cell_data, widths[col]));
            }
        }

        return (options.outline ? '║ ' : pre) + row_arr.join(div) + (options.outline ? ' ║' : '');
    }

    function divBox(num) { 
        return num % 2 && num > 2;
    }

    function create_line(where){
        var row_arr = [];
        var join = '═';

        var i = 0;
        for(var col in widths){
            i++;
            var add = 1;
            var div_len = scsl(options.divide);

            if(i === 1 || i === (Object.keys(widths)).length){ //first and last
                add++; //add 1 char for edge space
                if(divBox(div_len)) add = add + ((div_len - 1) / 2);
            } else {
                if(divBox(div_len)) add = add + div_len - 1;
            }

            row_arr.push(Array(widths[col] + add).join(where === 'header' ? '─' : '═'));
        }

        if(where === 'top')     return '╔' + row_arr.join(divBox(div_len) || div_len === 1 ? '╤' : Array(div_len + 1).join('═')) + '╗';
        if(where === 'bottom')  return '╚' + row_arr.join(divBox(div_len) || div_len === 1 ? '╧' : Array(div_len + 1).join('═')) + '╝';
        if(where === 'header')  return '╟' + row_arr.join(divBox(div_len) || div_len === 1 ? '┼' : Array(div_len + 1).join('─')) + '╢';
        
    }


    if(options.outline) new_data.push(create_line('top'));

    if(options.header){
        new_data.push(create_row(Object.keys(widths)));
        if(options.outline) new_data.push(create_line('header'));
    }

    var cluster_id = 0;
    if(data[0].cluster_id && options.outline) cluster_id = data[0].cluster_id;
    for(var row in data){
        if(data[row].cluster_id && data[row].cluster_id !== cluster_id){
            if(options.outline) new_data.push(create_line('header'));
            cluster_id = data[row].cluster_id;
            options.cluster.push(options.cluster.shift());
            options.cluster_symbols.push(options.cluster_symbols.shift());
        }
        new_data.push(create_row(data[row]));
    }

    if(options.outline) new_data.push(create_line('bottom'));

    return new_data;
}

module.exports = SAY;