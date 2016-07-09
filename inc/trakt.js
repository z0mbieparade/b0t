var config = require('.././config.json');

var Trakt = require('trakt-api'),
    log = require('log-simple')(null, {debug: config.debug}),
    c = require('irc-colors');

var trakt = Trakt(config.API.TraktTV.api_key, {noReject: true});

var TTV = exports.TTV = function(){}

TTV.prototype.getTrending = function(media_type, callback)
{
    var _this = this;
    if(media_type !== 'movies' && media_type !== 'shows'){
        callback({'err': 'movies and shows are the only accepted parameters'}); 
        return;
    }

    if(media_type === 'movies'){
        trakt.movieTrending(function(err, data){
            if (err){
              log.error('trakt.movieTrending error', err);  
              callback({'err': err.statusMessage});
              return;
            }

            _this.parseMediaInfo(data, null, null, {type: 'movie'}, function(new_data){
                log.debug(new_data)
                callback(new_data);
            });
        });
    } else if(media_type === 'shows') {
        trakt.showTrending(function(err, data){
            if (err){
              log.error('trakt.showTrending error', err);  
              callback({'err': err.statusMessage});
              return;
            }

            _this.parseMediaInfo(data, null, null, {type: 'show'}, function(new_data){
                log.debug(new_data)
                callback(new_data);
            });
        });
    } 
};

TTV.prototype.parseMediaInfo = function(media, irc_nick, ttv_nick, merge_info, callback) {
   log.debug('parseMediaInfo:', media);
    if (!media){
        log.error('no media found');
        return callback({'err': 'no media found'}); 
    } 

    //error, non-fatal
    if(media.statusCode) {
        log.error(media.statusCode + ': ' + media.statusMessage);
        callback({'err': media.statusMessage});
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

TTV.prototype.getRecent = function(irc_nick, ttv_nick, callback) {
    var _this = this;

    trakt.userWatching(ttv_nick, function(err, data) {
        if (err){
          log.error('trakt.userWatching error', err);  
          callback({'err': err.statusMessage});
          return;
        }

        if(data.statusCode && data.statusCode !== 204) {
             var media = data;

            _this.parseMediaInfo(media, irc_nick, ttv_nick, {now_watching: true}, callback);

        //not currently watching anything, get history
        } else if(data.statusCode && data.statusCode === 204) {
            trakt.userHistory(ttv_nick, function(err2, data2) {
                if (err){
                  log.error('trakt.userHistory error', err2);  
                  callback({'err': err.statusMessage});
                  return;
                } 

                log.debug(data2)

                if(data2.length > 0) {
                    var media = data2[0];
                    _this.parseMediaInfo(media, irc_nick, ttv_nick, {now_watching: false}, callback);
                } else {
                    log.error(c.bold(irc_nick) + ' hasn\'t scrobbled any media yet.');
                    callback({'err': c.bold(irc_nick) + ' hasn\'t scrobbled any media yet.'});
                }
            });
        }
        else
        {
            var media = data;
            _this.parseMediaInfo(media, irc_nick, ttv_nick, {now_watching: true}, callback);
        }
    });
}

