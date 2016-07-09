var config = require('.././config.json');

var wunderbar = require('wunderbar'),
    log = require('log-simple')(null, {debug: config.debug}),
    c = require('irc-colors');

var weather = new wunderbar(config.API.Weather.api_key);

var WU = exports.WU = function(){}

WU.prototype.set_location = function(loc, nick, callback, set_loc) {
    this.get_weather(loc, nick, callback, true);
};

WU.prototype.get_weather = function(loc, nick, callback, set_loc) {
    weather.conditions(loc, function(err, res) {
        if(err) {
            log.error(err);
            callback({'err': ''});
        } else {
            if(res.response.error)
            {
                callback({'err': res.response.error.description});
            }
            else if(res.current_observation)
            {
                var say_weather = function()
                {
                    log.debug(res.current_observation);

                    var data = {
                        irc_nick: nick,
                        location: res.current_observation.display_location.full,
                        weath: res.current_observation.weather,
                        temp: res.current_observation.temperature_string,
                        humid: res.current_observation.relative_humidity,
                        icon: res.current_observation.icon
                    }

                    callback(data);
                }

                if(set_loc)
                {
                    var loc_set = res.current_observation.display_location.zip !== '00000' ? 
                        res.current_observation.display_location.zip : res.current_observation.display_location.full;
                    
                    callback({location: loc_set, irc_nick: nick});

                } else {
                    say_weather()
                }
            } else if (res.response.results) {
                callback({'err': 'There are ' + res.response.results.length + ' locations with that name. Please be more specific.'});
            }
        }
    });
}