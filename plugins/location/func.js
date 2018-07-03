var wunderbar = require('wunderbar'),
    weather = new wunderbar(config.API.weather.key);

var WU = exports.WU = function(){}

var symbols = {
    chanceflurries: "🌨",
    chancerain: "🌧",
    chancesleet: "🌨",
    chancesnow: "🌨",
    chancetstorms: "⛈",
    clear: "🌞",
    flurries: "🌨",
    fog: "🌫",
    hazy: "",
    mostlycloudy: "🌥",
    mostlysunny: "🌤",
    partlycloudy: "⛅",
    partlysunny: "⛅",
    sleet: "🌨🌧",
    rain: "🌧",
    snow: "🌨",
    sunny: "🌞",
    tstorms: "⛈",
    cloudy: "🌥"
};

var wind_dir = {
    East: '→',  
    ENE: '→↗',
    ESE: '→↘',
    NE: '↗',
    NNE: '↑↗',
    NNW: '↖↑',
    North: '↑',
    NW: '↖',
    SE: '↘',
    South: '↓',
    SSE: '↓↘',
    SSW: '↙↓',
    SW: '↙',
    West: '←',
    WNW: '↖←',
    WSW: '↙←',
    Variable: '↔'
};

var temp_colors = [
    {'%':100, c:'red'},
    {'%':70, c:'olive'},
    {'%':45, c:'teal'}
];
var wind_colors = [
    {'%':100, c:'red'},
    {'%':30, c:'brown'}, 
    {'%':20, c:'olive'}, 
    {'%':10, c:'green'}, 
    {'%':2, c:'teal'}
];

WU.prototype.set_location = function(loc, irc_nick, callback) {
    this.get_weather(loc, irc_nick, callback);
};

WU.prototype.get_weather = function(loc, irc_nick, callback) {
    var _this = this;
    weather.conditions(loc, function(err, res) {
        if(err) {
            b.log.error(err);
            callback({'err': 'An error has occured.'});
        } else {
            if(res.response.error){
                callback({'err': res.response.error.description});
            }
            else if(res.current_observation){
                var data = res.current_observation;
                data.irc_nick = irc_nick;
                data.conditions = symbols[data.icon] + ' ' + data.weather,

                callback(data);
            } else if (res.response.results) {

                var w_obj = {};
                res.response.results.forEach(function(res){
                    w_obj[res.l] = res;
                });

                _this.get_weather(Object.keys(w_obj)[0], irc_nick, callback);
            }
        }
    });
}

WU.prototype.weather_str = function(d, CHAN){
    b.log.debug(d);
    var str = CHAN.t.highlight(d.display_location.full) + ': ' + symbols[d.icon] + ' ' + d.weather + ' ';
    str += x.score(d.temp_f, {
        score_str: parseInt(d.temp_f) + '°F (' + parseInt(d.temp_c) + '°C)', 
        colors: temp_colors, 
        max: 105, 
        min: -5, 
        config: CHAN.config});
    str += ' Feels like: ' + x.score(d.feelslike_f, {
        score_str: parseInt(d.feelslike_f) + '°F (' + parseInt(d.feelslike_c) + '°C)', 
        colors: temp_colors, 
        max: 105, 
        min: -5, 
        config: CHAN.config});

    str += ' Wind: ' + x.score(d.wind_mph, {
        score_str: d.wind_string === 'Calm' ? 'Calm ' + wind_dir[d.wind_dir] : d.wind_mph + 'mph ' + wind_dir[d.wind_dir], 
        colors: wind_colors, 
        config: CHAN.config});
    str += ' Humidity: ' + x.score(+d.relative_humidity.slice(0, -1), {
        colors: temp_colors, 
        ignore_perc: true,
        end:'%', 
        config: CHAN.config
    });

    return str;
}

WU.prototype.get_forecast = function(loc, loc_name, irc_nick, callback) {
    var location = loc_name;
    var _this = this;
    weather.forecast(loc, function(err, res) {

    b.log.debug(loc, location, irc_nick);

        if(err) {
            b.log.error(err);
            callback({'err': 'An error has occured.'});
        } else {
            if(res.response.error){
                callback({'err': res.response.error.description});
            }
            else if(res.forecast && res.forecast.simpleforecast && res.forecast.simpleforecast.forecastday){
                var data = {
                    days: res.forecast.simpleforecast.forecastday,
                    irc_nick: irc_nick,
                    location: location
                }

                callback(data);
            } else if (res.response.results) {
                var w_obj = {};
                res.response.results.forEach(function(res){
                    w_obj[res.l] = res;
                });

                var loc_name = w_obj[Object.keys(w_obj)[0]].city + ', ' + (w_obj[Object.keys(w_obj)[0]].state ? w_obj[Object.keys(w_obj)[0]].state + ' ' : '') + w_obj[Object.keys(w_obj)[0]].country_name;

                _this.get_forecast(Object.keys(w_obj)[0], loc_name, irc_nick, callback);
            }
        }
    });
}

WU.prototype.forecast_str = function(d, CHAN, hide_day){
    var str = (hide_day ? '' : CHAN.t.term(d.date.weekday_short) + ': ') + symbols[d.icon] + ' ' + d.conditions + ' ';
    str += x.score(d.high.fahrenheit, {
        score_str: '⬆' + parseInt(d.high.fahrenheit) + '°F (' + parseInt(d.high.celsius) + '°C)', 
        colors: temp_colors, 
        max: 105, 
        min: -5, 
        config: CHAN.config
    });
    str += ' ' + x.score(d.low.fahrenheit, {
        score_str: '⬇' + parseInt(d.low.fahrenheit) + '°F (' + parseInt(d.low.celsius) + '°C)', 
        colors: temp_colors, 
        max: 105, 
        min: -5, 
        config: CHAN.config
    });
    str += ' ' + x.score(d.avehumidity, {
        score_str: d.avehumidity + '% avr humidity', 
        colors: temp_colors, 
        config: CHAN.config
    });

    return str;
}