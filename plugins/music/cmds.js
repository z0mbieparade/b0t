var Music = require(__dirname + '/func.js'),
		m = new Music();

var info = {
	name: 'Music',
	about: 'various music related commands',
	//this is based of lastfm scrobble statistics, which state that the highest scrobbled 
	//song is 'Smells Like Teen Spirit' by Nirvana and has been scrobbled over 10 mil x, but that's just silly
	//so we'll do 10k instead, since that's prolly a good number for a popular song.
	highest_song_count: 10000,
	last_artist: null
}

exports.info = info;

var cmds = {
	np: { //fix this when we re-write commands logic, the params aren't functioning quite right.
		action: 'get last scrobbled song from last.fm/libre.fm/listenbrainz',
		params:[{
			optional: true,
			or: [{
				name: 'lastfm',
				type: 'flag'
			},{
				name: 'librefm',
				type: 'flag'
			},{
				name: 'listenbrainz',
				type: 'flag'
			}]
		},{
			optional: true,
			name: 'irc nick',
			type: 'string',
			default: function(USER){ return USER.nick; }
		}],
		register: 'lastfm|librefm|listenbrainz',
		func: function(CHAN, USER, say, args, command_string){
			var service = null;

			var args = {
				flag: null,
				irc_nick: USER.nick
			};
			var command_arr = command_string.split(/\s/gm).filter(function(a){
				if(['-lastfm','-librefm','-listenbrainz'].includes(a)){
					args.flag = a;
					return false;
				} else {
					return a ? true : false;
				}
			});
			if(command_arr.length > 0) args.irc_nick = command_arr[0];
			if(args.flag) service = args.flag.replace('-', '');

			b.users.get_user_data(args.irc_nick === USER.nick ? USER : args.irc_nick, {}, function(udata){
				if(udata.err){
					if(args.irc_nick === USER.nick){
						say(udata, 2);
					} else {
						say({err: args.irc_nick + ' does not have a registered scrobbler account'}, 2);
					}
					return;
				}

				if(args.flag && !udata[service]){
					say({err: args.irc_nick + ' does not have a registered ' + service + ' account'}, 2);
					return;
				} 
				else if(!udata.lastfm && !udata.librefm && !udata.listenbrainz)
				{
					say({err: args.irc_nick + ' does not have a registered scrobbler account'}, 2);
				}

				m.get_recent_np(CHAN, {
					irc_nick: args.irc_nick,
					lastfm: udata.lastfm,
					librefm: udata.librefm,
					listenbrainz: udata.listenbrainz,
					service: service,
					wp: false 
				}, function(d) {
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

					if(d.service === 'lastfm'){
						str += c.red(' ♬ ');
					} else if (d.service === 'librefm') {
						str += c.olive(' ♬ ');
					} else if (d.service === 'listenbrainz') {
						str += c.pink(' ♬ ');
					}

					if(d.user_play_count !== 0 || d.play_count !== 0)
					{
						str += '[' + x.score(d.user_play_count, {max: d.play_count, score_str: x.abv_num(d.user_play_count), config: CHAN.config})  + '/';
						str += x.score(d.play_count, {max: info.highest_song_count, score_str: x.abv_num(d.play_count), config: CHAN.config}) + '] '
					}

					str += (d.loved ? CHAN.t.fail('♥') + ' (' : '('); 

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
	yt: { //fix this when we re-write commands logic, the params aren't functioning quite right.
		action: 'get last scrobbled song and attempt to locate a youtube video of it',
		params: [{
			optional: true,
			or: [{
				name: 'lastfm',
				type: 'flag'
			},{
				name: 'librefm',
				type: 'flag'
			},{
				name: 'listenbrainz',
				type: 'flag'
			}]
		},{
			optional: true,
			name: 'irc nick',
			type: 'string',
			default: function(USER){ return USER.nick; }
		}],
		register: 'lastfm|librefm|listenbrainz',
		API: ['youtube'],
		func: function(CHAN, USER, say, args, command_string){
			var service = null;

			var args = {
				flag: null,
				irc_nick: USER.nick
			};
			var command_arr = command_string.split(/\s/gm).filter(function(a){
				if(['-lastfm','-librefm','-listenbrainz'].includes(a)){
					args.flag = a;
					return false;
				} else {
					return a ? true : false;
				}
			});
			if(command_arr.length > 0) args.irc_nick = command_arr[0];
			if(args.flag) service = args.flag.replace('-', '');

			b.users.get_user_data(args.irc_nick === USER.nick ? USER : args.irc_nick, {}, function(udata){
				if(udata.err){
					if(args.irc_nick === USER.nick){
						say(udata, 2);
					} else {
						say({err: args.irc_nick + ' does not have a registered scrobbler account'}, 2);
					}
					return;
				}

				if(args.flag && !udata[service]){
					say({err: args.irc_nick + ' does not have a registered ' + service + ' account'}, 2);
					return;
				} 
				else if(!udata.lastfm && !udata.librefm && !udata.listenbrainz)
				{
					say({err: args.irc_nick + ' does not have a registered scrobbler account'}, 2);
				}

				m.get_recent_np(CHAN, {
					irc_nick: args.irc_nick,
					lastfm: udata.lastfm,
					librefm: udata.librefm,
					listenbrainz: udata.listenbrainz,
					service: service,
					wp: false 
				}, function(d) {
					if(d.err) return say(d, 2);

					var title = [];
					if(d.artist !== '') {
						info.last_artist = d.artist;
						title.push(d.artist);
					}

					if(d.name !== '') title.push(d.name);

					m.yt_video_search(CHAN, title.join(' '), function(results) 
					{
						if(results.err)
						{
							CHAN.log.error(results.err)
							say({err: results.err}, 2);
							return;
						}
					 
						if(!results || results.length === 0){
							say({err: 'no youtube video found for last played song'}, 2)
							return;
						}

						var str = CHAN.t.highlight(x.no_highlight(args.irc_nick)) + ' ';
						str += d.now_playing ? 'is now playing: ' + CHAN.t.success(results[0].title || '') : 'last played: ' + CHAN.t.null(results[0].title || '');
						str += ' ' + results[0].link; 

						say(str, 1, {skip_verify: true});
					});
				});
			});		   
		}
	},
	wp: {
		action: 'get all users in current chan w/ a registered scrobbler account\'s last played song',
		no_pm: true,
		spammy: true,
		func: function(CHAN, USER, say, args, command_string){
			CHAN.get_all_users_in_chan_data({col: ['lastfm', 'librefm', 'listenbrainz'], return_rows: true}, function(data){
				var playing = [];
				var not_playing = [];

				let requests = (Object.keys(data)).map((irc_nick) => {
					return new Promise((resolve) => {
						m.get_recent_np(CHAN, {
							irc_nick: irc_nick,
							lastfm: data[irc_nick].lastfm,
							librefm: data[irc_nick].librefm,
							listenbrainz: data[irc_nick].listenbrainz,
							wp: true 
						}, function(d) {
							if(d.err) {
								CHAN.log.error(d.err);
							} else {
								var play_data = {
									'♪': '♪',
									service_hidden: d.service,
									user: d.irc_nick,
									now_playing_hidden: d.now_playing,
									artist: d.artist ? d.artist : null,
									song: d.name ? d.name : null,
									album: d.album ? d.album : null,
									plays: d.user_play_count === 0 && d.play_count === 0 ? '-----' : x.abv_num(d.user_play_count) + '/' + x.abv_num(d.play_count),
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
								'♪': function(row, cell){
									if(row.service_hidden === 'lastfm') return c.red('♪');
									if(row.service_hidden === 'librefm') return c.olive('♪');
									if(row.service_hidden === 'listenbrainz') return c.pink('♪');
								},
								user: function(row, cell){ 
									return row.now_playing_hidden ? CHAN.t.success(x.no_highlight(cell)) : CHAN.t.null(x.no_highlight(cell))
								},
								artist: function(row, cell){ return CHAN.t.highlight(cell) },
								song: function(row, cell){ return CHAN.t.highlight(cell) },
								album: function(row, cell){ return CHAN.t.highlight(cell) },
								plays: function(row, cell){ 
									if(row.user_plays_hidden === 0 && row.total_plays_hidden === 0) return CHAN.t.null('-----');

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

				m.get_weekly(CHAN, {
					irc_nick: args.irc_nick,
					lastfm: lastfm_un,
					service: 'lastfm'
				}, function(d) {
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
			m.get_similar_artists(CHAN, args.artist, function(d){
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
			m.get_artist_info(CHAN, args.artist, function(d){
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
	},
	librefm: {
		action: 'register your libre.fm username with your irc nick',
		params: [{
			name: 'libre.fm username',
			type: 'string',
			key: 'username'
		}],
		registered: true,
		func: function(CHAN, USER, say, args, command_string){
			b.users.update_user(USER.nick, {librefm: args.username}, function(msg){
				say(msg, 2);
			});
		}
	},
	listenbrainz: {
		action: 'register your listenbrainz username with your irc nick',
		params: [{
			name: 'listenbrainz username',
			type: 'string',
			key: 'username'
		}],
		registered: true,
		func: function(CHAN, USER, say, args, command_string){
			b.users.update_user(USER.nick, {listenbrainz: args.username}, function(msg){
				say(msg, 2);
			});
		}
	}

}
exports.cmds = cmds;
