var info = {
	name: 'TraktTV',
	about: 'tv and movie related commands',
	last_media: null
}
exports.info = info;

if(config.API.trakt && config.API.trakt.key !== '') {
	var traktTV = require(__dirname + '/func.js'),
		ttv = new traktTV();
} else {
	b.log.warn('Missing TraktTV API key!');
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

				ttv.getRecent(CHAN, args.irc_nick, trakt_un, function(d) {
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
		discord: false,
		spammy: true,
		func: function(CHAN, USER, say, args, command_string){
			CHAN.get_all_users_in_chan_data({col: 'trakt', label: 'Trakt.TV'}, function(data){
				var watching = [];
				var not_watching = [];

				let requests = (Object.keys(data)).map((trakt_un) => {
					return new Promise((resolve) => {
						ttv.getRecent(CHAN, data[trakt_un], trakt_un, function(d) {
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
				ttv.search(CHAN, 'show', args.show, function(d) {
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
				ttv.search(CHAN, 'movie', args.movie, function(d) {
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
			ttv.getTrending(CHAN, args.flag, function(d) {
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
