var request = require('request');

module.exports = class RND{
	imgur(CHAN, method, send_data){
		if(config.API.imgur && config.API.imgur.key !== '') {

			var url = 'https://api.imgur.com/3/' + method + '/' + send_data.path.join('/');

			request({url: url, followRedirect: false, headers: {
			    "Authorization": "Client-ID " + config.API.imgur.key
			  }}, function (error, response, body) {
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
			});

		} else {
			b.log.warn('Missing imgur API key!');
			if(send_data.handlers.error) send_data.handlers.error({err: 'Missing imgur API key'});
		}
	};
}