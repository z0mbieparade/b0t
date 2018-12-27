var request 		= require('request');

module.exports = class TTV{
	constructor(){
		if(config.API.youtube && config.API.youtube.key !== ''){
			this.yt_search = require('youtube-search');
			this.yt_opts = {
					maxResults: 1,
					key: config.API.youtube.key
				};
		} else { 
			b.log.error('Missing Youtube API key!');
			this.yt_search = false;
		}

		if (config.API.trakt && config.API.trakt.key !== ''){
			var Trakt = require('trakt-api');
			this.trakt = Trakt(config.API.trakt.key, {logLevel: 'debug'});
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

	get_tmdb_url(CHAN, method, send_data){

		///discover/movie?primary_release_date.gte=2014-09-15&primary_release_date.lte=2014-10-22

		var url = 'https://api.themoviedb.org/3/' + method + '?';
		for(var field in send_data){
			if(field === 'handlers') continue;
			url += '&' + field + '=' + encodeURIComponent(send_data[field]);
		}
		url += '&api_key=' + config.API.themoviedb.key;

		request({url: url, followRedirect: false}, function (error, response, body) {
			//b.log.debug(error, response, body);
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

	search(CHAN, media_type, query, callback){
		var _this = this;
		if(!this.use_trakt){
			callback({err: 'Missing Trakt API key!'});
			return;
		}

		this.trakt.searchTextQuery(media_type, query, { extended : 'full' }, function(err, data){
			if(err){
				CHAN.log.error(err);
				callback({err: 'An error has occured'});
				return;
			}		
			if(!data || !data[0] || !data[0][media_type]){
				callback({err: 'No ' + media_type + ' found by that name (' + query + ')'});
				return;
			}

			var d = data[0][media_type];
			d.type = media_type;
			d.score = data[0].score;
			delete d.available_translations;

			if(!d.trailer && _this.yt_search !== false){
				_this.yt_search((d.title + ' trailer'), _this.yt_opts, function(err, results) {
					if(err){
						CHAN.log.error(err.stack);
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
		});
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
			this.trakt.movieTrending(function(err, data){
				if (err){
				  CHAN.log.error('trakt.movieTrending error', err);  
				  callback({err: err.statusMessage});
				  return;
				}

				_this.parseMediaInfo(CHAN, data, null, null, {type: 'movie'}, function(new_data){
					callback(new_data);
				});
			});
		} else if(media_type === '-shows') {
			this.trakt.showTrending(function(err, data){
				if (err){
				  CHAN.log.error('trakt.showTrending error', err);  
				  callback({err: err.statusMessage});
				  return;
				}

				_this.parseMediaInfo(CHAN, data, null, null, {type: 'show'}, function(new_data){
					callback(new_data);
				});
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

		this.trakt.userWatching(ttv_nick, function(err, data) {
			if (err){
			  CHAN.log.error('trakt.userWatching error', err);  
			  callback({err: ('An error has occured: ' + err.statusCode)});
			  return;
			}

			if(data === undefined) {
				_this.trakt.userHistory(ttv_nick, function(err2, data2) {
					if (err){
					  CHAN.log.error('trakt.userHistory error', err2);  
					  callback({err: err.statusMessage});
					  return;
					} 

					if(data2.length > 0) {
						var media = data2[0];
						_this.parseMediaInfo(CHAN, media, irc_nick, ttv_nick, {now_watching: false}, callback);
					} else {
						CHAN.log.error(CHAN.t.highlight(irc_nick) + ' hasn\'t scrobbled any media yet.');
						callback({err: CHAN.t.highlight(irc_nick) + ' hasn\'t scrobbled any media yet.'});
					}
				});
			}
			else
			{
				var media = data;
				_this.parseMediaInfo(CHAN, media, irc_nick, ttv_nick, {now_watching: true}, callback);
			}
		});
	}
}


