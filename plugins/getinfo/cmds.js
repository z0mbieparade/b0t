var urban	   	= require('urban-dictionary'),
	wikipedia   = require('wtf_wikipedia'),
	GetInfo	 	= require(__dirname + '/func.js')
	didYouMean 	= require('didyoumean2'),
	gi		  	= new GetInfo();

var info = {
	name: 'GetInfo',
	about: 'info from various sources',
	last_word: null,
	c_list: null, //store list of cryptocurrencies
	c_last_rank: 0,
	c_convert: ["AUD", "BRL", "CAD", "CHF", "CLP", "CNY", "CZK", "DKK", "EUR", "GBP", "HKD", "HUF", "IDR", "ILS", "INR", "JPY", "KRW", "MXN", "MYR", "NOK", "NZD", "PHP", "PKR", "PLN", "RUB", "SEK", "SGD", "THB", "TRY", "TWD", "ZAR"]
}
exports.info = info;

if(!config.API.mwdictionary || config.API.mwdictionary.key === '') {
	b.log.warn('Missing Merriam-Webster dictionary API key!');
}

if(!config.API.wolframalpha || config.API.wolframalpha.key === '') {
	b.log.warn('Missing Wolframalpha API key!');
}

if(!config.API.whoisxmlapi || config.API.whoisxmlapi.key === '') {
	b.log.warn('Missing whoisxmlapi API key!');
}

