module.exports = class MOODY{
	constructor(chan) {
		var _this = this;

		this.chan = chan;
		this.db = new DB({
			readable: true, 
			db_name: 'moody',
			db_name_new: 'moody_' + chan,
			on_load: function(db_root){
				console.log('db_root', db_root);
				_this.data = db_root;
				return db_root;
			},
		});
	}

	action(nick, text){
		if(text.indexOf(bot.nick) < 0) return;

		text = text.replace(bot.nick, '$b').toLowerCase();

		b.log.debug(text);

		var resp = {
			love: ['hugs $n', 'glomps $n', 'cuddles $n', 'giggles'],
			hate: ['kicks $n >:(', 'slaps $n, rude!', 'punches $n'],
			eats: ['nom nom nom', 'slurps loudly', 'stuffs face', 'munches']
		}

		var actions = {
			'loves $b':  				{ mood: 10, bored: -15, resp: resp.love},
			'hugs $b': 					{ mood: 5, bored: -10, resp: resp.love},
			'pets $b':  				{ mood: 2, bored: -5, resp: ['purrrs']},
			'dances for $b':  			{ mood: 5, bored: -5, resp: resp.love},

			'licks $b': 				{ mood: -1, bored: -4, resp: ['takes a bath, gross']},
			'kicks $b':  				{ mood: -10, bored: -1, resp: resp.hate},
			'slaps $b':  				{ mood: -15, bored: -1, resp: resp.hate},
			'punches $b': 				{ mood: -20, bored: -1, resp: resp.hate},

			'feeds $b': 				{ mood: 5, hunger: -25, bored: -5, resp: resp.eats},
			'gives $b a cookie': 		{ mood: 5, hunger: -10, bored: -5, resp: resp.eats},
			'gives $b a snack': 		{ mood: 5, hunger: -10, bored: -5, resp: resp.eats}
		};

		if(actions[text] !== undefined){
			b.log.debug(actions[text], this.data);
			this.update_and_resp(nick, actions[text]);
		}
	}

	update_and_resp(nick, act){
		var _this = this;
		for(var stat in _this.data.stats){
			if(act[stat] !== undefined){
				_this.data.stats[stat] + act[stat];

				if(_this.data.stats[stat] > 100){
					_this.data.stats[stat] = 100;
					_this.max_stat(nick, stat);
				} else if(_this.data.stats[stat] < 0){
					_this.data.stats[stat] = 0;
					_this.min_stat(nick, stat);
				} else {
					b.channels[_this.chan].say(x.rand_arr(act[stat].resp), 1)
				}
			}
		}
	}

	max_stat(nick, stat){

	}

	min_stat(nick, stat){

	}
}