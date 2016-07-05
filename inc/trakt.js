var config = require('.././config.json');

var Trakt = require('trakt-api'),
    log = require('log-simple')(null, {debug: config.debug}),
    c = require('irc-colors');

var trakt = Trakt(config.API.TraktTV.api_key, {noReject: true});

var TTV = exports.TTV = function(){}

TTV.prototype.parseMediaInfo = function(media, irc_nick, ttv_nick, ww, callback) {
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

    var media_info = {
        irc_nick: irc_nick,
        title: '',
        year: '',
        type: media.type
    };
    switch(media.type)
    {
        case 'episode':
            var title = [];
            if(media.show.title) title.push(media.show.title);
            if(media.episode.title) title.push(media.episode.title);

            var season = media.season ? media.season : media.episode.season;
            var episode = media.number ? media.number : media.episode.number;

            var SE = 'S' + (season < 10 ? '0' + season : season);
            SE += 'E' + (episode < 10 ? '0' + episode : episode);

            title.push(SE);

            media_info.title = title.join(' - ');
            media_info.year = media.show.year;
            break;

        case 'movie':
            media_info.title = media.movie.title;
            media_info.year = media.movie.year;
            break;

        default:
            media_info = media;
            break;
    }
    
    callback(media_info);
};

TTV.prototype.getRecent = function(irc_nick, ttv_nick, ww, callback) {
    var _this = this;

    trakt.userWatching(ttv_nick, function(err, data) {
        if (err){
          log.error('trakt.userWatching error', err);  
          callback({'err': ''});
          return;
        }

        if(data.statusCode && data.statusCode !== 204) {
            _this.parseMediaInfo(data, irc_nick, ttv_nick, ww, callback);

        //not currently watching anything, get history
        } else if(data.statusCode && data.statusCode === 204) {
            trakt.userHistory(ttv_nick, function(err2, data2) {
                if (err){
                  log.error('trakt.userHistory error', err2);  
                  callback({'err': ''});
                  return;
                } 

                if(data2.length > 0) {
                    var media = data2[0];
                    media.now_watching = false;
                    _this.parseMediaInfo(media, irc_nick, ttv_nick, ww, callback);
                } else {
                    log.error(c.bold(irc_nick) + ' hasn\'t scrobbled any media yet.');
                    callback({'err': c.bold(irc_nick) + ' hasn\'t scrobbled any media yet.'});
                }
            });
        }
        else
        {
            var media = data;
            media.now_watching = true;

            _this.parseMediaInfo(media, irc_nick, ttv_nick, ww, callback);
        }
    });
}

