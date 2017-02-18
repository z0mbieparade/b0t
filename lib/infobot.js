
var INFO = exports.INFO = function(){};


INFO.prototype.check_message = function(text, can_lock){
	
	//lock factoid (~ only)
	var lock_factoid = text.match(/^lock\s([\w\d]+)/i);
	if(lock_factoid !== null)
	{
		this.update_factoid(lock_factoid[1], {lock: true}, false, can_lock);
		return;
	}

	//forget factoid (fails if locked, unless ~)
	var forget_factoid = text.match(/^forget\s([\w\d]+)/i);
	if(forget_factoid !== null)
	{
		this.delete_factoid(forget_factoid[1], can_lock);
		return;
	}

	//what is factoid
	var get_factoid = text.match(/^what\s(?:is|are)\s([\w\d\s]+)/i);
	if(get_factoid !== null)
	{
		this.get_factoid(get_factoid[1]);

		return;
	}

	//no, factoid is/are info
	var update_factoid = text.match(/^(?:no,)\s([\w\d]+)\s(is|are)\s([\w\d\s]+)/i);
	if(update_factoid !== null)
	{
		this.set_factoid(update_factoid[1], {
			plural: update_factoid[2] === 'are',
			info: update_factoid[3],
			lock: false
		}, can_lock);
		return;
	}

	//factoid is/are also info
	var append_factoid = text.match(/^([\w\d]+)\s(is|are)\s(?:also)\s([\w\d\s]+)/i);
	if(append_factoid !== null)
	{
		this.update_factoid(append_factoid[1], {info: append_factoid[3]}, true, can_lock);
		return;
	}

	//factoid is/are info
	var set_factoid = text.match(/^([\w\d]+)\s(is|are)\s([\w\d\s]+)/i);
	if(set_factoid !== null)
	{
		this.set_factoid(set_factoid[1], {
			plural: set_factoid[2] === 'are',
			info: set_factoid[3],
			lock: false
		}, can_lock);
		return;
	}

	//factoid?
	var question_factoid = text.match(/^([\w\d]+)\?/i);
	if(question_factoid !== null)
	{
		this.get_factoid(question_factoid[1]);
		return;
	}

};

INFO.prototype.factoid_locked = function(about, callback)
{
	about = about.toLowerCase();
	this.get_factoid(about, function(data){
		log.debug('locked', data && data.lock === true);
		callback(data && data.lock === true);
	});
}

INFO.prototype.update_factoid = function(about, new_data, append, can_lock){
	about = about.toLowerCase();
	var _this = this;
	this.get_factoid(about, function(data){

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

INFO.prototype.get_factoid = function(about, callback){
	about = about.toLowerCase();

	action.get_db_data('/factoid/' + about, function(data){
   		if(data !== null){
   			if(callback){
   				callback(data);
   				return;
   			}
   			action.say(c.green(about + ' ' + (data.plural ? 'are' : 'is') + ' ' + data.info), 2);
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