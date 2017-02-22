try {
   var words = require('.././infobot_vars.json');
   log.debug('Loaded infobot custom vars!');
}
catch (e) {
	log.warn('no custom infobot_vars.json, loaded default infobot data');
    var words = require('./infobot_vars_default.json');
}

var INFO = exports.INFO = function(){};

INFO.prototype.check_message = function(text, can_lock){

	//lock X (~ only)
	var lock_factoid = text.match(/^lock\s([\w\d]+)/i);
	if(lock_factoid !== null)
	{
		this.update_factoid(lock_factoid[1], {lock: true}, false, can_lock);
		return;
	}

	//forget X (fails if locked, unless ~)
	var forget_factoid = text.match(/^forget\s([\w\d]+)/i);
	if(forget_factoid !== null)
	{
		this.delete_factoid(forget_factoid[1], can_lock);
		return;
	}

	//what is X / who is X / what the *** is X? / who the *** is X?
	var get_factoid = text.match(/^(what|who)(?:\s|\sthe\s(\w+)\s)(?:is|are)\s([\w\d]+)/i);
	if(get_factoid !== null)
	{
		this.get_factoid(get_factoid[3], get_factoid[2] || null);
		return;
	}

	//what's X / who's X
	var get_factoid = text.match(/^(what|who)'*s\s([\w\d]+)/i);
	if(get_factoid !== null)
	{
		this.get_factoid(get_factoid[2], null);
		return;
	}

	//no, X is/are Y
	var update_factoid = text.match(/^(?:no,)\s([\w\d]+)\s(is|are)\s(.*?)[\.\!\?\s]*$/i);
	if(update_factoid !== null)
	{
		this.set_factoid(update_factoid[1], {
			plural: update_factoid[2] === 'are',
			info: update_factoid[3],
			lock: false
		}, can_lock);
		return;
	}

	//X is/are also Z
	var append_factoid = text.match(/^([\w\d]+)\s(is|are)\s(?:also)\s(.*?)[\.\!\?\s]*$/i);
	if(append_factoid !== null)
	{
		this.update_factoid(append_factoid[1], {info: append_factoid[3]}, true, can_lock);
		return;
	}

	//X is/are Y
	var set_factoid = text.match(/^([\w\d]+)\s(is|are)\s(.*?)[\.\!\?\s]*$/i);
	if(set_factoid !== null)
	{
		this.set_factoid(set_factoid[1], {
			plural: set_factoid[2] === 'are',
			info: set_factoid[3],
			lock: false
		}, can_lock);
		return;
	}

	//X? X!
	var question_factoid = text.match(/^([\w\d]+)(?:\?|\!)/i);
	if(question_factoid !== null)
	{
		this.get_factoid(question_factoid[1]);
		return;
	}

};

INFO.prototype.factoid_locked = function(about, callback)
{
	about = about.toLowerCase();
	this.get_factoid(about, null, function(data){
		log.debug('locked', data && data.lock === true);
		callback(data && data.lock === true);
	});
}

INFO.prototype.update_factoid = function(about, new_data, append, can_lock){
	about = about.toLowerCase();
	var _this = this;
	this.get_factoid(about, null, function(data){

		if(data.lock && !can_lock){
			log.warn('factoid lock, and user cannot unlock lock');
			return;
		}

		if(append){
			new_data.info = data.info + ' and ' + (data.plural ? 'are' : 'is') + ' also ' + new_data.info
		}

		for(var key in new_data){
			data[key] = new_data[key];
		}

		_this.set_factoid(about, data, can_lock);
	});
}

INFO.prototype.get_factoid = function(about, adj, callback){
	about = about.toLowerCase();
	var _this = this;

	action.get_db_data('/factoid/' + about, function(data){
   		if(data !== null){
   			if(callback){
   				callback(data);
   				return;
   			}

   			var adjective = adj ? _this.ing(adj) + ' ' : '';

   			action.say(c.green(about + ' ' + (data.plural ? 'are' : 'is') + ' ' + adjective + _this.vars(data.info)), 2);
   		} else {
   			if(callback) callback(data);
   			return;
   		}
    });
}

INFO.prototype.set_factoid = function(about, data, can_lock){
	about = about.toLowerCase();

	this.factoid_locked(about, function(locked){
		if(locked && !can_lock){
			log.warn('factoid lock, and user cannot unlock lock');
		} else {
			action.update_db('/factoid/' + about, data, true, function(act){
		        if(act === 'add'){
		            log.debug('factoid added');
		        } else {
		            log.debug('factoid removed');
		        }
		    });
		}
	});
}

INFO.prototype.delete_factoid = function(about, can_lock){

	about = about.toLowerCase();
	this.factoid_locked(about, function(locked){
		if(locked && !can_lock){
			log.warn('factoid lock, and user cannot unlock lock');
		} else {
			action.delete_from_db('/factoid/' + about, function(deleted){
				if(deleted){
					log.debug('forgot about ' + about);
				} else {
					log.debug('no ' + about + ' factoid to forget');
				}
			});
		}
	});
}

INFO.prototype.vars = function(str){

	var users = ['nobody', 'somebody'];
	action.get_all_users_in_chan_data(null, function(data){
        users = data;
    });

	str = str.replace(/([\w\d]+\|)+([\w\d]+)/ig, function(x){
		var or_vars = x.split('|');
		return or_vars[action.random_number_between(0,or_vars.length - 1)];
	});
	
	str = str.replace(/\$noun/ig, function(x){
		return words.noun[action.random_number_between(0,words.noun.length - 1)];
	});
	
	str = str.replace(/\$adjective|\$adj/ig, function(x){
		return words.adjective[action.random_number_between(0,words.adjective.length - 1)];
	});
	
	str = str.replace(/\$verb/ig, function(x){
		return words.verb[action.random_number_between(0,words.verb.length - 1)];
	});
	
	str = str.replace(/\$adverb/ig, function(x){
		return words.adverb[action.random_number_between(0,words.adverb.length - 1)];
	});
	
	str = str.replace(/\$preposition|\$prep/ig, function(x){
		return words.preposition[action.random_number_between(0,words.preposition.length - 1)];
	});

	str = str.replace(/\$user/ig, function(x){
		return users[action.random_number_between(0,users.length - 1)]
	});

	if(words.other){
		for(var key in words.other){
			var other_regex = new RegExp('\\$'+key, 'ig');
			str = str.replace(other_regex, function(x){
				return words.other[key][action.random_number_between(0,words.other[key].length - 1)];
			});
		}
	}

	return str;
}

//verb -> verbing
INFO.prototype.ing = function(adj){
	adj = adj.toLowerCase();
	var special = {
		'hell': 'hella'
	};

	if(special[adj]) return special[adj];

	//ends in s, remove the s
	var ends_in_s = adj.match(/(\w+)[s]$/i);
	if(ends_in_s !== null) adj = ends_in_s[1];

	//ends in ie, remove the ie and add ying
	var ends_in_ie = adj.match(/(\w+)[ie]$/i);
	if(ends_in_ie !== null) return ends_in_ie[1] + 'ying'

	//ends in e, remove the e and add ing
	var ends_in_e = adj.match(/(\w+)[e]$/i);
	if(ends_in_e !== null) return ends_in_e[1] + 'ing';

	//consonant + vowel + consonant (except w, x, y), double the final consonant and add ing
	var c_v_c = adj.match(/\w*[bcdfghjklmnpqrstvwxyz][aeiou]([bcdfghjklmnpqrstvz])$/i); 
	if(c_v_c !== null) return adj + c_v_c[1] + 'ing';

	//consonant + vowel + consonant + s, remove the s and double the final consonant and add ing
	var c_v_c_s = adj.match(/(\w*[bcdfghjklmnpqrstvwxyz][aeiou])([bcdfghjklmnpqrstvwxyz])[s]$/i); 
	if(c_v_c_s !== null) return c_v_c_s[1] + c_v_c_s[2] + c_v_c_s[2] + 'ing';

	return adj + 'ing';
}