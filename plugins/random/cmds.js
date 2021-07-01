var fortune 			= require("adage"),
	dateWithOffset  = require("date-with-offset"),
	xpath 					= require('xpath'),
	RND 						= require(__dirname + '/func.js'),
	rnd 						= new RND();

var info = {
	name: 'Random',
	about: 'silly commands, or one offs with no place',
	bullet: 0,
	bullet_order: [0, 1, 2, 3, 4, 5]
}
exports.info = info;

var insults_db = new DB({db_name: 'insults'});
var scopes_db = new DB({db_name: 'scopes'});
var CAH_db = new DB({db_name: 'CAH'});
var creeds_db = new DB({readable: true, db_name: 'creeds'});

var answers = [
		'It is certain',
		'It is decidedly so',
		'Without a doubt',
		'Yes, definitely',
		'You may rely on it',
		'As I see it, yes',
		'Most likely',
		'Outlook good',
		'Yes',
		'Signs point to yes', //0-9 positive

		'Reply hazy try again',
		'Ask again later',
		'Better not tell you now',
		'Cannot predict now',
		'Concentrate and ask again', //10-14 maybe

		'Don\'t count on it',
		'My reply is no',
		'My sources say no',
		'Outlook not so good',
		'Very doubtful' //15-19 negative
	],
	dance_mirror = [
		[" 8====D ", " ᗡ====8 "],
		[" 8==m==D - - ", " - - ᗡ==m==8 "],
		[" rEEEEE ", " ƎƎƎƎƎɹ "],
		[" fweeeEEEEP ", " ԀƎƎƎƎǝǝǝʍɟ "],
		[" (__*__) ", " (__*__) "],
		[" shake ", " ǝʞɐɥs "],
		[" ( o Y o ) ", " ( o Y o ) "],
		[" (.)(.) ", " (.)(.) "],
		["(((", ")))"],
		[">>>>>", "<<<<<"],
		[" ////// ", " \\\\\\\\\\\\ "]
	],
	dance_outside = [
		"👻", "🍺", "💃", "⚡", "❇", "🍹", "🎉", "✨", "- _ -", "_", "🚨", "-v-^-v-",
		"🎈", "🔫", "🍻", "🔔", "⚠", '.', "==", "x", "💀", "🍰", "💊", "👾", "***", "{(*)}"
	],
	dance_inside = [
		"dance bitch",
		"OoOoOoOoOoO",
		"OONTZ OONTZ OONTZ",
		"ya play dat shit",
		"TURN IT UP",
		"*does the stomp and shuffle*",
		"yolo swag twerk",
		"FUCK YA",
		"now THAT'S how you PARTY"
	],
	russian_nick = [
		"Anastasia",
		"Bogdan",
		"Boris",
		"Dmitry",
		"Egor",
		"Ivan",
		"Katya",
		"Mikhail",
		"Nastya",
		"Natasha",
		"Nikita",
		"Nikolai",
		"Oleg",
		"Pavel",
		"Sasha",
		"Sonya",
		"Sophia",
		"Svetlana",
		"Vadim",
		"Vladimir"
	],
	slap = {
		size: [ 'large', 'massive', 'gigantic', 'huge', 'jumbo', 'enormous', 'minuscule', 'microscopic', 'tiny', 'undersized'],
		adj: [ 'rotten', 'slimey', 'sticky', 'wet', 'smelly', 'fleshy', 'pregnant', 'leaking', 'flatulent', 'soupy', 'stank ass', 'overripe', 'decomposing', 'viscous', 'putrid'],
		fish: [ 'trout', 'salmon', 'crab', 'sea bass', 'octopus', 'shark', 'goldfish', 'angler fish', 'squid', 'eel', 'manta ray', 'kraken', 'jelly fish', 'mermaid', 'shrimp']
	};

