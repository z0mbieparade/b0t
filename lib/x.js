var Entities			= require("html-entities").AllHtmlEntities,
	entities				= new Entities(),
	xml2js		  		= require('xml2js').parseString,
	htmlparser	  	= require("htmlparser2"),
	stripAnsi	   		= require('strip-ansi'),
	request		 			= require('request'),
	dateWithOffset  = require("date-with-offset"),
	jsonfile				= require("jsonfile"),
	chrono		  		= require("chrono-node")
	ua_list					= require(__botdir + '/db/default/./UA.json'),
	xpath 					= require('xpath'),
	dom 						= require('xmldom').DOMParser,
	path 						= require('path');

module.exports = class X{

	/* -------------- LANGUAGE STUFF --------------------- */

	techno(ing, adj_count, noun_count){
		var _this = this;
		adj_count = adj_count !== undefined ? adj_count : 1;
		noun_count = noun_count !== undefined ? noun_count : 1;

		var tech_arr = [];

		if(ing){
			tech_arr.push(this.cap_first_letter(_this.ing(_this.rand_arr(words.techverb))));
		} else {
			tech_arr.push(this.rand_arr(words.techverb));
		}

		tech_arr.push('the');

		for(var i = 0; i < adj_count; i++){
			tech_arr.push(this.rand_arr(words.techadj));
		}

		for(var i = 0; i < noun_count; i++){
			tech_arr.push(this.rand_arr(words.technoun));
		}

		return tech_arr.join(' ');
	}

	join_and(arr){
		if(arr.length === 0) return '';
		if(arr.length === 1) return arr[0];
		if(arr.length === 2) return arr[0] + ' and ' + arr[1]; // x and x

		var pre_and = arr.splice(0, arr.length - 1);
		return pre_and.join(', ') + ', and ' + arr;//x, x, and x
	}

	//verb -> verbing
	ing(adj){
		adj = adj.toLowerCase();
		var special = {
			'hell': 'hella'
		};

		if(special[adj]) return special[adj];

		//ends in s, remove the s
		var ends_in_s = adj.match(/(\w+)s$/i);
		if(ends_in_s !== null) adj = ends_in_s[1];

		//ends in ie, remove the ie and add ying
		var ends_in_ie = adj.match(/(\w+)ie$/i);
		if(ends_in_ie !== null) return ends_in_ie[1] + 'ying'

		//ends in e, remove the e and add ing
		var ends_in_e = adj.match(/(\w+)e$/i);
		if(ends_in_e !== null) return ends_in_e[1] + 'ing';

		//consonant + vowel + consonant (except w, x, y), double the final consonant and add ing
		var c_v_c = adj.match(/\w*[bcdfghjklmnpqrstvwxyz][aeiou]([bcdfghjklmnpqrstvz])$/i);
		if(c_v_c !== null) return adj + c_v_c[1] + 'ing';

		//consonant + vowel + consonant + s, remove the s and double the final consonant and add ing
		var c_v_c_s = adj.match(/(\w*[bcdfghjklmnpqrstvwxyz][aeiou])([bcdfghjklmnpqrstvwxyz])s$/i);
		if(c_v_c_s !== null) return c_v_c_s[1] + c_v_c_s[2] + c_v_c_s[2] + 'ing';

		return adj + 'ing';
	}

	article_adj_adv(adj, info){
		var article = null;
		var adverb = null;

		var ws = info.split(/\s/).filter(function(w){
			return w !== '';
		});

		if(words.article.includes(ws[0])) article = ws.shift();
		if(words.adverb_no_ly.includes(ws[0]) || ws[0].match(/(\w+)ly$/i)) adverb = ws.shift();
		if(article === null && words.article.includes(ws[0])) article = ws.shift();
		if(adverb === null && words.adverb_no_ly.includes(ws[0]) || ws[0].match(/(\w+)ly$/i)) adverb = ws.shift();

		if(adj) ws.unshift(adj.trim());
		if(adverb !== null) ws.unshift(adverb);
		if(article !== null) ws.unshift(article);

		return ws.join(' ');
	}

	vars(CHAN, str){
		var _this = this;
		var users = ['nobody', 'somebody'];
		CHAN.get_all_users_in_chan_data(null, function(data){
			users = data;
		});

		str = str.replace(/([\w\d]+\|)+([\w\d]+)/ig, function(xx){
			var or_vars = xx.split('|');
			return _this.rand_arr(or_vars);
		});

		for(var word in words)
		{
			var w = word.split('|');
			var var_reg = new RegExp('\\$' + w.join('[s]*|\\$') + '[s]*', 'ig');

			str = str.replace(var_reg, function(xx){
				var new_word = _this.rand_arr(words[word]);
				if(xx[xx.length - 1] === 's' && new_word[new_word.length - 1] !== 's') return new_word + 's';
				return new_word;
			});
		}

		str = str.replace(/\$user/ig, function(xx){
			return _this.rand_arr(users);
		});

		return str;
	}

	mirror_text(str, reverse){
		var char = {
			a:'ɐ',b:'q',c:'ɔ',d:'p',e:'ǝ',f:'ɟ',g:'ɓ',h:'ɥ',i:'ᴉ',j:'ſ',k:'ʞ',l:'ๅ',m:'ɯ',
			n:'u',o:'o',p:'d',q:'b',r:'ɹ',s:'s',t:'ʇ',u:'n',v:'ʌ',w:'ʍ',x:'x',y:'ʎ',z:'z',
			A:'Ɐ',B:'ꓭ',C:'ꓛ',D:'ꓷ',E:'Ǝ',F:'ꓞ',G:'ꓨ',H:'H',I:'I',J:'ſ',K:'ꓘ',L:'ꓶ',M:'W',
			N:'N',O:'O',P:'ꓒ',Q:'Ὸ',R:'ꓤ',S:'S',T:'ꓕ',U:'ꓵ',V:'ꓥ',W:'M',X:'X',Y:'⅄',Z:'Z',
			0:'0',1:'Ɩ',2:'Շ',3:'Ɛ',4:'h',5:'૬',6:'9',7:'L',8:'8',9:'6',
			'&':'⅋','!':'¡'
		}

		var new_str = str.map(function(c){
			return char[c] ? char[c] : c;
		});

		if(reverse) new_str = new_str.reverse();

		return new_str;
	}

	cap_first_letter(str) {
		return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
	}

	shuffle_arr(arr) {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}

	rand_number_between(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	};

	//skip_arr = array of values to skip in arr
	rand_arr(arr, skip_arr) {
		if(!arr || arr.length === 0) return '';

		var rand = arr[this.rand_number_between(0, arr.length - 1)];

		if(skip_arr && skip_arr.includes(rand))
		{
			var filter_arr = arr.filter(function(item)
			{
				return !skip_arr.includes(item);
			});

			return this.rand_arr(filter_arr)
		}
		else
		{
			return rand;
		}
	};

	//formats a string or array with a random color (excludes white, black, bold, italic, underline, reset)
	rand_color(data, disable_colors) {
		var _this = this;
		if(data === undefined){
			b.log.error('data undefined could not color');
			return;
		}

		if(disable_colors){
			return data;
		} else {
			var col_arr = [3,4,6,7,8,9,10,11,13,15];
			var c = '\u0003' + _this.rand_arr(col_arr);

			if(typeof data === 'string'){
				return c + data + '\u000f';
			} else {
				for(var i = 0; i < data.length; i++){
					data[i] = c + data[i] + '\u000f';
				}
				return data;
			}
		}
	};

	//generate unique id
	guid(){
	  var s4 = function() {
		return Math.floor((1 + Math.random()) * 0x10000)
		  .toString(16)
		  .substring(1);
	  }
	  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
		s4() + '-' + s4() + s4() + s4();
	};

	//strip ANSI escape codes
	strip_ansi(str){
		return stripAnsi(str);
	}

	unescape_html(str, add_slashes){
		if(add_slashes === false){
			return str.replace(/&gt;/g, '>')
								.replace(/&lt;/g, '<')
								.replace(/&quot;/g, '"')
								.replace(/&apos;/g, "'")
								.replace(/&amp;/g, '&');
		} else {
			return str.replace(/&gt;/g, '\>')
								.replace(/&lt;/g, '\<')
								.replace(/&quot;/g, '\"')
								.replace(/&apos;/g, "\'")
								.replace(/&amp;/g, '\&');
		}
	}

	//verifies and strips strings before speaking them
	verify_string(str) {
	 if(typeof str !== 'string'){
			//b.log.error('verify_string: str is a', typeof str, str);
			if(typeof str === 'object'){
				var tmp_str = '';
				for(var key in str){
					tmp_str += key + ': ' + str[key] + '\n';
				}
				str = tmp_str;
			} else {
				str = JSON.stringify(str);
			}
		}

		//strip tags
		str = str.replace(/<\/?[^>]+(>|$)/g, "");
		str = str.trim();

		var breaks = str.match(/\r?\n|\r/g) || [];

		//if there are more than 3 new line breaks, remove them.
		if(breaks.length > 3){
			str = str.replace(/\r?\n|\r/g, ' ');
		}

		return str;
	};

	abv_num(num, fixed) {
		if (num === null) { return null; } // terminate early
		if (num === 0) { return '0'; } // terminate early
		fixed = (!fixed || fixed < 0) ? 0 : fixed; // number of decimal places to show

		var b = (num).toPrecision(2).split("e"), // get power
		k = b.length === 1 ? 0 : Math.floor(Math.min(b[1].slice(1), 14) / 3), // floor at decimals, ceiling at trillions
		c = k < 1 ? num.toFixed(0 + fixed) : (num / Math.pow(10, k * 3) ).toFixed(1 + fixed), // divide by power
		d = c < 0 ? c : Math.abs(c), // enforce -0 is 0
		e = d + ['', 'K', 'M', 'B', 'T'][k]; // append power

		return e;
	}

	//add comma to numbers
	comma_num(num){
		return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}

	ms_to_time(duration, options) {
		options = Object.assign({}, {
			short: true, //if true 1y1mo1wk1d1h1s1m, if false hh:mm:ss
			smart: true //if true, tries to shorten dates in a smart way
		}, options);

		var Nms, Ns, Nm, Nh, Nd, Nw, Nmo, Nyr;

		function calc_t(ms_left)
		{
			Nms = ms_left;

			Ns = (Nms / 1000) | 0;
			Nms -= Ns * 1000;

			Nm = (Ns / 60) | 0;
			Ns -= Nm * 60;

			Nh = (Nm / 60) | 0;
			Nm -= Nh * 60;

			Nd = (Nh / 24) | 0;
			Nh -= Nd * 24;

			Nw = (Nd / 7) | 0;
			Nd -= Nw * 7;
		}

		var mo_max = 1000*60*60*24*31;
		var mo_min = 1000*60*60*24*28;
		var real_yr = 31556952000;

		//months and years are not quite as straight forward, so we're fudging a bit
		if(duration >= mo_min)  {
			Nyr = Math.floor(duration / real_yr);
			duration -= Nyr * real_yr;

			var Nmo_min = Math.floor(duration / mo_min);
			var Nmo_max = Math.floor(duration / mo_max);

			if(Nmo_min === Nmo_max){
				Nmo = Nmo_max;
				duration -= Nmo_max * mo_max;
			} else if (Nmo_min > Nmo_max) {
				Nmo = Nmo_min;
				duration -= Nmo_min * mo_max;
			}

			if(Nmo >= 12)
			{
				Nyr = Math.floor(Nmo / 12);
				Nmo -= Nyr * 12;
			}

			calc_t(duration);

			Nw -= (Nmo * 4) + (Nyr * 52);
		} else {
			Nyr = 0;
			Nmo = 0;
			calc_t(duration);
		}


		//1 day
		if(duration >= 86400000 && !options.short){
			console.log(duration, 'greater than 1 day, setting short = true');
			options.short = true;
		}

		if(options.short){

			var yr  = Nyr > 0 ? Nyr + 'yr' : '',
				mo  = Nmo > 0 ? Nmo + 'mo' : '',
				w   = Nw > 0 ? Nw + 'wk' : '',
				d   = Nd > 0 ? Nd + 'd' : '',
				h   = Nh > 0 ? Nh + 'h' : '',
				m   = Nm > 0 ? Nm + 'm' : '',
				s   = Ns > 0 ? Ns + 's' : '';

			if(options.smart){
				if(Nyr > 0){
					return yr + mo;
				} else {
					if(Nmo > 1){
						return yr + mo + w;
					} else {
						if(Nw > 1){
							return yr + mo + w + d;
						} else {
							if(Nd > 1){
								return yr + mo + w + d + h;
							} else {
								if(Nh > 1){
									return yr + mo + w + d + h + m;
								} else {
									return yr + mo + w + d + h + m + s;
								}
							}
						}
					}
				}
			} else {
				return yr + mo + w + d + h + m + s;
			}

		} else {

			var h   = (Nh < 10) ? "0" + Nh : Nh,
				m   = (Nm < 10) ? "0" + Nm : Nm,
				s   = (Ns < 10) ? "0" + Ns : Ns;

			return h + ":" + m + ":" + s;
		}
	}

	iso8601_duration_to_time(duration, options){
		options = Object.assign({}, {
			short: true, //if true 1y1mo1wk1d1h1s1m, if false hh:mm:ss
			smart: true //if true, tries to shorten dates in a smart way
		}, options);

		//var regex = /(-)?P(?:([.,\d]+)Y)?(?:([.,\d]+)M)?(?:([.,\d]+)W)?(?:([.,\d]+)D)?T(?:([.,\d]+)H)?(?:([.,\d]+)M)?(?:([.,\d]+)S)?/;
		var regex = /(-)?P(?:([.,\d]+)Y)?(?:([.,\d]+)M)?(?:([.,\d]+)W)?(?:([.,\d]+)D)?(?:T(?:([.,\d]+)H)?(?:([.,\d]+)M)?(?:([.,\d]+)S)?)?/
		var matches = duration.match(regex);
    var time = {
        sign: matches[1] === undefined ? '+' : '-',
        years: matches[2] === undefined ? 0 : +matches[2],
        months: matches[3] === undefined ? 0 : +matches[3],
        weeks: matches[4] === undefined ? 0 : +matches[4],
        days: matches[5] === undefined ? 0 : +matches[5],
        hours: matches[6] === undefined ? 0 : +matches[6],
        minutes: matches[7] === undefined ? 0 : +matches[7],
        seconds: matches[8] === undefined ? 0 : +matches[8]
    };

		//1 day
		if((time.years > 0 || time.months > 0 || time.weeks > 0 || time.days > 0) && !options.short){
			console.log(duration, 'greater than 1 day, setting short = true');
			options.short = true;
		}

		if(options.short){
			var yr  = time.years > 0 ? time.years + 'yr' : '',
					mo  = time.months > 0 ? time.months + 'mo' : '',
					w   = time.weeks > 0 ? time.weeks + 'wk' : '',
					d   = time.days > 0 ? time.days + 'd' : '',
					h   = time.hours > 0 ? time.hours + 'h' : '',
					m   = time.minutes > 0 ? time.minutes + 'm' : '',
					s   = time.seconds > 0 ? time.seconds + 's' : '';

			if(options.smart){
				if(time.years > 0){
					return yr + mo;
				} else {
					if(time.months > 1){
						return yr + mo + w;
					} else {
						if(time.weeks > 1){
							return yr + mo + w + d;
						} else {
							if(time.days > 1){
								return yr + mo + w + d + h;
							} else {
								if(time.hours > 1){
									return yr + mo + w + d + h + m;
								} else {
									return yr + mo + w + d + h + m + s;
								}
							}
						}
					}
				}
			} else {
				return yr + mo + w + d + h + m + s;
			}

		} else {

			var h   = (time.hours < 10) ? "0" + time.hours : time.hours,
					m   = (time.minutes < 10) ? "0" + time.minutes : time.minutes,
					s   = (time.seconds < 10) ? "0" + time.seconds : time.seconds;

			return h + ":" + m + ":" + s;
		}
	}

	//input epoc, offset mins, timezone, returns mm/dd/yyyy hh:mmAM/PM timezone
	epoc_to_date(epoc, offset, timezone){
		offset = offset || 0;
		var date = new dateWithOffset(epoc, this.convert_offset_to_min(offset));

		timezone = timezone || 'GMT' + (offset === 0 ? '' : offset);

		var month = date.getMonth() + 1;
		var day = date.getDate();
		var year = date.getFullYear();

		var hour = date.getHours();
		var min = date.getMinutes();

		var am_pm = hour > 12 ? 'PM' : 'AM';

		//date.toString()

		return month + '/' + day + '/' + year + ' ' + (hour > 12 ? hour - 12 : hour) + ':' + (min < 10 ? '0' + min : min) + am_pm + ' ' + timezone;
	}

	//converts offset -0600 -> -360 min
	convert_offset_to_min(gmt_offset){
		return (parseInt(gmt_offset, 10) / 100) * 60;
	}

	//date string to {m: d: y:}
	date_string_to_obj(date_str, offset){
		offset 		= this.convert_offset_to_min(offset ? offset : 0);
		var date 	= date_str ? new dateWithOffset(date_str, offset) : new dateWithOffset(offset);

		return {
			date: date,
			month: (date.getMonth() + 1),
			day: date.getDate(),
			year: date.getFullYear(),
			day_of_week: date.getDay()
		}
	}

	//date string to mm/dd/yy
	date_string_to_mdy(date_str, offset){
		offset 		= this.convert_offset_to_min(offset ? offset : 0);

		console.log(date_str, offset)

		var date	= date_str ? new dateWithOffset(date_str, offset) : new dateWithOffset(offset);
		var month   = (date.getMonth() + 1),
			day	 	= date.getDate(),
			year	= (date.getFullYear() - 2000);

		return (month < 9 ? '0' + month : month) + '/' + (day < 9 ? '0' + day : day) + '/' + year;
	}

	date_string_to_mdyhms(date_str, offset, timezone){
		offset	  	= offset ? offset : 0;
		timezone	= timezone ? ' (' + timezone + ')' : ' (GMT)';
		var str	 	= '';

		var date		= new dateWithOffset(date_str, offset),
			date_date   = date.toString().split(/\s/).slice(0, 4).join(' '),
			hour		= date.getHours(),
			minute	  	= date.getMinutes(),
			amPM		= (hour > 11) ? "pm" : "am";

		var today		   	= new Date(),
			today_hour	  	= today.getHours(),
			today_minute	= today.getMinutes(),
			today_date	  	= today.toDateString();

		var tomorrow_date	= (new Date('tomorrow')).toDateString();
		var yesterday_date	= (new Date('yesterday')).toDateString();


		if(date_date === today_date){

			if(hour > (today_hour + 3))
			{
				str += 'Today at ';

			} else if(hour < (today_hour + 3) && (hour > today_hour || (hour === today_hour && today_minute < minute))){
				str += 'Today in ';

				if((hour - today_hour) > 1){
					str += (hour - today_hour) + ' hours ';

					if((minute - today_minute) > 1){
						str += 'and ' + (minute - today_minute) + ' mins ';
					} else if((minute - today_minute) === 1){
						str += 'and 1 min ';
					}
				} else if((hour - today_hour) === 1){
					str += '1 hour ';

					if((minute - today_minute) > 1){
						str += 'and ' + (minute - today_minute) + ' mins ';
					} else if((minute - today_minute) === 1){
						str += 'and 1 min ';
					}
				} else {
					if((minute - today_minute) > 1){
						str += (minute - today_minute) + ' mins ';
					} else if((minute - today_minute) === 1){
						str += '1 min ';
					}
				}
				str += 'at ';

			} else if (hour === today_hour && minute === today_minute){
				str += 'Now at ';
			} else if(hour > (today_hour - 3)){
				str += 'Today ';

				if((today_hour - hour) > 1){
					str += (today_hour - hour) + ' hours ';

					if((today_minute - minute) > 1){
						str += 'and ' + (today_minute - minute) + ' mins ago ';
					} else if((minute - today_minute) === 1){
						str += 'and 1 min ago ';
					}
				} else if((hour - today_hour) === 1){
					str += '1 hour ';

					if((today_minute - minute) > 1){
						str += 'and ' + (today_minute - minute) + ' mins ago ';
					} else if((minute - today_minute) === 1){
						str += 'and 1 min ago ';
					}
				} else {
					if((today_minute - minute) > 1){
						str += (today_minute - minute) + ' mins ago ';
					} else if((minute - today_minute) === 1){
						str += '1 min ago ';
					}
				}

				str += 'at ';
			} else {
				str += 'Today earlier at ';
			}

		} else if (date_date === tomorrow_date){
			str += 'Tomorrow at '
		} else if (date_date === yesterday_date){
			str += 'Yesterday at '
		} else {
			var month   = (date.getMonth() + 1),
				day	 = date.getDate(),
				year	= (date.getFullYear() - 2000);

			str += 'on ' + (month < 9 ? '0' + month : month) + '/' + (day < 9 ? '0' + day : day) + '/' + year + ' at ';
		}

		if(hour > 12){
			hour -= 12;
		} else if(hour == 0){
			hour = 12;
		}

		minute = minute < 10 ? 0 + minute : minute;

		return  str + hour + ":" + (minute < 10 ? '0' + minute : minute) + amPM + timezone;
	}

	//takes string and tries to convert it to a date, ie: 5pm, 5 tonight, 5:30 MST, tomorrow at 5, etc
	str_to_datetime(str, offset){
		var time = chrono.parse(str);
		offset = this.convert_offset_to_min(offset);

		try{
			var start = time[0].start.date();
			var gmt_time = new dateWithOffset(start.toString(), 0); //GMT0
			var offset_time = new dateWithOffset(start.toString(), offset); //by offset

			return {offset: offset_time.toString(), gmt: gmt_time.toString(), gmt_epoc: gmt_time.valueOf()};
		} catch(e){
			b.log.error(e.message);
			if(e.message === 'Cannot read property \'start\' of undefined'){
				return {err: 'Invalid date or time "' + str + '"'}
			} else {
				return {err: e.message};
			}
		}
	}

	get_url(url, type, callback, options){
		options = Object.assign({}, {
			only_return_text: false, //if true and type = html, instead of returning an array of dom object, returns an array of text only.
			only_return_nodes: null, //{attr: {'class': 'zoom'}} {tag: ['tag_name']} searched for only these values and returns them
			return_err: false,
			headers: null,
			rand_user_agent: false, //set to true to spoof random user-agent header
			timeout: 30000, //how long to wait before conn times out
			xpath: null, // //*[@id="content"]/div/div[1]/article[1]/div/div/div[2]/p/a/text()
			parse_type: 'html',
			parse_func: callback,
			followRedirect: null,
			maxRedirects: 3,
			timeout: 30000,
			form: null
		}, options);

		if(type === 'xml' || type === 'json'){
			options.parse_type = type;
		} else if(options.xpath !== null) {
			options.parse_type = 'xpath';
		}

		var _this = this;
		var u = new URL(url);
		var link_type = null;

		var request_options = {
			url: url
		}

		if(options.maxRedirects){
			request_options.maxRedirects = options.maxRedirects;
		}

		if(options.timeout){
			request_options.timeout = options.timeout;
		}

		if(options.followRedirect !== null){
			request_options.followRedirect = options.followRedirect;
		}

		if(options.form !== null){
			request_options.form = options.form;
		}

		if(u.hostname.match(/^(www\.)?(youtube\.com|youtu\.be)$/) &&
			 config.API.youtube && config.API.youtube.key !== '') //youtube
		{
			if(u.hostname.match(/^(www\.)?(youtube\.com)$/)){
				var id = u.searchParams.get('v');
			} else if(u.hostname.match(/^(www\.)?(youtu\.be)$/)){
				var id = u.pathname.replace('/', '');
			}

			var params = {
				id: id,
				part: 'snippet,contentDetails,statistics',
				maxResults: 1
			}

			var api_url = 'https://www.googleapis.com/youtube/v3/videos?key=' + config.API.youtube.key

			for(var key in params){
				api_url += '&' + key + '=' + encodeURI(params[key]);
			}

			request_options.url = api_url;
			options.parse_type = 'json';
			options.rand_user_agent = false;
			link_type = 'youtube';

			if(type === 'sup')
			{
				options.parse_func = function(ret){
					var sup_arr = [];
					if(ret.items && ret.items[0])
					{
						var item = ret.items[0];
						if(item.snippet)
						{
							if(item.snippet.title) sup_arr.push(item.snippet.title);
							if(item.snippet.channelTitle) sup_arr.push('Uploader: ' + item.snippet.channelTitle);
						}

						if(item.contentDetails && item.contentDetails.duration){
							sup_arr.push('Time: ' + x.iso8601_duration_to_time(item.contentDetails.duration, {short: false}))
						}

						if(item.statistics && item.statistics.viewCount){
							sup_arr.push('Views: ' + x.abv_num(+item.statistics.viewCount))
						}

						callback(sup_arr.join(' | '))
					}
					else
					{
						callback({err: 'Something funky with youtube data.'});
					}
				}
			}
		}
		else if(u.hostname.match(/^(www\.)?(twitter.com)$/) &&
			      config.API.twitter.bearer_token !== '') //twitter
		{
			var twpath = path.basename(u.pathname);
			request_options.url = 'https://api.twitter.com/2/tweets/' + twpath;
			request_options.headers = {
        Accept: '*/*',
        Connection: 'close',
				Authorization: 'Bearer ' + config.API.twitter.bearer_token
      };
			options.parse_type = 'json';
			options.rand_user_agent = false;
			link_type = 'twitter';

			if(type === 'sup'){
				options.parse_func = function(ret){
					if(ret && ret.data && ret.data.text)
					{
						callback(x.unescape_html(ret.data.text));
					}
					else
					{
						callback({err: 'Something funky with twitter data.'})
					}
				}
			}
		}
		else if(u.hostname.match(/^(www\.|i\.)?(imgur.com)$/)) //imgur
		{
			if(type === 'sup'){
				options.parse_type = 'html'
				options.only_return_nodes = {tag: ['title', 'meta']};
				options.parse_func = function(ret)
				{
					var str_arr = [];
					if(typeof ret === 'string')
					{
						str_arr = [ret];
					}
					else if (typeof ret === 'object')
					{
						for(var j = 0; j < ret.length; j++){
							if(ret[j].tag === 'title' &&  ret[j].text !== 'Imgur: The most awesome images on the Internet'){
								str_arr.push(ret[j].text);
							} else if (ret[j].tag === 'meta' && ret[j].attr && ret[j].attr.property &&
								ret[j].attr.property === 'og:description' &&  ret[j].attr.content !== 'Imgur: The most awesome images on the Internet.' &&
								ret[j].attr.content) {
								str_arr.push(ret[j].attr.content);
							}
						}
					}

					if(str_arr.length < 1) str_arr.push('Imgur: The most awesome images on the Internet');
					callback(str_arr.join(' | '));
				}
			}

			link_type = 'imgur';
		}

		if(options.headers !== null){
			request_options.headers = options.headers;
		}

		if(options.rand_user_agent){
			request_options.headers = request_options.headers || {};
			request_options.headers['User-Agent'] = _this.rand_arr(ua_list);
		}

		console.log(request_options)

		request(request_options, function (error, response, body) {
			if(error){
				if(options.return_err) callback({err: error.message})
				return b.log.error('Error:', error.message);
			}

			if(response.statusCode !== 200){
				if(options.return_err) callback({err: response.statusCode})
				return b.log.error('Invalid Status Code Returned:', response.statusCode, url);
			}

			if(options.parse_type === 'json'){
				try {
					var ret = JSON.parse(body);
					options.parse_func(ret);
					return;
				} catch(e) {
					b.log.error('get_url not valid JSON', e.message, e);
					callback({err: 'Not valid JSON.'});
				}
			} else if(options.parse_type === 'xpath'){
				try {
					var doc = new dom({
						errorHandler:{
							warning: function(w){
								//console.warn(w)
							},
							error:  function(w){
								//console.warn(w)
							},
							fatalError:  function(w){
								console.error(w)
							}
						}
    				}).parseFromString(body)
					options.parse_func(xpath.select(options.xpath, doc))
				} catch(e) {
					if(options.return_err) callback({err: e.message})
					return b.log.error('Error:', e.message);
				}
			} else if(options.parse_type === 'xml'){
				xml2js(body, function(err, result) {
					options.parse_func(result);
				});
			} else if(options.parse_type === 'html') {
				var options_html = Object.assign({}, options, {type: type});
				_this.parse_html(body, options_html);
			} else {
				options.parse_func(body);
			}
		});
	}

	parse_html(body, options){
		options = Object.assign({}, {
			type: 'html', //sup only returns title
			only_return_text: false, //if true and type = html, instead of returning an array of dom object, returns an array of text only.
			only_return_nodes: null //{attr: {'class': 'zoom'}} {attr: {'class': ['zoom', 'out']} {tag: ['tag_name']} searched for only these values and returns them
		}, options);

		var parsed = [];
		var _this = this;

		var push_tag = null;
		var parser = new htmlparser.Parser({
			onopentag: function(name, attribs){
				if(options.type === 'sup' && name !== 'title' && options.only_return_nodes == null) return;
				if(name === 'br' || name == 'hr' || options.only_return_text) return;

				if(options.only_return_nodes){
					if(options.only_return_nodes.attr){
						for(var attr in options.only_return_nodes.attr){
							if(Array.isArray(options.only_return_nodes.attr[attr]))
							{
								if(attribs[attr] === undefined ||  !options.only_return_nodes.attr[attr].includes(attribs[attr])) return;
							}
							else
							{
								if(attribs[attr] === undefined || attribs[attr] !== options.only_return_nodes.attr[attr]) return;
							}
						}
					}

					if(options.only_return_nodes.tag){
						if(options.only_return_nodes.tag.indexOf(name) < 0) return;
					}
				}

				push_tag = {
					tag: name
				};

				if(attribs){
					push_tag.attr = attribs;
				}
			},
			ontext: function(text){
				text = text.trim();

				if(push_tag && options.type === 'sup' && push_tag.tag === 'title' && text.length > 0){
					options.parse_func(text);
					parser.parseComplete();
				}

				if(text.length > 0){
					if(options.only_return_text === true){
						parsed.push(text);
					} else if(options.only_return_nodes !== undefined) {
						if(push_tag === null){
							return;
						} else {
							push_tag.text = text;
						}
					} else {
						push_tag ? push_tag.text = text : push_tag = {text: text};
					}
				} else {
					return;
				}
			},
			onclosetag: function(tagname){
			   if(push_tag && !options.only_return_text) {
					parsed.push(push_tag);
					push_tag = null;
			   }
			},
			onend: function() {
				if(options.type !== 'sup'){
					options.parse_func(parsed);
				}
			}
		}, {decodeEntities: false});
		body = entities.decode(body);
		parser.write(body);
		parser.end();
	}

	//update speak array with now, rotate if max count is reached
	update_speak_time(path, count, case_insensitive){
		var _this = this;
		var now = (new dateWithOffset(0)).getTime();

		db.get_data('/speak/' + path, function(time_arr){
			if(time_arr !== null){
				time_arr.push(now);
				if(time_arr.length > count){
					time_arr.shift();
				}

				db.update('/speak/' + path, time_arr, true, undefined, case_insensitive);
			} else {
				time_arr = [now];
				db.update('/speak/' + path, time_arr, true, undefined, case_insensitive);
			}
		}, case_insensitive);
	}

	//check last time speak happened
	//return false if no speak, or now > last spoke + wait time, or return ms until can speak again
	check_speak_timeout(path, wait_time, callback, case_insensitive){
		var _this = this;
		db.get_data('/speak/' + path, function(time_arr){
			if(time_arr !== null && time_arr.length > 0){
				var now = (new dateWithOffset(0)).getTime();
				var timeout = time_arr[time_arr.length - 1] + wait_time;

				if(now < timeout){
					b.log.debug('check_speak_timeout 1', path, _this.ms_to_time(timeout - now))
					callback(timeout - now);
				} else {
					b.log.debug('check_speak_timeout 2', path, false);
					callback(false);
				}
			} else {
				b.log.debug('check_speak_timeout 3', path, false, time_arr);
				callback(false);
			}
		}, case_insensitive);
	}

	//returns average seconds between last 5 messages in the channel if busy,
	//otherwise returns false if not busy
	check_busy(chan, callback){
		var _this = this;
		db.get_data("/speak/"+chan+'/chan', function(msg_arr){
			if(msg_arr !== null && msg_arr.length > 4){
				var epoc = (new dateWithOffset(0)).getTime();
				var since_last_speak = epoc - msg_arr[msg_arr.length - 1];

				//if the time since the last time someone spoke in chat is 2x limit_chan_speak_when_busy,
				//let the bot speak in chat
				if(since_last_speak < (_this.config.busy_interval * 2)){ //1 min

					//otherwise average all of the speaking
					//and if the average of the last 5 lines in chat is
					//less than half the limit_chan_speak_when_busy setting,
					//send to notice.
					var sum = 0;
					for(var i = 1; i < msg_arr.length; i++){
						sum = sum + (msg_arr[i] - msg_arr[i-1]);
					}

					var avr = Math.floor(sum / (msg_arr.length - 1));
					if(avr <= _this.config.busy_interval){ //30 sec
						callback(avr);
					} else {
						b.channels[chan].log.debug('FALSE speak avr', _this.ms_to_time(avr), 'is <= config.busy_interval', _this.ms_to_time(b.channels[chan].config.busy_interval / 2));
						callback(false);
					}
				} else {
					b.channels[chan].log.debug('FALSE since last speak', _this.ms_to_time(since_last_speak), 'is <', _this.ms_to_time((b.channels[chan].config.busy_interval * 2)));
					callback(false);
				}
			} else {
				b.channels[chan].log.warn('FALSE less than 4 messages in db');
				callback(false);
			}
		}, chan);
	}


	/* -------------- PONG TIMERS --------------------- */
	// functions that need timers, runs off server ping/pong

	get_pong_time_left(cb_name, callback){
		var _this = this;
		var pong_epoc = (new dateWithOffset(0)).getTime(); //now

		db.get_data('/pong/cbs/' + cb_name, function(cb_last){
			if(cb_last !== null){
				var time_left = (cb_last + b.cbs[cb_name].ms) - pong_epoc;
				callback(time_left > 0 ? _this.ms_to_time(time_left) : 0);
			} else {
				callback(null);
			}
		});
	}

	pong_exists(cb_name, callback){
		db.get_data('/pong/cbs/' + cb_name, function(cb_last){
			callback(cb_last !== null)
		});
	}

	//timers that run on intervals based off ping/pong on server
	add_pong(cb_name, ms, cb_func, run_once){
		var _this = this;
		var pong_epoc = (new dateWithOffset(0)).getTime(); //now

		b.log.debug('PONG ADD', cb_name, 'time:', _this.ms_to_time(ms));
		b.cbs[cb_name] = {
			ms: ms,
			func: cb_func,
			run_once: run_once
		};

		db.update('/pong/cbs/' + cb_name, pong_epoc, true);
	}

	remove_pong(cb_name){
		b.log.debug('PONG DELETE', cb_name);
		delete b.cbs[cb_name];
		db.delete('/pong/cbs/' + cb_name)
	}

	//update pong time, run any pong timers in queue
	pong(){
		var _this = this;
		var pong_epoc = (new dateWithOffset(0)).getTime(); //now

		_this.check_reminders();


		db.update('/pong/now', pong_epoc, true); //set now
		for(var cb_func in b.cbs){ //loop thru open pong cbs
			db.get_data('/pong/cbs/' + cb_func, function(cb_last){
				if(cb_last !== null){ //if last loop time is not null...
					b.log.trace(cb_func, _this.ms_to_time(b.cbs[cb_func].ms), _this.ms_to_time(pong_epoc - cb_last))
					if(pong_epoc >= (cb_last + b.cbs[cb_func].ms)){ //if now >= last loop time + pong cb time length, run function
						b.cbs[cb_func].func(cb_func);
						b.log.debug('PONG RUN:', (b.cbs[cb_func].run_once ? 'once' : 'loop') , cb_func);

						if(b.cbs[cb_func].run_once){
							_this.remove_pong(cb_func);
						} else {
							b.log.debug('PONG SET:NOW', cb_func);
							db.update('/pong/cbs/' + cb_func, pong_epoc, true);
						}
					} else {
						//b.log.debug('PONG SKIP', cb_func, 'wait:', _this.ms_to_time((cb_last + b.cbs[cb_func].ms) - pong_epoc));
					}
				} else { //if pong cb last loop time has never been updated, set to now
					b.log.debug('PONG SET:NOW (was null)', cb_func);
					db.update('/pong/cbs/' + cb_func, pong_epoc, true);
				}
			});
		}
	}

	/* -------------- CACHE DATA --------------------- */
	// for saving data to pull later, good for API calls that have limits on them

	add_cache(path, data, timer, case_insensitive){
		var cache_data = {
			date: (new dateWithOffset(0)).getTime(),
			timer: timer,
			data: data
		};

		db.update(path, cache_data, true, undefined, case_insensitive);
	}

	get_cache(path, succ, fail, case_insensitive){
		db.get_data(path, function(d){
			if(d !== null){
				var now = (new dateWithOffset(0)).getTime();
				if(now >= (d.timer + d.date)){
					db.delete(path, function(act){
						b.log.debug('get_cache fail 1', path);
						fail();
					}, case_insensitive);
				} else {
					b.log.debug('get_cache succ', path);
					succ(d.data);
				}
			} else {
				b.log.debug('get_cache fail 2', path);
				fail();
			}
		}, case_insensitive);
	}

	delete_cache(path, case_insensitive){
		db.delete(path, function(act){}, case_insensitive);
	}

	/* -------------- Formatting bot output --------------------- */
	//colors, scores, monospace, etc

	//generate color coded 'score'
	//red <= 25%, brown <= 50%, orange <= 75%, green <= 95%, cyan > 95%
	score(score, options){
		options = Object.assign({}, {
			config: config.chan_default,
			max: 100, //max score amount
			min: 0, //min score amount
			end: '', //what comes after score number. default none, if % used, score should be a decimal value, like .0563 will convert to 5.6%
			ignore_perc: false, //don't * 100 if end === %
			score_str: null,
			reverse: false,
			colors: [ //what colors to parse, must start with 100
				{'%':100, c:'cyan'},
				{'%':95, c:'green'},
				{'%':75, c:'olive'},
				{'%':50, c:'brown'},
				{'%':25, c:'red'}
			]
		}, options);

		if(options.reverse){
			var new_colors = [];
			options.colors.forEach(function(col, i){

				var c = {
					'%': i < options.colors.length - 1 ? 100 - options.colors[i + 1]['%'] : 100,
					c: options.colors[i].c
				};

				new_colors.unshift(c);
			});
			options.colors = new_colors;
		}

		if(options.end === '%' && options.ignore_perc === false){
			score = Number((parseFloat(score) * 100).toFixed(1));
		} else {
			score = parseInt(score, 10);
		}

		if(options.config.disable_colors){

			return (options.score_str === null ? score : options.score_str) + options.end;

		} else {

			options.max = parseInt(options.max, 10);
			options.min = parseInt(options.min, 10);

			var colors = JSON.parse(JSON.stringify(options.colors));
			var first_color = colors[0].c;
			var score_perc = (((score - options.min) / (options.max - options.min)) * 100).toFixed(2);

			colors.push({'%': score_perc});

			colors.sort(function(a, b){
				return b['%'] - a['%'];
			});

			var index = 0;
			for(var i = 0; i < colors.length; i++){
				if(!colors[i].c){
					index = i;
					break;
				}
			}

			var color = colors[i - 1] ? colors[i - 1].c : first_color;

			return c[color]((options.score_str === null ? score : options.score_str) + options.end);
		}
	};

	//inserts zero width no-break space character in irc nick so it doesn't ping users
	no_highlight(nick){
		if(nick === undefined) return '';
		return nick.slice(0,1) + "\uFEFF" + nick.slice(1, nick.length);
	};


	/* returns string formatted with color codes.
	if plugin has colors:true, then command_str will be formatted.

		&b &bold
		&i &italic
		&u &underline
		&r &reset

		-colors can use color id, or any of the array values below
		&0 &white
		&11 &cyan &aqua
		etc.

		typing: &lime>green text here
		returns: \u00039>green text here
		displays: >green text here (in green in irc window)
	*/
	format(str, CHAN){
		var cobj = {
			'\u00030':  [ '0', 'white'],
			'\u00031':  [ '1', 'black'],
			'\u00032':  [ '2', 'navy', 'darkblue'],
			'\u00033':  [ '3', 'green', 'darkgreen', 'forest'],
			'\u00034':  [ '4', 'red'],
			'\u00035':  [ '5', 'brown', 'maroon', 'darkred'],
			'\u00036':  [ '6', 'purple', 'violet'],
			'\u00037':  [ '7', 'olive', 'orange'],
			'\u00038':  [ '8', 'yellow'],
			'\u00039':  [ '9', 'lightgreen', 'lime'],
			'\u000310': [ '10', 'teal'],
			'\u000311': [ '11', 'cyan', 'aqua'],
			'\u000312': [ '12', 'blue', 'royal'],
			'\u000313': [ '13', 'pink', 'lightpurple', 'fuchsia'],
			'\u000314': [ '14', 'gray', 'grey'],
			'\u000315': [ '15', 'lightgray', 'lightgrey', 'silver'],
			'\u001f':   ['underline', 'u'],
			'\u0016':   ['italic', 'i'],
			'\u0002':   ['bold', 'b'],
			'\u000f':   ['reset', 'r']
		};


		if(CHAN.config.disable_colors){
			for(var cid in cobj){
				for(var i = 0; i < cobj[cid].length; i++){
					str = str.replace(new RegExp('&' + cobj[cid][i], 'g'), '');
				}
			}

			return str;

		} else {
			var col_count = 0;
			for(var cid in cobj){
				for(var i = 0; i < cobj[cid].length; i++){
					var reg_col = new RegExp('&' + cobj[cid][i], 'g');
					if(str.match(reg_col) !== null) col_count++;
					str = str.replace(reg_col, cid);
				}
			}

			return str + (col_count > 0 ? '\u000f' : '');
		}
	}

	//convert text to unicode monospace
	to_monospace(text){
		var monospace = {
			a: '𝚊', b: '𝚋', c: '𝚌', d: '𝚍', e: '𝚎', f: '𝚏', g: '𝚐', h: '𝚑', i: '𝚒', j: '𝚓', k: '𝚔', l: '𝚕', m: '𝚖',
			n: '𝚗', o: '𝚘', p: '𝚙', q: '𝚚', r: '𝚛', s: '𝚜', t: '𝚝', u: '𝚞', v: '𝚟', w: '𝚠', x: '𝚡', y: '𝚢', z: '𝚣',
			A: '𝙰', B: '𝙱', C: '𝙲', D: '𝙳', E: '𝙴', F: '𝙵', G: '𝙶', H: '𝙷', I: '𝙸', J: '𝙹', K: '𝙺', L: '𝙻', M: '𝙼',
			N: '𝙽', O: '𝙾', P: '𝙿', Q: '𝚀', R: '𝚁', S: '𝚂', T: '𝚃', U: '𝚄', V: '𝚅', W: '𝚆', X: '𝚇', Y: '𝚈', Z: '𝚉',
			0: '𝟶', 1: '𝟷', 2: '𝟸', 3: '𝟹', 4: '𝟺', 5: '𝟻', 6: '𝟼', 7: '𝟽', 8: '𝟾', 9: '𝟿', ' ': ' ', '．': '﹒', '-': '—'
		}

		var mono_txt = [...text].map(function(letter){
			return monospace[letter] ? monospace[letter] : letter;
		});
		return mono_txt.join('');
	}



	/* -------------- Interacting with Obj/Arr --------------------- */

	//speak object
	input_object(obj, key_arr, new_val, callback, options){
		var _this = this;
		options = Object.assign({}, {
			ignore: [], //keys to ignore
			skip_keys: false //skip key label
		}, options);

		var response = [];
		var last_key = key_arr && key_arr.length > 0 ? key_arr[key_arr.length - 1] : '';

		function search_obj(objj, keys, i, callback){
			if(keys[i] !== undefined && objj[keys[i]] !== undefined && options.ignore.indexOf(key_arr[i]) < 0){
				b.log.debug(keys[i], i, objj[keys[i]]);
				if(keys[i + 1] !== undefined){
					search_obj(objj[keys[i]], key_arr, i + 1);
				} else {
					if(typeof objj[keys[i]] === 'object'){
						for(var key in objj[keys[i]]){
							if(options.ignore.indexOf(key) > -1) continue;
							parse_val(key, objj[keys[i]][key], typeof objj[keys[i]][key], 1);
						}
						return true;
					} else {
						parse_val(last_key, objj[keys[i]], typeof objj[keys[i]], 2);
						return true;
					}
				}
			} else if (keys.length === 0){
				if(typeof objj === 'object'){
					for(var key in objj){
						if(options.ignore.indexOf(key) > -1) continue;
						parse_val(key, objj[key], typeof objj[key], 3);
					}
					return true;
				} else {
					parse_val(last_key, objj, typeof objj, 4);
					return true;
				}
			} else {
				return false;
			}

			return true;
		}

		function validate(old_val, new_val){
			if(typeof old_val === 'number'){
				return +new_val;
			} else if(typeof old_val === 'boolean'){
				if(new_val.toLowerCase() === 't' || new_val.toLowerCase() === 'true') return true;
				if(new_val.toLowerCase() === 'f' || new_val.toLowerCase() === 'false') return false;
			} else if(typeof old_val === 'string' && new_val !== null){
				return new_val + '';
			} else if(typeof old_val === 'object' && Array.isArray(old_val)){
				return new_val.split(/,\s*/g);
			}
			return null;
		}

		function parse_val(key, val, type, n){
			b.log.debug(key, val, type, n)
			switch(type){
				case 'object':
					if(Array.isArray(val)){
						var sub = (_this.input_object(val, [], {skip_keys: true})).join(', ');
						if(sub.length > 50) sub = sub.slice(0, 100) + '\u000f...';
						response.push(c.red('(arr) ' + (options.skip_keys ? '' : key + ': ')) + '[' + sub + ']');
					} else {
						var sub = (_this.input_object(val, [], {ignore: options.ignore})).join(', ');
						if(sub.length > 50) sub = sub.slice(0, 100) + '\u000f...';
						response.push(c.olive('(obj) ' + (options.skip_keys ? '' : key + ': ')) + '{' + sub + '}');
					}

					break;
				case 'string':
					response.push(c.teal('(str) ' + (options.skip_keys ? '' : key + ': ')) + '\'' + val + '\'');
					break;
				case 'boolean':
					response.push(c.green('(bool) ' + (options.skip_keys ? '' : key + ': ')) + val);
					break;
				case 'number':
					response.push(c.yellow('(int) ' + (options.skip_keys ? '' : key + ': ')) + '\u000f' + val);
					break;
				default:
					response.push(c.purple('(' + typeof val + ') ' + (options.skip_keys ? '' : key + ': ')) + val);
					break;
			}
		}


		var rtn = search_obj(obj, key_arr || [], 0);
		return rtn === false ? {err: key_arr[0] + ' not found in object'} : response;
	}


	update_config(conf_data, chan){
		if(chan){
			var file = __botdir + '/chan_config/config_' + chan + '.json';
		} else {
			var file = __botdir + '/config.json';
		}

		jsonfile.writeFile(file, conf_data, {spaces: 4}, function(err) {
		  b.log.error(err);
		});
	}

	/* -------------- POLLING (for !poll and !vote) --------------------- */

	say_poll(CHAN, poll, callback){
		var _this = this;
		var say_arr = [];
		var results = poll.answers.map(function(answer, i){
			return {
				id: i,
				answer: answer,
				score: 0
			}
		});
		var total_votes = 0;

		if(poll.votes){
			for(var user in poll.votes){
				results[poll.votes[user]].score++;
				total_votes++;
			}
		}

		if(poll.status === 'open'){
			_this.get_pong_time_left('polls' + CHAN.chan, function(time_left){
				say_arr.push(CHAN.t.highlight('To vote, please type ' + config.command_prefix + 'vote <id of answer>'));
				say_arr.push(CHAN.t.warn(poll.question) + ' ' + CHAN.t.fail('Time left: ' + time_left));

				for(var i = 0; i < poll.answers.length; i++){
				   say_arr.push(CHAN.t.highlight2('[' + (i+1) + ']' ) + ' ' + poll.answers[i] + ' ' + (total_votes > 0 ? x.score(results[i].score, {max: total_votes, config: CHAN.config, score_str: '(' + results[i].score + ')'}) : ''));
				}

				callback(say_arr);
			});
		} else if (poll.status === 'closed'){

			results.sort(function(a, b) { return a.score - b.score; });
			var score_arrs = {};

			say_arr.push(CHAN.t.highlight('Poll results for: ') + CHAN.t.warn(poll.question));

			for(var i = 0; i < results.length; i++){
				score_arrs[results[i].score] = score_arrs[results[i].score] || [];
				score_arrs[results[i].score].push(results[i].answer);
			}

			var scores = (Object.keys(score_arrs)).sort(function(a, b){return b-a});

			if(total_votes === 0){
				say_arr.push(CHAN.t.null('No Votes :( ' + score_arrs[0].join('/')));
			} else {
				for(var i = 0; i < scores.length; i++){
					if(i === 0){
						say_arr.push(CHAN.t.success('WINNER: (' + scores[i] + '/' + total_votes + ') ' + score_arrs[scores[i]].join('/')));
					} else {
						say_arr.push(CHAN.t.null('(' + scores[i] + '/' + total_votes + ') ' + score_arrs[scores[i]].join('/')));
					}
				}
			}

			callback(say_arr);

		}
	}

	add_poll(CHAN, args, callback){
		var _this = this;
		var answers = args.answers.split(/\s*-\d\s*/g);
		answers = answers.filter(function(x){ return x !== '' });

		var poll = {
			question: args.question,
			answers: answers,
			status: 'open',
			time: (new dateWithOffset(0)).getTime(),
			votes: { }
		};

		polls_db.update('/' + CHAN.chan + '[]', poll, true, function(act){
			_this.add_pong('polls' + CHAN.chan, CHAN.config.plugin_settings.poll_timer, function(cb_func){
				var chan = (cb_func.split('polls'))[1];
				_this.close_current_poll(b.channels[chan], function(result){
					b.channels[chan].say(result, 1, {to: chan, skip_verify: true, ignore_bot_speak: true, skip_buffer: true, join: '\n'});
				});
			}, true);
			_this.add_pong('polls_reminder' + CHAN.chan, (CHAN.config.plugin_settings.poll_timer - 60000), function(cb_func){
				var chan = (cb_func.split('polls_reminder'))[1];

				polls_db.get_data('/' + chan + '[-1]', function(poll){
					if(poll !== null && poll.status === 'open'){
						_this.get_pong_time_left('polls' + chan, function(time_left){
							var str = CHAN.t.fail('Reminder, there is an open poll: ') + CHAN.t.warn(poll.question) + ' ' + CHAN.t.fail('Time left: ' + time_left);
							b.channels[chan].say(str, 1, {to: chan, skip_verify: true, ignore_bot_speak: true, skip_buffer: true, join: '\n'});
						});
					}
				});
			}, true);

			_this.say_poll(CHAN, poll, callback);
		});
	}

	vote(CHAN, USER, args, poll, callback){
		var nick = USER.nick_org ? USER.nick_org : USER.nick;

		if(poll.status !== 'open'){
			callback({err: 'Voting is closed for this poll! Open a new poll to vote.'});
			return;
		}

		if(poll.votes[nick] !== undefined){
			callback({err: 'You have already voted for this poll.'});
			return;
		}

		var answer_id = args.answer_id - 1;

		if(poll.answers[answer_id] === undefined){
			callback({err: 'No answer with id ' + args.answer_id});
			return;
		}

		var key_search_regex = '^' + nick.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$';
		var case_insensitive_regex = new RegExp(key_search_regex, 'i');

		if(!poll.votes){
			poll.votes = {};
			poll.votes[nick] = (args.answer_id - 1)
		} else {
			var match_key = false;
			for(var key in poll.votes){
				if(key.match(case_insensitive_regex)){
					poll.votes[key] = answer_id;
					match_key = true;
					break;
				}
			}

			if(match_key === false) poll.votes[nick] = (args.answer_id - 1);
		}

		polls_db.update('/' + CHAN.chan + '[-1]', poll, true, function(){
			callback({succ: 'voted for ' + args.answer_id + ': ' + poll.answers[answer_id]});
		});
	}

	get_poll(CHAN, USER, args, callback){
		var _this = this;
		polls_db.get_data('/' + CHAN.chan + '[-1]', function(poll){
			if(poll !== null){
				if(Object.keys(args).length === 0){
					_this.say_poll(CHAN, poll, callback);
				} else if (args.question !== undefined && args.answers !== undefined){
					if(poll.status === 'open'){
						callback({err: 'There is currently an open poll, please type ' + config.command_prefix + 'poll -close before creating a new poll'});
					} else {
						_this.add_poll(CHAN, args, callback);
					}
				} else if(args.answer_id !== undefined){
					_this.vote(CHAN, USER, args, poll, callback)
				}
			} else {
				if(Object.keys(args).length === 0 || args.answer_id !== undefined){
					callback({err: 'There are currently no polls'});
				} else if (args.question !== undefined && args.answers !== undefined){
					_this.add_poll(CHAN, args, callback);
				}
			}
		});
	}

	close_current_poll(CHAN, callback){
		var _this = this;
		polls_db.get_data('/' + CHAN.chan + '[-1]', function(poll){
			if(poll !== null && poll.status !== 'closed'){
				poll.status = 'closed';
				polls_db.update('/' + CHAN.chan + '[-1]/status', 'closed', true, function(){
					_this.say_poll(CHAN, poll, callback);
				});
			} else {
				callback({err: 'no poll to close'});
			}
		});
	}

	/* -------------- REMINDER (for !remind) --------------------- */

	set_reminder(USER, CHAN, args, callback){
		var _this = this;

		if((new dateWithOffset(0)).getTime() > args.time){
			callback({err: 'Reminders can only be set in the future!'});
			return;
		}

		db.update('/nicks/' + args.who + '/reminders[]', args, true, function(){
			var str = 'Added reminder for ' + _this.no_highlight(args.who) + ' ' + _this.date_string_to_mdyhms(args.time, args.offset, args.timezone) + ' to ' + args.to_do;
			callback({succ: str});
		});
	}

	check_reminders(){
		var _this = this;
		var now_epoc = (new dateWithOffset(0)).getTime(); //now

		//check for reminders
		db.get_data('/nicks', function(nicks){
			for(var nick in nicks){
				if(nicks[nick].reminders){
					for(var i = nicks[nick].reminders.length - 1; i > -1; i--){
						var remind = nicks[nick].reminders[i];

						if(remind.time <= now_epoc){
							var sent_reminder = false;

							for(var chan in b.channels){
								for(var user in b.channels[chan].users){
									if(b.channels[chan].users[user].nick_org === nick){

										var str = b.channels[chan].t.success('REMINDER ' + nick + ': ');
										if(remind.who_set !== remind.who) str += _this.no_highlight(remind.who_set) + ' set a reminder for you to '
										str += remind.to_do + ' ' + _this.date_string_to_mdyhms(remind.time, remind.offset, remind.timezone);

										b.channels[chan].say(str);

										sent_reminder = true;
									}
								}
							}

							if(sent_reminder){
								db.delete('/nicks/' + nick + '/reminders[' + i + ']', function(done){
									b.log.debug('Removed reminder', done, remind);
								}, nick);
							}
						}
					}
				}
			}
		});
	}

}
