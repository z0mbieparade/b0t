var info = {
	name: 'Media',
	about: 'tv and movie related commands',
	last_media: null
}
exports.info = info;

if((config.API.trakt && config.API.trakt.key !== '') || (config.API.themoviedb && config.API.themoviedb.key !== '')) {
	var Media = require(__dirname + '/func.js'),
		m = new Media();
} 

var symbols = {
	episode: "📺",
	movie: "🎥"
};

var cmds = {
	nw: {
		action: 'get last scrobbled show/movie from trakt.tv',
		params: [{
			optional: true,
			name: 'irc nick',
			type: 'string',
			default: function(USER){ return USER.nick; }
		}],
		API: ['trakt'],
		register: 'trakt',
		func: function(CHAN, USER, say, args, command_string){
			b.users.get_user_data(args.irc_nick === USER.nick ? USER : args.irc_nick, {col: 'trakt'}, function(trakt_un){
				if(trakt_un.err){
					if(args.irc_nick === USER.nick){
						say(trakt_un, 2);
					} else {
						say({err: args.irc_nick + ' does not have a registered trakt.tv account'}, 2);
					}
					return;
				}

				m.getRecent(CHAN, args.irc_nick, trakt_un, function(d) {
					if(d.err) return say(d, 2);

					if(d.title !== '') info.last_media = d.title;

					d.irc_nick = x.no_highlight(d.irc_nick);

					var str = CHAN.t.highlight(d.irc_nick);
					str += (d.now_watching ? ' is now watching: ' + symbols[d.type] + ' ' + CHAN.t.success(d.title) :
					 ' last watched: ' + symbols[d.type] + ' ' + CHAN.t.null(d.title));
					str += (d.year !== '' ? ' (' + d.year + ')' : '');

					say(str, 1, {skip_verify: true});

				});
			});
		}
	},
	ww: {
		action: 'get all users in current chan w/ registered trakt.tv nicks last scrobbled show/movie',
		API: ['trakt'],
		no_pm: true,
		spammy: true,
		func: function(CHAN, USER, say, args, command_string){
			CHAN.get_all_users_in_chan_data({col: 'trakt', label: 'Trakt.TV'}, function(data){
				var watching = [];
				var not_watching = [];

				let requests = (Object.keys(data)).map((trakt_un) => {
					return new Promise((resolve) => {
						m.getRecent(CHAN, data[trakt_un], trakt_un, function(d) {
							if(d.err) {
								CHAN.log.error(d.err);
							} else {
								var media_data = {
									user: d.irc_nick,
									now_watching_hidden: d.now_watching,
									media: symbols[d.type],
									title: d.title,
									year: d.year 
								};

								if(d.now_watching){
									watching.push(media_data);
								} else {
									not_watching.push(media_data);
								}
							}
							resolve();
						});
					});
				});

				Promise.all(requests).then(() => { 

					var say_data = [watching, not_watching];
					say(say_data, 1, {
						table: true, 
						table_opts: {
							header: false, 
							outline: false, 
							cluster: [CHAN.t.success, CHAN.t.null],
							cluster_symbols: ['▸', '॥'],
							full_width: ['user', 'year'],
							col_format: {
								user: function(row, cell){ 
									return row.now_watching_hidden ? CHAN.t.success(cell) : CHAN.t.null(cell)
								},
								title: function(row, cell){ return CHAN.t.highlight(cell) }
							}
						}, 
						lines: 15, 
						force_lines: true
					});

				});
			});
		}
	},
	show: {
		action: 'get show info',
		params: [{
			optional: function(){ return info.last_media !== null },
			name: 'show',
			type: 'text',
			default: function(){ return info.last_media === null ? undefined : info.last_media; }
		}],
		API: ['trakt', 'youtube'],
		func: function(CHAN, USER, say, args, command_string){
			if(args.show === undefined){
				say({err: 'No last show defined, please type ' + b.cmds.cmd_syntax(USER, 'show', {short: true})}, 2)
				return;
			}

			try{
				m.search(CHAN, 'show', args.show, function(d) {
					if(d.err) return say(d, 2);

					if(d.title !== '') info.last_media = d.title;

					var status = '';
					switch(d.status){
						case 'returning series':
							status += CHAN.t.success('Returning');
							break;
						case 'production':
							status += CHAN.t.waiting('Production');
							break;
						case 'planned':
							status += CHAN.t.considering('Planned');
							break;
						case 'canceled':
							status += CHAN.t.fail('Canceled');
							break;
						case 'ended':
						default:
							status += CHAN.t.null('Ended');
							break;
					}

					var genres = d.genres && d.genres.length > 0 ? d.genres.join(', ') : CHAN.t.null('no genres');

					var data = [
						CHAN.t.highlight(CHAN.t.term(d.title + ' (' + d.year + ')')) + ' Rating ' + x.score(d.rating, {max:10, end:'/10', config: CHAN.config}) + ' Status ' + status + ' Genres (' + genres + ')',
						CHAN.t.highlight('Summary ') + x.verify_string(d.overview, d.homepage)
					];

					say(data, 1, {skip_verify: true, url: d.trailer ? CHAN.t.highlight('Trailer ') + d.trailer : '', join: '\n', ellipsis: true});
				});
			} catch(e){
				say({err: e.message});
			}
		}
	},
	movie: {
		action: 'get movie info',
		params: [{
			optional: function(){ return info.last_media !== null },
			name: 'movie',
			type: 'text',
			default: function(){ return info.last_media === null ? undefined : info.last_media; } 
		}],
		API: ['trakt', 'youtube'],
		func: function(CHAN, USER, say, args, command_string){
			if(args.movie === undefined){
				say({err: 'No last movie defined, please type ' + b.cmds.cmd_syntax(USER, 'movie', {short: true})}, 2)
				return;
			}

			try{
				m.search(CHAN, 'movie', args.movie, function(d) {
					if(d.err) return say(d, 2);

					if(d.title !== '') info.last_media = d.title;

					var genres = d.genres && d.genres.length > 0 ? d.genres.join(', ') : CHAN.t.null('no genres');

					var data = [
						CHAN.t.highlight(CHAN.t.term(d.title + ' (' + d.year + ')')) + ' Rating ' + x.score(d.rating, {max:10, end:'/10', config: CHAN.config}) + ' Genres (' + genres + ')',
						CHAN.t.highlight('Summary ') + x.verify_string(d.overview, d.homepage)
					];

					say(data, 1, {skip_verify: true, url: d.trailer ? CHAN.t.highlight('Trailer ') + d.trailer : '', join: '\n', ellipsis: true});
				});

			} catch(e){
				say({err: e.message});
			}
		}
	},
	trend: {
		action: 'get movies/shows currently trending',
		params: [{
			or: [{
				name: 'movies',
				type: 'flag'
			},{
				name: 'shows',
				type: 'flag'
			}]
		}],
		API: ['trakt'],
		func: function(CHAN, USER, say, args, command_string){
			m.getTrending(CHAN, args.flag, function(d) {
				if(d.err) return say(d, 2);

				var str = CHAN.t.highlight('Trending ');
				var high_watch = 0;

				var arr = [];
				for(var i = 0; i < d.length; i++) {
					if(i === 0){
					   str += CHAN.t.highlight(d[i].type + 's: ');
					   high_watch = d[i].watchers;  
					}

					var watch = d[i].title;
					if(d[i].year !== '') watch += ' (' + d[i].year + ')';
					watch += ' ' + x.score(d[i].watchers, {max:high_watch, end:'x', config: CHAN.config});

					arr.push(watch);
				}
				str += arr.join(', ');

				say(str, 1, {skip_verify: true});
			});
		}
	},
	out: {
		action: 'get movies currently showing in theaters this week',
		params: [{
			optional: true,
			name: 'date',
			type: 'text'
		}],
		API: ['themoviedb'],
		func: function(CHAN, USER, say, args, command_string){
			function format_date(date){
				var month   = date.getMonth() + 1,
				    day	 	= date.getDate(),
				    year	= date.getFullYear();

				return year + '-' + month + '-' + day;
			}

			function adjust_date(date, days)
			{
				return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
			}

			b.users.get_user_data(USER.nick, {
				ignore_err: true,
				skip_say: true
			}, function(d){
				
				var date_check = x.str_to_datetime(args.date, d.offset);
				if(date_check.err){
					var date = new Date();
				} else {
					var date = new Date(date_check.gmt_epoc);
				}

				var days 		= ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
				var days_abv	= ['sun','mon','tues','wed','thur','fri','sat'];
				var months 		= ['January','February','March','April','May','June', 'July','August','September','October','November','December'];
				var months_abv 	= ['jan','feb','mar','apr','may','jun', 'jul','aug','sep','oct','nov','dec'];

				var day = date.getDay();
				var end_date_str = day === 6 ? end_date_str : format_date(adjust_date(date, 6 - day));
				var start_date_str = day === 0 ? start_date_str : format_date(adjust_date(date, day * -1));
				var release_str = 'this week';

				if(args.date){
					var one_day_reg = new RegExp('\b' + days.join('\b|\b') + '\b|\b' + days_abv.join('\b|\b') + '\b|\btomorrow\b|\btoday\b|\bnow\b|\byesterday\b|\bon\b ', 'igm');
					var one_month_reg = new RegExp('\b' + months.join('\b|\b') + '\b|\b' + months_abv.join('\b|\b') + '\b|\bmonth\b', 'igm');

					if(args.date.match(one_day_reg)){ //1 day
						var end_date_str = format_date(date);
						var start_date_str = format_date(adjust_date(date, -1));

						if(args.date.match(/today|now/igm)){
							release_str = 'today';
						} else if(args.date.match(/tomorrow/igm)){
							release_str = 'tomorrow';
						} else if(args.date.match(/yesterday/igm)){
							release_str = 'yesterday';
						} else {
							release_str = 'between ' + start_date_str + ' and ' + end_date_str;
						}
					} else if(args.date.match(/week/igm)){ //7 days default
						if(args.date.match(/this week/igm)){
							release_str = 'this week';
						} else if(args.date.match(/last week/igm)){
							release_str = 'last week';
						} else if(args.date.match(/next week/igm)){
							release_str = 'next week';
						} else {
							release_str = 'between ' + start_date_str + ' and ' + end_date_str;
						}
					} else if(args.date.match(/month/igm)){ //30 days
						start_date_str = date.getFullYear() + '-' + (date.getMonth() + 1) + '-1';
						var end_date = new Date(date.getFullYear(), date.getMonth() + 1, 0);
						end_date_str = format_date(end_date);

						if(args.date.match(/this month/igm)){
							release_str = 'this month';
						} else if(args.date.match(/last month/igm)){
							release_str = 'last month';
						} else if(args.date.match(/next month/igm)){
							release_str = 'next month';
						} else {
							release_str = 'between ' + start_date_str + ' and ' + end_date_str;
						}
					} else if(args.date.match(/year/igm)){ //265 days
						start_date_str = date.getFullYear() + '-1-1';
						var end_date = new Date(date.getFullYear() + 1, 0, 0);
						end_date_str = format_date(end_date);

						if(args.date.match(/this year/igm)){
							release_str = 'this year';
						} else if(args.date.match(/last year/igm)){
							release_str = 'last year';
						} else if(args.date.match(/next year/igm)){
							release_str = 'next year';
						} else {
							release_str = 'between ' + start_date_str + ' and ' + end_date_str;
						}
					}
				}

				m.get_tmdb_url(CHAN, 'discover/movie', {
					'primary_release_date.gte': start_date_str,
					'primary_release_date.lte': end_date_str,
					handlers: {
						error: function(err){
							b.log.error(err)
							say({err: err});
						},
						success: function(data){
							if(data.results && data.results.length > 0){
								var movie_arr = data.results.map(function(movie){

									if(new Date(movie.release_date) > new Date){
										var str = CHAN.t.success(movie.title);
									} else {
										var str = movie.title + ' ' + x.score(movie.vote_average, {max:10, end:'/10', config: CHAN.config});
									}

									return str;
								})

								var say_str = CHAN.t.highlight('Movies released ' + release_str + ':');
								say_str += ' ' + movie_arr.join(', ');

								say(say_str, 1, {skip_verify: true});
							} else {
								say({err: 'No movie releases for those dates.'});
							}
						}
					}
				});



			});
		}
	},
	trakt: {
		action: 'register your trakt.tv username with your irc nick',
		params: [{
			name: 'trakt.tv username',
			type: 'string',
			key: 'username'
		}],
		registered: true,
		API: ['trakt'],
		func: function(CHAN, USER, say, args, command_string){
			b.users.update_user(USER.nick, {trakt: args.username}, function(msg){
				say(msg, 2);
			});
		}
	}

}
exports.cmds = cmds;