var cmds = {
	'8ball': {
		action: 'magic 8ball answer',
		params: [{
			optional: true,
			name: 'question',
			type: 'string'
		}],
		func: function(CHAN, USER, say, args, command_string){
			var num = x.rand_number_between(0, answers.length - 1);
			if(num <= 9){
				var answer = CHAN.t.success(answers[num]);
			} else if (num <= 14) {
				var answer = CHAN.t.warn(answers[num]);
			} else {
				var answer = CHAN.t.fail(answers[num]);
			}
			say(answer, 1, {skip_verify: true});
		}
	},
	choose: {
		action: 'Choose one thing or another',
		params: [{
			name: 'this or that',
			type: '\\S.*?\\sor\\s\\S.*'
		}],
		func: function(CHAN, USER, say, args, command_string){
			var choose = args.this_or_that.split(/\sor\s/i);
			say({succ: x.rand_arr(choose)}, {skip_buffer: true, skip_verify: true})
		}
	},
	creed: {
		action: 'things to live by',
		params: [{
			optional: true,
			or: [
				{
					name: 'disable',
					perm: '~',
					type: 'flag',
					key: 'flag',
					and: [ { name: 'id', type: 'number', key: 'id' } ]
				},{
					name: 'add',
					perm: '~',
					type: 'flag',
					key: 'flag',
					and: [ { name: 'new creed', type: 'text', key: 'new_val' } ]
				},{
					name: 'edit',
					perm: '~',
					type: 'flag',
					key: 'flag',
					and: [ { name: 'id', type: 'number' }, { name: 'new creed', type: 'text', key: 'new_val' } ]
				},{
					name: 'all',
					type: 'flag',
					key: 'flag',
				},{
					name: 'id',
					key: 'id',
					type: 'number'
				}

			]
		}],
		func: function(CHAN, USER, say, args, command_string){
			creeds_db.get_data("/", function(d){
				if(d === null) return say({err: 'No creeds found.'});
				var creeds = [];
				var j = 0;
				d.forEach(function(creed, i){
					if(args.flag === undefined || args.flag !== '-all'){
						if(creed.disabled) return;
						j++;
						creeds.push(CHAN.t.warn('Creed ' + j + ') ') + (creed.new ? creed.new : creed.creed));
					} else {
						if(creed.disabled){
							creeds.push(CHAN.t.null('Creed X) ' + (creed.new ? creed.creed  + ' / ' : '')) + (creed.new ? creed.new : creed.creed));
						} else {
							j++;
							creeds.push(CHAN.t.warn('Creed ' + j + ') ') + CHAN.t.null(creed.new ? creed.creed  + ' / ' : '') + (creed.new ? creed.new : creed.creed));
						}
					}
				});

				if(args.id !== undefined && args.flag === undefined){
					if(creeds[+args.id - 1] !== undefined){
						say(creeds[+args.id - 1], 1, {skip_verify: true});
					} else {
						say({err: 'No creed id ' + args.id + ' found.'})
					}
				} else if (args.flag === '-disable') {
					var d_creed = '';
					var k = 0;
					d.forEach(function(creed, i){
						if(creed.disabled) return;
						k++;
						if(k === args.id){
							creed.disabled = true;
							d_creed = creed.creed;
						}
					});

					if(d_creed !== ''){
						creeds_db.update('/', d, true, function(act){
							 say({succ: 'Disabled creed ' + args.id + ': ' + d_creed});
						});
					} else {
						say({err: 'No creed id ' + args.id + ' found.'})
					}
				} else if (args.flag === '-edit') {
					var o_creed = '';
					var k = 0;
					d.forEach(function(creed, i){
						if(creed.disabled) return;
						k++;
						if(k === args.id){
							creed.new = args.new_val;
							o_creed = creed.creed;
						}
					});

					if(o_creed !== ''){
						creeds_db.update('/', d, true, function(act){
							 say({succ: 'Updated creed ' + args.id + ': ' + o_creed + ' -> ' + args.new_val});
						});
					} else {
						say({err: 'No creed id ' + args.id + ' found.'})
					}
				} else if (args.flag === '-add') {
					creeds_db.update('/', [{creed: args.new_val, disabled: false}], false, function(act){
						say({succ: 'Added new creed ' + args.new_val});
					});
				} else {
					say(creeds, 3, {skip_verify: true, join: '\n'});
				}
			});
		}
	},
	fml: {
		action: 'get random fml quote',
		func: function(CHAN, USER, say, args, command_string){
			var get_fml = function(tries)
			{
				x.get_url('https://www.fmylife.com/random', 'html', function(result){
					if(result.err){
						CHAN.log.error(result.err);
						return say(result);
					} else {
						try {
							var str = CHAN.t.highlight('FML: ');

							var auth_reg = /By (.*?) /g;
							var auth = xpath.select1('.//div[1]/text()', result[0]).nodeValue.replace(/\n/gm, ' ');
							var author = auth_reg.exec(auth);

							var txt = xpath.select1('.//div[2]/a/text()', result[0]).nodeValue.replace(/\n/gm, '');

							if(!txt)
							{
								txt = xpath.select1('.//div[2]/a/span[@class="spicy-hidden"]/text()', result[0]).nodeValue.replace(/\n/gm, '');
								str += '🌶️ ';
							}

							var agree = xpath.select1('.//div[contains(@class, \'vote-up-group\')]/div/text()', result[0]).nodeValue.replace(/\n/gm, '');
							var deserved = xpath.select1('.//div[contains(@class, \'vote-down-group\')]/div/text()', result[0]).nodeValue.replace(/\n/gm, '');

							if(+agree > +deserved){
								str += CHAN.t.warn('"' + txt + '"');
							} else {
								str += CHAN.t.fail('"' + txt + '"');
							}
							if(author && author.length) str += CHAN.t.null(' -' + author[1]);

							say(str);
						} catch(e){
							CHAN.log.error(e.message);

							if(tries > 3)
							{
								return say({err: 'Something went wrong'});
							}
							else
							{
								get_fml(tries + 1)
							}
						}
					}
				}, {
					return_err: true,
					xpath: '//*[@id="content"]/div/div[1]/div[1]/article[1]/div[1]'
				})
			}

			get_fml(0)
		}
	},
	fortune: {
		action: 'Unix fortune',
		func: function(CHAN, USER, say, args, command_string){
			fortune({}, function(err, a) {
			  if(err) return say({err: err});
			  say(a, {skip_buffer: true, skip_verify: true});
			});
		}
	},
	horoscope: {
		action: 'horoscope',
		params: [{
			optional: true,
			name: 'sign',
			type: 'string'
		}],
		func: function(CHAN, USER, say, args, command_string){
			if(args.sign && args.sign !== '') {
				scopes_db.get_data("/" + args.sign.toLowerCase(), function(d){
					if(d !== null) {
						say(CHAN.t.warn(x.cap_first_letter(args.sign) + ': ' + x.rand_arr(d)), {skip_buffer: true, skip_verify: true})
					} else {
						say({err: x.cap_first_letter(args.sign) + ' is not a valid zodiac sign.'})
					}
				});
			} else {
				scopes_db.get_data("/", function(d){
					if(d !== null) {
						var pick_sign = x.rand_arr(Object.keys(d));
						say(CHAN.t.warn(x.unescape_html(x.rand_arr(d[pick_sign]))), {skip_buffer: true, skip_verify: true})
					} else {
						say({err: 'No horoscopes avaliable.'})
					}
				});
			}
		}
	},
	insult: {
		action: 'insult a user',
		params: [{
			optional: true,
			or: [
				{
					name: 'list',
					perm: '~',
					type: 'flag',
					key: 'flag'
				},{
					name: 'delete',
					perm: '~',
					type: 'flag',
					key: 'flag',
					and: [ { name: 'id', type: 'number' } ]
				},{
					name: 'edit',
					perm: '~',
					type: 'flag',
					key: 'flag',
					and: [ { name: 'id', type: 'number' }, { name: 'new insult', type: 'text', key: 'new_val' } ]
				},{
					name: 'add',
					type: 'flag',
					key: 'flag',
					and: [ { name: 'insult', type: 'text', key: 'new_val' } ]
				},{
					name: 'to',
					type: 'text',
					key: 'to'
				}

			]
		}],
		func: function(CHAN, USER, say, args, command_string){
			if(args.flag){
				insults_db.manage_arr(USER, '/', args, {}, say);
			} else {

				if(args.to === bot.nick) args.to = USER.nick;

				insults_db.get_data("/", function(d){
					//insult(d, 0);
					var str = (args.to !== undefined ? args.to.replace('<', '') + ': ' : '') + x.rand_arr(d);
					say(CHAN.t.warn(str), 1);
				});
			}
		}
	},
	lottery: {
		action: 'play the lottery',
		func: function(CHAN, USER, say, args, command_string){
			var no = Array.from({length: 9}, function(){
				return x.rand_number_between(0, 9);
			});

			say("You should play: " + no[0] + no[1] + no[2] + " and " + no[3] + no[4] + no[5] + no[6] + " for today's lottery!", 1, {skip_verify: true});
		}
	},
	oontz: {
		params: [{
			optional: true,
			name: 'text',
			type: 'text'
		}],
		action: 'random excitement',
		func: function(CHAN, USER, say, args, command_string){
			var inside = args.text ? args.text : x.rand_arr(dance_inside);

			var outside_left = [];
			for(var i = 0; i < 8; i++) {
				outside_left.push(x.rand_color(x.rand_arr(dance_outside)));
			}

			var outside_right = Array.prototype.slice.call(outside_left);
			outside_right.reverse();

			var oontz_arr = outside_left.concat([x.rand_color(' ' + inside + ' ')], outside_right);

			var create_mirror = function(){
				var mirror_pos = x.rand_number_between(1, 8);
				var mirror_arr = x.rand_color(x.rand_arr(dance_mirror));

				oontz_arr.splice(mirror_pos, 0, mirror_arr[0]);
				oontz_arr.splice(-mirror_pos, 0, mirror_arr[1]);
			}

			create_mirror();
			create_mirror();

			var str = oontz_arr.join('');


			say(str, 1, {skip_verify: true});
		}
	},
	poll: {
		action: 'Create a poll and have users vote on it',
		params: [{
			optional: true,
			or: [{
					name: 'close',
					key: 'close',
					perm: '~',
					type: 'flag'
				},{
					and: [{
						name: 'question',
						type: '.+?(?=\\s-\\d)'
					},{
						name: '-1 answer -2 answer...',
						key: 'answers',
						type: '-\\d+\\s\\S+.*?-\\d+\\s\\S+.*'
					}]
				}
			]
		}],
		func: function(CHAN, USER, say, args, command_string){
			b.log.debug(args);
			if(args.close !== undefined){
				x.close_current_poll(CHAN, function(result){
					say(result);
				});
			} else {
				x.get_poll(CHAN, USER, args, function(result){
					say(result, {skip_buffer: true, skip_verify: true, join: '\n'});
				});
			}
		}
	},
	potd: {
		action: 'pull the last image from a pre-set imgur album',
		settings: ['potd/imgur_album'],
		API: ['imgur'],
		func: function(CHAN, USER, say, args, command_string){
			rnd.imgur(CHAN, 'album', {
				path: [CHAN.config.plugin_settings.potd.imgur_album],
				handlers: {
					success: function(album){
						var img = album.data.images[0];
						var say_arr = [];

						say_arr.push(CHAN.t.highlight('POTD: ') + img.link);
						if(img.title != 'null' && img.title !== null) say_arr.push(CHAN.t.null(img.title));
						if(img.description != 'null' && img.description !== null) say_arr.push(CHAN.t.null(img.description));

						say(say_arr, 1, {skip_verify: true, join: '\n'});
					},
					error: function(err){
						b.log.error(err);
						say({err: 'None found'}, 2);
					}
				}
			})
		}
	},
	remind: {
		action: 'Remind user at/in time to do something',
		registered: true,
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
					and: [{
						name: 'irc nick or me',
						type: 'string',
						key: 'who',
						default: function(USER){ return 'me'; }
					},{
						name: 'at|in',
						key: 'at in',
						type: 'at|in'
					},{
						name: 'time',
						type: '.+?)(?=\\sto\\s'
					},{
						name: 'to',
						type: 'to',
						ignore: true
					},{
						name: 'do something',
						type: 'text',
						key: 'to do'
					}]
				}]
		}],
		func: function(CHAN, USER, say, args, command_string){
			if(args.flag){
				db.manage_arr(USER, '/nicks/' + USER.nick_org + '/reminders', args, {
					case_insensitive: USER.nick_org,
					format: function(item){
						var str = '';

						if(item.who_set !== item.who){
							str += item.who_set + ' set a reminder for you to '
						}

						str += item.to_do + ' ' + x.date_string_to_mdyhms(item.time, item.offset, item.timezone);

						return str;
					}
				},
				say);
			} else {
				args.who = args.who.toLowerCase() === 'me' || args.who.toLowerCase() === 'myself' || args.who.toLowerCase() === 'moi' || args.who.toLowerCase() === 'mee' ?
					USER.nick : b.users.get_nick_org(args.who);
				args.who_set = USER.nick_org;
				args.at_in = args.at_in.toLowerCase();

				b.users.get_user_data(USER.nick, {
					label: 'timezone offset',
					ignore_err: true,
					skip_say: true
				}, function(d){

					var time_str = (args.at_in === 'in' ? 'in ' : 'at ') + args.time;
					var time = x.str_to_datetime(time_str, d.offset);

					if(time.err) return say(time);

					args.time = time.gmt_epoc;
					args.offset = d && d.offset ? x.convert_offset_to_min(d.offset) : 0;
					args.timezone = d && d.timezone ? d.timezone : null;

					b.log.debug(args, time);

					x.set_reminder(USER, CHAN, args, function(result){
						say(result);
					})
				});
			}
		}
	},
	rr: {
		action: 'play russian roulette',
		func: function(CHAN, USER, say, args, command_string){
			var debug = false;

			if(info.bullet === 0)
			{
				info.bullet_order = x.shuffle_arr(info.bullet_order);
			}

			if(debug) b.log.debug('info.bullet', info.bullet, 'bullet_order', info.bullet_order);

			b.users.get_user_data(USER.nick, {
				col: 'rr',
				label: 'russian roulette',
				ignore_err: true,
				skip_say: true
			}, function(d){
				console.log('get user data rr', USER.nick, d);
				if(d){
					var now = (new dateWithOffset(0)).getTime();
					var wait = (d + 900000) - now;

					if(wait > 0){
						return say({err: 'You have to wait ' + x.ms_to_time(wait) + ' before playing russian roulette!'})
					} else {
						pull_trigger();
					}
				} else {
					pull_trigger();
				}
			});

			function pull_trigger(force_fire_on){
				info.bullet++;
				if(!force_fire_on) say(CHAN.t.warn('Pulling the trigger... ') + (debug ? CHAN.t.null('(' + (info.bullet) + ')') : ''), 1, {skip_verify: true});

				function click(){
					var bullet = info.bullet_order[info.bullet - 1];
					var misfire = x.rand_number_between(1,15) === 1 ? true : false;

					if(force_fire_on) {
						var hit_nick = force_fire_on;
					} else {
						var hit_nick = misfire ? x.rand_arr(Object.keys(CHAN.users)) : USER.nick;
					}

					misfire = hit_nick === USER.nick ? false : misfire;

					var new_gun = false;

					if(debug) b.log.debug('pull_trigger bullet', bullet, 'misfire', misfire, 'force_fire_on', force_fire_on, 'hit_nick', hit_nick);

					switch(bullet) {
						case 1:
							if(force_fire_on) {
								say(CHAN.t.fail('BANG! You killed ' + hit_nick + '!'), 1, {skip_verify: true});
								if(!debug) bot.send('kill', hit_nick, "BANG! " + USER.nick + " killed you!");
								if(debug) CHAN.log.debug('kill', hit_nick, "BANG! " + USER.nick + " killed you!");
							} else if(misfire){
								say(CHAN.t.fail('BANG! Your gun misfired and hit ' + hit_nick + '!'), 1, {skip_verify: true});
								if(!debug) bot.send('kill', hit_nick, "BANG! " + USER.nick + "'s gun misfired and hit you!");
								if(debug) CHAN.log.debug('kill', hit_nick, "BANG! " + USER.nick + "'s gun misfired and hit you!");
							} else {
								say(CHAN.t.fail('BANG!'), 1, {skip_verify: true});
								if(!debug) bot.send('kill', hit_nick, "BANG! You found the only bullet! So you die.");
								if(debug) CHAN.log.debug('kill', hit_nick, "BANG! You found the only bullet! So you die.");
							}

							b.users.update_user(hit_nick, {rr: (new dateWithOffset(0)).getTime()}, function(msg){});

							new_gun = true;
							break;
						case 2:

							if(['~', '&', '@', '%'].includes(CHAN.users[hit_nick].perm))
							{
								var swap = x.rand_arr(Object.keys(CHAN.users), [USER.nick])
								if(swap === '')
								{
									say(CHAN.t.success('Click!'), 1, {skip_verify: true});
									break;
								}
								else
								{
									if(force_fire_on) {
										say(CHAN.t.success('Click! ' + hit_nick + ' swaps nicks with ' + swap + '!'), 1, {skip_verify: true});
									} else if(misfire){
										say(CHAN.t.success('Click! Your aim is terrible! ' + hit_nick + ' swaps nicks with ' + swap + '!'), 1, {skip_verify: true});
									} else {
										say(CHAN.t.success('Click! Swaps nicks with ' + swap + '!'), 1, {skip_verify: true});
									}

									if(!debug) {
										b.users.nick_change(hit_nick, 'user' + x.rand_number_between(0, 1000), function(old_nick1, new_nick1, new_nick_attempt1){
											CHAN.log.debug('nick swap', old_nick1, '->', new_nick1, '(', new_nick_attempt1, ')');
											b.users.nick_change(swap, hit_nick, function(old_nick2, new_nick2, new_nick_attempt2){
												CHAN.log.debug('nick swap', old_nick2, '->', new_nick2, '(', new_nick_attempt2, ')');
												b.users.nick_change(new_nick1, swap, function(old_nick3, new_nick3, new_nick_attempt3){
													CHAN.log.debug('nick swap', old_nick3, '->', new_nick3, '(', new_nick_attempt3, ')');
												})
											})
										})
									}
									if(debug) CHAN.log.debug('swap nicks', hit_nick, swap)
								}
							}
							else
							{
								if(force_fire_on) {
									say(CHAN.t.success('Click! ' + hit_nick + ' gains half-ops!'), 1, {skip_verify: true});
								} else if(misfire){
									say(CHAN.t.success('Click! Your aim is terrible! ' + hit_nick + ' gains half-ops!'), 1, {skip_verify: true});
								} else {
									say(CHAN.t.success('Click! Gain half-ops!'), 1, {skip_verify: true});
								}

								for(var usr in CHAN.users)
								{
									if(CHAN.users[usr].perm === '%' && usr !== hit_nick)
									{
										if(!debug) bot.send('mode', CHAN.chan, '-h', usr);
										if(!debug) bot.send('mode', CHAN.chan, '+v', usr);
										if(debug) CHAN.log.debug('mode', CHAN.chan, '-h+v', usr)
									}
								}

								if(!debug) bot.send('mode', CHAN.chan, '+h', hit_nick);
								if(debug) CHAN.log.debug('mode', CHAN.chan, '+h', hit_nick)
							}

							break;
						case 3:
							if(force_fire_on) {
								say(CHAN.t.success('Click! ' + hit_nick + ' gets a new nickname!'), 1, {skip_verify: true});
								var new_nick = x.rand_arr(russian_nick);
								// need to check for OperServ
								if(config.use_serv_for_admin_commands && config.use_serv_for_admin_commands == true) {
									bot.say('OperServ', 'svsnick ' + hit_nick + ' ' + new_nick);
									if(debug) CHAN.log.debug('msg OperServ svsnick', hit_nick, new_nick);
								}
								else {
									bot.send('sanick', hit_nick, new_nick);
									if(debug) CHAN.log.debug('sanick', hit_nick, new_nick);
								}

								if(!debug) hit_nick = new_nick;
							} else if(misfire){
								say(CHAN.t.success('Click! Watch where you\'re pointing that thing! ' + hit_nick + ', enjoy your new nickname!'), 1, {skip_verify: true});
							} else {
								say(CHAN.t.success('Click! Enjoy your new nickname!'), 1, {skip_verify: true});
							}
							// check for OperServ here, too
							if(config.use_serv_for_admin_commands && config.use_serv_for_admin_commands == true) {
								bot.say('OperServ', 'svsnick ' + hit_nick + ' ' + x.rand_arr(russian_nick));
								if(debug) CHAN.log.debug('msg OperServ svsnick', hit_nick, x.rand_arr(russian_nick));
							}
							else {
								bot.send('sanick', hit_nick, x.rand_arr(russian_nick));
								if(debug) CHAN.log.debug('sanick', hit_nick, x.rand_arr(russian_nick));
							}
							break;
						case 4:
							if(['~', '&', '@'].includes(CHAN.users[hit_nick].perm))
							{
								say(CHAN.t.success('Click!'), 1, {skip_verify: true});
							}
							else
							{
								if(force_fire_on) {
									say(CHAN.t.success('Click! ' + hit_nick + ' loses half-ops.'), 1, {skip_verify: true});
									if(!debug) bot.send('mode', CHAN.chan, '-h', hit_nick);
									if(debug) CHAN.log.debug('mode', CHAN.chan, '-h', hit_nick);
								} else if(misfire){
									say(CHAN.t.success('Click! Shoddy aim, partner. ' + hit_nick + ' loses half-ops.'), 1, {skip_verify: true});
								} else {
									say(CHAN.t.success('Click! Lose half-ops!'), 1, {skip_verify: true});
								}
								if(!debug) bot.send('mode', CHAN.chan, '-h', hit_nick);
								if(debug) CHAN.log.debug('mode', CHAN.chan, '-h', hit_nick);
							}

							break;
						case 5:
							if(!force_fire_on && misfire){
								var clicks = x.rand_number_between(1, 3);
								var clicks_txt = ['once', 'twice', 'thrice'];
								say(CHAN.t.success('Click! Hold the gun to ' + hit_nick + '\'s head and fire ' + clicks_txt[clicks - 1] + '!'), 1, {skip_verify: true});

								function multi_click(hit_nick){
									setTimeout(function(){
										if(!new_gun)
										{
											pull_trigger(hit_nick);
											clicks--;

											if(clicks > 0)
											{
												multi_click(hit_nick);
											}
										}
									}, 200);
								}
								multi_click(hit_nick);
								break;
							}
						case 6:
						default:
							say(CHAN.t.success('Click!'), 1, {skip_verify: true});
							break;
					}

					if(info.bullet > 6 || new_gun) info.bullet = 0;
				}

				if(force_fire_on) {
					click();
				} else {
					setTimeout(click, 200);
				}

			}
		}
	},
	slap: {
		action: 'slap something',
		params: [{
			optional: true,
			name: 'thing',
			type: 'string'
		}],
		func: function(CHAN, USER, say, args, command_string){
			var thing = args.thing ? args.thing : x.rand_arr(Object.keys(CHAN.users));
			var str = 'slaps ' + thing + ' around with a ' + x.rand_arr(slap.size) + ' ' + x.rand_arr(slap.adj) + ' ' + x.rand_arr(slap.fish);
			say('/me ' + x.rand_color(str), {skip_buffer: true, skip_verify: true})
		}
	},
	stroke: {
		action: 'have a stroke',
		func: function(CHAN, USER, say, args, command_string) {
			say("Does anyone else smell toast?", {stroke: true})
		}
	},
	tarot: {
		action: 'CAH tarot spread',
		params: [{
			optional: true,
			or: [{
					name: 'ppf',
					desc: 'past/present/future',
					type: 'flag',
					key: 	'flag'
				},{
					name: 'soa',
					desc: 'situation/obstacle/advice',
					type: 'flag',
					key: 	'flag'
				},{
					name: 'ytr',
					desc: 'you/them/relationship',
					type: 'flag',
					key: 	'flag'
				}]
		}],
		func: function(CHAN, USER, say, args, command_string){

			var colors = ['olive', 'lime', 'cyan'];
			var spreads = {
				'-ppf': ['Your past', 'Your present', 'Your future'],
				'-soa': ['The situation', 'The obstacle', 'Some advice'],
				'-ytr': ['You are', 'They are', 'The relationship']
			};

			if(!args.flag) args.flag = '-ppf';

			CAH_db.get_data("/", function(d){
				if(d){
					var pick_random_white = function(tries)
					{
						try {
							var deck_id = x.rand_arr(Object.keys(d));
							var deck = d[deck_id].white;
							var card = x.rand_arr(deck);
							return card.text;
						} catch(e) {
							if(tries < 3){
								return pick_random_white(tries + 1);
							} else {
								return false;
							}
						}
					}

					var spread_it = [];
					for(var i = 0; i < spreads[args.flag].length; i++)
					{
						var card = pick_random_white(0);
						if(card){
							spread_it.push(c[colors[i]](spreads[args.flag][i] + ': ') + card);
						}
						else {
							break;
						}
					}

					if(spread_it.length === spreads[args.flag].length){
						say(spread_it, 1, {lines: spread_it.length, force_lines: true, join:'\n'});
					} else {
						return say({err: 'Something went wrong.'});
					}
				} else {
					say({err: 'Something went wrong.'})
				}
			});
		}
	},
	vote: {
		action: 'Vote on the current poll',
		params: [{
			optional: true,
			name: 'answer id',
			type: 'number'
		}],
		func: function(CHAN, USER, say, args, command_string){
			x.get_poll(CHAN, USER, args, function(result){
				say(result, {skip_buffer: true, skip_verify: true, join: '\n'});
			});
		}
	},

}
exports.cmds = cmds;
