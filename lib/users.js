//when a user logs on to the server
var User = require(__botdir + '/lib/user.js');

module.exports = class USERS{
    constructor(){
		this.on_server = {};
		this.who_queue = {};
		this.nick_change_queue = {};
	}

	//fire when nick has finished changing
	nick_changed(old_nick, new_nick){
        b.log.warn('changed nick', old_nick, '->', new_nick);
        if(new_nick === bot.nick){
        	if(this.nick_change_queue[old_nick]){
				this.nick_change_queue[old_nick].callback(old_nick, new_nick, this.nick_change_queue[old_nick].new_nick);
				delete this.nick_change_queue[old_nick];
			}
        } else {
        	this.add_or_update_user(old_nick, {nick: new_nick});
        }
	}

	//call to change a users nickname
	nick_change(nick, new_nick, callback){
		if(b.is_op){
			this.nick_change_queue[nick] = {new_nick: new_nick, callback: callback ? callback : function(){}};
			bot.send('sanick', nick, new_nick);
		} else {
			b.log.error('nick_change', bot.nick, 'is not opper')
			callback();
		}
	}

	who_reply(msg){
		var _this = this;
		let user_data = null;

		//b.log.debug(msg);
		switch(msg.rawCommand){
			case '311': //whoisuser
				user_data = {
					who: msg.args[1] + '!' + msg.args[2] + '@' + msg.args[3],
	        		nick: msg.args[1],
	        		user: msg.args[2],
	        		host: msg.args[3]
	        	}
				break;
			case '312': //whoisserver
				break;
			case '313': //whoisoperator
				break;
			case '317': //whoisidle
				break;
			case '319': //whoischannels
				break;
	        case '352': //who
	        	user_data = {
	        		who: msg.args[5]+ '!' + msg.args[2] + '@' + msg.args[3],
	        		nick: msg.args[5],
	        		user: msg.args[2],
	        		host: msg.args[3],
	        		ip: msg.args[4]
	        	}
	        	break;
	        case '401': //nosuchnick
	        	if(_this.who_queue[msg.args[1]]){
	        		if(_this.who_queue[msg.args[1]].callback) _this.who_queue[msg.args[1]].callback({err: 'No such nick ' + msg.args[1]});
	        		delete  _this.who_queue[msg.args[1]];
	        	}
	        	break;
	        default:
	        	break;
		}

		if(user_data !== null && user_data.nick !== bot.nick){
			if(_this.who_queue[user_data.nick]){
				user_data = merge.all([_this.who_queue[user_data.nick], user_data]);
				delete _this.who_queue[user_data.nick];
			}
	        _this.add_or_update_user(user_data.who, user_data);
		}
	}

	join_server(chan, nick, msg){
		var chans = {};
		chans[chan] = '';

		this.add_or_update_user(msg.prefix, {
			who: msg.prefix,
			nick: nick,
			user: msg.user,
			host: msg.host,
			chans: chans
		}, chan);
	}

	//join = a channel, user just joined, so do things like update last seen, say tagline etc
	//nick_change = true, this is a nick_change call
	add_or_update_user(who, user_data, join){
		var _this = this;
		this.find_user(who, function(usr){
			//b.log.debug('find_user clbk', usr);

			if(typeof usr.who.length > 1){
				b.log.error('Something went wrong, multiple users found for', who, usr.who);
			} else {
				let usrr = usr;
				_this.user_data_from_who(config.owner, true, function(match_owner_regex){
					usr = usrr;
					if(usr.where === 'on_server'){
						var old_usr = _this.on_server[usr.who[0]];

						_this.on_server[usr.who[0]] = merge.all([_this.on_server[usr.who[0]], user_data]);
						var usr_who = _this.on_server[usr.who[0]].who;

						//if nick changed, we need to update the who
						if(old_usr.nick !== _this.on_server[usr_who].nick){
							usr_who = _this.on_server[usr.who[0]].nick + '!' + (_this.on_server[usr.who[0]].who.split('!'))[1];
							_this.on_server[usr.who[0]].who = usr_who;
							_this.on_server[usr_who] = _this.on_server[usr.who[0]];
							delete _this.on_server[usr.who[0]];

							//change user nicks in channels
							for(var chan in _this.on_server[usr_who].chans){
								if(b.channels[chan] && b.channels[chan].users[old_usr.nick]){
									b.channels[chan].users[old_usr.nick].nick_change(_this.on_server[usr_who].nick);
								}
							}

							if(_this.nick_change_queue[old_usr.nick]){
								_this.nick_change_queue[old_usr.nick].callback(old_usr.nick, _this.on_server[usr_who].nick, _this.nick_change_queue[old_usr.nick].new_nick);
								delete _this.nick_change_queue[old_usr.nick];
							}
						}

						//verify if user is in all the right channels
						if(_this.on_server[usr_who].chans){
							for(var chan in _this.on_server[usr_who].chans){
								if(b.channels[chan] && !b.channels[chan].users[_this.on_server[usr_who].nick]){
									//b.log.debug('1 new user', _this.on_server[usr_who].nick, usr_who, chan, _this.on_server[usr_who].chans[chan]);

									b.channels[chan].users[_this.on_server[usr_who].nick] = 
										new User(_this.on_server[usr_who].nick, usr_who, chan, _this.on_server[usr_who].chans[chan], (join && join === chan));
								}
							}
						}

						if(usr_who.match(match_owner_regex) !== null && !_this.on_server[usr_who].is_owner){
							_this.on_server[usr_who].is_owner = true;
							b.log.info(usr_who, 'made b0t owner', match_owner_regex);
						} else if(usr_who.match(match_owner_regex) === null && _this.on_server[usr_who].is_owner){
							b.log.warn(usr_who, 'no longer matches owner', match_owner_regex);
							delete _this.on_server[usr_who].is_owner;
						}

						if(_this.on_server[usr_who].callback){
							var callback_data = {};
							callback_data[usr_who] = _this.on_server[usr_who];
							_this.on_server[usr_who].callback(callback_data);
							delete _this.on_server[usr_who].callback;
						}
					} else {
						if(user_data.who){
							user_data.who_org = usr.who[0];
							user_data.nick_org = user_data.nick;

							if(user_data.who.match(match_owner_regex) !== null){
								user_data.is_owner = true;
								b.log.info(user_data.who, 'made b0t owner', match_owner_regex);
							} 

							_this.on_server[usr.who[0]] = user_data;

							//verify if user is in all the right channels
							if(user_data.chans){
								for(var chan in user_data.chans){
									if(b.channels[chan] && !b.channels[chan].users[user_data.nick]){
										//b.log.debug('2 new user', user_data.nick, usr.who[0], chan, user_data.chans[chan]);

										b.channels[chan].users[user_data.nick] = 
											new User(user_data.nick, usr.who[0], chan, user_data.chans[chan], (join && join === chan));
									}
								}
							}

							if(user_data.callback){
								var callback_data = {};
								callback_data[usr.who[0]] = user_data;
								user_data.callback(callback_data);
								delete user_data.callback;
							}
							
						} else {
							if(!_this.who_queue[user_data.nick]){
								_this.who_queue[user_data.nick] = user_data;
								bot.send('WHO', user_data.nick);
								//bot.send('WHOIS', user_data.nick);
							} else {
								_this.who_queue[user_data.nick] = merge.all([_this.who_queue[user_data.nick], user_data]);
							}
						}
					}
				});
			}
		});

		//b.log.debug('add_or_update_user on_server', _this.on_server);
	}

	user_data_from_who(who, return_regex, callback){

		function create_regex(user_data){
			var match_who = '^';
			if(user_data.nick === '*'){
				match_who += '.+?!';
			} else {
				match_who += user_data.nick.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '!';
			}

			if(user_data.user === '*'){
				match_who += '.+?@';
			} else {
				match_who += user_data.user.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '@';
			}

			if(user_data.host === '*'){
				match_who += '.+$';
			} else {
				match_who += user_data.host.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$';
			}
			return new RegExp(match_who, 'i');
		}

		var user_data = null;
		var split_who = who.match(/^(.*?)!(.*?)@(.*)$/); //nick!user@host
		if(split_who !== null){
			user_data = {
				nick: split_who[1],
				user: split_who[2],
				host: split_who[3]
			};
		}

		split_who = who.match(/^(.*?)!(.*)$/); //nick!user
		if(split_who !== null && user_data === null){
			user_data = {
				nick: split_who[1],
				user: split_who[2],
				host: '*'
			};
		}

		split_who = who.match(/^(.*?)@(.*)$/); //nick@host
		if(split_who !== null && user_data === null){
			user_data = {
				nick: split_who[1],
				user: '*',
				host: split_who[2]
			};
		}

		if(user_data === null){
			user_data = {
				nick: who,
				user: '*',
				host: '*'
			}
		} 

		callback(return_regex ? create_regex(user_data) : user_data);
	};

	//if force = true, if owner is not on server, return owner nick.
	owner(force, callback){
		var _this = this;

		var owner_nicks = [];
		for(var usr in _this.on_server){
			if(_this.on_server[usr].is_owner) owner_nicks.push(_this.on_server[usr].nick);
		}

		if(owner_nicks.length === 0){
			if(force){
				_this.user_data_from_who(config.owner, false, function(owner_data){
					if(owner_data.nick !== '*'){
						return callback([owner_data.nick]);
					} else {
						return callback([config.owner]);
					}
				});
			} else {
				return callback(null);
			}
		} else {
			return callback(owner_nicks);
		} 
	};


	find_user(who, callback){
		var _this = this;
		//b.log.debug('find_user', who);
		if(this.on_server[who]){
			return callback({'who': [who], 'where': 'on_server'});
		} else {
			_this.user_data_from_who(who, true, function(match_who_regex){
				//b.log.debug('user_data_from_who', match_who_regex);

				var matched_whos = [];
				for(var usr in _this.on_server){
					if(usr.match(match_who_regex) !== null){
						matched_whos.push(usr);
					}
				}

				if(matched_whos.length > 1) b.log.warn('More than one user matched!', match_who_regex, matched_whos);
				if(matched_whos.length > 0){
					return callback({'who': matched_whos, 'where': 'on_server'});
				} else {
					return callback({'who': [who], 'where': null});
				}
			});
		}
	};

	leave_channel(nick, chan, reason){
		var _this = this;

	    this.update_last_seen(nick, chan, reason);

	    if(b.channels[chan].config.discord_relay_channel){
	        b.channels[chan].SAY.say('← ' + x.no_highlight(nick) + ' left', 1, {skip_verify: true, ignore_bot_speak: true, skip_buffer: true});
	    }

	    //if the bot left, delete the whole channel
	    if(nick === bot.nick){
	        b.log.debug(bot.nick, 'left channel, deleting', chan);
	        b.channels[chan].uninit_chan();
	        b.log.debug('channels:', Object.keys(b.channels));
	    } else {
	        b.log.debug(nick, 'left channel', chan, 'deleting');
	        delete b.channels[chan].users[nick];
	    }

	    this.find_user(nick, function(usr){
	    	b.log.debug(usr);
			if(usr.where === 'on_server'){
				for(var i = 0; i < usr.who.length; i++){
					//b.log.debug(usr.who[i], _this.on_server[usr.who[i]]);
					delete _this.on_server[usr.who[i]].chans[chan];
				}
			} else {
				b.log.warn('could not delete chan from', usr.who.join(','), 'does not exist');
			}
		});
	};


	leave_server(nick, reason){
		var _this = this;

		//remove user from all channels
		for(var chan in b.channels){
	        this.update_last_seen(nick, null, reason);

	        //if the bot left, delete the whole channel
	        if(nick === bot.nick){
	            b.log.debug(bot.nick, 'quit server, deleting channels');
	            for(chan in b.channels){
	                if(b.channels[chan].config.discord_relay_channel){
	                    b.channels[chan].SAY.say('← ' + x.no_highlight(nick) + ' quit', 1, {skip_verify: true, ignore_bot_speak: true, skip_buffer: true});
	                }

	                b.channels[chan].uninit_chan();
	            }
	            b.log.debug('channels:', Object.keys(b.channels));
	        } else {
	            b.log.debug(nick, 'quit server, deleting from all channels');
	            for(chan in b.channels){
	                if(b.channels[chan].users[nick] && b.channels[chan].config.discord_relay_channel){
	                    b.channels[chan].SAY.say('← ' + x.no_highlight(nick) + ' quit', 1, {skip_verify: true, ignore_bot_speak: true, skip_buffer: true});
	                }

	                delete b.channels[chan].users[nick];
	            }
	        }
	    }

		this.find_user(nick, function(usr){
			if(usr.where === 'on_server'){
				for(var who in usr.who){
					delete _this.on_server[who];
					b.log.info('deleting', who, 'from server');
				}
				//b.log.debug('leave_server on_server', _this.on_server);
			} else {
				b.log.warn('could not delete from server', usr.who.join(','), 'does not exist');
			}
		});
	};

	whois(who, force, callback){
		var _this = this;
		var whois_data = {};
		if(force){
			_this.user_data_from_who(who, false, function(user_data){
				//b.log.debug('whois user_data_from_who', user_data);
				user_data.callback = function(who_data){
					if(who_data.err){
						_this.find_user(who, function(usr){
							//b.log.debug('whois find_user', usr);
							if(usr.where === 'on_server'){
								for(var i = 0; i < usr.who.length; i++){
									whois_data[usr.who[i]] = _this.on_server[usr.who[i]];
								}
								return callback(whois_data);
							} else {
								callback(who_data);
							}
						});
					} else {
						callback(who_data);
					}
				};

				_this.who_queue[user_data.nick] = user_data;
				bot.send('WHOIS', user_data.nick);
			});
		} else {
			_this.find_user(who, function(usr){
				if(usr.where === 'on_server'){
					for(var i = 0; i < usr.who.length; i++){
						whois_data[usr.who[i]] = _this.on_server[usr.who[i]];
					}
					return callback(whois_data);
				} else {
					_this.user_data_from_who(who, false, function(user_data){
						user_data.callback = callback;
						_this.who_queue[user_data.nick] = user_data;

						bot.send('WHOIS', user_data.nick);
					});
				}
			});
		}
	}

	update_org_to_current(usr_arr){
		var _this = this;
		for(var who in this.on_server){
			if(usr_arr === undefined || usr_arr.indexOf(_this.on_server[who].nick) > -1){
				_this.on_server[who].nick_org = _this.on_server[who].nick;
				_this.on_server[who].who_org = _this.on_server[who].who;
			}
		}
	};

	update_last_seen(nick, chan, action, where){ 
		var _this = this;
		var seen_data = {
	        date: (new dateWithOffset(0)).getTime(),
	        chan: chan,
	        action: action,
	        where: where ? where : 'irc'
	    };

		this.find_user(nick, function(usr){
			if(usr.where === 'on_server'){
				usr.who.forEach(function(who){
					db.update("/nicks/" + _this.on_server[who].nick_org + '/seen', seen_data, true, undefined, _this.on_server[who].nick_org);
				});
			} else {
				db.update("/nicks/" + nick + '/seen', seen_data, true, undefined, nick);
			}
		});
	}

	/* data = { col: data, col2: data2 } */
	update_user(nick, data, callback) {
	    db.update("/nicks/" + nick, data, false, function(act){
	        if(act === 'remove'){
	            callback({succ: x.no_highlight(nick) + '\'s ' + x.join_and(Object.keys(data)) + ' has now been removed', act: 'remove'});
	        } else {
	            callback({succ: x.no_highlight(nick) + '\'s ' + x.join_and(Object.keys(data)) + ' has now been set', act: 'add'});
	        }
	    }, nick);
	}

	//get user data
	get_user_data(nick, options, callback) {
	    var _this = this;
	     options = Object.assign({}, {
	        label: null, // name name, purely for speaking purposes
	        col: '', // command name usually (the one used to register data, not the one calling it), but can be any data column under user name in db
	        register_syntax: null, //by default, tries to get syntax for col as command. if col is not a command and skip_say:true, this should not be null
	        skip_say: false, //return false instead of error message if not registered
	        ignore_err: false,
	        return_all: false, //if true, return an object of all the user data (if col is set, throws error if col doesn't exist in user data) 
	        use_nick_org: true //if false, doesn't look to see if the user has an original nick
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
	    
	    function get_usr_data(path){
		    db.get_data(path, function(user_data){
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
		                var str = nick + (nick_org !== nick ? '(' + nick_org + ')' : '') + ', your ' + options.label + ' is not registered, please type ' + options.register_syntax + ' to register it';
		                callback({err: str});
		                return;
		            } else {
		                callback(false);
		                return;
		            }
		        }
		    }, true, nick);
		}

	    if(options.use_nick_org){
	    	this.find_user(nick, function(usr){
				if(usr.where === 'on_server'){
					if(usr.who.length > 1){
						b.log.error('more than one user found on server for', nick, usr.who.join(', '));
			            if(!options.skip_say){
			                callback({err: 'Something went wrong'});
			                return;
			            } else {
			                callback(false);
			                return;
			            }
					} else {
						get_usr_data("/nicks/" + _this.on_server[usr.who[0]].nick_org + '/' + (options.return_all ? '' : options.col), _this.on_server[usr.who[0]].nick_org);
					}
				} else {
					get_usr_data("/nicks/" + nick + '/' + (options.return_all ? '' : options.col));
				}
			});
	    } else {
	    	get_usr_data("/nicks/" + nick + '/' + (options.return_all ? '' : options.col));
	    }
	}

	send_tell_messages(nick){
	    this.get_user_data(nick, {
	        label: 'mesages',
	        col: 'msg',
	        ignore_err: true,
	        skip_say: true,
	        use_nick_org: false
	    }, function(messages){
	        if(messages !== false){
	            for(var sender in messages){
	                b.pm.SAY.say(sender + ' said to tell ' + nick + ' ' + messages[sender].join(' | '), 3, {to: nick});
	                b.pm.SAY.say({succ: 'told ' + nick + ' ' + messages[sender].join(' | ')}, 3, {to: sender});
	            }
	            db.delete("/nicks/" + nick + '/msg');
	        }
	    });
	}
}