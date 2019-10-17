var request 		= require('request');

module.exports = class TTV{
	constructor(){
		if(config.API.youtube && config.API.youtube.key !== ''){
			this.yt_search = true;
		} else { 
			b.log.error('Missing Youtube API key!');
			this.yt_search = false;
		}

		if (config.API.trakt && config.API.trakt.key !== ''){
			this.use_trakt = true;
		} else {
			b.log.error('Missing Trakt API key!');
			this.use_trakt = false;
		}

		if (config.API.themoviedb && config.API.themoviedb.key !== ''){
			this.use_themoviedb = true;
		} else {
			b.log.error('Missing TheMovieDB API key!');
			this.use_themoviedb = false;
		}
	}

	get_tmdb_url(CHAN, method, params, callback){

		var url = 'https://api.themoviedb.org/3/' + method + '?';
		for(var key in params){
			if(key === 'handlers') continue;
			url += '&' + key + '=' + encodeURIComponent(params[key]);
		}
		url += '&api_key=' + config.API.themoviedb.key;

		request({url: url, followRedirect: false}, function (error, response, body) {
			if(error){
				CHAN.log.error('Error:', error);
				if(params.handlers.error) params.handlers.error(error);
			} else if(response.statusCode !== 200){
				CHAN.log.error('Invalid Status Code Returned:', response.statusCode);
				if(params.handlers.error) params.handlers.error(error);
			} else {
				var json_parse = JSON.parse(body);
				if(json_parse.error) CHAN.log.error('Error:', json_parse.message);

				params.handlers.success(json_parse);
			}
		});
	};

	get_trakt_url(CHAN, method, params, callback){

		if (this.use_trakt){
			var headers = {
				'trakt-api-key'     : config.API.trakt.key,
				'trakt-api-version' : '2',
				'Content-type'      : 'application/json'
			}
		} else {
			callback({err: 'Missing Trakt API key!'});
			return;
		}

		var url = 'https://api.trakt.tv/' + method;

		var i = 0;
		for(var key in params){
			if(key === 'handlers') continue;
			url += (i === 0 ? '?' : '&') + key + '=' + encodeURIComponent(params[key]);
			i++;
		}

		CHAN.log.debug(url);

		request({url: url, followRedirect: false, headers: headers}, function (error, response, body) {
			if(error){
				CHAN.log.error('Error:', error);
				if(params.handlers.error) params.handlers.error(error);
			} else if(response.statusCode >= 400){
				CHAN.log.error('Invalid Status Code Returned:', response.statusCode);
				if(params.handlers.error) params.handlers.error(error);
			} else {
				try{
					var json_parse = JSON.parse(body);
					params.handlers.success(json_parse);
				} catch(e) {
					CHAN.log.debug(e.message);
					params.handlers.success({err: response.statusCode});
				}
			}
		});
	};

	yt_video_search(CHAN, term, callback)
	{
		if(!this.yt_search){
			return callback({err: 'No YouTube API key provided'});
		}

		var params = {
			q: term,
			part: 'snippet',
			maxResults: 1
		}

		var url = 'https://www.googleapis.com/youtube/v3/search?key=' + config.API.youtube.key

		for(var key in params){
			url += '&' + key + '=' + encodeURI(params[key]);
		}

		CHAN.log.debug(url);

		request({url: url}, function (error, response, body){
			try{
				if(error && error != null && error != 'null')
				{
					CHAN.log.error('Error:', error);
					return callback({err: error});
				} 
				else 
				{
					var json_parse = JSON.parse(body);

					if(json_parse && json_parse.items)
					{
						var results = json_parse.items.map(function (item) {
							var link = ''
							var id = ''
							switch (item.id.kind) {
								case 'youtube#channel':
									link = 'https://www.youtube.com/channel/' + item.id.channelId;
									id = item.id.channelId;
									break;
								case 'youtube#playlist':
									link = 'https://www.youtube.com/playlist?list=' + item.id.playlistId;
									id = item.id.playlistId
									break;
								default:
									link = 'https://www.youtube.com/watch?v=' + item.id.videoId;
									id = item.id.videoId
									break;
							}

							return {
								id: id,
								link: link,
								kind: item.id.kind,
								publishedAt: item.snippet.publishedAt,
								channelId: item.snippet.channelId,
								channelTitle: item.snippet.channelTitle,
								title: item.snippet.title,
								description: item.snippet.description,
								thumbnails: item.snippet.thumbnails
							}
						});

						return callback(results);
					}
					else
					{
						CHAN.log.error('Error:', body);
						return callback({err: 'An error has occured'});
					}
				}
			} catch(e) {
					CHAN.log.error('Error:', error);
					return callback({err: e.message});
			}
		});
	}

	search(CHAN, media_type, query, callback){
		var _this = this;
		if(!this.use_trakt){
			callback({err: 'Missing Trakt API key!'});
			return;
		}

		this.get_trakt_url(CHAN, 'search/' + media_type, {
			query: query,
			extended : 'max',
			handlers: {
				error: function(err){
					CHAN.log.error(err);
					callback({err: 'An error has occured'});
					return;
				},
				success: function(data){
					if(!data || !data[0] || !data[0][media_type]){
						callback({err: 'No ' + media_type + ' found by that name (' + query + ')'});
						return;
					}

					var d = data[0][media_type];
					d.type = media_type;
					d.score = data[0].score;

					_this.get_trakt_url(CHAN, media_type + 's/' + d.ids.slug, {
						extended : 'full',
						handlers: {
							error: function(err){
								CHAN.log.error(err);
								callback({err: 'An error has occured'});
								return;
							},
							success: function(dd){
								if(!dd){
									callback({err: 'No ' + media_type + ' found by that name (' + query + ')'});
									return;
								}

								d = Object.assign({}, d, dd);

								if(!d.trailer && _this.yt_search){
									_this.yt_video_search(CHAN, (d.title + ' trailer'), function(results) {
										if(results.err){
											CHAN.log.error(results.err);
											callback({err: 'an error has occured'});
										} else if(!results || results.length === 0){
											callback({err: 'no youtube video found show'}, 2);
										} else {
											d.trailer = CHAN.t.null('(YouTube Search) ') + results[0].link;
										}

										callback(d);
									});
								} else {
									callback(d);
								}
							}
						}
					});
				}
			}
		})
	}

	getTrending(CHAN, media_type, callback){
		var _this = this;
		if(!this.use_trakt){
			callback({err: 'Missing Trakt API key!'});
			return;
		}

		if(media_type !== '-movies' && media_type !== '-shows'){
			callback({err: '-movies and -shows are the only accepted parameters'}); 
			return;
		}

		if(media_type === '-movies'){
			this.get_trakt_url(CHAN, 'movies/trending', {
				handlers: {
					error: function(err){
						CHAN.log.error(err);
						callback({err: 'An error has occured'});
						return;
					},
					success: function(data){
						if(!data || !data.length){
							callback({err: 'No movies trending'});
							return;
						}

						_this.parseMediaInfo(CHAN, data, null, null, {type: 'movie'}, function(new_data){
							callback(new_data);
						});
					}
				}
			});
		} else if(media_type === '-shows') {
			this.get_trakt_url(CHAN, 'shows/trending', {
				handlers: {
					error: function(err){
						CHAN.log.error(err);
						callback({err: 'An error has occured'});
						return;
					},
					success: function(data){
						if(!data || !data.length){
							callback({err: 'No shows trending'});
							return;
						}

						_this.parseMediaInfo(CHAN, data, null, null, {type: 'show'}, function(new_data){
							callback(new_data);
						});
					}
				}
			});
		} 
	};

	parseMediaInfo(CHAN, media, irc_nick, ttv_nick, merge_info, callback) {
		if (!media){
			CHAN.log.error('no media found');
			return callback({err: 'no media found'}); 
		} 

		//error, non-fatal
		if(media.statusCode) {
			CHAN.log.error(media.statusCode + ': ' + media.statusMessage);
			callback({err: media.statusMessage});
			return;
		}

		if(!media.length) media = [media];

		var media_arr = [];
		for(var m = 0; m < media.length; m++){
			var media_info = {
				title: '',
				year: '',
				type: media[m].type || ''
			};

			for(var key in merge_info){
				media_info[key] = merge_info[key];
			}

			if(media[m].watchers) media_info.watchers = media[m].watchers;
			if(media[m].now_watching !== undefined) media_info = media[m].now_watching;
			if(irc_nick) media_info.irc_nick = irc_nick;

			switch(media_info.type)
			{
				case 'episode':
					var title = [];
					if(media[m].show.title) title.push(media[m].show.title);
					if(media[m].episode.title) title.push(media[m].episode.title);

					var season = media[m].season ? media[m].season : media[m].episode.season;
					var episode = media[m].number ? media[m].number : media[m].episode.number;

					var SE = 'S' + (season < 10 ? '0' + season : season);
					SE += 'E' + (episode < 10 ? '0' + episode : episode);

					title.push(SE);

					media_info.title = title.join(' - ');
					media_info.year = media[m].show.year;
					break;
				case 'show': 
					media_info.title = media[m].show.title;
					media_info.year = media[m].show.year;
					break;
				case 'movie':
					media_info.title = media[m].movie.title;
					media_info.year = media[m].movie.year;
					break;

				default:
					media_info = media[m];
					break;
			}

			media_arr.push(media_info);
		}
		
		callback(media_arr.length === 1 ? media_arr[0] : media_arr);
	};

	getRecent(CHAN, irc_nick, ttv_nick, callback) {
		var _this = this;

		if(!this.use_trakt){
			callback({err: 'Missing Trakt API key!'});
			return;
		}

		this.get_trakt_url(CHAN, 'users/' + ttv_nick + '/watching', {
			handlers: {
				error: function(err){
					CHAN.log.error(err);
					callback({err: 'An error has occured'});
					return;
				},
				success: function(data){
					if(data.err && data.err === 204) //no content
					{
						_this.get_trakt_url(CHAN, 'users/' + ttv_nick + '/history', {
							handlers: {
								error: function(err){
									CHAN.log.error(err);
									callback({err: 'An error has occured'});
									return;
								},
								success: function(data2){
									if(data2.err && data2.err === 204) //no content
									{
										CHAN.log.error(CHAN.t.highlight(irc_nick) + ' hasn\'t scrobbled any media yet.');
										callback({err: CHAN.t.highlight(irc_nick) + ' hasn\'t scrobbled any media yet.'});
									}
									else if(data2.err) {
										callback({err: 'An error has occured, status code ' + data2.err});
										return;
									} else if(data2.length > 0) {
										var media = data2[0];
										_this.parseMediaInfo(CHAN, media, irc_nick, ttv_nick, {now_watching: false}, callback);
									}
								}
							}
						});
					}
					else if(data.err) {
						callback({err: 'An error has occured, status code ' + data.err});
						return;
					}
					else
					{
						var media = data;
						_this.parseMediaInfo(CHAN, media, irc_nick, ttv_nick, {now_watching: true}, callback);
					}
				}
			}
		});
	}
}


