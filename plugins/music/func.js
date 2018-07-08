var request = require('request');

module.exports = class LFM{
	get_url(CHAN, method, send_data){

		var url = 'http://ws.audioscrobbler.com/2.0/?method=' + method;
		for(var field in send_data){
			if(field === 'handlers') continue;
			url += '&' + field + '=' + encodeURIComponent(send_data[field]);
		}
		url += '&api_key=' + config.API.lastfm.key + '&format=json';

		request({url: url, followRedirect: false}, function (error, response, body) {
			if(error){
				CHAN.log.error('Error:', error);
				if(send_data.handlers.error) send_data.handlers.error(error);
			} else if(response.statusCode !== 200){
				CHAN.log.error('Invalid Status Code Returned:', response.statusCode);
				if(send_data.handlers.error) send_data.handlers.error(error);
			} else {
				var json_parse = JSON.parse(body);
				if(json_parse.error) CHAN.log.error('Error:', json_parse.message);

				send_data.handlers.success(json_parse);
			}
		});
	};

	parseTrackInfo(CHAN, track, irc_nick, lfm_nick, wp, callback) {
		var str;

		if (!track) return callback({'err': 'No Track'});

		var tags = (track.toptags instanceof Array) ? track.toptags : [track.toptags];

		var tag_names = [];
		for(var i = 0; i < tags.length; i++)
		{
			if(tags[i] && tags[i].name) tag_names.push(tags[i].name);
		}

		var artist = track.artist && track.artist.name ? track.artist.name : 
			track.artist && track.artist['#text'] ? track.artist['#text'] : '';

		var album = track.album && track.album.title ? track.album.title : 
			track.album && track.album['#text'] ? track.album['#text'] : '';

		var data = {
			irc_nick: irc_nick,
			now_playing: track.now_playing,
			loved: track.userloved && track.userloved !== '0',
			name: track.name,
			artist: artist,
			album: album,
			user_play_count: track.userplaycount || 0,
			play_count: track.playcount || 0,
		};


		data.tags = tag_names;

		callback(data);
	}

	getArtistTags(CHAN, track, irc_nick, lfm_nick, wp, callback) {
		var _this = this;
		CHAN.log.debug('getting artist tags');

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
						_this.parseTrackInfo(CHAN, track, irc_nick, lfm_nick, wp, callback);
					} else {
						_this.parseTrackInfo(CHAN, track, irc_nick, lfm_nick, wp, callback); // no tags
					}
				},
				error: function(err) {
					CHAN.log.debug('getArtistTags error:', err.stack);
					CHAN.log.debug('you can probably ignore this error above, this track has no tags.');
					_this.parseTrackInfo(CHAN, track, irc_nick, lfm_nick, wp, callback); // no tags
				}
			}
		};

		if(track && track.artist && track.artist.mbid){
			send_data.mbid = track.artist.mbid;
			_this.get_url(CHAN, 'artist.getTopTags', send_data);
		} else if (track && track.artist && track.artist.name){
			send_data.artist = track.artist.name;
			_this.get_url(CHAN, 'artist.getTopTags', send_data);
		} else if (track && track.artist && track.artist['#text']){
			send_data.artist = track.artist['#text'];
			_this.get_url(CHAN, 'artist.getTopTags', send_data);
		} else {
			CHAN.log.debug('getArtistTags error: no artist specified');
			CHAN.log.debug('you can probably ignore this error above, this track has no tags.');
			_this.parseTrackInfo(CHAN, track, irc_nick, lfm_nick, wp, callback); // no tags
		}
	}

	getAlbumTags(CHAN, track, irc_nick, lfm_nick, wp, callback) {
		var _this = this;
		CHAN.log.debug('getting album tags', track, track.album);
		_this.get_url(CHAN, 'album.getTopTags', {
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
						_this.parseTrackInfo(CHAN, track, irc_nick, lfm_nick, wp, callback);
					} else {
						// get tags from artist
						_this.getArtistTags(CHAN, track, irc_nick, lfm_nick, wp, callback);
					}
				},
				error: function(err) {
					// get tags from artist
					CHAN.log.debug('getAlbumTags error:', err);
					CHAN.log.debug('you can probably ignore this error above, trying to get tags from artist...');
					_this.getArtistTags(CHAN, track, irc_nick, lfm_nick, callback); // no tags
				}
			}
		});
	}

	getWeekly(CHAN, irc_nick, lfm_nick, callback) {
		var _this = this;
		CHAN.log.debug('getting user weekly artist info', irc_nick);
		_this.get_url(CHAN, 'user.getWeeklyArtistChart', {
			user: lfm_nick,
			handlers: {
				success: function(d) {

					var data = d.weeklyartistchart;
					data.irc_nick = irc_nick;

					callback(data);
				},
				error: function(err) {
					CHAN.log.debug('getWeekly error:', err);
					callback({err: err.message});
				}
			}
		});
	}

	getRecent(CHAN, irc_nick, lfm_nick, wp, callback) {
		var _this = this;
		_this.get_url(CHAN, 'user.getRecentTracks', {
			user: lfm_nick,
			limit: 1,
			handlers: {
				success: function(data) {
					if (data && data.recenttracks && data.recenttracks.hasOwnProperty('track')) {
						var track = (data.recenttracks.track instanceof Array) ? data.recenttracks.track[0] : data.recenttracks.track;
						var now_playing = track && track.hasOwnProperty('@attr') && track['@attr'].nowplaying === 'true';
						var album = track && track.album ? track.album : undefined;

						 _this.get_url(CHAN, 'track.getInfo', {
							mbid: track && track.mbid,
							track: track && track.name,
							artist: track && track.artist && track.artist['#text'],
							username: lfm_nick,
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
										_this.parseTrackInfo(CHAN, data.track, irc_nick, lfm_nick, wp, callback);
									} else {
										if (data.album) {
											// get tags from album
											_this.getAlbumTags(CHAN, data.track, irc_nick, lfm_nick, wp, callback);
										} else {
											// get tags from artist
											_this.getArtistTags(CHAN, data.track, irc_nick, lfm_nick, wp, callback);
										}
									}
								},
								error: function(err) {
									CHAN.log.error('getRecentTrack error:', err);
									callback({'err': err.message});
								}
							}
						});
					} else {
						var msg = (wp ? '[' + CHAN.t.highlight(irc_nick) + ']' : CHAN.t.highlight(irc_nick)) + ' hasn\'t scrobbled any tracks yet.';
						callback({'err': 'hasn\'t scrobbled any tracks'});
					}
				},

				error: function(err) {
					CHAN.log.error('getRecentTrack error:', err);
					callback({err: err.message});
				}
			}
		});
	}

	getSimilarArtists(CHAN, artist, callback) {
		var _this = this;
		_this.get_url(CHAN, 'artist.getSimilar', {
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

	getArtistInfo(CHAN, artist, callback) {
		var _this = this;
		_this.get_url(CHAN, 'artist.getInfo', {
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