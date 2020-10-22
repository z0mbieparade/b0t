var request 	= require('request');

module.exports = class GI{
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
			var ret = '';
			var col = false;
			var pre = '';

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

}
