var UntappdClient   = require('node-untappd'),
	f_untappd	   = new UntappdClient();

	f_untappd.setClientId(config.API.untappd.key);
	f_untappd.setClientSecret(config.API.untappd.secret);


module.exports = class UTPD{

	parseBeerInfo(CHAN, beer, irc_nick, untappd_nick, ww, callback) {
		if (!beer || !beer.response || !beer.response.checkins || !beer.response.checkins.items) {
			CHAN.log.error('no beer data found');
			callback({err: 'no beer data found'}); 
			return;
		} 

		var beer_info = {
			irc_nick:	irc_nick,
			beer_name:	'',
			beer_style:	'',
			beer_abv:	'',
			brewery:	'',
			venue:		'',
			date:		''
		};

		var beers = beer.response.checkins.items.forEach(function(checkin){

			beer_info.beer_name		= checkin.beer.beer_name;
			beer_info.beer_style	= checkin.beer.beer_style;
			beer_info.beer_abv		= checkin.beer.beer_abv;
			beer_info.brewery		= checkin.brewery.brewery_name;
			beer_info.date			= checkin.created_at;
			if (checkin.venue.venue_name !== '') {
				beer_info.venue = checkin.venue.venue_name;
			}
		});

		callback(beer_info);
	};

	getBeer(CHAN, irc_nick, untappd_nick, ww, callback) {
		var _this = this;
		var lc_untappd_nick = untappd_nick.toLowerCase();

		f_untappd.userActivityFeed(function(err, obj) {
			if (err){
				CHAN.log.error('f_untappd.userActivityFeed error', err);  
				callback({'err': err.statusMessage});
				return;
			} else {
			
			_this.parseBeerInfo(CHAN, obj, irc_nick, lc_untappd_nick, ww, callback);
		}
		}, lc_untappd_nick);
	};
}

