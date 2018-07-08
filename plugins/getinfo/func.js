var google	  = require('google'),
	DDG		 = require('node-ddg-api').DDG,
	ddg		 = new DDG(config.bot_nick);

module.exports = class GI{

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

}