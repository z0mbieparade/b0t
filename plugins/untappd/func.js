module.exports = class UTPD{
	get_url(method, callback)
	{
		var url = 'https://api.untappd.com/' + method + '?client_id=';
			  url += config.API.untappd.key + '&client_secret=' + config.API.untappd.secret;

		x.get_url(url, 'json', callback)
	}

	parse_beer_info(CHAN, beer, irc_nick, untappd_nick, ww, callback) {
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

	get_beer(CHAN, irc_nick, untappd_nick, ww, callback) {
		var _this = this;
		var lc_untappd_nick = untappd_nick.toLowerCase();

		this.get_url('v4/user/checkins/' + lc_untappd_nick, function(data)
		{
			if (data.err){
				CHAN.log.error('untappd', data);
				return callback(data);
			} else {
				_this.parse_beer_info(CHAN, data, irc_nick, lc_untappd_nick, ww, callback);
			}
		});
	}
}
