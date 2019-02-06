var request = require('request');

module.exports = class Music{
	constructor(){
		this.use_lastfm = true;
		if(!config.API.lastfm || config.API.lastfm.key == '') {
			b.log.warn('Missing LastFM API key!');
			this.use_lastfm = false;
		}
	}

	get_url(CHAN, service, method, send_data){
		if(service === 'lastfm' && !this.use_lastfm){
			send_data.handlers.error({message: 'LastFM is not enabled.'});
			return;
		}

		var base = {
			lastfm: 'http://ws.audioscrobbler.com/2.0/?method=',
			librefm: 'https://libre.fm/2.0/?method=',
			listenbrainz: 'https://api.listenbrainz.org/1/',
			musicbrainz: 'http://musicbrainz.org/ws/2/'
		}

		var url = base[service] + method;

		var i = service === 'lastfm' || service === 'librefm' ? 1 : 0;
		for(var field in send_data){
			if(field === 'handlers' || field === 'encode') continue;

			url += (i === 0 ? '?' : '&') + field + '=';

			if(send_data.encode && send_data.encode === 'encodeURI')
			{
				url += encodeURI(send_data[field]);
			}
			else if(send_data.encode !== undefined && send_data.encode === false)
			{
				url += send_data[field];
			}
			else
			{
				url += encodeURIComponent(send_data[field])
			}
			
			i++;
		}

		var headers = null;

		if(service === 'lastfm')
		{
			url += (i === 0 ? '?' : '&') + 'api_key=' + config.API.lastfm.key + '&format=json';
		}
		else if(service === 'librefm')
		{
			url += (i === 0 ? '?' : '&') + 'format=json';
		}
		else if(service === 'musicbrainz' || service === 'listenbrainz')
		{
			url += (i === 0 ? '?' : '&') + 'fmt=json';
			headers = {
				'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36'
			}
		}

		console.log(url);

		request({url: url, followRedirect: false, headers: headers}, function (error, response, body) 
		{
			if(error)
			{
				CHAN.log.error('Error:', error);
				if(send_data.handlers.error) send_data.handlers.error(error);
			} 
			else if(response.statusCode !== 200)
			{
				CHAN.log.error('Invalid Status Code Returned:', response.statusCode);
				if(send_data.handlers.error) send_data.handlers.error(error);
			} 
			else 
			{
				var json_parse = JSON.parse(body);
				if(json_parse.error) CHAN.log.error('Error:', json_parse.message);
				send_data.handlers.success(json_parse);
			}
		});
	};

	//this is a hack because listenbrainz api doesn't show the currently playing song
	get_listenbrainz_np(CHAN, options, callback){
		options = Object.assign({}, {
			irc_nick: null,
			service: null,
			lastfm: null,
			librefm: null,
			listenbrainz: null,
			wp: false
		}, options);

		request({url: 'https://listenbrainz.org/user/' + options.listenbrainz, followRedirect: false}, function(error, response, body) 
		{
			var reg = /<tr id="playing_now">.*?<td>(.*?)<\/td>.*?<td>(.*?)<\/td>.*?<\/tr>/mgis;
			var np_match = reg.exec(body)
			if(np_match)
			{
				callback({
					artist_name: np_match[1],
					track_name: np_match[2]
				})
			}
			else
			{
				callback(false);
			}
		});
	}

	parse_track_info(CHAN, track, options, callback) {
		options = Object.assign({}, {
			irc_nick: null,
			service: null,
			lastfm: null,
			librefm: null,
			listenbrainz: null,
			wp: false
		}, options);
		var str;

		if (!track) return callback({'err': 'No Track'});

		if(options.service === 'listenbrainz')
		{
			var data = {
				service: options.service,
				irc_nick: options.irc_nick,
				now_playing: track.now_playing,
				loved: false,
				name: track.track_name ? track.track_name : '',
				artist: track.artist_name ? track.artist_name : '',
				album: track.release_name ? track.release_name : '',
				album_date: track.album_date,
				user_play_count: 0,
				play_count: 0,
				tags: track.tags ? track.tags : [],
			}
		}
		else
		{
			var tags = (track.toptags instanceof Array) ? track.toptags : [track.toptags];
			var tag_names = [];
			for(var i = 0; i < tags.length; i++)
			{
				if(tags[i] && tags[i].name) tag_names.push(tags[i].name);
			}

			var artist = track.artist && track.artist.name ? track.artist.name : 
				track.artist && track.artist['#text'] ? track.artist['#text'] : '';

			//JANKY but so is librefm still, sigh.
			if(artist === '' && track.url && track.url.match(/artist\/.+?\/album/))
			{
				var url_arr = track.url.split('/');
				artist = url_arr[url_arr.indexOf('artist') + 1].replace(/\+/g, ' ');
			}

			var album = track.album && track.album.title ? track.album.title : 
				track.album && track.album['#text'] ? track.album['#text'] : '';

			if(album === '' && track.url && track.url.match(/album\/.+?\/track/))
			{
				var url_arr = track.url.split('/');
				album = url_arr[url_arr.indexOf('album') + 1].replace(/\+/g, ' ');
			}

			var data = {
				service: options.service,
				irc_nick: options.irc_nick,
				now_playing: track.now_playing,
				loved: track.userloved && track.userloved !== '0',
				name: track.name,
				artist: artist,
				album: album,
				user_play_count: +track.userplaycount || 0,
				play_count: +track.playcount || 0,
			};

			data.tags = tag_names;
		}
		
		callback(data);
		
	}

	get_artist_tags(CHAN, track, options, callback) {
		CHAN.log.debug('getting artist tags');
		var _this = this;
		options = Object.assign({}, {
			irc_nick: null,
			service: null,
			lastfm: null,
			librefm: null,
			listenbrainz: null,
			wp: false
		}, options);

		var send_data = {
			autocorrect: 1,
			handlers: {
				success: function(data) {
					var tags;
					if (data && data.toptags && data.toptags.tag) {
						tags = (data.toptags.tag instanceof Array) ? data.toptags.tag : [data.toptags];
					} else {
						tags = [];
					}

					if (tags.length > 0) {
						track.toptags = tags;
						_this.parse_track_info(CHAN, track, options, callback);
					} else {
						_this.parse_track_info(CHAN, track, options, callback); // no tags
					}
				},
				error: function(err) {
					CHAN.log.debug('get_artist_tags error:', err.stack);
					CHAN.log.debug('you can probably ignore this error above, this track has no tags.');
					_this.parse_track_info(CHAN, track, options, callback); // no tags
				}
			}
		};

		if(track && track.artist && track.artist.mbid){
			send_data.mbid = track.artist.mbid;
			_this.get_url(CHAN, options.service, 'artist.getTopTags', send_data);
		} else if (track && track.artist && track.artist.name){
			send_data.artist = track.artist.name;
			_this.get_url(CHAN, options.service, 'artist.getTopTags', send_data);
		} else if (track && track.artist && track.artist['#text']){
			send_data.artist = track.artist['#text'];
			_this.get_url(CHAN, options.service, 'artist.getTopTags', send_data);
		} else {
			CHAN.log.debug('get_artist_tags error: no artist specified');
			CHAN.log.debug('you can probably ignore this error above, this track has no tags.');
			_this.parse_track_info(CHAN, track, options, callback); // no tags
		}
	}

	get_album_tags(CHAN, track, options, callback) {
		CHAN.log.debug('getting album tags', track, track.album);
		var _this = this;
		options = Object.assign({}, {
			irc_nick: null,
			service: null,
			lastfm: null,
			librefm: null,
			listenbrainz: null,
			wp: false
		}, options);

		_this.get_url(CHAN, options.service, 'album.getTopTags', {
			mbid: track && track.album && track.album.mbid,
			autocorrect: 1,
			handlers: {
				success: function(data) {
					var tags;
					if (data && data.toptags && data.toptags.tag) {
						tags = (data.toptags.tag instanceof Array) ? data.toptags.tag : [data.toptags];
					} else {
						tags = [];
					}

					if (tags.length > 0) {
						track.toptags = tags;
						_this.parse_track_info(CHAN, track, options, callback);
					} else {
						// get tags from artist
						_this.get_artist_tags(CHAN, track, options, callback);
					}
				},
				error: function(err) {
					// get tags from artist
					CHAN.log.debug('getAlbumTags error:', err);
					CHAN.log.debug('you can probably ignore this error above, trying to get tags from artist...');
					_this.get_artist_tags(CHAN, track, options, callback); // no tags
				}
			}
		});
	}

	get_weekly(CHAN, options, callback) {
		CHAN.log.debug('getting user weekly artist info');
		var _this = this;
		options = Object.assign({}, {
			irc_nick: null,
			service: 'lastfm',
			lastfm: null
		}, options);

		_this.get_url(CHAN, options.service, 'user.getWeeklyArtistChart', {
			user: options[options.service],
			handlers: {
				success: function(d) {

					var data = d.weeklyartistchart;
					data.irc_nick = options.irc_nick;

					callback(data);
				},
				error: function(err) {
					CHAN.log.debug('getWeekly error:', err);
					callback({err: err && err.message ? err.message : 'Cannot get user weekly artist data'});
				}
			}
		});
	}

	get_recent_np(CHAN, options, callback){
		var _this = this;
		options = Object.assign({}, {
			irc_nick: null,
			service: null,
			lastfm: null,
			librefm: null,
			listenbrainz: null,
			wp: false
		}, options);

		if(options.service)
		{
			_this.get_recent(CHAN, options, callback);
			return;
		}

		var track_data = {};
		var arr = [];
		if(options.lastfm && this.use_lastfm){
			arr.push(new Promise((resolve) => {
				_this.get_recent(CHAN, {
					irc_nick: options.irc_nick,
					service: 'lastfm',
					lastfm: options.lastfm,
					wp: options.wp
				}, function(data){
					track_data.lastfm = data;
					resolve();
				})
			}))
		}

		if(options.librefm) {
			arr.push(new Promise((resolve) => {
				_this.get_recent(CHAN, {
					irc_nick: options.irc_nick,
					service: 'librefm',
					librefm: options.librefm,
					wp: options.wp
				}, function(data){
					track_data.librefm = data;
					resolve();
				})
			}))
		}

		if(options.listenbrainz) {
			arr.push(new Promise((resolve) => {
				_this.get_recent(CHAN, {
					irc_nick: options.irc_nick,
					service: 'listenbrainz',
					listenbrainz: options.listenbrainz,
					wp: options.wp
				}, function(data){
					track_data.listenbrainz = data;
					resolve();
				})
			}))
		}

		Promise.all(arr).then(function(){
			var service = Object.keys(track_data)[0];
			var send_track = track_data[service];

			if(Object.keys(track_data).length > 1)
			{
				if(track_data.librefm && track_data.librefm.now_playing){
					service = 'librefm';
				} else if(track_data.lastfm && track_data.lastfm.now_playing){
					service = 'lastfm';
				} else if(track_data.listenbrainz && track_data.listenbrainz.now_playing){
					service = 'listenbrainz';
				} else if(track_data.librefm){
					service = 'librefm';
				} else if(track_data.lastfm){
					service = 'lastfm';
				} else if(track_data.listenbrainz){
					service = 'listenbrainz';
				} else {
					service = Object.keys(track_data)[0]
				}

				send_track = track_data[service];

				var update_fields = ['artist', 'album', 'tags'];
				for(var s in track_data){
					if(s === service) continue;
					if(track_data[s].name === send_track.name && (track_data[s].artist === send_track.artist || track_data[s].album === send_track.album))
					{
						update_fields.forEach(function(field)
						{
							if(typeof send_track[field] === 'string' || send_track[s][field] === 'string')
							{
								if(send_track[field] === null || send_track[field] === '')
								{
									send_track[field] = track_data[s][field];
								}
							} 
							else if(Array.isArray(send_track[field]))
							{
								if(send_track[field].length === 0 && track_data[s][field].length > 0)
								{
									send_track[field] = track_data[s][field];
								}
							}
						})
					}

				}
			}

			callback(send_track);
		});
	}

	get_recent(CHAN, options, callback) {
		var _this = this;
		options = Object.assign({}, {
			irc_nick: null,
			service: null,
			lastfm: null,
			librefm: null,
			listenbrainz: null,
			wp: false
		}, options);

		if(!options.service || !options[options.service])
		{
			if(options.librefm)
			{
				options.service = 'librefm';
			} 
			else if(options.lastfm && this.use_lastfm)
			{
				options.service = 'lastfm';
			} 
			else if(options.listenbrainz)
			{
				options.service = 'listenbrainz';
			}
			else
			{
				callback({err: 'No scrobbling service provided'})
			}
		}

		if(options.service === 'listenbrainz')
		{
			_this.get_url(CHAN, options.service, 'user/' + options[options.service] + '/listens', {
				count: 1,
				handlers: {
					success: function(data) {
						_this.get_listenbrainz_np(CHAN, options, function(np){
							var track = null;
							if(data && data.payload && data.payload.listens && data.payload.listens.length > 0)
							{
								track = data.payload.listens[0].track_metadata;
								var add_info = JSON.parse(JSON.stringify(track.additional_info))
								delete track.additional_info;
								track = Object.assign({}, add_info, track);

							} 

							if(np)
							{
								if(np.track_name !== track.track_name && np.artist_name !== track.artist_name)
								{
									track = np;
								}

								track.now_playing = true;
							}
							else
							{
								if(track !== null)
								{
									track.now_playing = false;
								}
								else
								{
									var msg = (options.wp ? '[' + CHAN.t.highlight(options.irc_nick) + ']' : CHAN.t.highlight(options.irc_nick)) + ' hasn\'t scrobbled any tracks yet.';
									callback({'err': 'hasn\'t scrobbled any tracks'});
									return;
								}
							}

							if(!track.tags || track.tags.length < 1)
							{
								if(track.release_name)
								{
									_this.get_url(CHAN, 'musicbrainz', 'release/', {
										encode: 'encodeURI',
										query: 'artist:' + track.artist_name + ' AND release:' + track.release_name,
										handlers: {
											success: function(data) {

												var found = false;
												for(var i = 0; i < data.releases.length; i++)
												{
													var release = data.releases[i];
													if(release.title === track.release_name)
													{
														for(var j = 0; j < release['artist-credit'].length; j++)
														{
															var artist = release['artist-credit'][j];
															if(artist.artist && artist.artist.name === track.artist_name)
															{
																found = release;

																track.album_date = release.date;
																track.artist_msid = artist.artist.id;
																track.release_group_mbid = release['release-group'].id;
																track.tags = release.tags ? release.tags.map(function(tag){ return tag.name; }) : track.tags;

																break;
															}
														}

														if(found) break;
													}
												}

												_this.parse_track_info(CHAN, track, options, callback);

											},
											error: function(err) {
												CHAN.log.error('get_recent_track error:', err);
												callback({'err': err && err.message ? err.message : 'No musicbrainz release found'});
											}
										}
									})
								}
								else
								{
									_this.get_url(CHAN, 'musicbrainz', 'artist/', {
										encode: 'encodeURI',
										query: 'artist:' + track.artist_name,
										handlers: {
											success: function(data) {
												for(var i = 0; i < data.artists.length; i++)
												{
													var artist = data.artists[i];
													if(artist.name === track.artist_name)
													{
														track.artist_msid = artist.id;
														track.tags = artist.tags ? artist.tags.map(function(tag){ return tag.name; }) : track.tags;
														break;
													}
												}

												_this.parse_track_info(CHAN, track, options, callback);

											},
											error: function(err) {
												CHAN.log.error('get_recent_track error:', err);
												callback({'err': err && err.message ? err.message : 'No musicbrainz artist found'});
											}
										}
									})
								}
							}
						})
						
					},
					error: function(err) {
						CHAN.log.error('get_recent_track error:', err);
						callback({err: err && err.message ? err.message : 'Cannot get listenbrainz user scrobbles'});
					}
				}
			});
		}
		else
		{
			_this.get_url(CHAN, options.service, 'user.getRecentTracks', {
				user: options[options.service],
				limit: 1,
				handlers: {
					success: function(data) {
						if (data && data.recenttracks && data.recenttracks.hasOwnProperty('track')) {
							var track = (data.recenttracks.track instanceof Array) ? data.recenttracks.track[0] : data.recenttracks.track;
							var now_playing = track && track.hasOwnProperty('@attr') && track['@attr'].nowplaying === 'true';
							var album = track && track.album ? track.album : undefined;

							 _this.get_url(CHAN, options.service, 'track.getInfo', {
								mbid: track && track.mbid,
								track: track && track.name,
								artist: track && track.artist && track.artist['#text'],
								username: options[options.service],
								handlers: {
									success: function(data) {
										if (!data) {
											return callback({'err': 'missing track data'});
										}

										if(!data.track) data = {track: track || {}};
										if(!data.track.album && album !== undefined) data.track.album = album;
										data.track.now_playing = now_playing;

										var tags = [];
										if (data && data.track && data.track.toptags && data.track.toptags.tag && (data.track.toptags.tag instanceof Array)) {
											tags = data.track.toptags.tag;
										} else {
											if ((typeof data.track.toptags === 'string') && (data.track.toptags.length > 0)) {
												var tag = data.track.toptags.trim().replace('\\n', '');
												tags = [tag];
											}
										}

										if (tags.length > 0) {
											data.track.toptags = tags;
											_this.parse_track_info(CHAN, data.track, options, callback);
										} else {
											if (data.album) {
												// get tags from album
												_this.get_album_tags(CHAN, data.track, options, callback);
											} else {
												// get tags from artist
												_this.get_artist_tags(CHAN, data.track, options, callback);
											}
										}
									},
									error: function(err) {
										CHAN.log.error('get_recent_track error:', err);
										callback({'err': err && err.message ? err.message : 'Cannot get ' + options.service + ' track info'});
									}
								}
							});
						} else {
							var msg = (options.wp ? '[' + CHAN.t.highlight(options.irc_nick) + ']' : CHAN.t.highlight(options.irc_nick)) + ' hasn\'t scrobbled any tracks yet.';
							callback({err: 'hasn\'t scrobbled any tracks'});
						}
					},
					error: function(err) {
						CHAN.log.error('get_recent_track error:', err);
						callback({err: err && err.message ? err.message : 'Cannot get ' + options.service + ' user scrobbles'});
					}
				}
			});
		}
	}

	get_similar_artists(CHAN, artist, callback) {
		var _this = this;
		_this.get_url(CHAN, 'lastfm', 'artist.getSimilar', {
			artist: artist,
			autocorrect: 1,
			limit: 13,
			handlers: {
				success: function(res) {
					if(res.error){
						this.error(res);
						return;
					}
					
					var data = {
						artist: res.similarartists['@attr'].artist,
						similar_artists: res.similarartists.artist
					}
					callback(data);
				},
				error: function(err) {
					CHAN.log.error('getSimilarArtists error: ', err)
					callback({err: err && err.message ? err.message : 'No artists found'});
				}
			}
		});
	}

	get_artist_info(CHAN, artist, callback) {
		var _this = this;
		_this.get_url(CHAN, 'lastfm', 'artist.getInfo', {
			artist: artist,
			autocorrect: 1,
			handlers: {
				success: function(res) {
					if(res.error){
						this.error(res);
						return;
					}

					var data = {
						artist: res.artist.name,
						bio: res.artist.bio.summary,
						url: res.artist.url,
						ontour: res.artist.ontour
					}
					callback(data);
				},
				error: function(err) {
					CHAN.log.error('getArtistInfo error: ', err)
					callback({err: err && err.message ? err.message : 'No artists found'});
				}
			}
		});
	}
}