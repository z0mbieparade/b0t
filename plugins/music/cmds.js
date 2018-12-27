var info = {
	name: 'LastFM',
	about: 'various music related commands',
	//this is based of lastfm scrobble statistics, which state that the highest scrobbled 
	//song is 'Smells Like Teen Spirit' by Nirvana and has been scrobbled over 10 mil x, but that's just silly
	//so we'll do 10k instead, since that's prolly a good number for a popular song.
	highest_song_count: 10000,
	last_artist: null
}
exports.info = info;

if(config.API.lastfm && config.API.lastfm.key !== '') {
	var lastFM = require(__dirname + '/func.js'),
		lfm = new lastFM();
} else {
	b.log.warn('Missing LastFM API key!');
}

if(config.API.youtube && config.API.youtube.key !== ''){
	var yt_search = require('youtube-search'),
		yt_opts = {
			maxResults: 1,
			key: config.API.youtube.key
		};
} else { 
	b.log.warn('Missing Youtube API key!');
}

var cmds = {
	np: {
		action: 'get last scrobbled song from last.fm',
		params: [{
			optional: true,
			name: 'irc nick',
			type: 'string',
			default: function(USER){ return USER.nick; }
		}],
		register: 'lastfm',
		API: ['lastfm'],
		func: function(CHAN, USER, say, args, command_string){
			b.users.get_user_data(args.irc_nick === USER.nick ? USER : args.irc_nick, {col: 'lastfm'}, function(lastfm_un){
				if(lastfm_un.err){
					if(args.irc_nick === USER.nick){
						say(lastfm_un, 2);
					} else {
						say({err: args.irc_nick + ' does not have a registered last.fm account'}, 2);
					}
					return;
				}

				lfm.getRecent(CHAN, args.irc_nick, lastfm_un, false, function(d) {
					if(d.err) return say(d, 2);

					var title = [];
					if(d.artist !== '') {
						info.last_artist = d.artist;
						title.push(d.artist);
					}
					if(d.name !== '') title.push(d.name);
					var title_str = title.join(' - ');
					if(d.album !== '') title_str += ' (from ' + d.album + ')';

					d.irc_nick = x.no_highlight(d.irc_nick);

					var str = CHAN.t.highlight(d.irc_nick) + ' ';
					str += d.now_playing ? 'is now playing: ' + CHAN.t.success(title_str) : 'last played: ' + CHAN.t.null(title_str); 
					str += ' [' + x.score(d.user_play_count, {max: d.play_count, score_str: x.abv_num(d.user_play_count), config: CHAN.config})  + '/';
					str += x.score(d.play_count, {max: info.highest_song_count, score_str: x.abv_num(d.play_count), config: CHAN.config}) + '] ' + (d.loved ? CHAN.t.fail('♥') + ' (' : '('); 

					if(d.tags.length > 0){
						var tags = d.tags.splice(0, 4); //max 4 tags
						tags = tags.map(function(tag){ return CHAN.t.highlight(tag); });
						str += tags.join(', ');
					} else {
						str += CHAN.t.null('No Tags');
					}

					str += ')';

					say(str, 1, {skip_verify: true});
				});
			});
		}
	},
	yt: {
		action: 'get last scrobbled song from last.fm and attempt to locate a youtube video of it',
		params: [{
			optional: true,
			name: 'irc nick',
			type: 'string',
			default: function(USER){ return USER.nick; }
		}],
		register: 'lastfm',
		API: ['lastfm', 'youtube'],
		func: function(CHAN, USER, say, args, command_string){
			b.users.get_user_data(args.irc_nick === USER.nick ? USER : args.irc_nick, {col: 'lastfm'}, function(lastfm_un){
				if(lastfm_un.err) return say(lastfm_un, 2);
				lfm.getRecent(CHAN, args.irc_nick, lastfm_un, false, function(data) {
					if(data.err) return say(data, 2);

					var title = [];
					if(data.artist !== '') {
						info.last_artist = data.artist;
						title.push(data.artist);
					}

					if(data.name !== '') title.push(data.name);
					yt_search(title.join(' '), yt_opts, function(err, results) {
						if(err){
							CHAN.log.error(err.stack)
							say({err: 'an error has occured'}, 2);
							b.users.owner(false, function(owner_nicks){
								if(owner_nick !== null){
									owner_nicks.forEach(function(owner_nick){
									   say({err: err.stack}, 3, {skip_verify: true, to: owner_nick}); 
								   });
								}
							});
							return;
						}
					 
						if(!results || results.length === 0){
							say({err: 'no youtube video found for last played song'}, 2)
							return;
						}

						var str = CHAN.t.highlight(x.no_highlight(args.irc_nick)) + ' ';
						str += data.now_playing ? 'is now playing: ' + CHAN.t.success(results[0].title || '') : 'last played: ' + CHAN.t.null(results[0].title || '');
						str += ' ' + results[0].link; 

						say(str, 1, {skip_verify: true});
					});
				});
			});		   
		}
	},
	wp: {
		action: 'get all users in current chan w/ registered last.fm nicks last scrobbled song',
		API: ['lastfm'],
		no_pm: true,
		spammy: true,
		func: function(CHAN, USER, say, args, command_string){
			CHAN.get_all_users_in_chan_data({col: 'lastfm', label: 'Last.FM'}, function(data){
				var playing = [];
				var not_playing = [];

				let requests = (Object.keys(data)).map((lastfm_un) => {
					return new Promise((resolve) => {
						lfm.getRecent(CHAN, data[lastfm_un], lastfm_un, true, function(d){
							if(d.err) {
								CHAN.log.error(d.err);
							} else {
								var play_data = {
									user: d.irc_nick,
									now_playing_hidden: d.now_playing,
									artist: d.artist ? d.artist : null,
									song: d.name ? d.name : null,
									album: d.album ? d.album : null,
									plays: x.abv_num(d.user_play_count) + '/' + x.abv_num(d.play_count),
									user_plays_hidden: d.user_play_count,
									total_plays_hidden: d.play_count,
									'♥': '♥',
									loved_hidden: d.loved,
									tags: d.tags.length > 0 ? (d.tags.splice(0, 2)).join(', ') : 'No Tags'
								}

								if(play_data.artist !== null && play_data.song !== null){
									if(d.now_playing){
										playing.push(play_data);
									} else {
										not_playing.push(play_data);
									} 
								}
							}
							resolve();
						});
			   
					});
				});

				Promise.all(requests).then(() => { 

					var say_data = [playing, not_playing];

					say(say_data, 1, {
						table: true, 
						table_opts: {
							header: true, 
							outline: false, 
							cluster: [CHAN.t.success, CHAN.t.null],
							cluster_symbols: ['▸', '॥'],
							full_width: ['user', 'plays', '♥'],
							col_format: {
								user: function(row, cell){ 
									return row.now_playing_hidden ? CHAN.t.success(cell) : CHAN.t.null(cell)
								},
								artist: function(row, cell){ return CHAN.t.highlight(cell) },
								song: function(row, cell){ return CHAN.t.highlight(cell) },
								album: function(row, cell){ return CHAN.t.highlight(cell) },
								plays: function(row, cell){ 
									return x.score(row.user_plays_hidden, {max: row.total_plays_hidden, score_str: x.abv_num(row.user_plays_hidden), config: CHAN.config})  + 
									'/' + x.score(row.total_plays_hidden, {max: info.highest_song_count, score_str: x.abv_num(row.total_plays_hidden), config: CHAN.config}) 
								},
								'♥': function(row, cell) { 
									return row.loved_hidden ? CHAN.t.fail('♥') : CHAN.t.null('♥')
								},
								tags: function(row, cell) { 
									return row.tags === 'No Tags' ? CHAN.t.null(cell) : CHAN.t.warn(cell)
								}
							}
						}, 
						lines: 15, 
						force_lines: true
					});

				});
			});
		}
	},
	top: {
		action: 'get user top artists for the week',
		params: [{
			optional: true,
			name: 'irc nick',
			type: 'string',
			default: function(USER){ return USER.nick; }
		}],
		register: 'lastfm',
		API: ['lastfm'],
		func: function(CHAN, USER, say, args, command_string){
			b.users.get_user_data(args.irc_nick === USER.nick ? USER : args.irc_nick, {col: 'lastfm'}, function(lastfm_un){
				if(lastfm_un.err){
					if(args.irc_nick === USER.nick){
						say(lastfm_un, 2);
					} else {
						say({err: args.irc_nick + ' does not have a registered last.fm account'}, 2);
					}
					return;
				}

				lfm.getWeekly(CHAN, args.irc_nick, lastfm_un, function(d) {
					if(d.err) return say(d);
					if(d.artist.length < 1) return say({err: d.irc_nick + ' has no top artists for this week.'});

					var str = CHAN.t.highlight(CHAN.t.term(x.no_highlight(d.irc_nick)) + ' top artists this week: ');

					var top_play = d.artist[0].playcount;
					var artists = d.artist.map(function(artist){
						return artist.name + ' ' + x.score(artist.playcount, {max: top_play, config: CHAN.config});
					});

					str += artists.slice(0,10).join(', ');

					say(str, 1, {skip_verify: true});
				});
			});
		}
	},
	sa: {
		action: 'get similar artists by percentage, if no artist entered uses last artist from np or yt',
		params: [{
			optional: function(){ return info.last_artist !== null },
			name: 'artist',
			type: 'text',
			default: function(){ return info.last_artist === null ? undefined : info.last_artist; }
		}],
		API: ['lastfm'],
		func: function(CHAN, USER, say, args, command_string){
			lfm.getSimilarArtists(CHAN, args.artist, function(d){
				if(d.err) return say(d, 2);

				if(d.artist !== '') {
					info.last_artist = d.artist;
				}

				if(d.similar_artists.length === 0) return say({err: 'No similar artists found.'});

				var str =  CHAN.t.highlight('Similar to ' + CHAN.t.term(d.artist) + ': ');
				var sa = d.similar_artists.map(function(artist){ 
					return artist.name + ' ' + x.score(artist.match, {max: 100, end: '%', config: CHAN.config}); 
				});
				str += sa.join(', ');

				say(str, 1);
			});
		}
	},
	bio: {
		action: 'get artist bio (uses last !np or !yt artist if none entered)',
		params: [{
			optional: function(){ return info.last_artist !== null },
			name: 'artist',
			type: 'text',
			default: function(){ return info.last_artist === null ? undefined : info.last_artist; }
		}],
		API: ['lastfm'],
		func: function(CHAN, USER, say, args, command_string){
			lfm.getArtistInfo(CHAN, args.artist, function(d){
				if(d.err) return say(d, 2);

				if(d.artist !== '') {
					info.last_artist = d.artist;
				}

				var str =  CHAN.t.highlight('Bio for ' + CHAN.t.term(d.artist) + ': ') + '\u000f' + d.bio;
				say(str, 1, {url: d.url});
			});
		}
	},
	lastfm: {
		action: 'register your last.fm username with your irc nick',
		params: [{
			name: 'last.fm username',
			type: 'string',
			key: 'username'
		}],
		registered: true,
		API: ['lastfm'],
		func: function(CHAN, USER, say, args, command_string){
			b.users.update_user(USER.nick, {lastfm: args.username}, function(msg){
				say(msg, 2);
			});
		}
	}

}
exports.cmds = cmds;