var cmds = {
	ud: {
		action: 'get urban dictionary term/word definition',
		params: [{
			optional: function(){ return info.last_word !== null },
			name: 'term',
			type: 'text',
			default: function(){ return info.last_word === null ? undefined : info.last_word; }
		}],
		func: function(CHAN, USER, say, args, command_string){
			info.last_word = args.term;
			urban.term(args.term, (error, entries, tags, sounds) => {
				if (error) {
					say({err: error.message});
				} else {

					var filter_entries = entries.filter(function(entry){
						return entry.word.toLowerCase() === args.term.toLowerCase();
					});

					if(filter_entries.length > 0)
					{
						entries = filter_entries;
					}

					entries.forEach(function(entry){
						entry.rank = entry.thumbs_up - entry.thumbs_down;
						entry.definition = c.stripColorsAndStyle(entry.definition);
						entry.definition = entry.definition.replace(/[\[\]]/gm, '');

						if(entry.example)
						{
							entry.example = c.stripColorsAndStyle(entry.example);
							entry.example = entry.example.replace(/[\[\]]/gm, '');
						}
					});
					entries.sort(function(a, b){
						if (a.rank > b.rank) return -1;
						if (a.rank < b.rank) return 1;
						return 0;
					});

					var entry = entries[0];

					var str_arr = [
						CHAN.t.highlight('UD ' + CHAN.t.term(entry.word)) + ' 👍' + CHAN.t.success(entry.thumbs_up) + ' 👎' + CHAN.t.fail(entry.thumbs_down) + ' ' + CHAN.t.null('-' + entry.author),
						entry.definition
					];
					if(entry.example) str_arr.push( CHAN.t.highlight('e.g. ') + '\u000f' + entry.example);

					say(str_arr, 1, {join: '\n', url: entry.permalink});
				}
			});
		}
	},
	d: {
		action: 'get Merriam-Webster dictionary word definition',
		params: [{
			optional: function(){ return info.last_word !== null },
			name: 'term',
			type: 'text',
			default: function(){ return info.last_word === null ? undefined : info.last_word; }
		}],
		API: ['mwdictionary'],
		func: function(CHAN, USER, say, args, command_string){
			info.last_word = args.term;
			var word = encodeURI(args.term);
			var url = "http://www.dictionaryapi.com/api/v1/references/collegiate/xml/" + word + "?key=" + config.API.mwdictionary.key;
			x.get_url(url, 'xml', function(data){

				if(!data || !data.entry_list || !data.entry_list.entry){
					say({err: 'Nothing found'});
					return;
				}

				try {
					var entries = {};


					//console.log(require('util').inspect(data, true, 10));

					for(var i = 0; i < data.entry_list.entry.length; i++){
						var entry = data.entry_list.entry[i];

						var e_str = '';

						var type = entry.fl && entry.fl.length ? entry.fl[0] : '';
						var pr = entry.pr && entry.pr.length ? ' \\' + entry.pr[0] + '\\' : '';
						var defs = [];

						if(!entry.def) continue;

						entry.def.forEach(function(def){
							var ssl = def.ssl && def.ssl.length ? def.ssl : [];

							def.dt.forEach(function(dt, i){
								var d = typeof dt === 'string' ? dt.replace(/^:/, '').trim() : (typeof dt['_'] === 'string' ? dt['_'].replace(/^:/, '').trim() : '');

								var syn = [];
								if(dt.sx){
									dt.sx.forEach(function(sx){
										if(typeof sx === 'string'){
											syn.push(sx.trim());
										} else if (sx['_'] && typeof sx['_'] === 'string') {
											syn.push(sx['_'].trim())
										}
									});
								}

								if(syn.length > 0) d = d.trim() + ' ' + CHAN.t.considering(syn.join(', '))

								if(d.trim() && dt.un && typeof dt.un[0] === 'string'){
									d += CHAN.t.highlight(' - ' + dt.un.join(', '));
								}

								if(ssl[i] && d.trim()) d = CHAN.t.null(ssl[i] + ':') + ' ' + d.trim();

								if(d.trim()) defs.push(d.trim());
							})
						});

						if(defs.length > 0){
							e_str += ' ' + CHAN.t.success(type + pr);
							defs.forEach(function(def, i){
								e_str += ' ' + CHAN.t.warn(i + 1) + ' ' + def;
							});

							entries[entry.ew[0]] = entries[entry.ew[0]] || [];
							entries[entry.ew[0]].push(e_str);
						}
					}

					if(Object.keys(entries).length === 0){
						say({err: 'Nothing found'});
					} else {
						var closest = didYouMean(word, Object.keys(entries));

						if(entries[closest].length === 1) {
							entries[closest][0] = CHAN.t.highlight('MWD ' + CHAN.t.term(closest)) + entries[closest][0]
						} else {
							entries[closest].unshift(CHAN.t.highlight('MWD ' + CHAN.t.term(closest)));
						}

						say(entries[closest], 1, {url: 'http://www.merriam-webster.com/dictionary/' + word, join: '\n'});
					}
				} catch(e) {
					say({err: 'Something went wrong'});
					CHAN.log.error('!d MWD', e.message, e);
				}
			});
		}
	},
	wiki: {
		action: 'get wikipedia page and summary',
		params: [{
			optional: function(){ return info.last_word !== null },
			name: 'term',
			type: 'text',
			default: function(){ return info.last_word === null ? undefined : info.last_word; }
		}],
		func: function(CHAN, USER, say, args, command_string){
			var pascal = args.term;
			pascal = pascal.toLowerCase().replace(/\b[a-z]/g, function(letter) {
				return letter.toUpperCase();
			});
			args.term = pascal;
			info.last_word = pascal;

			wikipedia.fetch(args.term).then(doc => {
				var text = doc.plaintext().trim();
				var str = CHAN.t.highlight('Wiki ' + CHAN.t.term(args.term)) + ' ' + text;
				say(str, 1, {url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(args.term)});
			}).catch(err => {
				say({err: 'Nothing found'});
			});
		}
	},
	wr: {
		action: 'WolframAlpha short answer',
		params: [{
			name: 'question',
			type: 'text'
		}],
		API: ['wolframalpha'],
		func: function(CHAN, USER, say, args, command_string){
			gi.wr(CHAN, args.question, function(msg, found){
				if(found){
					say(msg, { join: '\n', lines: 5, force_lines: true })
				} else {
					say(msg);
				}
			});
		}
	},
	stats: {
		action: 'get user stats info',
		params: [{
			name: 'username',
			type: 'string'
		}],
		func: function(CHAN, USER, say, args, command_string){
			b.users.get_user_data(args.username, {
				ignore_err: true,
				skip_say: true,
				return_nicks: true
			}, function(d){
				if(!d) return say({err: 'No user found'});

				function above_below_avr(usr, avr)
				{
					var ret = '';

					if(usr > avr){
						ret += CHAN.t.success(x.abv_num(usr))
					} else if(usr == avr) {
						ret += CHAN.t.warn(x.abv_num(usr))
					} else {
						ret += CHAN.t.fail(x.abv_num(usr))
					}

					ret += '/' + x.abv_num(avr);

					return ret;
				}

				db.get_data('/nicks', function(users){
					if(!users) return say({err: 'None found'});

					var stats = {
						user_by_word_rank: {

						},
						total: { //total for all users
							words: 0,
							letters: 0,
							lines: 0
						},
						avr: { //avr for all users
							words: 0,
							letters: 0,
							lines: 0
						},
						usr: { //current user
							words: 0,
							letters: 0,
							lines: 0
						},
						count: 0 //user count
					};
					for(var usr in users){
						if(users[usr].spoke){
							stats.count++;

							var word_count = (users[usr].spoke.words ? users[usr].spoke.words : 0);

							stats.user_by_word_rank[word_count] = stats.user_by_word_rank[word_count] || [];
							stats.user_by_word_rank[word_count].push(usr);

							stats.total.words = stats.total.words + word_count;
							stats.total.letters = stats.total.letters + (users[usr].spoke.letters ? users[usr].spoke.letters : 0);
							stats.total.lines = stats.total.lines + (users[usr].spoke.lines ? users[usr].spoke.lines : 0);
						}
					}

					stats.avr.words = stats.total.words / stats.count
					stats.avr.letters = stats.total.letters / stats.count
					stats.avr.lines = stats.total.lines / stats.count

					if(d.spoke) stats.usr = d.spoke;

					var words_counts = Object.keys(stats.user_by_word_rank).sort(function(a, b){return b-a});
					stats.usr.rank = words_counts.indexOf(stats.usr.words + '') + 1;

					var rank = stats.usr.rank;
					if(rank <= 5){
						rank = CHAN.t.success('#'+rank);
					} else if (rank > 5 && rank < 10){
						rank = CHAN.t.warn('#'+rank);
					} else {
						rank = CHAN.t.fail('#'+rank);
					}

					var str = CHAN.t.highlight(x.no_highlight(d.nick_org)) + ' [' + rank + '/' + stats.count + ' users]';
						str += CHAN.t.null(' (User/Average)');
						str += CHAN.t.highlight(' Words: ') + above_below_avr(stats.usr.words, stats.avr.words);
						str += CHAN.t.highlight(' Letters: ') + above_below_avr(stats.usr.letters, stats.avr.letters);
						str += CHAN.t.highlight(' Lines: ') + above_below_avr(stats.usr.lines, stats.avr.lines)

					say(str, 1, {skip_verify: true});

				});
			});
		}
	},
	stock: {
		action: 'get stock info',
		params: [{
			name: 'symbol',
			type: 'string'
		}],
		settings: ['stock/url'],
		func: function(CHAN, USER, say, args, command_string){

		  x.get_url(CHAN.config.plugin_settings.stock.url + args.symbol, 'json', function(quote){
		  		if(quote.err) return say({err: 'None found'});

				var str = CHAN.t.highlight(quote.name) + ' (' + CHAN.t.highlight(quote.symbol.toUpperCase()) + ') -> ' + gi.na(CHAN, quote.price);
				str += ' (' + gi.na(CHAN, quote.change, true) + ' ' + gi.na(CHAN, quote.changepct, true, true) + ')';
				str += ' | DAY L/H ' + gi.na(CHAN, quote.day_low) + '/' + gi.na(CHAN, quote.day_high);
				str += ' | 52w L/H ' + gi.na(CHAN, quote.fifty_two_week_low) + '/' + gi.na(CHAN, quote.fifty_two_week_high);
				if (Object.entries(quote.pe).length !== 0) {
					str += ' | P/E: ' + gi.na(CHAN, quote.pe);
				}
				if (Object.entries(quote.ps).length !== 0) {
					str += ' | P/S: ' + gi.na(CHAN, quote.ps);
				}
				if (Object.entries(quote.pb).length !== 0) {
					str += ' | P/B: ' + gi.na(CHAN, quote.pb);
				}
				if (Object.entries(quote.div).length !== 0) {
					str += ' | Div/yield: ' + gi.na(CHAN, quote.div) + '/' + gi.na(CHAN, quote.yield);
				}
				if (Object.entries(quote.ytd).length !== 0) {
					str += ' | YTD: ' + quote.ytd.value * 100 + '%';
				}
				say(str, 1, { skip_verify: true });

			}, {
				return_err: true,
				headers: {
					'Accept': 'json'
					}
				}
			);

		}
	},
	cc: {
		action: 'get cryptocurrency info (by default in USD)',
		params: [{
			or: [{
				name: 'list',
				type: 'flag'
			},{
				and: [{
					name: 'symbol',
					type: 'string'
				},{
					optional: true,
					name: 'convert to currency',
					key: 'convert_to',
					type: 'string',
					default: function(USER){ return 'USD' }
				}]
			}]
		}],
		settings: ['stock/url'],
		func: function(CHAN, USER, say, args, command_string){

			if(!info.c_list){
				var url = 'https://api.coinmarketcap.com/v1/ticker/';
				x.get_url(url, 'json', function(list){
					if(list.err){
						say(list);
						b.log.error(url, list);
						return;
					}

					list.forEach(function(coin){
						info.c_list = info.c_list || {};
						info.c_list[coin.symbol] = coin;

						if(coin.rank > info.c_last_rank) info.c_last_rank = coin.rank;
					});

					if(args.symbol){
						get_info();
					} else if (args.flag){
						list_ccs();
					}

				}, {
					return_err: true
				});
			} else {
				if(args.symbol){
					get_info();
				} else if (args.flag){
					list_ccs();
				}
			}

			function list_ccs(){
				var str_list = [];

				for(var symbol in info.c_list){
					str_list.push(CHAN.t.warn('[' + info.c_list[symbol].rank + '] ') + info.c_list[symbol].name + ' (' + symbol + ')');
				}

				say(str_list.join(', '), 1, {skip_verify: true});
			}

			function get_info(){
				args.convert_to = args.convert_to.toUpperCase();
				if(args.convert_to && info.c_convert.indexOf(args.convert_to) < 0) args.convert_to = 'USD';

				args.symbol = args.symbol.toUpperCase();
				if(!info.c_list[args.symbol]) return say({err: 'No cryptocurrency with symbol ' + args.symbol + ' found.'});

				var url2 = 'https://api.coinmarketcap.com/v1/ticker/' + info.c_list[args.symbol].id + (args.convert_to ? '/?convert=' + args.convert_to : '');
				x.get_url(url2, 'json', function(coin){
					if(coin.err){
						say(coin);
						b.log.error(url2, coin);
						return;
					}

					var price = +coin[0]['price_' + args.convert_to.toLowerCase()];

					var c = {
						price: {value: price},
						price_24h: {value: (coin[0].percent_change_24h * price / 100)},
						price_24h_perc: {value: +coin[0].percent_change_24h},
						price_7d: {value: (coin[0].percent_change_7d * price / 100)},
						price_7d_perc: {value: +coin[0].percent_change_7d},
					}

					var str = CHAN.t.highlight(coin[0].name) + ' (' + CHAN.t.highlight(coin[0].symbol.toUpperCase()) + ') -> ' + gi.na(CHAN, c.price) + ' ' + args.convert_to;
					str += ' [' + x.score(coin[0].rank, {max: info.c_last_rank, config: CHAN.config, reverse: true}) + '/' + x.score(info.c_last_rank, {max: info.c_last_rank, config: CHAN.config, reverse: true}) + ']';
					str += ' | 24h: ' + gi.na(CHAN, c.price_24h, true) + ' ' + gi.na(CHAN, c.price_24h_perc, true, true);
					str += ' | 7d: ' + gi.na(CHAN, c.price_7d, true) + ' ' + gi.na(CHAN, c.price_7d_perc, true, true);

					say(str, 1, {skip_verify: true});

				}, {
					return_err: true
				});
			}

		}
	},
	yts: {
		action: 'youtube search query',
		params: [{
			name: 'search string',
			type: 'text'
		}],
		func: function(CHAN, USER, say, args, command_string){
			var query = (args.search_string.split(/\s+/)).map(function(x){
				return encodeURIComponent(x);
			});
			say('https://www.youtube.com/results?search_query=' + query.join('+'), 1);
		}
	},
	ddg: {
		action: 'DuckDuckGo search query',
		params: [{
			name: 'search string',
			type: 'text'
		}],
		func: function(CHAN, USER, say, args, command_string){
			gi.ddg(CHAN, args.search_string, function(res, url){
				if(res.err) return say(res);
				say(res, 1, {skip_verify: true, url: url});
			});
		}
	},
	covid: {
		action: 'COVID-19 Data',
		params: [{
			name: 'state abbr | CAN',
			key: 'state',
			type: 'text',
			optional: true
		}],
		func: function(CHAN, USER, say, args, command_string){
			function say_table(d, title)
			{
				let key_text = {
					vaccinated: '💉 Vaccinated',
					recovered: '🤕 Recovered',
					positive: '🦠 Positive Tests',
					hospitalizedCurrently: '🚑 Hospital Now',
					hospitalizedCumulative: '🚑 Hospital Total',
					inIcuCurrently: '🫁 ICU Now',
					inIcuCumulative: '🫁 ICU Total',
					death: '💀 Deaths'
				}

				let key_order = {
					vaccinated: 0,
					recovered: 1,
					positive: 2,
					hospitalizedCurrently: 3,
					hospitalizedCumulative: 4,
					inIcuCurrently: 5,
					inIcuCumulative: 6,
					death: 7
				}

				function pos_neg(n, col, rev_color)
				{
					if(!col)
					{
						if(Math.sign(n) === 1){
							return '+' + x.comma_num(n);
						} else if(Math.sign(n) === -1){
							return '-' + x.comma_num(Math.abs(n));
						} else {
							return n;
						}
					}
					else
					{
						if(rev_color)
						{
							if(Math.sign(n) === 1){
								return CHAN.t.success('+' + x.comma_num(n));
							} else if(Math.sign(n) === -1){
								return CHAN.t.errors('-' + x.comma_num(Math.abs(n)));
							} else {
								return CHAN.t.warn(n);
							}
						}
						else
						{
							if(Math.sign(n) === 1){
								return CHAN.t.errors('+' + x.comma_num(n));
							} else if(Math.sign(n) === -1){
								return CHAN.t.success('-' + x.comma_num(Math.abs(n)));
							} else {
								return CHAN.t.success(n);
							}
						}
					}
				}

				let say_data = [];

				for(var key in d)
				{
					if(key_text[key] === undefined) continue;

					let row = {
						order_hidden: key_order[key],
						type: 'X' + key_text[key].slice(1),
						type_hidden: key_text[key],
						key_hidden: key,
						total: x.comma_num(d[key].today),
						day_change_hidden: d[key].change_1,
						weekly_change_hidden: d[key].change_7,
						monthly_change_hidden: d[key].change_30
					};

					if(d.is_today){
						row.todayxxx = pos_neg(d[key].change_1);
					} else {
						row.yesterdayxxx = pos_neg(d[key].change_1);
					}

					row.sedaysxxx = pos_neg(d[key].change_7);
					row.thidaysxxx = pos_neg(d[key].change_30);

					say_data.push(row);
				}

				say(say_data, 1, {
					table: true,
					force_lines: true,
					lines: 9,
					table_opts: {
						title: (args.state ? args.state.toUpperCase() : 'USA') + ' COVID-19 data totals and changes in the last day, week, and month.',
						header: {
							type: '-',
							todayxxx: 'today ↑↓',
							yesterdayxxx: 'yesterday ↑↓',
							sedaysxxx: '7 days ↑↓',
							thidaysxxx: '30 days ↑↓'
						},
						outline: false,
						sort_by: function(a, b){
							return (a.order_hidden > b.order_hidden) ? 1 : -1;
						},
						col_format: {
							type: function(row, cell)
							{
								if(row.key_hidden === 'vaccinated'){
									return c.cyan(row.type_hidden)
								} else if(row.key_hidden === 'recovered'){
									return c.green(row.type_hidden)
								} else if(row.key_hidden === 'positive'){
									return c.yellow(row.type_hidden)
								} else if(row.key_hidden === 'hospitalizedCurrently' || row.key_hidden === 'hospitalizedCumulative'){
									return c.olive(row.type_hidden)
								} else if(row.key_hidden === 'inIcuCurrently' || row.key_hidden === 'inIcuCumulative'){
									return c.red(row.type_hidden)
								} else {
									return c.gray(row.type_hidden)
								}
							},
							todayxxx: function(row, cell){
								return pos_neg(row.day_change_hidden, true, ['recovered', 'vaccinated'].includes(row.key_hidden));
							},
							yesterdayxxx: function(row, cell){
								return pos_neg(row.day_change_hidden, true, ['recovered', 'vaccinated'].includes(row.key_hidden));
							},
							sedaysxxx: function(row, cell){
								return pos_neg(row.weekly_change_hidden, true, ['recovered', 'vaccinated'].includes(row.key_hidden));
							},
							thidaysxxx: function(row, cell){
								return pos_neg(row.monthly_change_hidden, true, ['recovered', 'vaccinated'].includes(row.key_hidden));
							}
						}
					}
				})
			}

			gi.covid(CHAN, args.state, function(d)
			{
				if(d.err) return say(d);
				say_table(d);
			});
		}
	},
	n: {
		action: 'get nutrition info about food',
		params: [{
			name: 'search string',
			type: 'text'
		}],
		API: ['nutritionix'],
		func: function(CHAN, USER, say, args, command_string){
			gi.nu(CHAN, {
				query: args.search_string,
				handlers: {
					success: function(data){
						if(data.foods && data.foods.length > 0)
						{
							var say_arr = [];
							data.foods.forEach(function(food){
								//console.log(food);

								for(var key in food){
									if(food[key] === null) food[key] = 0;
								}

								var str = CHAN.t.highlight(food.food_name);

								var serving = food.serving_qty + food.serving_unit;
								if(food.serving_unit.match(/^serving/i))
								{
									serving = food.serving_unit
										.replace(/^serving \(about /i, '~')
										.replace(/\s|\)/gi, '')
								}

								str += CHAN.t.success(' (' + serving + '/' + food.serving_weight_grams + 'g) ' + Math.round(food.nf_calories) + 'cal, ');
								str += CHAN.t.fail('Carbs: ' + Math.round(food.nf_total_carbohydrate) + 'g (Sug: ' +  food.nf_sugars.toFixed(1) + 'g, Fiber: ' + food.nf_dietary_fiber.toFixed(1) + 'g), ');
								str += CHAN.t.warn('Fat: ' + Math.round(food.nf_total_fat) + 'g (Sat: ' +  food.nf_saturated_fat.toFixed(1) + 'g), ');
								str += CHAN.t.waiting('Chol: ' + Math.round(food.nf_cholesterol) + 'g, ');
								str += CHAN.t.considering('Prot: ' + food.nf_protein.toFixed(1) + 'g ');

								say_arr.push(str);
							});

							say(say_arr, 1, {join: '\n'});
						}
						else
						{
							console.log('succ error', data)
						}
					},
					error: function(err)
					{
						console.log('error', err)
					}
				}
			})
		}
	},
	drink: {
		action: 'Cocktail/drink lookup',
		params: [{
			or: [{
				name: 'random',
				type: 'flag'
			},{
				and: [{
					name: 'search',
					type: 'text'
				},{
					or: [{
						name: 'drink',
						type: 'flag'
					},{
						name: 'ingredient',
						type: 'flag'
					},{
						name: 'about',
						type: 'flag',
						optional: true
					}],
					optional: true
				}]
			}]
		}],
		func: function(CHAN, USER, say, args, command_string){

			//command parsing is stupid still, fix this someday
			if(command_string.match(/-random/)) {
				delete args.search
				args.flag = '-random';
			} else if(command_string.match(/-drink/)) {
				args.search = command_string.replace('-drink', '').trim();
				args.flag = '-drink';
			} else if(command_string.match(/-ingredient/)) {
				args.search = command_string.replace('-ingredient', '').trim();
				if(command_string.match(/-about/)) {
					args.search = args.search.replace('-about', '').trim();
					args.flag = '-ingredient_about';
				} else {
					args.flag = '-ingredient';
				}
			} else if(command_string.match(/-about/)) {
				args.search = command_string.replace('-about', '').trim();
				args.flag = '-ingredient_about';
			} else {
				args.flag = '-drink';
			}

			if(args.flag === '-random'){
				gi.drink_rand(CHAN, function(d){
					say(d, { join: '\n', lines: 5, force_lines: true });
				});
			} else if(args.flag === '-drink'){
				gi.drink(CHAN, args.search, function(d){
					say(d, { join: '\n', lines: 5, force_lines: true });
				});
			} else if(args.flag === '-ingredient_about'){
				gi.drink_about_ingredient(CHAN, args.search, function(d){
					say(d, { join: '\n' });
				});
			} else {
				gi.drink_by_ingredient(CHAN, args.search, function(d){
					say(d, { join: '\n', lines: 5, force_lines: true });
				});
			}
		}
	},
	whois: {
		action: 'Domain/IPv4/IPv6/Email whois lookup',
		params: [{
			optional: true,
			name: 'long',
			type: 'flag'
		},{
			name: 'domain/IPv4/IPv6/email',
			key: 'domain',
			type: 'string'
		}],
		API: ['whoisxmlapi'],
		spammy: true,
		func: function(CHAN, USER, say, args, command_string){

			var make_str = function(domain, sub){
				var ret = [];
				var str = '';

				if(domain.domainName){
					str += CHAN.t.highlight((sub ? 'Subrecord: ' : 'Domain: ') + CHAN.t.term(domain.domainName) + ': ');
				} else {
					str += CHAN.t.highlight((sub ? 'Subrecord: ' : 'Domain: ') + CHAN.t.term(args.domain) + ': ');
				}

				if(domain.registrarName) str += CHAN.t.null('(' + domain.registrarName + ') ');

				if(domain.dataError) str += CHAN.t.fail('Err: ' + domain.dataError + ' ')

				if(domain.createdDateNormalized) str += CHAN.t.success('Created: ' + domain.createdDateNormalized.split(' ')[0] + ' ');
				if(domain.updatedDateNormalized) str += CHAN.t.warn('Updated: ' + domain.updatedDateNormalized.split(' ')[0] + ' ');
				if(domain.expiresDateNormalized) str += CHAN.t.fail('Expires: ' + domain.expiresDateNormalized.split(' ')[0] + ' ');

				ret.push(str);

				if(domain.registrant){
					var reg = '';

					reg += CHAN.t.highlight('Registrant: ');
					if(domain.registrant.name) reg += domain.registrant.name + ' ';
					if(domain.registrant.organization) reg += domain.registrant.organization + ' ';

					var address = [
						domain.registrant.street,
						domain.registrant.street1,
						domain.registrant.street2,
						domain.registrant.city,
						domain.registrant.state,
						domain.registrant.postalCode,
						(domain.registrant.countryCode || domain.registrant.country)
					].filter(function(a){
						return a !== null && a !== undefined;
					}).join(', ')

					if(address) reg += address;

					ret.push(reg)

					var contact = '';
					if(domain.registrant.email) contact += domain.registrant.email + ' ';
					if(domain.registrant.telephone) contact += 'tel: ' + domain.registrant.telephone + ' ';
					if(domain.registrant.fax) contact += 'fax: ' + domain.registrant.fax + ' ';

					if(contact) ret.push(CHAN.t.highlight('Contact: ') + contact);
				}

				if(domain.nameServers && domain.nameServers.hostNames){
					var name_servers = CHAN.t.highlight('Name Servers: ') + domain.nameServers.hostNames.join(', ');
					ret.push(name_servers);
				}

				if(domain.custom){
					var custom = '';
					for(var key in domain.custom){
						custom += key + ': ' + domain.custom[key] + ' ';
					}
					if(custom) ret.push(custom);
				}

				return ret;
			}

			x.get_cache('/whois/' + args.domain, function(d){
				if(d.err) return say(d);
				if(args.long === '-long'){
					say(d, 2, {force_lines: true, lines: 30, skip_verify: true});
				} else {
					var ret = make_str(d);
					if(d.subRecords && d.subRecords.length){
						for(var i = 1; i < d.subRecords.length; i++){
							ret = ret.concat(make_str(d.subRecords[i], true));
						}
					}
					say(ret, 2, {force_lines: true, lines: 5, join: '\n', skip_verify: true});
				}
			}, function(){
				gi.whois(CHAN, args.domain, function(d){
					x.add_cache('/whois/' + args.domain, d, (60000 * 1440), args.domain);
					if(d.err) return say(d);
					if(args.long === '-long'){
						say(d, 2, {force_lines: true, lines: 30, skip_verify: true});
					} else {
						var ret = make_str(d);
						if(d.subRecords && d.subRecords.length){
							for(var i = 1; i < d.subRecords.length; i++){
								ret = ret.concat(make_str(d.subRecords[i], true));
							}
						}
						say(ret, 2, {force_lines: true, lines: 5, join: '\n', skip_verify: true});
					}
				});
			}, args.domain);
		}
	},
}
exports.cmds = cmds;
