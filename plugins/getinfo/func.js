var google	  	= require('google'),
	request 	= require('request'),
	DDG		 	= require('node-ddg-api').DDG,
	ddg		 	= new DDG(config.bot_nick);

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
			if(send_data.handlers.error) send_data.handlers.error({err: 'Missing imgur API key'});
		}
	};

	goog(CHAN, search_string, callback){
		var _this = this;
		CHAN.log.debug('Searching GOOG');
		google(search_string, function (err, res){
			if(err){
				CHAN.log.error('goog:', err);
				if(err.message.match(/CAPTCHA/igm)) return callback({err: 'Slapped by Google CAPTCHA'});
				return callback({err: 'Something went wrong'});
			}
			
			var links = res.links.filter(link => link.title && link.href);

			if(links.length < 1) return callback({err: 'Nothing found.'});

			var say_link = links[0];

			links.forEach(function(link, i){
				if(link.href.match(/wiki/ig)){
					say_link = link;
					return;
				}
			});

			_this.speak_search(CHAN, 'GOOG', say_link, callback);
		});
	}

	ddg(CHAN, search_string, callback){
		var _this = this;
		CHAN.log.debug('Searching DDG');
		ddg.instantAnswer(search_string, {skip_disambig: '0'}, function(err, res) {
			if (err){
				CHAN.log.error('ddg:', err);
				return callback({err: 'Something went wrong.'});
			}

			if(res.RelatedTopics.length < 1) return callback({err: 'Nothing found.'});

			try{
				var say_link = {
					title: res.Heading,
					href: res.AbstractURL,
					description: res.RelatedTopics[0].Text
				}

				_this.speak_search(CHAN, 'DDG', say_link, callback);
			} catch(e) {
				CHAN.log.error('ddg', e);
				return say({err: 'Something went wrong.'});
			}
		});
	}

	speak_search(CHAN, src, say_link, callback){
		var is_yt = say_link.href.match(/^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/i);
		//this is a youtube link
		if(is_yt !== null){
			 x.get_url(is_yt[5], 'youtube', function(data){

				var str =  CHAN.t.highlight(data.title) + CHAN.t.null(' | Uploader: ') + CHAN.t.highlight(data.owner);
					str += CHAN.t.null(' | Time: ') + CHAN.t.highlight(x.ms_to_time(data.duration * 1000, {short: false})) + CHAN.t.null(' | Views: ') + CHAN.t.highlight(data.views);  

				say_link.title = str;
				callback(CHAN.t.highlight(CHAN.t.term(src + ':') + ' ' + say_link.title) + ' ' + say_link.description, say_link.href)
				
			});
		} else {
			callback(CHAN.t.highlight(CHAN.t.term(src + ':') + ' ' + say_link.title) + ' ' + say_link.description, say_link.href)
		}
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
							row['col_' + i] = row_arr[i] !== undefined ? row_arr[i] : '';
						}

						data_table.push(row);
						table_row_count++;
					}
				});

				if(table_row_count > 1)
				{
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