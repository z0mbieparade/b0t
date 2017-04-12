var INFO = exports.INFO = function(){};

INFO.prototype.check_message = function(CHAN, text, can_lock, nick){

	//lock X (~ only)
	var lock_factoid = text.match(/^lock\s([\w\d]+)/i);
	if(lock_factoid !== null)
	{
		this.update_factoid(CHAN, lock_factoid[1], {lock: true}, false, can_lock);
		return;
	}

	//forget X (fails if locked, unless ~)
	var forget_factoid = text.match(/^forget\s([\w\d]+)/i);
	if(forget_factoid !== null)
	{
		this.delete_factoid(CHAN, forget_factoid[1], can_lock);
		return;
	}

	//what is X / who is X / what the *** is X? / who the *** is X?
	var get_factoid = text.match(/^(what|who)(?:\s|\sthe\s(\w+)\s)(?:is|are)\s([\w\d]+)/i);
	if(get_factoid !== null)
	{
		this.get_factoid(CHAN, get_factoid[3], get_factoid[2] || null);
		return;
	}

	//wt* is X
	var get_factoid = text.match(/^(wt)([a-z])\s(?:is|are)\s([\w\d]+)/i);
	if(get_factoid !== null)
	{
		this.get_factoid(CHAN, get_factoid[3], get_factoid[2]);
		return;
	}

	//what's X / who's X
	var get_factoid = text.match(/^(what|who)'*s\s([\w\d]+)/i);
	if(get_factoid !== null)
	{
		this.get_factoid(CHAN, get_factoid[2], null);
		return;
	}

	//I am Y
	var update_factoid = text.match(/^I\sam\s(.*?)[\.\!\?\s]*$/i);
	if(update_factoid !== null)
	{
		this.set_factoid(CHAN, nick, {
			plural: false,
			info: update_factoid[1],
			lock: false
		}, can_lock);
		return;
	}

	//no, X is/are Y
	var update_factoid = text.match(/^(?:no,)\s([\w\d]+)\s(is|are)\s(.*?)[\.\!\?\s]*$/i);
	if(update_factoid !== null)
	{
		this.set_factoid(CHAN, update_factoid[1], {
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
		this.update_factoid(CHAN, append_factoid[1], {
			plural: append_factoid[2] === 'are',
			info: append_factoid[3]
		}, true, can_lock);
		return;
	}

	//X is/are Y
	var set_factoid = text.match(/^([\w\d]+)\s(is|are)\s(.*?)[\.\!\?\s]*$/i);
	if(set_factoid !== null)
	{
		this.set_factoid(CHAN, set_factoid[1], {
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
		this.get_factoid(CHAN, question_factoid[1]);
		return;
	}

};

INFO.prototype.factoid_locked = function(CHAN, about, callback){
	about = about.toLowerCase();
	this.get_factoid(CHAN, about, null, function(data){
		CHAN.log.debug('locked', data && data.lock === true);
		callback(data && data.lock === true);
	});
}

INFO.prototype.update_factoid = function(CHAN, about, new_data, append, can_lock){
	var _this = this;
	about = about.toLowerCase();
	this.get_factoid(CHAN, about, null, function(data){

		if(data === null){
			_this.set_factoid(CHAN, about, {
				plural: new_data.plural,
				info: new_data.info,
				lock: false
			}, can_lock);
			return;
		}

		if(data.lock && !can_lock){
			CHAN.log.warn('factoid lock, and user cannot unlock lock');
			return;
		}

		if(append){
			new_data.info = data.info + ' and ' + (data.plural ? 'are' : 'is') + ' also ' + new_data.info
		}

		for(var key in new_data){
			data[key] = new_data[key];
		}

		_this.set_factoid(CHAN, about, data, can_lock);
	});
}

INFO.prototype.get_factoid = function(CHAN, about, adj, callback){
	about = about.toLowerCase();
	var _this = this;
	db.get_db_data('/factoid/' + about, function(data){
   		if(data !== null){
   			if(callback){
   				callback(data);
   				return;
   			}

   			var adjective = adj ? x.ing(adj) + ' ' : '';
   			var send_factoid = about + ' ' + (data.plural ? 'are' : 'is') + ' ' + x.article_adj(adjective, x.vars(CHAN, data.info));

   			CHAN.SAY.say({succ: send_factoid}, 1, {to: CHAN.chan});
   		} else {
   			if(callback) callback(data);
   			return;
   		}
    });
}

INFO.prototype.set_factoid = function(CHAN, about, data, can_lock){
	about = about.toLowerCase();
	this.factoid_locked(CHAN, about, function(locked){
		if(locked && !can_lock){
			CHAN.log.warn('factoid lock, and user cannot unlock lock');
		} else {
			db.update_db('/factoid/' + about, data, true, function(act){
		        if(act === 'add'){
		            CHAN.log.debug('factoid added');
		        } else {
		            CHAN.log.debug('factoid removed');
		        }
		    });
		}
	});
}

INFO.prototype.delete_factoid = function(CHAN, about, can_lock){
	about = about.toLowerCase();
	this.factoid_locked(CHAN, about, function(locked){
		if(locked && !can_lock){
			CHAN.log.warn('factoid lock, and user cannot unlock lock');
		} else {
			db.delete_from_db('/factoid/' + about, function(deleted){
				if(deleted){
					CHAN.log.debug('forgot about ' + about);
				} else {
					CHAN.log.debug('no ' + about + ' factoid to forget');
				}
			});
		}
	});
}