var request 	= require('request');
module.exports = class GI
{
	covid(CHAN, state, callback)
	{
		let canada = false;

		state = state ? state.toLowerCase() : null;

		let url = 'https://api.covidtracking.com/v1/us/daily.json';

		if(state)
		{
			if(state === 'can'){ //all of canada
				url = 'https://api.covid19tracker.ca/reports?fill_dates';
				canada = true;
		/*	} else if(state.match(/can,\s*\w{2}/)) { //canadian province idk api doesn't like this
				let prov = state.split(',')[1].trim();

				console.log(prov);*/
			} else { //us state
				url = 'https://api.covidtracking.com/v1/states/' + state + '/daily.json';
			}
		}

		function is_today(date)
		{
			let today = new Date();
			return date.getDate() === today.getDate() &&
						date.getMonth() == today.getMonth() &&
						date.getFullYear() == today.getFullYear();
		}

		x.get_url(url, 'json', function(res){

			let data = res;
			if(canada){
				if(res.data && res.data.length){
					data = res.data.reverse();
				} else {
					callback({err: 'No CAN COVID data available.'})
					return;
				}
			}

			console.log(data[0]);

			if(data.length && data.length > 7)
			{
				let d = {};
				let convert = {};
				let keys = [
					'fatalities',
					'hospitalizedCurrently',
					'hospitalizedCumulative',
					'inIcuCurrently',
					'inIcuCumulative',
					'positive',
					'recovered'
				]

				if(canada)
				{
					keys = [
						'total_fatalities',
						'total_hospitalizations',
						'total_criticals',
						'total_cases',
						'total_recoveries',
						'total_vaccinated'
					]

					convert = {
						total_fatalities: 'death',
						total_hospitalizations: 'hospitalizedCumulative',
						total_vaccinated: 'vaccinated',
						total_fatalities: 'positive',
						total_recoveries: 'recovered',
						total_criticals: 'inIcuCumulative'
					}
				}

				for(let i = 30; i >= 0; i--)
				{
					if(data[i])
					{
						if(!d.start)
						{
							let date = data[i].date + '';
							if(!date.match(/-/)){
								d.start = date.slice(0,4) + '-' + date.slice(4,6) + '-' + date.slice(6,8);
							} else {
								d.start = data[i].date;
							}
							d.start_date = new Date(d.start);

							d.is_today = is_today(d.start_date);
						}

						keys.forEach(function(key)
						{
							if(data[i][key] !== null && data[i][key] !== undefined)
							{
								d[key + '_arr'] = d[key + '_arr'] || {};
								d[key + '_arr'][i] = data[i][key];
							}
						})

						if(i === 0)
						{
							if(!d.end)
							{
								let date = data[i].date + '';
								if(!date.match(/-/)){
									d.end = date.slice(0,4) + '-' + date.slice(4,6) + '-' + date.slice(6,8);
								} else {
									d.end = data[i].date;
								}
								d.end_date = new Date(d.end);
							}
						}
					}
					else
					{
						break;
					}
				}

				keys.forEach(function(key)
				{
					let arr_key = key + '_arr';
					let d_key = convert[key] ? convert[key] : key;

					if(d[arr_key])
					{
						let days = Object.keys(d[arr_key]);
						d[d_key] = {
							today: d[arr_key][days[0]]
						}

						if(days.length > 1)
						{
							let today_i = days[0];
							let last_i = days[days.length - 1];
							let today_plus_6 = parseInt(today_i) + 6;
							let week_i = days.reduce(function(prev, curr)
							{
								return (Math.abs(parseInt(curr) - today_plus_6) < Math.abs(parseInt(prev) - today_plus_6) ? parseInt(curr) : parseInt(prev));
							});

							d[d_key].change_30 = d[arr_key][today_i] - d[arr_key][last_i];
							d[d_key].change_7 = d[arr_key][today_i] - d[arr_key][week_i];

							if(d[arr_key][0] && d[arr_key][1])
							{
								d[d_key].change_1 = d[arr_key][0] - d[arr_key][1];
							}
						}

						delete d[arr_key];
					}
				})

				console.log(d);
				callback(d);
			}
			else
			{
				callback({err: 'No COVID data available.'})
			}
		},{
			return_err: true
		})
	}

	cc(CHAN, data, callback)
	{
		let _this = this;
		if(config.API.coinmarketcap && config.API.coinmarketcap.key !== '')
		{
			var url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest';
			let i = 0;
			for(var key in data)
			{
				url += (i === 0 ? '?' : '&') + key + '=' + encodeURI(data[key]);
				i++;
			}

			x.get_url(url, 'json', function(d){
				if(d.err && d.err == 400 && data.slug !== undefined)
				{
					data.symbol = data.slug;
					delete data.slug;
					_this.cc(CHAN, data, callback);

				} else if(d.err){
					callback(d);
				} else if(d.status && d.status.error_message){
					callback({err: d.status.error_message});
				} else if(d.data && Object.keys(d.data).length){
					callback(d.data[Object.keys(d.data)[0]]);
				}
			}, {
				return_err: true,
				headers: {
					'X-CMC_PRO_API_KEY': config.API.coinmarketcap.key
				}
			});
		}
	}

	nu(CHAN, send_data){
		if(config.API.nutritionix && config.API.nutritionix.key !== '') {
			request.post({
				url: 'https://trackapi.nutritionix.com/v2/natural/nutrients',
				headers: {
					"Content-Type": "application/json",
					"x-app-id": config.API.nutritionix.app_id,
					"x-app-key": config.API.nutritionix.key
				},
				form: {
					query: send_data.query
				}
			}, function(error, response, body){
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
			})

		} else {
			b.log.warn('Missing Nutritionix API key!');
			if(send_data.handlers.error) send_data.handlers.error({err: 'Missing Nutritionix API key'});
		}
	};

	ddg(CHAN, search_string, callback){
		var _this = this;
		var url = 'https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=0&q=' + encodeURI(search_string);

		x.get_url(url, 'json', function(data){
			if (data.err){
				CHAN.log.error('ddg:', data.err);
				return callback({err: 'Something went wrong.'});
			}

			if(data.RelatedTopics.length < 1) return callback({err: 'Nothing found.'});

			try{
				var say_link = {
					title: data.Heading,
					href: data.AbstractURL,
					description: data.RelatedTopics[0].Text
				}

				var str = CHAN.t.highlight(CHAN.t.term('DDG:') + ' ' + say_link.title) + ' ' + say_link.description;
				callback(str, say_link.href);
			} catch(e) {
				CHAN.log.error('ddg', e);
				return say({err: 'Something went wrong.'});
			}
		})
	}

	na(CHAN, val, extra, perc){
		if(val === null || val === undefined || val.value === null || val.value === undefined){
			return extra ? CHAN.t.warn('-') : '-';
		} else {
			let ret = '';
			let col = false;
			let pre = '';


			if(Math.sign(val.value) === 0 || Math.sign(val) === -0){
				col = CHAN.t.warn;
				ret = val.value.toFixed(2);
			} else if(Math.sign(val.value) < 0){
				col = CHAN.t.fail;
				pre = '-';
				ret = Math.abs(val.value).toFixed(2);
			} else {
				col = CHAN.t.success;
				pre = '+';
				ret = val.value.toFixed(2);
			}

			ret = (ret + '').split('.');
			ret = (+ret[0]).toLocaleString() + '.' + ret[1] + (perc ? '%' : '');

			if(extra) ret = col(pre + ret);

			return ret;
		}
	}

	wr(CHAN, question, callback)
	{
		var interpretation = null;
		var total_lines = 0;
		var answer_arr = [];
		var url = null;

		var question = encodeURI(question);
		var get_url = "http://api.wolframalpha.com/v2/query?input=" + question + "&appid=" + config.API.wolframalpha.key + '&output=json';

		x.get_url(get_url, 'json', function(data){

			//console.log(require('util').inspect(data, true, 10));

			if(data.queryresult && !data.queryresult.error)
			{
				if(data.queryresult.numpods < 1)
				{
					callback({err: 'No Results Found'})
				}
				else
				{
					result_loop(data.queryresult.pods, 0);

					//console.log('interpretation', interpretation)
					//console.log(require('util').inspect(answer_arr, true, 10));

					if(answer_arr[0].text && answer_arr[0].text === '(data not available)')
					{
						callback({err: 'Data not available'});
					}
					else if(answer_arr.length > 0)
					{
						var line_count = 0;

						if(interpretation !== null)
						{
							line_count++;
							callback(CHAN.t.highlight(CHAN.t.term(interpretation)));
						}

						var say_arr = [];
						for(var i = 0; i < answer_arr.length; i++)
						{
							var answer = answer_arr[i];
							if(answer.text)
							{
								if(answer.title)
								{
									say_arr.push(CHAN.t.highlight(answer.title));
								}

								if(typeof answer.text === 'string')
								{
									say_arr.push(answer.text);
								}
								else
								{
									say_arr = say_arr.concat(answer.text);
								}

							} else {

								var table_arr = CHAN.SAY.table(answer.table,
								{
									title: answer.title,
									header: false,
									outline: false
								});

								say_arr = say_arr.concat(table_arr);
							}
						}

						callback(say_arr, true);
					}

				}

			} else {
				callback({err: 'Something went wrong'});
			}
		})

		function result_loop(pods, loop)
		{
			pods.forEach(function(pod)
			{
				pod = split_rows(pod);

				if(pod.title === 'Input interpretation' && !pod.primary && pod.subpods[0].plaintext)
				{
					interpretation = pod.subpods[0].plaintext;
					if(typeof interpretation !== 'string')
					{
						interpretation = interpretation.join(' ');
					}
					interpretation = interpretation.replace(/ \| /gm, ' ');
				}
				else if(pod.primary === true)
				{
					pod.subpods.forEach(function(subpod)
					{
						if(subpod.plaintext !== '' && subpod.plaintext !== null)
						{
							var data = tableize(subpod.plaintext)
							data.title = interpretation;
							interpretation = null;
							answer_arr.push(data)
						}
						else if(subpod.img && subpod.img.src !== null)
						{
							answer_arr.push({text: subpod.img.src, title: interpretation});
						}
					});
				}
				else if(pod.title === 'Image' && loop < 3)
				{
					return;
				}
				else
				{
					pod.subpods.forEach(function(subpod)
					{
						if(subpod.plaintext)
						{
							var data = tableize(subpod.plaintext)
							data.title = pod.title;
							answer_arr.push(data)
						}
						else if(subpod.img && subpod.img.src !== null)
						{
							answer_arr.push({text: subpod.img.src, title: pod.title});
						}
					});

				}
			})

			if(answer_arr.length === 0 && loop < 4){
				loop++;
				result_loop(result, loop);
			}
		}

		function split_rows(old_row)
		{
			var row = JSON.parse(JSON.stringify(old_row));
			if(typeof row === 'string')
			{
				var split_row = row.split('\n').filter(function(col)
				{
					return col.trim() !== '' && col !== null;
				});

				if(split_row.length === 1)
				{
					return split_row[0];
				}
				else if(split_row.length === 0)
				{
					return null;
				}
				else
				{
					return split_row;
				}
			}
			else if(typeof row === 'object')
			{
				for(var key in row){
					row[key] = split_rows(row[key])
				}
				return row;
			}
			else
			{
				return row;
			}
		}

		function tableize(d)
		{
			if(typeof d === 'string')
			{
				var data = [d];
			}
			else
			{
				var data = d;
			}

			var table = data.some(function(a){ return a.match(' | ')});

			if(table)
			{
				var col_count = 0;
				var data_arr = data.map(function(row)
				{
					var row_arr =  row.split(' | ').map(function(col)
					{
						return col.trim();
					});

					if(row_arr.length > col_count) col_count = row_arr.length;
					return row_arr;
				});
				var data_table = [];
				var table_row_count = 0;

				var table_cols_not_empty = [];

				data_arr.forEach(function(row_arr)
				{
					if(row_arr.length === 1)
					{
						data_table.push(row_arr[0]);
					}
					else
					{
						var row = {};
						for(var i = 0; i < col_count; i++)
						{
							row[i] = row_arr[i] !== undefined ? row_arr[i].trim() : '';

							if(row[i] !== '' && !table_cols_not_empty.includes(i))
							{
								table_cols_not_empty.push(i);
							}
						}

						data_table.push(row);
						table_row_count++;
					}
				});

				if(table_row_count > 1)
				{
					data_table.forEach(function(row)
					{
						if(typeof row !== 'string')
						{
							for(var i in row)
							{
								if(table_cols_not_empty.includes(+i))
								{
									row['col_' + i] = row[i];
								}

								delete row[i];
							}
						}
					})

					return {table: data_table};
				}
				else
				{
					return {text: d};
				}
			}
			else
			{
				return {text: d};
			}
		}
	}

	drink_make_drink(CHAN, drink, callback)
	{
		var str = CHAN.t.highlight(CHAN.t.term(drink.strDrink));
		if(drink.strCategory) str += ' ' + CHAN.t.considering(drink.strCategory);
		if(drink.strTags) str += ' ' + CHAN.t.null('(' + (drink.strTags.split(',').join(', ')) + ')');

		var ingredients = [];

		for(var i = 1; i <= 15; i++) {
			var ingredient = '';

			if(drink['strMeasure' + i] !== null) {
				ingredient += drink['strMeasure' + i].trim() + ' ';
			}

			if(drink['strIngredient' + i] !== null) {
				ingredient += drink['strIngredient' + i];
			}

			if(ingredient !== '') ingredients.push(ingredient);
		}

		var instructions = [];
		if(drink.strInstructions){
			instructions = drink.strInstructions.split('\n').map(function(i){
				return i.replace('\r', '').trim();
			})
		}

		var ret_arr = [
			str,
			CHAN.t.highlight('ingredients:') + ' ' + CHAN.t.warn(ingredients.join(', ')),
			instructions.join(' ')
		];

		if(drink.strVideo){
			ret_arr.push(drink.strVideo);
		}

		callback(ret_arr);
	}

	drink_rand(CHAN, callback){
		var _this = this;
		var url = 'https://www.thecocktaildb.com/api/json/v1/1/random.php';

		x.get_url(url, 'json', function(data){
			if (data.err){
				CHAN.log.error('drink_rand:', data.err);
				return callback({err: 'Something went wrong.'});
			}

			if(data.drinks && data.drinks.length > 0){
				_this.drink_make_drink(CHAN, data.drinks[0], callback);
			} else {
				return callback({err: 'No drinks found.'});
			}
		});
	}

	drink_by_ingredient(CHAN, search, callback)	{
		var _this = this;
		var url = 'https://www.thecocktaildb.com/api/json/v1/1/filter.php?i=' + encodeURI(search);
		console.log(url);

		x.get_url(url, 'json', function(data){
			if (data.err){
				CHAN.log.error('drink_by_ingredient:', data.err);
				return callback({err: 'Something went wrong.'});
			}

			if(data.drinks && data.drinks.length === 1){
				_this.drink(CHAN, data.drinks[0].strDrink, callback);
			} else if(data.drinks && data.drinks.length > 1){
				var drink = x.rand_arr(data.drinks)
				_this.drink(CHAN, drink.strDrink, callback);
			} else {
				return callback({err: 'No drinks found.'});
			}
		});
	}

	drink_about_ingredient(CHAN, search, callback)	{
		var _this = this;
		var url = 'https://www.thecocktaildb.com/api/json/v1/1/search.php?i=' + encodeURI(search);
		console.log(url);

		x.get_url(url, 'json', function(data){
			if (data.err){
				CHAN.log.error('drink_about_ingredient:', data.err);
				return callback({err: 'Something went wrong.'});
			}

			if(data.ingredients && data.ingredients.length > 0){

				var ingredient = data.ingredients[0];

				var str = CHAN.t.highlight(CHAN.t.term(ingredient.strIngredient));
				if(ingredient.strType && ingredient.strType != ingredient.strIngredient) str += ' ' + CHAN.t.null('(' + ingredient.strType + ')');

				if(ingredient.strAlcohol == "Yes"){
					if(ingredient.strABV){
						str += ' ' + x.score(ingredient.strABV, {score_str: 'Alcoholic ABV: ' + ingredient.strABV + '%', reverse: true, config: CHAN.config});
					} else {
						str += ' ' + CHAN.t.fail('Alcoholic');
					}
				} else {
					str += ' ' + x.score(0, {score_str: 'Non-Alcoholic', reverse: true, config: CHAN.config});
				}

				var about = [];
				if(ingredient.strDescription){
					about = ingredient.strDescription.split('\n').map(function(i){
						return i.replace('\r', '').trim();
					})
				}

				if(about.length > 0)
				{
					var ret_arr = [str, about.join(' ')];
					callback(ret_arr);
				} else {
					callback({err: 'No ingredient description found.'})
				}

			} else {
				return callback({err: 'No ingredient found.'});
			}
		});
	}

	drink(CHAN, search, callback){
		var _this = this;
		var url = 'https://www.thecocktaildb.com/api/json/v1/1/search.php?s=' + encodeURI(search);
		console.log(url);

		x.get_url(url, 'json', function(data){
			if (data.err){
				CHAN.log.error('drink:', data.err);
				return callback({err: 'Something went wrong.'});
			}

			if(data.drinks && data.drinks.length > 0){
				_this.drink_make_drink(CHAN, data.drinks[0], callback);
			} else {
				return callback({err: 'No drinks found.'});
			}
		});
	}

	whois(CHAN, domainName, callback){
		var url = 'https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=' + config.API.whoisxmlapi.key;
				url += '&outputFormat=json&domainName=' + domainName;

		console.log(url);

		x.get_url(url, 'json', function(res){
			if(res.err) return say(res)
			if(res.WhoisRecord)
			{
				var whois = res.WhoisRecord;

				var template = {
					domainName: null,
					registrarName: null,
					createdDateNormalized: null,
					updatedDateNormalized: null,
					expiresDateNormalized: null,
					dataError: null,
					registrant: null,
					nameServers: null,
					custom: null
				}

				var domain = JSON.parse(JSON.stringify(template));

				var get_data = function(obj, data){
					for(var key in obj){
						if(key == 'rawText' || key == 'header' || key == 'strippedText') delete obj[key];
						if(key == 'rawText' || key == 'header' || key == 'strippedText' || (typeof obj[key] === 'string' && obj[key].match(/REDACTED/i))) continue;
						if(data[key] === null && typeof obj[key] === 'string'){
							data[key] = obj[key].replace(/(\r\n|\n|\r)/gm, ' ').replace(/\s+/g, ' ');
						} else if(data[key] === null){
							data[key] = obj[key];
						} else if(key.match(/(customField)(\d+)(Value)/i)){
							var match = key.match(/(customField)(\d+)(Value)/i);
							if(obj[match[1] + match[2] + 'Name']){
								data.custom = data.custom || {};
								data.custom[obj[match[1] + match[2] + 'Name']] = obj[key].replace(/(\r\n|\n|\r)/gm, ' ').replace(/\s+/g, ' ');
							}
						}
					}
				}

				var delete_empty = function(obj){
					for(var key in obj){
						if(obj[key] === null || obj[key] === '' || key === 'rawText' || key == 'header' || key == 'strippedText' ||
						  (typeof obj[key] === 'string' && obj[key].match(/REDACTED/i))) delete obj[key];
						if(typeof obj[key] === 'string') obj[key] = obj[key].replace(/(\r\n|\n|\r)/gm, ' ').replace(/\s+/g, ' ');
						if(typeof obj[key] === 'object') delete_empty(obj[key]);
					}
				}

				get_data(whois, domain);
				if(whois.registryData) get_data(whois.registryData, domain);
				if(whois.subRecords && whois.subRecords.length){
					domain.subRecords = [];
					whois.subRecords.forEach(function(record){
						var data_sub = JSON.parse(JSON.stringify(template));
						get_data(record, data_sub);
						delete_empty(data_sub);
						domain.subRecords.push(data_sub);
					});
				}
				delete_empty(domain);

				callback(domain);

			} else {
				callback({err: 'No whois record found.'});
			}
		})
	}
}
