var didYouMean = require('didyoumean2'),
	request = require('request');

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
	cloudy: "🌥",

	'01d': "🌞",
	'01n': "🌞",
	'02d': "🌤",
	'02n': "🌤",
	'03d': "🌥",
	'03n': "🌥",
	'04d': "🌥",
	'04n': "🌥",
	'09d': "🌧",
	'09n': "🌧",
	'10d': "🌧",
	'10n': "🌧",
	'11d': "⛈",
	'11n': "⛈",
	'13d': "🌨",
	'13n': "🌨",
	'50d': "🌫",
	'50n': "🌫"
};

var nice_weather = 
{
	'Thunderstorm': ['& thunderstorms', '& thunderstormy', '& thunderstorms', '& thunderstorms'],
	'Drizzle': ['& drizzle', '& drizzly', '& drizzly', '& drizzling'],
	'Rain': ['& rain', '& rainy', '& rainy', '& rain'],
	'Snow': ['& snow', '& snowy', '& snowy', '& snow'],
	'Clear': ['& clear skies', '& clear', '& clear', '& clear skies'],
	'Clouds': ['& clouds', '& cloudy', '& cloudy', '& clouds'],
	'Smoke': ['& smoke', '& smokey', '& smokey', 'buy a respirator or leave ffs'],
	'Fog': ['& fog', '& foggy', '& foggy', 'you ever had pea soup? like that'],
	'Ash': ['& ash', '& ashy', '& just ashy', 'did you make the wrong sacrafice to the volcano?'],
	'Sand': ['& sand', '& sandy', '& sandy', 'did you climb into a litter box or what'],
	'Squall': ['& squalls', '& squally', '& squallish', 'batten down the hatches'],
	'Tornado': ['& a tornado', '& tornado-y', '& a tornado', 'hang on tight to Toto, Dorthy'],
	'*': ['& *', '& *y', '& *', '& *']
}

var nice_weather_description = 
[
	['a smidge of', 'a bit of', 'a little', 'scattered'],
	['some what', 'kind of', 'passably'],
	['mostly', 'moderately', 'rather', 'quite'],
	['continuous', 'perpetual', 'ongoing', 'nonstop', 'endless']
];

var wind_dir = {
	North: '↑',
	NE: '↗',
	NNE: '↑↗',
	ENE: '→↗',
	East: '→',  
	ESE: '→↘',
	SE: '↘',
	SSE: '↓↘',
	South: '↓',
	SSW: '↙↓',
	SW: '↙',
	WSW: '↙←',
	West: '←',
	WNW: '↖←',
	NW: '↖',
	NNW: '↖↑',
	Variable: '↔',
	Calm: ''
};

var weekday_short = [
	'Sun', 'Mon', 'Tues', 'Wed', 'Thu', 'Fri', 'Sat'
];

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

