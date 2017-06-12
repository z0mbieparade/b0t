var dateWithOffset  = require("date-with-offset");

var DEF = exports.DEF = function(){};

/*DEF.prototype.validate = function(old_val, new_val){
    if(typeof old_val === 'number'){
        return +new_val;
    } else if(typeof old_val === 'boolean'){
        if(new_val.toLowerCase() === 't' || new_val.toLowerCase() === 'true') return true;
        if(new_val.toLowerCase() === 'f' || new_val.toLowerCase() === 'false') return false;
    } else if(typeof old_val === 'string' && new_val !== null){
        return new_val + '';
    } else if(typeof old_val === 'object' && Array.isArray(old_val)){
        return new_val.split(/,\s*/ //g);
 /*   }
    return null;
}

DEF.prototype.set_config = function(conf, args, callback){
	var _this = this;
    var key_arr = args.settings.split(':');

    var new_val = _this.validate(conf[args[0]], command_string);

    if(conf[key]){
        if(typeof conf[key] !== 'object'){
            if(new_val !== null){
                conf[key] = new_val;
                callback({succ: 'Updated ' + key_arr.join(' ') + ': ' + new_val}, key_arr, conf);
            } else {
                callback({err: 'To change a config setting, please type ' + config.command_prefix + 'config ' + key_arr.join(' ') + ' <' + typeof conf[key] + '>'});
            }
        } else {
            if(Array.isArray(conf[key])){
                conf[key] = new_val;
                callback({succ: 'Updated ' + key_arr.join(' ') + ': [' + new_val.join(', ') + ']'}, key_arr, conf);
            } else {
                if(command_string !== null){
                    args.shift();
                    key_arr.push(args[0]);

                    _this.set_config(conf[key], key_arr, args, command_string, function(response, key_arrr, conff){
                        if(conff) conf[key] = conff;
                        callback(response, key_arrr, conf)
                    });
                } else {
                    callback(x.input_object(conf[key]));
                }
            }
        }
    } else {
        callback({err: 'No setting in config with key \'' + key + '\''});
    }
}*/


DEF.prototype.say_poll = function(CHAN, poll, callback){
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

        for(var i = 0; i < scores.length; i++){
            if(i === 0){
                say_arr.push(CHAN.t.success('WINNER: (' + scores[i] + '/' + total_votes + ') ' + score_arrs[scores[i]].join('/')));
            } else {
                say_arr.push(CHAN.t.null('(' + scores[i] + '/' + total_votes + ') ' + score_arrs[scores[i]].join('/')));
            }
        }
    }

    callback(say_arr);
} 

DEF.prototype.add_poll = function(CHAN, args, callback){
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

    db.update_db("/polls[]", poll, true, function(act){
        _this.say_poll(CHAN, poll, callback);
    });
}

DEF.prototype.vote = function(CHAN, USER, args, poll, callback){
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

    db.update_db('/polls[-1]', poll, true, function(){
        callback({succ: 'voted for ' + args.answer_id + ': ' + poll.answers[answer_id]});
    });
}

DEF.prototype.get_poll = function(CHAN, USER, args, callback){
    var _this = this;
    db.get_db_data('/polls[-1]', function(poll){
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

            