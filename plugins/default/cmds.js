var info = {
	name: 'Default',
	about: 'built in system commands'
}
exports.info = info;

var DEFAULT		 = require(__dirname + '/func.js'),
	def			 = new DEFAULT();

var cmds = {
	commands: {
		action: 'list all of the available bot commands',
		params: [{
			optional: true,
			name: 'list',
			type: 'flag'
		}],
		func: function(CHAN, USER, say, args, command_string){
			b.cmds.verify_commands(USER, {help: (args.list !== undefined), is_pm: CHAN.is_pm, by_plugin: true, ignore_spammy: true}, function(cmd_obj){

				if(Object.keys(cmd_obj).length === 0)
				{
					say({'err': 'No commands avaliable'});
					return;
				}

				if(args.list !== undefined) {
					var cmd_arr = [];

					if(!USER.is_owner && CHAN.is_pm) cmd_arr.push(CHAN.t.fail('Note: When using in a PM, only shows base privileges'));

					for(var plugin in cmd_obj){
						cmd_arr.push(CHAN.t.warn('--- ' + CHAN.t.term(plugin + ': ' + (b.cmds.commands[plugin].info.about ? b.cmds.commands[plugin].info.about : '')) + ' ---'));
						cmd_arr = cmd_arr.concat(cmd_obj[plugin]);
					}

					say(cmd_arr, 3, {skip_verify: true, join: '\n'});
				} else {
					var cmd_arr = [];

					for(var plugin in cmd_obj){
						cmd_arr.push(CHAN.t.warn(plugin + ':') + ' ' + cmd_obj[plugin].join(', '));
					}

					var str = cmd_arr.join(CHAN.t.highlight(' | '));
					str += CHAN.t.fail(' (for more info, you can type any command followed by help)');

					if(CHAN.is_pm) str += CHAN.t.null(' (cannot be used in a PM)');

					say(str, 3, {skip_verify: true, lines: 20, force_lines: true});
				}

			});
		}
	},
	help: {
		action: 'help the user',
		params: [{
			or: [{
					name: 'colors',
					type: 'flag',
					key: 'topic'
				},{
					name: 'commands',
					type: 'flag',
					key: 'topic'
				},{
					name: 'infobot',
					type: 'flag',
					key: 'topic'
				}]
		}],
		perm: '+',
		func: function(CHAN, USER, say, args, command_string){

			var help_topics = {
				'-colors': [
					'If a command accepts colors, you can use various short cuts to format text preceded by an &:',
					'\u0002b bold\u000f | \u0016i italic\u000f | \u001fu\u000f \u001funderline\u000f | r reset | ' + c.white.bgblack(' 0 ')+c.black.bgwhite(' 1 ')+c.navy(' 2 ')+c.green(' 3 ')+c.red(' 4 ')+c.brown(' 5 ')+c.purple(' 6 ')+c.olive(' 7 ')+c.yellow(' 8 ')+c.lime(' 9 ')+c.teal(' 10 ')+c.cyan(' 11 ')+c.blue(' 12 ')+c.pink(' 13 ')+c.grey(' 14 ')+c.silver(' 15 '),
					'color codes are 0-15 see https://github.com/z0mbieparade/b0t/wiki/Colors for a complete list of color names',
					'typing `&lime>green text here` or `&9>green text here` will return \u00039>green text here'
				],
				'-commands': [
					'For any command, you can type ' + CHAN.t.highlight(config.command_prefix + 'command help') + ' to receive full usage instructions.',
					'To view all commands and their help syntax, you can type ' + CHAN.t.highlight(config.command_prefix + 'commands -list'),
					'For example, typing ' + CHAN.t.highlight(config.command_prefix + 'tag help') + ' will return the following syntax:',
					b.cmds.cmd_syntax(USER, 'tag'),
					'To break this down, that means there are 4 things you can do with the tag command: ',
					'1. ' + CHAN.t.highlight(config.command_prefix + 'tag -list') + ' will return a list of all taglines currently for your user account',
					'2. ' + CHAN.t.highlight(config.command_prefix + 'tag -delete 4') + ' will delete the 4th tagline (which you know the id of because you did list first)',
					'3. ' + CHAN.t.highlight(config.command_prefix + 'tag -edit 3 new tagline') + ' will edit the 2nd tagline (which you know the id of because you did list first)',
					'4. ' + CHAN.t.highlight(config.command_prefix + 'tag &lime>i feel pretty, oh so pretty') + ' will add ' + c.lime('>i feel pretty, oh so pretty') + ' as a tagline when you enter the room. (for more info about colors, type ' + config.command_prefix + 'help colors)'
				],
				'-infobot': [
					'See https://github.com/z0mbieparade/b0t/wiki/Info-Bot for more info.'
				]
			}

			say(help_topics[args.topic] , 3, {skip_verify: true, skip_buffer: true, join: '\n'});
		}
	},
	'set': {
		action: 'set the channel topic',
		params: [{
			name: 'topic',
			type: 'text',
			colors: true
		}],
		perm: '+',
		no_pm: true,
		func: function(CHAN, USER, say, args, command_string){
			topic_db.update('/' + CHAN.chan, {topic: [args.topic]}, false, function(){
				CHAN.update_topic();
			});
		}
	},
	pin: {
		action: 'pin a topic',
		params: [{
			optional: true,
			or: [{
					name: 'topic id',
					type: 'number',
					key: 'id'
				},{
					name: 'search term',
					type: 'text',
					key: 'query'
				}]
		}],
		perm: '~',
		no_pm: true,
		func: function(CHAN, USER, say, args, command_string){
			topic_db.search_arr(USER, '/' + CHAN.chan + '/topic', args, false, function(data, found){
				if(found && found > 1){
					say({succ: found + " items found matching '" + command_string.trim() + "'"}, 2, {skip_verify: true});
					say(data, 3, {skip_verify: true, join: '\n'});
				} else if(found && found === 1){
					topic_db.update('/' + CHAN.chan + '/pinned', data, true, function(act){
						CHAN.update_topic();
					});
				} else {
					say(data, 2, {skip_verify: true});
				}
			});
		}
	},
	unpin: {
		action: 'unpin the channel topic',
		perm: '~',
		no_pm: true,
		func: function(CHAN, USER, say, args, command_string){
			topic_db.delete('/' + CHAN.chan + '/pinned', function(act){
				if(act){
					CHAN.update_topic();
				} else {
					say({err: 'unable to unpin topic'});
				}
			});
		}
	},
	updatetopic: {
		action: 'update channel topic from qotd',
		perm: 'owner',
		no_pm: true,
		func: function(CHAN, USER, say, args, command_string){
			CHAN.update_topic();
		}
	},
	qotd: {
		action: 'get random topic, or enter a search term to search for a specific topic. if more than one found, will list by ID number. Enter id number to read specific topic',
		no_pm: true,
		params: [{
			optional: true,
			or: [{
					name: 'topic id',
					type: 'number',
					key: 'id'
				},{
					name: 'search term',
					type: 'text',
					key: 'query'
				}]
		}],
		func: function(CHAN, USER, say, args, command_string){
			topic_db.search_arr(USER, '/' + CHAN.chan + '/topic', args, true, function(data, found){
				if(found && found > 1){
					say({succ: found + " items found matching '" + command_string.trim() + "'"}, 2, {skip_verify: true});
					say(data, 3, {skip_verify: true, join: '\n'});
				} else if(found && found === 1){
					say({succ: data}, 1, {skip_verify: true});
				} else {
					say(data, 2, {skip_verify: true});
				}
			});
		}
	},
	ping: {
		action: 'Send ping and get pong',
		func: function(CHAN, USER, say, args, command_string){
			if(b.waiting_for_pong.indexOf(CHAN.chan) < 0) b.waiting_for_pong.push(CHAN.chan);
			bot.send('ping', config.network_name);
		}
	},
	reg: {
		action: 'register a user for any service (lastfm, trakt, location, untappd)',
		params: [{
				name: 'service',
				type: 'string'
			},{
				name: 'irc nick',
				type: 'string'
			},{
				or: [{
					name: 'list',
					type: 'flag',
					key: 'flag',
				},{
					name: 'delete',
					type: 'flag',
					key: 'flag',
					and: [ { name: 'id', type: 'number' } ]
				},{
					name: 'edit',
					type: 'flag',
					key: 'flag',
					and: [ { name: 'id', type: 'number' }, { name: 'data', type: 'text', key: 'new_val', colors: true } ]
				},{
					name: 'data',
					type: 'text',
					key: 'new_val',
					colors: true,
					fake: {flag: '-add'}
				}]
		}],
		perm: 'owner',
		registered: true,
		func: function(CHAN, USER, say, args, command_string){

			var command_data = b.cmds.command(args.service, {
				t: CHAN.t,
				perm: 'owner',
				config: CHAN.config
			});

			if(command_data.err)
			{
				return say(command_data);
			}

		   if(args.service === 'tag'){
				db.manage_arr(USER, '/nicks/'+args.irc_nick+'/tags', args, {case_insensitive: args.irc_nick}, say);
			} else if(args.service === 'location'){
				command_data.func(CHAN, {nick: args.irc_nick}, say, {location: args.new_val}, '');
			} else {
				var data = command_string.split(' ');
				data.splice(0, 2);

				var data_obj = {};
				data_obj[args.service] = args.new_val;

				db.update("/nicks/" + args.irc_nick, data_obj, false, function(act){
					if(act === 'remove'){
						say({succ: args.irc_nick + '\'s ' + args.service + ' has now been removed'}, 2);
					} else {
						say({succ: args.irc_nick + '\'s ' + args.service + ' has now been set'}, 2);
					}
				}, args.irc_nick);
			}
		}
	},
	unreg: {
		action: 'unregister a user for any service (lastfm, trakt, location, untappd)',
		params: [{
				name: 'service',
				type: 'string'
			},{
				name: 'irc nick',
				type: 'string'
		}],
		perm: '~',
		registered: true,
		func: function(CHAN, USER, say, args, command_string){
			if(args.service === 'tags' || args.service === 'tag'){
				say({err: 'use reg command to modify user tags'});
			} else {
				db.delete('/nicks/' + args.irc_nick + '/' + args.service, function(act){
					if(act === true){
						say({succ: args.irc_nick + '\'s ' + args.service + ' has now been removed'});
					} else {
						say({err: 'Unable to delete'});
					}
				}, args.irc_nick);
			}
		}
	},
	tell: {
		action: 'tell another user something when they they are next active',
		params: [{
				name: 'irc nick',
				type: 'string'
			},{
				name: 'message',
				type: 'text',
				colors: true
		}],
		registered: true,
		func: function(CHAN, USER, say, args, command_string){
			command_string = command_string.replace(/^.*?\s/i, '');
			db.update('/nicks/' + args.irc_nick + '/msg/' + USER.nick + '[]', args.message, true, function(act){
				if(act === 'remove'){
					say({succ: 'Your message has been removed'}, 2)
				} else {
					say({succ: 'Your message will be sent when ' + args.irc_nick + ' is next seen'}, 2);
				}
			}, args.irc_nick);
		}
	},
	speak: {
		action: 'allows owner to speak through bot to channel or to user',
		params: [{
				name: 'to',
				type: 'string'
			},{
				name: 'message',
				type: 'text',
				colors: true
		}],
		perm: 'owner',
		func: function(CHAN, USER, say, args, command_string){
			say(args.message, 1, {to: args.to, skip_verify: true, ignore_bot_speak: true})
		}
	},
	tag: {
		action: 'create a tagline for the bot to say when you enter the room',
		params: [{
			or: [{
					name: 'list',
					type: 'flag',
					key: 'flag',
				},{
					name: 'delete',
					type: 'flag',
					key: 'flag',
					and: [ { name: 'id', type: 'number' } ]
				},{
					name: 'edit',
					type: 'flag',
					key: 'flag',
					and: [ { name: 'id', type: 'number' }, { name: 'new tagline', type: 'text', key: 'new_val', colors: true } ]
				},{
					name: 'new tagline',
					type: 'text',
					key: 'new_val',
					colors: true,
					fake: {flag: '-add'}
				}]
		}],
		registered: true,
		func: function(CHAN, USER, say, args, command_string){
			db.manage_arr(USER, '/nicks/' + USER.nick + '/tags', args, {case_insensitive: USER.nick}, say);
		}
	},
	updates: {
		action: 'check for updates to b0t script',
		perm: '@',
		func: function(CHAN, USER, say, args, command_string){
			x.get_url(
				'https://raw.githubusercontent.com/z0mbieparade/b0t/master/package.json',
				'json',
				function(data){
					if(data.version === pkg.version){
						say('I am up to date!', 1);
					} else {
						var str = 'Please update me! My version: ' + pkg.version + ' Current version: ' + data.version;
						say(str, 2)
					}
			   });
		}
	},
	bug: {
		action: 'send a bug report to the owner or lists current bugs',
		perm: '%',
		params: [{
			or: [{
					name: 'list',
					type: 'flag',
					key: 'flag',
				},{
					name: 'delete',
					type: 'flag',
					perm: 'owner',
					key: 'flag',
					and: [ { name: 'id', type: 'number' } ]
				},{
					name: 'edit',
					type: 'flag',
					perm: 'owner',
					key: 'flag',
					and: [ { name: 'id', type: 'number' }, { name: 'new bug', type: 'text', key: 'new_val', colors: true } ]
				},{
					name: 'new bug',
					type: 'text',
					key: 'new_val',
					colors: true,
					fake: {flag: '-add'}
				}]
		}],
		func: function(CHAN, USER, say, args, command_string){
			db.manage_arr(USER, '/bugs', args, {}, say);
		}
	},
	request: {
		action: 'send a feature request to the owner or list current requests',
		params: [{
			or: [{
					name: 'list',
					type: 'flag',
					key: 'flag',
				},{
					name: 'delete',
					type: 'flag',
					perm: 'owner',
					key: 'flag',
					and: [ { name: 'id', type: 'number' } ]
				},{
					name: 'edit',
					type: 'flag',
					perm: 'owner',
					key: 'flag',
					and: [ { name: 'id', type: 'number' }, { name: 'new request', type: 'text', key: 'new_val', colors: true } ]
				},{
					name: 'new request',
					type: 'text',
					key: 'new_val',
					colors: true,
					fake: {flag: '-add'}
				}]
		}],
		func: function(CHAN, USER, say, args, command_string){
			 db.manage_arr(USER, '/requests', args, {}, say);
		}
	},
	next: {
		action: 'Page next thru avaliable buffer, lines is 5 by default, join is a new line by default',
		params: [{
				optional: true,
				name: 'lines',
				type: 'number'
			},{
				optional: true,
				name: 'join',
				type: 'string',
			}],
		func: function(CHAN, USER, say, args, command_string){
			var opt = {
				nick: USER.nick,
				skip_buffer: true,
				skip_verify: true,
				page_buffer: true,
				copy_buffer_to_user: true
			};

			if(args.lines !== undefined) {
				opt.lines = args.lines;
				opt.force_lines = true;
			}
			if(args.name !== undefined) opt.name = args.name;

			say(null, 2, opt)
		}
	},
	list: {
		action: 'List all users in channel',
		no_pm: true,
		params: [{
			optional: true,
			name: 'chan',
			type: '#\\w+'
		}],
		func: function(CHAN, USER, say, args, command_string){
			//["", "+", "-", "@", "%", "&", "~"]

			function usr_list(chan_name){
				var data = [];

				function format_usr(u){

					var str = u.perm;
					if(u.is_owner || u.is_chan_owner) str += '(' + (u.is_owner ? 'α' : '') + (u.is_chan_owner ? 'χ' : '') + ')';
					str += x.no_highlight(u.nick) + (u.nick_org === u.nick ? '' : '/' + x.no_highlight(u.nick_org));

					if(u.registered) str = CHAN.t.success(str);

					data.push(str);
				}

				var chan = b.channels[chan_name];

				var data_obj = {owner: [], chan_owner: []};
				config.permissions.forEach(function(p){
					data_obj[p === '' ? 'none' : p] = [];
				});

				for(var nick in chan.users){
					if(nick === bot.nick) continue;

					var usr = chan.users[nick];

					if(usr.is_owner){
						data_obj['owner'].push(usr);
					} else if(usr.is_chan_owner){
						data_obj['chan_owner'].push(usr);
					} else {
						data_obj[usr.perm === '' ? 'none' : usr.perm].push(usr);
					}
				}

				for(var p in data_obj){
					data_obj[p].sort(function(a,b){
						return a.nick.localeCompare(b.nick);
					});
				}

				data_obj.owner.forEach(format_usr);
				data_obj.chan_owner.forEach(format_usr);

				data.push('(' + (b.is_op ? 'ο' : '') + 'β)' + bot.nick + (bot.nick !== config.bot_nick ? '/' + config.bot_nick : ''));

				for(var i = config.permissions.length - 1; i > -1; i--){
					var p = config.permissions[i] === '' ? 'none' : config.permissions[i];
					data_obj[p].forEach(format_usr);
				}


				say(data.join(', '), 1, {skip_verify: true, join: ', ', skip_buffer: true});
			}

			if(args.chan !== undefined){
				if(b.channels[args.chan] === undefined || b.channels[args.chan].config === undefined){
					say({err: 'No channel by that name'}, 3);
					return;
				} else {
					b.users.add_nickserv_cb(args.chan, 'names', function(callback){
						var chan_name = args.chan
						usr_list(chan_name);
						callback();
					});
					bot.send('names', args.chan);
				}
			} else {
				b.users.add_nickserv_cb(CHAN.chan, 'names', function(callback){
					var chan_name = CHAN.chan
					usr_list(chan_name);
					callback();
				});
				bot.send('names', CHAN.chan);
			}

		}
	},
	user: {
		action: 'whois info about a user',
		params: [{
			name: 'irc nick',
			type: 'string'
		}],
		perm: 'owner',
		func: function(CHAN, USER, say, args, command_string){
			b.users.whois(args.irc_nick, true, function(whois_data){
				if(whois_data.err){
					say(whois_data);
				} else {
					CHAN.log.debug('whois', whois_data);
					say({whois: whois_data}, 3, {skip_verify: true, lines: 30, force_lines: true, join: '\n'});

					b.users.get_user_data(args.irc_nick, {
						ignore_err: true,
						skip_say: true
					}, function(d){
						CHAN.log.debug('user_data', d);
						say({user_data: d}, 3, {skip_verify: true, lines: 50, force_lines: true, join: '\n'});
					});
				}
			});

		}
	},
	seen: {
		action: 'Check when user(s) was last seen',
		params: [{
			or: [{
				name: 'irc nick',
				type: 'string',
				key: 'method'
			},{
				name: 'all',
				type: 'flag',
				key: 'method',
				spammy: true
			}]
		}],
		func: function(CHAN, USER, say, args, command_string){
			if(args.method === '-all'){
				var say_data = [];

				b.users.get_user_data(USER.nick, {
					ignore_err: true,
					skip_say: true
				}, function(d){
					CHAN.get_all_users_in_chan_data({no_highlight: false, col: ['seen', 'spoke'], label: 'Seen/Spoke', return_rows: true}, function(data){

						var say_data = [];
						var now = (new dateWithOffset(0)).getTime();

						for(var irc_nick in data){
							b.log.debug('data', irc_nick, data[irc_nick]);

							if(data[irc_nick].seen.date > now - 3600000 && data[irc_nick].seen.action === 'speak' && Object.keys(data).length > 15) continue;

							var spoke_txt = '';
							if(data[irc_nick].spoke && data[irc_nick].spoke.text && data[irc_nick].spoke.text.length > 0){
								var last_said = data[irc_nick].spoke.text[0]

								spoke_txt += '"' + last_said.text + '"';

								if(data[irc_nick].seen.date - last_said.date > 1000){
									spoke_txt += ' ' + x.ms_to_time(data[irc_nick].seen.date - last_said.date) + ' before'
								}
							}

							say_data.push({
								nick: irc_nick,
								date_hidden: data[irc_nick].seen.date,
								date: x.epoc_to_date(data[irc_nick].seen.date, d.offset, d.timezone),
								action: data[irc_nick].seen.action,
								said: spoke_txt
							})
						}

						say_data.sort(function (a, b) {
						  return a.date_hidden - b.date_hidden;
						}).reverse();

						say(say_data, 1, {
							table: true,
							table_opts: {
								header: true,
								outline: false,
								full_width: ['nick'],
								col_format: {
									nick: function(row, cell){
										return x.score(row.date_hidden, {max: now + 100, min: now - 2592000000, score_str: x.no_highlight(row.nick), config: CHAN.config})
									},
									date: function(row, cell){
										return x.score(row.date_hidden, {max: now + 100, min: now - 2592000000, score_str: row.date, config: CHAN.config})
									},
									action: function(row, cell){
										switch(row.action){
											case 'speak':
												return CHAN.t.highlight(row.action);
												break;
											case 'pm':
												return CHAN.t.highlight2(row.action);
												break;
											case 'join':
												return CHAN.t.success(row.action);
												break;
											case 'kick':
												return CHAN.t.warn(row.action);
												break;
											case 'kill':
												return CHAN.t.fail(row.action);
												break;
											case 'part':
											case 'quit':
												return CHAN.t.null(row.action);
												break;
											default:
												return CHAN.t.waiting(row.action);
												break;
										}
									}
								}
							},
							lines: 15,
							force_lines: true
						});

					});
				});


			} else {
				args.irc_nick = args.method;
				delete args.method;

				b.users.get_user_data(args.irc_nick === USER.nick ? USER : args.irc_nick, {
					ignore_err: true,
					skip_say: true
				}, function(data){
					if(!data.seen){
						say({err: args.irc_nick + ' has never been seen'});
					} else {
						var str = x.no_highlight(CHAN.t.term(args.irc_nick)) + ' ';
						switch(data.seen.action){
							case 'speak':
								str += 'last spoke in';
								break;
							case 'pm':
								str += 'last PMed';
								break;
							case 'part':
								str += 'last parted from';
								break;
							case 'join':
								str += 'last joined';
								break;
							case 'kick':
								str += 'was last kicked from';
								break;
							case 'kill':
								str += 'was last killed from';
								break;
							case 'quit':
								str += 'last quit the server';
								break;
							default:
								str += 'last ' + data.seen.action + 'ed in';
								break;
						}

						b.users.get_user_data(USER.nick, {
							ignore_err: true,
							skip_say: true
						}, function(d){
							if(data.seen.chan !== null){
								str += ' ' + data.seen.chan + ' (' + data.seen.where + ')';
							}
							str += ' on ' + x.epoc_to_date(data.seen.date, d.offset, d.timezone);


							if(data.spoke && data.spoke.text && data.spoke.text.length > 0){
								var last_said = data.spoke.text[0]

								str += ' "' + last_said.text + '"';

								if(data.seen.date - last_said.date > 1000){
									str += ' ' + x.ms_to_time(data.seen.date - last_said.date) + ' before'
								}
							}

							say({succ: str});
						});
					}
				});
			}
		}
	},
	date: {
		action: 'Get server datetime',
		func: function(CHAN, USER, say, args, command_string){
			var date = (new dateWithOffset(0)).getTime();
			var str = 'The datetime is: ' + x.epoc_to_date(date, 0, 'GMT');

			say({succ: str});
		}
	},
	nicks: {
		action: 'Update nicks on server',
		params: [{
			or: [{
				name: 'revert',
				type: 'flag'
			} /*,{
				name: 'revert2',
				type: 'flag'
			} */,{
				name: 'set',
				type: 'flag'
			} /*,{
				name: 'rand',
				type: 'flag'
			}*/]
		}],
		perm: '~',
		registered: true,
		func: function(CHAN, USER, say, args, command_string){
			if(args.flag === '-revert'){
				if(b.is_op){

					var nicks = [];
					var new_nicks = [];
					var nicks_failed = [];

					if(bot.nick !== config.bot_nick) nicks.push(bot.nick);
					for(var nick in CHAN.users){
						if(nick !== CHAN.users[nick].nick_org){
							nicks.push(nick);
						}
					}

					let changes = (nicks).map((nick) => {
						return new Promise((resolve) => {
							let wait = setTimeout(function(){
								clearTimeout(wait);
								resolve();
							}, 200);

							b.users.nick_change(nick, 'user' + x.rand_number_between(0, 1000), function(old_nick, new_nick, new_nick_attempt){
								if(wait) clearTimeout(wait);
								CHAN.log.debug('nick rand', old_nick, '->', new_nick, '(', new_nick_attempt, ')');
								new_nicks.push(new_nick);
								resolve();
							})
						});
					});

					Promise.all(changes).then(() => {
						CHAN.log.debug('nicks rand finish');

						let changes2 = (new_nicks).map((nick) => {
							return new Promise((resolve) => {
								let wait = setTimeout(function(){
									clearTimeout(wait);
									nicks_failed.push(nick);
									resolve();
								}, 200);

								b.users.nick_change(nick, bot.nick === nick ? config.bot_nick : CHAN.users[nick].nick_org, function(old_nick, new_nick, new_nick_attempt){
									if(wait) clearTimeout(wait);
									CHAN.log.debug('nick org', old_nick, '->', new_nick, '(', new_nick_attempt, ')');

									if(new_nick !== new_nick_attempt){
										nicks_failed.push(new_nick);
									}

									resolve();
								})
							});
						});

						Promise.all(changes2).then(() => {
							CHAN.log.debug('nicks org finish');
							if(nicks_failed.length > 0){
								CHAN.log.error('nicks failed:', nicks_failed);
								say({err: 'Nicks failed: ' + nicks_failed.join(', ')});
							} else {
								say({succ: 'Nicks reverted!'});
							}

						});

					});
				}

			} /*else if(args.flag === '-revert2'){
				if(b.is_op){

					function test_nick(new_nick, callback){
						b.users.find_user(new_nick, function(usr){
							//CHAN.log.debug(usr, usr.where);
							if(usr.where !== null){
								test_nick('user' + x.rand_number_between(0, 1000), callback);
							} else {
								callback(new_nick);
							};
						});
					}

					var revert_nicks = {};
					var user_list = [];
					var again_count = 0;

					function revert(){
						user_list = Object.keys(CHAN.users);
						if(bot.nick !== config.bot_nick) user_list.push(bot.nick);

						let requests = (user_list).map((nick) => {
							return new Promise((resolve) => {
								var orginal_nick = nick === bot.nick ? config.bot_nick : CHAN.users[nick].nick_org;

								if(nick !== orginal_nick){
									test_nick(orginal_nick, function(new_nick){
										revert_nicks[nick] = new_nick;
										resolve();
									});
								} else {
									resolve();
								}
							});
						});

						Promise.all(requests).then(() => {
							//CHAN.log.debug(revert_nicks);

							let changes = (Object.keys(revert_nicks)).map((user) => {
								return new Promise((resolve) => {
									b.users.nick_change(user, revert_nicks[user], function(old_nick, new_nick, new_nick_attempt){
										//CHAN.log.debug(old_nick, '->', new_nick);
										resolve();
									})
								});
							});

							Promise.all(changes).then(() => {
								//CHAN.log.debug('finished changes');
								var again = false;
								if(bot.nick !== config.bot_nick) again = true;
								if(!again){
								   for(var nick in CHAN.users){
										if(CHAN.users[nick].nick_org !== nick){
											again = true;
											break;
										}
									}
								}

								//CHAN.log.debug('again?', again);

								if(again && again_count < 20){
									again_count++;
									revert_nicks = {};
									revert();
								} else if (again && again_count >= 20){
									say({err: 'Stuck in loop, cannot revert nicks'});
								} else {
									say({succ: 'Nicks reverted!'});
								}
							});
						});
					}

					revert();

				} else {
					say({err: bot.nick + ' is not opper'}, 3);
				}
			} else if (args.flag === '-rand'){
				if(b.is_op){
					var nicks = Object.keys(CHAN.users);
					nicks.unshift(bot.nick);

					var new_nicks = [];

					let changes = (nicks).map((nick) => {
						return new Promise((resolve) => {
							b.users.nick_change(nick, 'user' + x.rand_number_between(0, 1000), function(old_nick, new_nick, new_nick_attempt){
								//CHAN.log.debug('nick 000', old_nick, '->', new_nick, '(', new_nick_attempt, ')');
								new_nicks.push(new_nick);
								resolve();
							})
						});
					});

					Promise.all(changes).then(() => {
						nicks.sort(() => Math.random() * 2 - 1);
						//CHAN.log.debug('finished 000');

						let changes2 = (new_nicks).map((nick) => {
							return new Promise((resolve) => {
								var nick_new = nicks.pop();

								b.users.nick_change(nick, nick_new, function(old_nick, new_nick, new_nick_attempt){
									//CHAN.log.debug('nick rand', old_nick, '->', new_nick, '(', new_nick_attempt, ')');
									resolve();
								})
							});
						});

						Promise.all(changes2).then(() => {
							say({succ: 'Nicks randomized!'});
						});
					});
				 } else {
					say({err: bot.nick + ' is not opper'}, 3);
				}
			}  */ else if (args.flag === '-set'){
				for(var user in b.users){
					b.users.update_org_to_current(Object.keys(CHAN.users));
				}
				say({succ: 'Original nicks updated!'});
			}
		}
	},
	unban: {
		action: 'Unban yourself if you were auto kick/banned for being inactive for too long',
	   /* disabled: function(){ //this needs a little more thought
			console.log('UNBAN', this);
			return !config.autokb_users_inactive_for;
		}, */
		func: function(CHAN, USER, say, args, command_string){
			if(b.is_op){
				b.users.get_user_data(USER.nick, {
						ignore_err: true,
						skip_say: true
					}, function(d){
						if(!d || !d.auto_kb){
							say({err: 'You have not been auto kick/banned from any channels! If you are banned for another reason, please contact the channel operator.'});
						} else {
							var chans = Object.keys(d.auto_kb);
							for(var chan in d.auto_kb){
								bot.send('mode', chan, '-b', USER.nick + '!*@*');
								bot.send('sajoin', USER.nick, chan);
							}
							db.delete("/nicks/" + USER.nick + '/auto_kb', function(){
								say({succ: 'You have been unbanned from: ' + chans.join(', ') + ' you can now rejoin if you were not autojoined.' });
							}, USER.nick);
						}
				});
			} else {
				say({err: 'Cannot use this command due to insufficent bot channel privileges.'});
			}
		}
	},
	//TODO: need a way to add/edit/delete obj/arr items
	/*config: {
		action: 'Update config on the fly',
		params: [{
			optional: true,
			or: [{
				and: [{
					optional: true,
					name: '#chan',
					type: '#\\w+',
					key: 'chan',
				},{
					optional: true,
					name: 'setting:setting:setting',
					type: 'string',
					key: 'settings',
					and: [{
						optional: true,
						name: 'value',
						type: 'text'
					}]
				}]
			},{
				name: 'save',
				type: 'flag',
				key: 'save'
			}]
		}],
		perm: 'owner',
		func: function(CHAN, USER, say, args, command_string){
			var arr = [];
			var err = '';
			var succ = '';

			var key_arr = args.settings === undefined ? [] : args.settings.split(':');

			if(args.chan !== undefined && (b.channels[args.chan] === undefined || b.channels[args.chan].config === undefined)){
				say({err: 'No channel by that name'}, 3);
				return;
			}

			if(args.save !== undefined){
				if(args.chan === undefined){
					x.update_config(config);
				} else {
					x.update_config(b.channels[args.chan].config, args.chan);
				}
			} else {
				if(args.chan === undefined){
					x.input_object(config, key_arr, args.value, function(resp){
						say(resp, 3, {join: '\n', lines: 15});
						//if(conf) config = conf;

						//TODO: prolly need to have a few more actions here when specific settings are updated.
						//if(key_arr[0] === 'bot_nick'){
						//	bot.send('nick', conf['bot_nick']);
						//}

					},{
						ignore: ['network_name', 'nickserv_password', 'ircop_password', 'bot_config', 'debug_level']
					});
				} else {
					x.input_object(b.channels[args.chan].config, key_arr, args.value, function(resp){
						say(response, 3, {join: '\n', lines: 15});
						//if(conf) config = conf;

					});
				}
			}

		}
	}*/

}
exports.cmds = cmds;