module.exports = class WU{

	get_url(method, send_data)
	{
		if(config.API.openweathermap)
		{
			this.get_url_openweathermap(method, send_data);
		} 
		else if(config.API.wunderground)
		{
			this.get_url_wunderground(method, send_data);
		}
	}

	get_url_wunderground(method, send_data, skip_try_other){
		var _this = this;
		if(method === 'weather') method = 'conditions';

		var url = 'http://api.wunderground.com/api/' + config.API.wunderground.key + '/' + method + '/q/' + send_data.location + '.json';

		console.log(url);

		request({url: url, followRedirect: false}, function (error, response, body) {
			if(error){
				b.log.error('Error:', error);

				if(config.API.openweathermap && config.API.openweathermap.key && !skip_try_other)
				{
					_this.get_url_openweathermap(method, send_data, true);
				}
				else if(send_data.handlers.error)
				{
					send_data.handlers.error(error);
				}
			} else if(response.statusCode !== 200){
				b.log.error('Invalid Status Code Returned:', response.statusCode);

				if(config.API.openweathermap && config.API.openweathermap.key && !skip_try_other)
				{
					_this.get_url_openweathermap(method, send_data, true);
				}
				else if(send_data.handlers.error)
				{
					send_data.handlers.error(error);
				}
			} else {
				var json_parse = JSON.parse(body);
				if(json_parse.error) b.log.error('Error:', json_parse.message);

				send_data.handlers.success(json_parse, 'wunderground');
			}
		});
	}

	get_url_openweathermap(method, send_data, skip_try_other){
		var _this = this;
		if(send_data.location.match(/^\d{5}(-{0,1}\d{4})?$/)) //US zipcode
		{
			var location = 'zip=' + send_data.location + ',us';
		}
		else if(send_data.location.match(/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i)) //CAN postal code
		{
			var location = 'zip=' + send_data.location.replace(/\W+/g, '') + ',ca';
		}
		else //we'll assume it's a city 
		{
			var location = 'q=' + send_data.location.replace(/,\s+/gm, ',');
		}

		if(method === 'conditions') method = 'weather';

		var url = 'http://api.openweathermap.org/data/2.5/' + method + '?' + location + '&units=imperial&appid=' + config.API.openweathermap.key

		console.log(url);

		request({url: url, followRedirect: false}, function (error, response, body) {
			if(error){
				b.log.error('Error:', error);

				if(config.API.wunderground && config.API.wunderground.key && !skip_try_other)
				{
					_this.get_url_wunderground(method, send_data, true);
				}
				else if(send_data.handlers.error)
				{
					send_data.handlers.error(error);
				}
			} else if(response.statusCode !== 200){
				var json_parse = JSON.parse(body);
				var msg = json_parse.message ? json_parse.message : 'invalid status code';

				b.log.error(response.statusCode, msg);
				
				if(config.API.wunderground && config.API.wunderground.key && !skip_try_other)
				{
					_this.get_url_wunderground(method, send_data, true);
				}
				else if(send_data.handlers.error)
				{
					send_data.handlers.error({err: msg});
				}
			} else {
				var json_parse = JSON.parse(body);
				send_data.handlers.success(json_parse, 'openweathermap');
			}
		});
	}

	get_url_timezonedb(send_data){
		var _this = this;

		if(!config.API.timezonedb || !config.API.timezonedb.key) return;
		
		var url = 'http://api.timezonedb.com/v2.1/get-time-zone?key=' + config.API.timezonedb.key + '&format=json&by=position&lat=' + send_data.latitude + '&lng=' + send_data.longitude

		console.log(url);

		request({url: url, followRedirect: false}, function (error, response, body) {
			if(error){
				b.log.error('Error:', error);
				send_data.handlers.error(error);
			} else if(response.statusCode !== 200){
				b.log.error('Invalid Status Code Returned:', response.statusCode);
				send_data.handlers.error(error);
			} else {
				var json_parse = JSON.parse(body);
				send_data.handlers.success(json_parse, 'timezonedb');
			}
		});
	}

	set_location(loc, irc_nick, callback) {
		this.get_weather(loc, irc_nick, callback, true);
	};

	get_weather(loc, irc_nick, callback, timezonedb) {
		var _this = this;
		_this.get_url('conditions', {
			location: loc,
			handlers: {
				success: function(res, api) {
					if(res.response && res.response.error){
						callback({'err': res.response.error.description});
					}
					else if(res.current_observation){
						var data = res.current_observation;
						data.irc_nick = irc_nick;
						data.conditions = symbols[data.icon] + ' ' + data.weather;

						callback(data);
					} else if (res.response && res.response.results) {
						var w_obj = {};
						var w_name_list = [];
						res.response.results.forEach(function(res){
							res.name_string = res.city + ', ' + res.state + ' ' + res.country_name;
							w_name_list.push(res.name_string);
							w_obj[res.l] = res;
						});
						var closest = didYouMean(loc, w_name_list);

						var ret_obj = Object.keys(w_obj)[0];
						for(var l in w_obj){
							if(w_obj[l].name_string === closest)
							{
								ret_obj = w_obj[l];
								break;
							}
						}

						b.log.debug(w_name_list, 'didumean', loc, closest, ret_obj);

						_this.get_weather(ret_obj.l, irc_nick, callback);
					}
					else if(res.main)
					{
						var data = res.main;
						data.irc_nick = irc_nick;
						data.icon = res.weather[0].icon;
						data.weather = res.weather[0].description;
						data.conditions = symbols[res.weather[0].icon] + ' ' + res.weather[0].description;
						data.feelslike_f = res.main.feels_like;
						data.feelslike_c = (res.main.feels_like - 32) * 5/9;
						data.temp_f = res.main.temp;
						data.temp_c = (res.main.temp - 32) * 5/9;
						data.location = res.name;
						data.country = res.sys.country;
						data.local_tz_offset = res.timezone;
						data.wind_mph = res.wind.speed;
						data.wind_deg = res.wind.deg === undefined ? null : res.wind.deg;
						data.display_location = {
							latitude: res.coord.lat,
							longitude: res.coord.lon,
							full: res.name + ' ' + res.sys.country
						};

						data.wind_dir = 'Calm';
						if(data.wind_deg !== null)
						{
							for(var i = 0; i < 16; i++){
								if(i === 0 && (res.wind.deg >= 348.75 || res.wind.deg < 11.25)){
									data.wind_dir = Object.keys(wind_dir)[i];
									break;
								} else if(i > 0) {
									var min = 11.25 + (22.5 * (i - 1));
									var max = 11.25 + (22.5 * i);

									if(res.wind.deg >= min && res.wind.deg < max){
										data.wind_dir = Object.keys(wind_dir)[i];
										break;
									}
								}
							}
						}

						if(timezonedb && config.API.timezonedb && config.API.timezonedb.key)
						{
							_this.get_url_timezonedb({
								latitude: res.coord.lat,
								longitude: res.coord.lon,
								handlers: {
									success: function(tz_res)
									{
										data.local_tz_short = tz_res.abbreviation;
										data.local_tz = tz_res.zoneName;

										callback(data);
									},
									error: function(err)
									{
										b.log.error(err);
										callback(data);
									}
								}
							})
						}
						else
						{
							callback(data);
						}
					}
				},
				error: function(err) {
					b.log.error(err);
					callback({'err': (err && err.err ? err.err : 'An error has occured.')});
				}
			}
		});
	}

	weather_tbl(d, CHAN)
	{
		return {
			user_hidden: d.irc_nick,
			location: d.display_location.full,
			temp: parseInt(d.temp_f) + 'F (' + parseInt(d.temp_c) + 'C)',
			temp_f_hidden: d.temp_f,
			feels: parseInt(d.feelslike_f) + 'F (' + parseInt(d.feelslike_c) + 'C)',
			feels_f_hidden: d.feelslike_f,
			wind: d.wind_string === 'Calm' ? 'Calm ' + d.wind_dir : Math.round(d.wind_mph) + 'mph ' + d.wind_dir,
			wind_hidden: Math.round(d.wind_mph),
			hum: d.humidity ? d.humidity : d.relative_humidity.slice(0, -1) + '%',
			humid_hidden: d.humidity ? d.humidity : d.relative_humidity.slice(0, -1),
			lat_hidden: d.display_location.latitude,
			long_hidden: d.display_location.longitude,
			conditions: d.conditions
		};
	}

	weather_str(d, CHAN){
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
			score_str: d.wind_string === 'Calm' ? 'Calm ' + wind_dir[d.wind_dir] : Math.round(d.wind_mph) + 'mph ' + wind_dir[d.wind_dir], 
			colors: wind_colors, 
			config: CHAN.config});
		str += ' Humidity: ' + x.score(d.humidity ? +d.humidity : +d.relative_humidity.slice(0, -1), {
			colors: temp_colors, 
			ignore_perc: true,
			end:'%', 
			config: CHAN.config
		});

		return str;
	}

	get_forecast(loc, loc_name, irc_nick, callback) {
		var location = loc_name;
		var _this = this;
		var _this = this;
		_this.get_url('forecast', {
			location: loc,
			handlers: {
				success: function(res, api) {
					if(res.response && res.response.error){
						callback({'err': res.response.error.description});
					}
					else if(res.forecast && res.forecast.simpleforecast && res.forecast.simpleforecast.forecastday){
						var data = {
							days: res.forecast.simpleforecast.forecastday,
							irc_nick: irc_nick,
							location: location
						}

						callback(data);
					} else if (res.response && res.response && res.response.results) {
						var w_obj = {};
						res.response.results.forEach(function(res){
							w_obj[res.l] = res;
						});

						var loc_name = w_obj[Object.keys(w_obj)[0]].city + ', ' + (w_obj[Object.keys(w_obj)[0]].state ? w_obj[Object.keys(w_obj)[0]].state + ' ' : '') + w_obj[Object.keys(w_obj)[0]].country_name;

						_this.get_forecast(Object.keys(w_obj)[0], loc_name, irc_nick, callback);
					}
					else if(res.list)
					{
						var data = {
							irc_nick: irc_nick,
							location: res.city.name + ' ' + res.city.country,
							days: {}
						};

						res.list.forEach(function(item)
						{
							var date = item.dt_txt.split(' ')[0];
							var time = item.dt_txt.split(' ')[1];

							var high = {
								fahrenheit: item.main.temp_max,
								celsius: (item.main.temp_max - 32) * 5/9,
							}

							var low = {
								fahrenheit: item.main.temp_min,
								celsius: (item.main.temp_min - 32) * 5/9,
							}

							if(data.days[date])
							{
								data.days[date].high.fahrenheit = high.fahrenheit > data.days[date].high.fahrenheit ? high.fahrenheit : data.days[date].high.fahrenheit;
								data.days[date].high.celsius = high.celsius > data.days[date].high.celsius ? high.celsius : data.days[date].high.celsius;

								data.days[date].low.fahrenheit = low.fahrenheit < data.days[date].low.fahrenheit ? low.fahrenheit : data.days[date].low.fahrenheit;
								data.days[date].low.celsius = low.celsius < data.days[date].low.celsius ? low.celsius : data.days[date].low.celsius;

								data.days[date].all_icons += symbols[item.weather[0].icon];

								data.days[date].main_counts[item.weather[0].main] = data.days[date].main_counts[item.weather[0].main] ? data.days[date].main_counts[item.weather[0].main] + 1 : 1;
							}
							else
							{
								var day = new Date(date);

								data.days[date] = {
									date: {
										date: date,
										weekday_short: weekday_short[day.getDay()]
									},
									high: high,
									low: low,
									humidities: [],
									avehumidity: item.main.humidity,

									icons: {},
									all_icons: symbols[item.weather[0].icon],

									mains: {},
									main_counts: {},
									conds: [item.weather[0].main],
									conditions: item.weather[0].main.toLowerCase(),
								}

								
								data.days[date].main_counts[item.weather[0].main] = 1;
							}

							data.days[date].humidities.push(item.main.humidity);
							data.days[date].icons[time] = item.weather[0].icon;
							data.days[date].mains[time] = item.weather[0].main;
						})

						for(var date in data.days)
						{
							var day = data.days[date];

							var sum = day.humidities.reduce((p, c) => c += p);
							day.avehumidity = Math.round(sum / day.humidities.length);

							day.conditions = '';

							var mc = 1;
							var len = Object.keys(day.main_counts).length;
							var total_counts = Object.values(day.main_counts).reduce((p, c) => c += p);
							var count_step = total_counts / 4;

							for(var m in day.main_counts)
							{
								var cond = '';

								for(var k = 0; k < 4; k++)
								{
									if(day.main_counts[m] >= (count_step * k) && 
										(k < 3 && day.main_counts[m] < (count_step * (k + 1)) || k === 3 && day.main_counts[m] <= total_counts))
									{
										if(nice_weather[m] && nice_weather[m][k]){
											cond = nice_weather[m][k]
										} else {
											cond = nice_weather['*'][k]
										}

										break;
									}
								}

								
								
								var desc = x.rand_arr(nice_weather_description[k]);
								cond = cond.replace('&', desc).replace('*', m.toLowerCase());

								day.conditions += cond;

								if(len > 1)
								{
									if(mc < len - 1)
									{
										day.conditions += ', ';
									}
									else if(mc < len)
									{
										day.conditions += ' and ';
									}
								}

								mc++;
							};
						}

						callback(data);
					}
				},
				error: function(err) {
					b.log.error(err);
					callback({'err': 'An error has occured.'});
				}
			}
		});
	}

	forecast_str(d, CHAN, hide_day){
		var str = (hide_day ? '' : CHAN.t.term(d.date.weekday_short) + ': ') + (d.all_icons ? d.all_icons : symbols[d.icon]) + ' ' + d.conditions + ' ';
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
}