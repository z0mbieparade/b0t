var info = {
	name: 'Untappd',
	about: 'beer related commands',
	last_beer: null
}
exports.info = info;

if(config.API.untappd && config.API.untappd.key !== '') {
	var UNTAPPD = require(__dirname + '/func.js'),
		untappd = new UNTAPPD();
} else {
	b.log.warn('Missing Untappd API key!');
}

var symbols = {
	beer:  '🍺',
	cider: '🍺',
	mead:  '🍺',
	other: '🍺'
}

var cmds = {
	ut: {
		action: 'get last beer drank from untappd.com',
		params: [{
			name: 'irc nick',
			type: 'string',
			default: function(USER){ return USER.nick; }
		}],
		register: 'untappd',
		API: ['untappd'],
		func: function(CHAN, USER, say, args, command_string){
			b.users.get_user_data(args.irc_nick === USER.nick ? USER : args.irc_nick, {col: 'untappd'}, function(untappd_un){
				if(untappd_un.err){
					if(args.irc_nick === USER.nick){
						say(untappd_un, 2);
					} else {
						say({err: args.irc_nick + ' does not have a registered untappd account'}, 2);
					}
					return;
				}

				untappd.get_beer(CHAN, args.irc_nick, untappd_un, false, function(d) {
					if(d.err) return say(d, 2);

					if(d.beer_name !== ''){
						info.last_beer = d.beer_name;
					}

					d.irc_nick = x.no_highlight(d.irc_nick);

					var str = CHAN.t.highlight(x.no_highlight(d.irc_nick));
					str += ' last drank ' + symbols['beer'] + ' ' + CHAN.t.null(d.beer_name);
					str += ' (' + d.beer_style + ' - ' + d.beer_abv + '%abv)';
					str += ' (from ' + d.brewery + ')';

					if (d.venue) {
						str += ' (at ' + CHAN.t.success(d.venue) + ')';
					}

					say(str, 1, {skip_verify: true});
				});
			});
		}
	},
	wt: {
		action: 'get all users in current chan w/ registered untappd nicks last checked in beer',
		API: ['untappd'],
		no_pm: true,
		spammy: true,
		func: function(CHAN, USER, say, args, command_string){
			CHAN.get_all_users_in_chan_data({col: 'untappd', label: 'Untappd'}, function(data){
				var say_data = [];

				let requests = (Object.keys(data)).map((untappd_un) => {
					return new Promise((resolve) => {
						untappd.get_beer(CHAN, data[untappd_un], untappd_un, true, function(d) {
							if(d.err) {
								CHAN.log.error(d.err);
							} else {
								say_data.push({
									user: d.irc_nick,
									name: d.beer_name,
									style: d.beer_style,
									abv: d.beer_abv + '%',
									abv_hidden: d.beer_abv,
									from: d.brewery,
									venue: d.venue,
									date: x.date_string_to_mdy(d.date),
									epoc_hidden: Date.parse(d.date)
								});
							}

							resolve();
						});
					});
				});

				Promise.all(requests).then(() => {

					say(say_data, 1, {
						table: true,
						table_opts: {
							header: true,
							outline: false,
							sort_by: function sort_by(a, b){
								return b.epoc_hidden - a.epoc_hidden;
							},
							full_width: ['user', 'abv', 'date'],
							col_format: {
								user: function(row, cell){ return CHAN.t.success(cell) },
								beer: function(row, cell){
									return CHAN.t.warn(cell);
								},
								abv: function(row, cell){
									return x.score(row.beer_abv_hidden, {
										score_str: cell,
										max: 15,
										config: CHAN.config,
										colors: [
											{'%':100, c:'red'},
											{'%':95, c:'brown'},
											{'%':75, c:'olive'},
											{'%':50, c:'green'},
											{'%':25, c:'teal'}
										]
									});
								},
								venue: function(row, cell){ return CHAN.t.success(cell) },
								date: function(row, cell){ return CHAN.t.null(cell) }
							}
						},
						lines: 15,
						force_lines: true
					});

				});
			});
		}
	},
	untappd: {
		action: 'register your untappd username with your irc nick',
		params: [{
			name: 'untappd username',
			type: 'string',
			key: 'username'
		}],
		registered: true,
		API: ['untappd'],
		func: function(CHAN, USER, say, args, command_string){
			b.users.update_user(USER.nick, {untappd: args.username}, function(msg){
				say(msg, 2);
			});
		}
	}
}
exports.cmds = cmds;
