var config = require('.././config.json');

var UntappdClient = require('node-untappd');

var f_untappd = new UntappdClient(true);
    f_untappd.setClientId(config.API.UNTAPPD.api_key);
    f_untappd.setClientSecret(config.API.UNTAPPD.secret);

var UTPD = exports.UTPD = function(){};

UTPD.prototype.parseBeerInfo = function(beer, irc_nick, untappd_nick, ww, callback) {
    //log.debug('parseBeerInfo:', beer);
    log.debug('parseBeerInfo: Entered function');

    if (!beer || !beer.response || !beer.response.checkins || !beer.response.checkins.items) {
        log.error('no beer data found');
        callback({'err': 'no beer data found'}); 
        return;
    } 

    //error, non-fatal
    //if(beer.statusCode) {
        //log.error(beer.statusCode + ': ' + beer.statusMessage);
        //callback({'err': beer.statusMessage});
        //return;
    //}
	var beer_info = {
		irc_nick:   irc_nick,
		beer_name:  '',
		beer_style: '',
		beer_abv:   '',
		brewery:    '',
		venue:      ''
	};

	var beers = beer.response.checkins.items.forEach(function(checkin){
		//log.warn('commands -> ut -> userFeed -> checkin: ' + JSON.stringify(checkin));

		beer_info.irc_nick   = checkin.user.user_name;
		beer_info.beer_name  = checkin.beer.beer_name;
		beer_info.beer_style = checkin.beer.beer_style;
		beer_info.beer_abv   = checkin.beer.beer_abv;
		beer_info.brewery    = checkin.brewery.brewery_name;
		if (checkin.venue.venue_name !== '') {
			beer_info.venue = checkin.venue.venue_name;
		}
	});

	callback(beer_info);
};

UTPD.prototype.getBeer = function(irc_nick, untappd_nick, ww, callback) {
    var _this = this;
    var lc_untappd_nick = untappd_nick.toLowerCase();

    log.debug('getBeer: entered function');

    f_untappd.userActivityFeed(function(err, obj) {
        log.debug('getBeer -> userActivityFeed: entered function');
        if (err){
          log.error('f_untappd.userActivityFeed error', err);  
          callback({'err': err.statusMessage});
          return;
        } else {
        
        log.debug('getBeer -> userActivityFeed -> obj: ' + JSON.stringify(obj));
		_this.parseBeerInfo(obj, irc_nick, lc_untappd_nick, ww, callback);
	}
    }, lc_untappd_nick);
};
