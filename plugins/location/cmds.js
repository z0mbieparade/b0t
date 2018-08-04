var info = {
	name: 'Location',
	about: 'commands based on location'
}
exports.info = info;

if(config.API.weather && config.API.weather.key !== '') {
	var Weather = require(__dirname + '/func.js'),
		wu = new Weather(),
		cluster = require('hierarchical-clustering');
} else {
	b.log.warn('Missing Weather API key!');
}

var cmds = {
	w: {
		action: "get current weather (if no zip or city/state is used, attempts to get weather for your registered location)",
		params: [{
			optional: true,
			or: [{
				name: 'zip',
				type: 'text',
				key: 'location'
			},{
				name: 'city, state',
				type: 'text',
				key: 'location'
			}]
		}],
		API: ['weather'],
		register: "location",
		func: function(CHAN, USER, say, args, command_string){
			if(args.location === undefined) {
				b.users.get_user_data(USER, {col: 'location'}, function(user_data){
					if(user_data.err) return say(user_data, 2);
						x.get_cache('/nicks/' + USER.nick + '/cache/wa', function(d){
							say('Weather for ' + wu.weather_str(d, CHAN), 1);
						}, function(){
							wu.get_weather(user_data, USER.nick, function(d){
								if(d.err) return say(d);

								x.add_cache('/nicks/' + d.irc_nick + '/cache/wa', d, 900000, d.irc_nick);

								say('Weather for ' + wu.weather_str(d, CHAN), 1);

								//after we update all the locations, will depricate this
								b.users.update_user(USER.nick, {
									offset: d.local_tz_offset, 
									timezone: d.local_tz_short,
									display_location: d.display_location.full,
									lat: d.display_location.latitude,
									long: d.display_location.longitude

								}, function(msg){
									CHAN.log.debug(msg);
								});
							});
						}, USER.nick);
				});
			} else {
				wu.get_weather(args.location, USER.nick, function(d){
					if(d.err) return say(d);

					say('Weather for ' + wu.weather_str(d, CHAN), 1);
				});
			}
		}
	},
	f: {
		action: "get weather forecast (if no zip or city/state is used, attempts to get forecast for your registered location)",
	   params: [{
			optional: true,
			name: 'long',
			type: 'flag'
		},{
			optional: true,
			or: [{
				name: 'zip',
				type: 'text',
				key: 'location'
			},{
				name: 'city, state',
				type: 'text',
				key: 'location'
			}]
		}],
		API: ['weather'],
		register: "location",
		func: function(CHAN, USER, say, args, command_string){

			function make_forecast(d, location){
				var data = [];
				if(args.long !== undefined){
					data.push('Forecast for ' + CHAN.t.highlight(location) + ':');
					var add_to_prev = false;
					for(var day in d.days){
						if(add_to_prev === false){
							data.push(wu.forecast_str(d.days[day], CHAN));
							add_to_prev = true;
						} else {
							data[data.length - 1] += ' | ' + wu.forecast_str(d.days[day], CHAN);
							add_to_prev = false;
						}
					}
				} else {
					data = 'Today\'s forecast for ' + CHAN.t.highlight(location) + ': ';
					data += wu.forecast_str(d.days[0], CHAN, true);
				}
			   
				say(data, {join: '\n', lines: 5, force_lines: true});
			}

			if(args.location === undefined) {
				b.users.get_user_data(USER, {col: 'location', return_all: true}, function(location, user_data){
					if(location.err) return say(location, 2);

					x.get_cache('/nicks/' + USER.nick + '/cache/f', function(d){
						make_forecast(d, user_data.display_location ? user_data.display_location : user_data.location);
					}, function(){

						wu.get_forecast(location, location, USER.nick, function(d){
							if(d.err) return say(d);

							x.add_cache('/nicks/' + d.irc_nick + '/cache/f', d, 900000, d.irc_nick);
							make_forecast(d, user_data.display_location ? user_data.display_location : user_data.location);

						});
					}, USER.nick);
				});
			} else {
				wu.get_forecast(args.location, args.location, USER.nick, function(d){
					if(d.err) return say(d);
					make_forecast(d, d.location);
				});
			}
		}
	},
	wa: {
		action: 'get weather for all users in current chan',
		API: ['weather'],
		no_pm: true,
		discord: false,
		spammy: true,
		func: function(CHAN, USER, say, args, command_string){
			CHAN.get_all_users_in_chan_data({no_highlight: false, col: 'location', label: 'Location'}, function(data){
				var say_data = [];

				let requests = (Object.keys(data)).map((loc) => {
					return new Promise((resolve) => {
						x.get_cache('/nicks/' + data[loc] + '/cache/wa', function(d){
							say_data.push(wu.weather_tbl(d, CHAN));
							resolve();
						}, function(){
							wu.get_weather(loc, data[loc], function(d){
								if(d.err) {
									CHAN.log.error(d.err);
								} else {
									x.add_cache('/nicks/' + d.irc_nick + '/cache/wa', d, 900000, d.irc_nick);
									say_data.push(wu.weather_tbl(d, CHAN));
								}

								resolve();
							});
						}, data[loc]);
					});
				});

				Promise.all(requests).then(() => { 

					// Euclidean distance 
					function distance(a, b) {
					  var d = Math.pow(a.long_hidden - b.long_hidden, 2);
					  d += Math.pow(a.lat_hidden - b.lat_hidden, 2);
					  return Math.sqrt(d);
					}
					 
					// Single-linkage clustering 
					function linkage(distances) {
					  return Math.min.apply(null, distances);
					}
					 
					var levels = cluster({
					  input: say_data,
					  distance: distance,
					  linkage: linkage,
					  minClusters: Math.round(Object.keys(data).length / 1.75)
					});
					 
					var clusters = levels[levels.length - 1].clusters;

					clusters = clusters.map(function (cluster) {
						return cluster.map(function (index) {
							return say_data[index];
						});
					});

					//we're gonna order these by the distance from the cluster the user that called the function is in
					for(var i = 0; i < clusters.length; i++){
						for(var j = 0; j < clusters[i].length; j++){
							if(clusters[i][j].user_hidden === USER.nick && i !== 0){ //move users that made call to top
								var a = clusters.splice(i,1);
								clusters.unshift(a[0]);
								break;
							}
						}
					}

					//get av lat/long so we can calculate distance of each cluster
					var av_long_lat = [];
					for(var i = 0; i < clusters.length; i++){
						var long = 0;
						var lat = 0;
						for(var j = 0; j < clusters[i].length; j++){
							long += +clusters[i][j].long_hidden;
							lat += +clusters[i][j].lat_hidden;
						}
						av_long_lat.push({
							id: i,
							long: long / clusters[i].length,
							lat: lat / clusters[i].length
						});
					}


					function calculateDistance(lat1, lon1, lat2, lon2, unit) {
						var radlat1 = Math.PI * lat1/180
						var radlat2 = Math.PI * lat2/180
						var radlon1 = Math.PI * lon1/180
						var radlon2 = Math.PI * lon2/180
						var theta = lon1-lon2
						var radtheta = Math.PI * theta/180
						var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
						dist = Math.acos(dist)
						dist = dist * 180/Math.PI
						dist = dist * 60 * 1.1515
						if (unit=="K") { dist = dist * 1.609344 }
						if (unit=="N") { dist = dist * 0.8684 }
						return dist
					}

					for ( i = 0; i < av_long_lat.length; i++) {
						av_long_lat[i]["distance"] = calculateDistance(
							av_long_lat[0]["lat"],
							av_long_lat[0]["long"],
							av_long_lat[i]["lat"],
							av_long_lat[i]["long"],"K");
					}

					av_long_lat.sort(function(a, b) { 
						return a.distance - b.distance;
					});

					var new_cluster = [];
					av_long_lat.map(function(obj, i){
						new_cluster.push(clusters[obj.id]);
					});

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

					say(new_cluster, {
						table: true, 
						table_opts: {
							header: true, 
							outline: false,
							full_width: ['location'],
							col_format: {
								location: function(row, cell){ 
									return CHAN.t.highlight(cell);
								},
								temp: function(row, cell){ 
									return x.score(row.temp_f_hidden, {
											score_str: cell, 
											colors: temp_colors, 
											max: 105, 
											min: -5, 
											config: CHAN.config})
								},
								feels: function(row, cell){ 
									return x.score(row.feels_f_hidden, {
											score_str: cell, 
											colors: temp_colors, 
											max: 105, 
											min: -5, 
											config: CHAN.config})
								},
								wind: function(row, cell){ 
									return x.score(row.wind_hidden, {
											score_str: cell, 
											colors: wind_colors, 
											config: CHAN.config
										});
								},
								hum: function(row, cell){
									return x.score(row.humid_hidden, {
											score_str: cell, 
											colors: temp_colors, 
											config: CHAN.config
										});
								}
							}
						}, 
						lines: 15, 
						force_lines: true
					});
				});

			});
		}
	},
	location: {
		action: "register your location with your irc nick",
		params: [{
			or: [{
				name: 'zip',
				type: 'text',
				key: 'location'
			},{
				name: 'city, state',
				type: 'text',
				key: 'location'
			}]
		}],
		registered: true,
		API: ['weather'],
		func: function(CHAN, USER, say, args, command_string){
			wu.set_location(args.location, USER.nick, function(d){
				if(d.err) return say(d);
				x.delete_cache('/nicks/' + USER.nick + '/cache/wa', USER.nick);
				x.delete_cache('/nicks/' + USER.nick + '/cache/f', USER.nick);
				var location = d.display_location.zip !== '00000' ?  d.display_location.zip : d.display_location.full
				b.users.update_user(USER.nick, {
					location: location, 
					offset: d.local_tz_offset, 
					timezone: d.local_tz_short,
					display_location: d.display_location.full,
					lat: d.display_location.latitude,
					long: d.display_location.longitude
				}, function(msg){
					say({succ: USER.nick + '\'s location has been updated'}, 2);
				});
			});
		}
	}
}
exports.cmds = cmds;
