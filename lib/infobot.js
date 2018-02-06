module.exports = class INFO{
	constructor(){
		this.determiners = ['this\\shere', 'this', 'that\\sthere', 'that', 'there', 'these', 'those', 'the', 'an', 'a'];
		this.data_rx = '([^!?\\r\\n]+?)';
		this.fact_rx = '(' + this.determiners.join('\\s|') + '|\\s*)' + this.data_rx;
		this.end_rx = '[.!?\\s]*$';
	}
	
	check_message(CHAN, text, can_lock, nick){

		//lock X (~ only)
		var lock_regex = new RegExp('^lock\\s' + this.fact_rx + this.end_rx, 'i');
		var lock_factoid = text.match(lock_regex);
		//CHAN.log.debug('lock', lock_regex, lock_factoid);
		if(lock_factoid !== null)
		{
			var about = lock_factoid[2].trim().replace(/\s/gi, '_');

			this.update_factoid(CHAN, about, {lock: true}, false, can_lock);
			return;
		}

		//forget X (fails if locked, unless ~)
		var forget_regex = new RegExp('^forget\\s' + this.fact_rx + this.end_rx, 'i');
		var forget_factoid = text.match(forget_regex);
		//CHAN.log.debug('forget', forget_regex, forget_factoid);
		if(forget_factoid !== null)
		{
			var about = forget_factoid[2].trim().replace(/\s/gi, '_');
			var determiner = forget_factoid[1].trim() || null;

			this.delete_factoid(CHAN, about, can_lock);
			return;
		}

		
		//what is X / who is X / what the *** is X? / who the *** is X? / what is an X? / what are these Xs?
		var get_regex = new RegExp('^(what|who)(?:\\s|\\sthe\\s(\\w+)\\s)(?:is|are)\\s' + this.fact_rx + this.end_rx, 'i');
		var get_factoid = text.match(get_regex);
		//CHAN.log.debug('get 1', get_regex, get_factoid);
		if(get_factoid !== null)
		{
			var about = get_factoid[4].trim().replace(/\s/gi, '_');
			var determiner = get_factoid[3].trim() || null;
			var adj = get_factoid[2].trim() || null;

			this.get_factoid(CHAN, determiner, about, adj);
			return;
		}

		//wt* is X / wt* is a X / wt* are Xs?
		get_regex = new RegExp('^(wt)([a-z])\\s(?:is|are)\\s' + this.fact_rx + this.end_rx, 'i');
		get_factoid = text.match(get_regex);
		//CHAN.log.debug('get 2', get_regex, get_factoid);
		if(get_factoid !== null)
		{
			var about = get_factoid[4].trim().replace(/\s/gi, '_');
			var determiner = get_factoid[3].trim() || null;
			var adj = get_factoid[2].trim() || null;

			this.get_factoid(CHAN, determiner, about, adj);
			return;
		}

		//what's X / who's X / what's an X
		get_regex = new RegExp('^(what|who)\'*s\\s' + this.fact_rx + this.end_rx, 'i');
		get_factoid = text.match(get_regex);
		//CHAN.log.debug('get 3', get_regex, get_factoid);
		if(get_factoid !== null)
		{
			var about = get_factoid[3].trim().replace(/\s/gi, '_');
			var determiner = get_factoid[2].trim() || null;
			
			this.get_factoid(CHAN, determiner, about, null);
			return;
		}	

		//I am also Y / I am also a Y / I'm also Y / Im also a Y
		var append_regex = new RegExp('^(?:I\\sam|I\'m|Im)\\s(?:also)\\s' + this.data_rx + this.end_rx, 'i');
		var append_factoid = text.match(append_regex);
		//CHAN.log.debug('append 1', append_regex, append_factoid);
		if(append_factoid !== null)
		{
			var about = nick;
			var info = append_factoid[1].trim();

			this.update_factoid(CHAN, about, {
				info: info
			}, true, can_lock);
			return;
		}


		//X is/are also Z
		append_regex = new RegExp('^' + this.fact_rx + '\\s(is|are)\\s(?:also)\\s' + this.data_rx + this.end_rx, 'i');
		append_factoid = text.match(append_regex);
		//CHAN.log.debug('append 2', append_regex, append_factoid);
		if(append_factoid !== null)
		{
			var about = append_factoid[2].trim().replace(/\s/gi, '_');
			var determiner = append_factoid[1].trim() || null;
			var plural = append_factoid[3].trim() === 'are';
			var info = append_factoid[4].trim();

			this.update_factoid(CHAN, about, {
				plural: plural,
				info: info,
				determiner: determiner
			}, true, can_lock);
			return;
		}	

		//no, X is/are Y
		var set_regex = new RegExp('^(?:no,)\\s' + this.fact_rx + '\\s(is|are)\\s' + this.data_rx + this.end_rx, 'i');
		var set_factoid = text.match(set_regex);
		//CHAN.log.debug('set 1', set_regex, set_factoid);
		if(set_factoid !== null)
		{
			var about = set_factoid[2].trim().replace(/\s/gi, '_');
			var determiner = set_factoid[1].trim() || null;
			var plural = set_factoid[3].trim() === 'are';
			var info = set_factoid[4].trim();

			this.set_factoid(CHAN, about, {
				plural: plural,
				info: info,
				lock: false,
				determiner: determiner
			}, can_lock);
			return;
		}

		//I am Y / I am a Y / I'm Y / Im a Y
		set_regex = new RegExp('^(?:I\\sam|I\'m|Im)\\s' + this.data_rx + this.end_rx, 'i');
		set_factoid = text.match(set_regex);
		//CHAN.log.debug('set 2', set_regex, set_factoid);
		if(set_factoid !== null)
		{
			var about = nick;
			var info = set_factoid[1].trim();

			this.set_factoid(CHAN, about, {
				plural: false,
				info: info,
				lock: false,
				determiner: null
			}, can_lock);
			return;
		}

		//X is/are Y
		set_regex = new RegExp('^' + this.fact_rx + '\\s(is|are)\\s' + this.data_rx + this.end_rx, 'i');
		set_factoid = text.match(set_regex);
		//CHAN.log.debug('set 3', set_regex, set_factoid);
		if(set_factoid !== null)
		{
			var about = set_factoid[2].trim().replace(/\s/gi, '_');
			var determiner = set_factoid[1].trim() || null;
			var plural = set_factoid[3].trim() === 'are';
			var info = set_factoid[4].trim();

			this.set_factoid(CHAN, about, {
				plural: plural,
				info: info,
				lock: false,
				determiner: determiner
			}, can_lock);
			return;
		}

		//X? X!
		var question_regex = new RegExp('^' + this.fact_rx + '[!?\\s]$', 'i');
		var question_factoid = text.match(question_regex);
		//CHAN.log.debug('question', question_regex, question_factoid);
		if(question_factoid !== null)
		{
			var about = question_factoid[2].trim().replace(/\s/gi, '_');
			var determiner = question_factoid[1].trim() || null;

			this.get_factoid(CHAN, determiner, about);
			return;
		}

	};

	factoid_locked(CHAN, about, force_unignore, callback){
		this.get_factoid(CHAN, null, about, null, force_unignore, function(data){
			CHAN.log.debug(about, 'locked', data && data.lock === true);
			callback(data && data.lock === true);
		});
	}

	update_factoid(CHAN, about, new_data, append, can_lock){
		var _this = this;
		//CHAN.log.debug('update_factoid', 'about', about, 'new_data', new_data, 'append', append);
		this.check_ignore(CHAN, about, false, function(){
			_this.get_factoid(CHAN, new_data.determiner ? new_data.determiner : null, about, null, false, function(data){

				if(data === null){
					_this.set_factoid(CHAN, about, {
						plural: new_data.plural,
						info: new_data.info,
						lock: false,
						determiner: new_data.determiner
					}, can_lock);
					return;
				}

				if(data.lock && !can_lock){
					CHAN.log.warn('factoid lock, and user cannot unlock lock');
					return;
				}

				if(append){
					new_data.info = data.info + ' and ' + (data.plural ? 'are' : 'is') + ' also ' + new_data.info;
				}

				for(var key in new_data){
					data[key] = new_data[key];
				}

				_this.set_factoid(CHAN, about, data, can_lock);
			});
		});
	}

	get_factoid(CHAN, determiner, about, adj, force_unignore, callback){
		//CHAN.log.debug('get_factoid', 'about', about, 'adj', adj, 'force_unignore', force_unignore);
		this.check_ignore(CHAN, about, force_unignore, function(){
			db.get_data('/factoid/' + about, function(data){
		   		if(data !== null){
		   			if(callback){
		   				callback(data);
		   				return;
		   			}

					//CHAN.log.debug('get_factoid data', data);

		   			var adjective = adj ? x.ing(adj) + ' ' : '';
		   			var send_factoid = (determiner ? determiner + ' ' : data.determiner ? data.determiner + ' ' : ''); 
		   				send_factoid += about.replace(/_/gi, ' ') + ' ' + (data.plural ? 'are' : 'is') + ' ';
		   				send_factoid += x.article_adj(adjective, x.vars(CHAN, data.info));

		   			CHAN.say({succ: send_factoid}, 1, {to: CHAN.chan});
		   		} else {
		   			if(callback) callback(data);
		   			return;
		   		}
		    }, about);
		});
	}

	set_factoid(CHAN, about, data, can_lock){
		var _this = this;
		//CHAN.log.debug('set_factoid', 'about', about, 'data', data);
		this.check_ignore(CHAN, about, false, function(){
			_this.factoid_locked(CHAN, about, false, function(locked){
				if(locked && !can_lock){
					CHAN.log.warn('factoid lock, and user cannot unlock lock');
				} else {
					db.update('/factoid/' + about, data, true, function(act){
				        if(act === 'add'){
				            //CHAN.log.debug('factoid added');
				        } else {
				            //CHAN.log.debug('factoid removed');
				        }
				    }, about);
				}
			});
		});
	}

	delete_factoid(CHAN, about, can_lock){
		this.factoid_locked(CHAN, about, true, function(locked){
			if(locked && !can_lock){
				CHAN.log.warn('factoid lock, and user cannot unlock lock');
			} else {
				db.delete('/factoid/' + about, function(deleted){
					if(deleted){
						CHAN.log.debug('forgot about ' + about);
					} else {
						CHAN.log.debug('no ' + about + ' factoid to forget');
					}
				}, about);
			}
		});
	}

	check_ignore(CHAN, about, force, callback){
		if((CHAN.config.info_bot_ignore.indexOf(about) < 0 && this.determiners.indexOf(about) < 0) || force){
			callback();
		} else {
			this.delete_factoid(CHAN, about, true);
		}
	}
}