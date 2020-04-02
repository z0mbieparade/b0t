var clones		  = require("clones");

module.exports = class CMDS{
	constructor(complete){
		var _this = this;
		var plugin_dir = __botdir + '/plugins/';
		this.commands			= {};
		this.command_by_plugin   = {};

		fs.readdir(plugin_dir, function(err, filenames) {
			if (err) {
				error(err); 
				return;
			}

			filenames.forEach(function(filename) {
				
				if(filename.indexOf('.') === 0) return;

				var Plugin = require(plugin_dir + filename + '/cmds.js');
				var info = Plugin.info
				var cmds = Plugin.cmds;

				for(var cmd in cmds){

					if(_this.command_by_plugin[cmd] && _this.command_by_plugin[cmd] !== info.name){
						b.log.error('Duplicate command name error, plugin ' + info.name + ' contains a command by the same name! Overwriting command.' )
					}

					_this.command_by_plugin[cmd] = info.name;
					_this.commands[info.name] = _this.commands[info.name] || {info: info, cmds: {}};
					_this.commands[info.name].cmds[cmd] = cmds[cmd];
				}

				b.log.info('*', x.techno(true), info.name, 'Plugin...');
			});


			complete();
		});
	}

	command(cmd, USER){
		var _this = this;
		USER = this.set_user(USER);
		cmd = cmd.toLowerCase();

		if(this.command_by_plugin[cmd]){
			var CMD = _this.commands[_this.command_by_plugin[cmd]].cmds[cmd];
			var perm = CMD.perm ? CMD.perm : '';

			var disabled = true;
			if(CMD.disabled === undefined || CMD.disabled === false) {
				disabled = false;
			} else if(typeof CMD.disabled === 'function'){
				disabled = CMD.disabled();
			}

			if(USER.config.cmd_override && USER.config.cmd_override[cmd]){
				if(USER.config.cmd_override[cmd] === "disabled"){
					disabled = true;
				} else {
					perm = USER.config.cmd_override[cmd];
				}
			} 

			var cmd_data = merge.all([_this.commands[_this.command_by_plugin[cmd]].cmds[cmd], {
				category: _this.command_by_plugin[cmd],
				info: _this.commands[_this.command_by_plugin[cmd]].info,
				perm: perm,
				disabled: disabled
			}]);

			//b.log.debug('cmd_data', cmd_data);

			return cmd_data;
		} else {
			return {'err': 'No command found.'};
		}
	}

	set_user(USER){
		if(!USER){
			return {
				t: b.t,
				perm: '',
				config: config.chan_default
			};
		} else {
			return USER;
		}
	}

	parse_command_input(USER, CHAN, cmd, text){
		var _this = this;
		USER = this.set_user(USER);
		var cmd_data = this.command(cmd, USER);

		if(text === 'help'){
			return {err: 'help'};
		}

		var errors = [];
		var params = cmd_data.params || [];

		var copy_params = clones(params)
		var mapped = map_input(copy_params, text, false, false, 'main');
		//console.log('mapped', require('util').inspect(mapped, true, 10));

		if(errors.length > 0){
			//b.log.error(errors);
			return {err: errors};
		}
		
		var flat = {};
		flatten_map(mapped, false);

		b.log.debug('flat', flat);
		return flat;

		function flatten_map(ps, or){
			for(var p = 0; p < ps.length; p++){
				var param = ps[p];

			   // b.log.debug('flatten_map param', param, 'or:', or);

				if(param.value !== undefined && param.value !== null){
					if(param.key !== undefined){
						flat[param.key.replace(/\s/g, '_')] = param.type && param.type === 'number' ? Number(param.value) : param.value;
					} else if(or === true){
						if(param.type !== undefined && flat[param.type] === undefined){
							flat[param.type] = param.type && param.type === 'number' ? Number(param.value) : param.value;
						} else {
							flat[param.name.replace(/\s/g, '_')] = param.type && param.type === 'number' ? Number(param.value) : param.value;
						} 
					} else {
						if(param.name !== undefined && flat[param.name.replace(' ', '_')] === undefined){
							flat[param.name.replace(/\s/g, '_')] = param.type && param.type === 'number' ? Number(param.value) : param.value;
						} else {
							flat[param.type] = param.type && param.type === 'number' ? Number(param.value) : param.value;
						} 
					}

					if(param.fake) flat = Object.assign({}, param.fake, flat);
				}

				if(param.or) flatten_map(param.or, true);
				if(param.and) flatten_map(param.and);
			}
		}

		function map_input(ps, input, or, or_tree, level){
			//b.log.warn('param:', ps);
			b.log.warn('input:', input, 'or:', or, 'or_tree:', or_tree, 'level:', level);
			var skip_reset = false;

			for(var p = 0; p < ps.length; p++){
				var param = ps[p];
				var opt = false;
				var def = undefined;
				var and_input = input;
				var perm = true;

				function delete_param(reason){
					b.log.warn('DELETE', (param.name ? '"' + param.name + '"' : ''), reason);
					ps.splice(p, 1);
					p--;
				}

				if(param.perm && param.perm !== '' && !_this.check_perm(USER.perm, param.perm)) perm = false;

				if(or === true && skip_reset === true){
					delete_param('skip_reset:' + skip_reset + ' or:' + or);
					continue;
				}

				if(param.optional !== undefined){
					if(typeof param.optional === 'boolean') opt = param.optional;
					if(typeof param.optional === 'function') opt = param.optional();
				}

				if(param.default !== undefined){
					if(typeof param.default === 'function') def = param.default(USER);
					if(typeof param.default !== 'function') def = param.default;
				}

				if(param.type && param.type !== ''){

					var regex = '^\\s*';

					switch(param.type){
						case 'string':
							if(param.name && param.name !== '') regex += '(\\S' + (opt ? '*' : '+') + ')';
							break;
						case 'number':
							if(param.name && param.name !== '') regex += '(\\d' + (opt ? '*' : '+') + ')';
							break;
						case 'flag':
							if(param.name && param.name !== '') regex += '(-' + param.name  + ')';
							break;
						case 'text':
							if(param.name && param.name !== '') regex += '(.' + (opt ? '*' : '+') + ')';
							break;
						default: 
							if(param.name && param.name !== '') regex += '(' + param.type + ')';
							break;
					}

					regex += '(?:\\s+|$)(.*)';

					//b.log.debug(regex, input);

					var matched = input.match(new RegExp(regex));

					//b.log.debug(matched);

					if(matched !== null){
						if(matched[1] === '' && def !== '' && def !== null && def !== undefined){
							param.value = def;
						} else {
							param.value = matched[1];
						}

						//opt === false && 
						if(or !== true){
							input = matched[2];
						} else {
							skip_reset = true;
						}

						and_input = matched[2];

						if(param.ignore){
							delete_param('match, ignore');
							continue;
						}

						if(perm === false){
							errors.push('You don\'t have permission to use ' + (param.name ? param.name : 'this param'));
							delete_param('not enough permission');
							continue;
						}

						if(config.require_nickserv_to_edit_user_data && param.registered && USER.registered === false){
							errors.push('You must register with ' + config.nickserv_nick + ' to use ' + (param.name ? param.name : 'this param'));
							delete_param('requires nickserv register, registered: false');
							continue;
						}
					} else {
						if(def !== undefined && def !== null && def !== ''){
							param.value = def;

							if(param.ignore){
								delete_param('match, ignore');
								continue;
							}
						} else {
							if(!opt && !or){ // && !or_tree){ //not optional, not OR
								param.error = ps[p].error || [];
								param.error.push('REQUIRED');
								errors.push('Missing ' + param.name);
							} else {
								if(param.ignore){
									delete_param('match, ignore');
								} else {
									delete_param('no match, optional:' + opt + ' or:' + or + ' or_tree:' + or_tree);
								}
								continue;
							} 

							//can delete: optional, any OR
							//cannot delete: not optional
						}			
					}

					//b.log.debug(param.name, regex, matched, input);
				} 

				if(perm === false){
					errors.push('You don\'t have permission to use ' + (param.name ? param.name : 'this param'));
					delete_param('not enough permission');
					continue;
				}

				if(param.colors === true && param.value !== undefined && param.value !== null && param.value !== '' && typeof param.value === 'string'){
					param.value = x.format(param.value, CHAN);
				}

				if(param.or){
					var orr = map_input(param.or, input, true, true, 'or'); 
					param.or = orr;
					
					if(orr.length < 1){

						if(opt === true){
							delete_param('orr 0, optional');
							continue;
						} else {
							param.error = ps[p].error || [];
							param.error.push('No matched OR params');
							errors.push('No matched OR params');
						}
					} else if(orr.length > 1){
						param.error = ps[p].error || [];
						param.error.push('Too many OR params: ', orr.length);
						errors.push('Too many OR params');
					}
				} 

				if(param.and) param.and = map_input(param.and, and_input, false, or_tree, 'and');
			}

			return ps;
		}
		
	}

	//get syntax for command
	cmd_syntax(USER, cmd, options){
		var _this = this;
		USER = this.set_user(USER);
		
		options = Object.assign({}, {
			short: false, //short default false, returns full syntax, true returns just !cmd <*param> (*optional) (colors)
			micro: false, //micro default false, returns full syntax, true returns just !cmd <*param>
			is_pm: false, //if true, display which commands cannot be used in PM
		}, options);
		options.short = options.short === true || options.micro === true ? true : false;

		var cm = this.command(cmd, USER);

		var syntax = config.command_prefix + cmd;
		var syntax_arr = [];
		var optional = false;
		var colors = false;

		function parse_params(params){
			var param_arr = [];
			for(var i = 0; i < params.length; i++) {
				var str = '';
				var param = params[i];
				var and = [];
				var or = [];
				var opt = false;

				if(param.optional !== undefined){
					if(typeof param.optional === 'boolean') opt = param.optional;
					if(typeof param.optional === 'function') opt = param.optional();
				}

				colors = param.colors ? true : false;

				if(param.perm && param.perm !== '' && !_this.check_perm(USER.perm, param.perm)) continue;

				if(param.name && param.name !== '') str = param.name;

				if(param.and) and = parse_params(param.and);
				if(param.or) or = parse_params(param.or);

				if(param.type && param.type !== ''){
					switch(param.type){
						case 'string':
						case 'text':
						case 'number':
							break;
						case 'flag':
							str = '-' + str;
							break;
						default:
							break;
					}
				}

				//has a name and is not to be ignored
				//is not optional OR has and/or params
				//has no type OR is a flag
				//<str>
				if(param.name && param.name !== '' && !param.ignore &&
					(!opt || (opt && (and.length > 0 || or.length > 0))) &&
					(!param.type || param.type !== 'flag') ){
					str = '<' + (colors ? USER.t.highlight2(str) : str) + '>';
				}

				if(param.name && param.name !== '' && param.ignore) str = USER.t.null(str);

				if(param.perm && param.perm !== '') str += USER.t.success('(' + (param.perm === 'owner' ? 'α' : param.perm) + ')');

				if(param.name && param.name !== '' && (params.or || param.and)){
					str += ' ';
				}

				if(and.length > 0) str += and.join(' ');
				if(or.length > 0) str += '(' + or.join(' | ') + ')';

				if(opt){
					str = USER.t.warn('[') + str + USER.t.warn(']');
					optional = true;
				}
				param_arr.push(str);
			}

			return param_arr;
		}
		
		syntax += ' ' + (parse_params(cm.params || [])).join(' ');

		if(options.micro){
			return syntax;
		} else if(options.short){
			if (cm.perm && cm.perm !== '') syntax = USER.t.success(' ' + (cm.perm === 'owner' ? 'α' : cm.perm)) + syntax;
			if (optional) syntax += USER.t.warn(' [optional]');
			if (colors) syntax += USER.t.highlight2(' colors');
			if (options.is_pm && cm.no_pm === true) syntax += USER.t.null(' no PMs');
			return syntax;
		} else {
			if (cm.perm && cm.perm !== '') syntax = USER.t.success(' (' + (cm.perm === 'owner' ? 'α' : cm.perm) + ')') + syntax;
			if (optional) syntax += USER.t.warn(' [params are optional]');
			if (colors) syntax += USER.t.highlight2(' (accepts colors)');
			if (options.is_pm && cm.no_pm === true) syntax += USER.t.null(' cannot use in PM');

			return USER.t.highlight('Usage: ') + syntax + ' ' + USER.t.highlight('Description: ') + cm.action + '.';
		}
	}


	//returns an array of all commands avaliable for a nick
	verify_commands(USER, options, callback){
		if(USER === undefined){
			b.log.error('Wait for USER init');
			callback(false);
			return;
		}

		var _this = this;
		var cmd_arr = [];
		var cmd_obj = {};

		options = Object.assign({}, {
			help: false, //if true, returns with command syntax
			by_plugin: false, //if true, organizes return object by plugin, instead of alphabetically
			is_pm: false, //if true, warn which commands can't be used in a PM
			ignore_spammy: false, //if true, we treat spammy commands like normal commands
			show_nickserv_err: false //likely don't change this, or spits out a nickserv err for every command if user isn't reg'd
		}, options);

		let requests = (Object.keys(_this.command_by_plugin)).map((cmd) => {
			return new Promise((resolve) => {
				_this.verify_command(USER, cmd, options, function(cmd_str){
					if(cmd_str !== false && cmd_str !== undefined){
						if(options.by_plugin){
						   cmd_obj[_this.command_by_plugin[cmd]] = cmd_obj[_this.command_by_plugin[cmd]] || [];
						   cmd_obj[_this.command_by_plugin[cmd]].push(cmd_str);
						} else {
							cmd_arr.push(cmd_str);
						}
					}
					resolve();
				});
			});
		});

		Promise.all(requests).then(() => { 
			if(options.by_plugin){
				for(var plugin in cmd_obj){
					if(cmd_obj[plugin].length < 1) delete cmd_obj[plugin];
				}

				callback(cmd_obj);
			} else {
				cmd_arr = cmd_arr.sort();
				callback(cmd_arr);
			}
		});
	};

	verify_command(USER, cmd, options, callback){
		if(USER === undefined){
			b.log.error('Wait for USER init');
			callback(false);
			return;
		}

		var _this = this;

		options = Object.assign({}, {
			help: false, //if true, returns with command syntax
			is_pm: false, //if true, warn which commands can't be used in a PM
			ignore_spammy: false, //if true, we treat spammy commands like normal commands
			show_nickserv_err: true //if we require nickserv reg and this is true, shows err if command requires nickserv reg to use
		}, options);

		var chan_config = USER.chan && b.channels[USER.chan] ? b.channels[USER.chan].config : config.chan_default;
		var cmd_data = this.command(cmd, USER)

		//if not exists, return
		if(cmd_data.err) {
			b.log.error('No command with that name in commands object');
			callback(false);
			return;
		}

		//skip if command has disabled = true
		var disabled = true;
		if(cmd_data.disabled === undefined || cmd_data.disabled === false) {
			disabled = false;
		} else if(typeof cmd_data.disabled === 'function'){
			disabled = cmd_data.disabled();
		}

		if(disabled){
			b.log.debug('skipping ' + config.command_prefix + cmd + ' because disabled');
			callback(false);
			return;
		}

		//skip if missing api key in info that is required in command api arr
		if(cmd_data.API){
			for(var i = 0; i < cmd_data.API.length; i++){
				var api_cat = cmd_data.API[i].split('|');

				var api_found = false;
				for(var j = 0; j < api_cat.length; j++){
					if(config.API && config.API[api_cat[j]] && config.API[api_cat[j]].key){
						api_found = true;
					}
				}

				if(api_found === false){
					b.log.debug('skipping ' + config.command_prefix + cmd + ' because requires ' + api_cat.join(' OR ') + ' api key, but none is provided');
					callback(false);
					return;
				}
			}
		}

		//skip if missing plugin setting in info that is required in settings arr
		if(cmd_data.settings){
			for(var i = 0; i < cmd_data.settings.length; i++){
				var setting_cat = cmd_data.settings[i];
				var setting_arr = setting_cat.split('/');

				if(!chan_config.plugin_settings || !chan_config.plugin_settings[setting_arr[0]]){
					b.log.debug('skipping ' + config.command_prefix + cmd + ' because requires ' + setting_arr[0] + ' plugin_setting, but none is provided');
					callback(false);
					return;
				} 

				var setting = chan_config.plugin_settings[setting_arr[0]];
				if(setting_arr.length > 1){
					for(var s = 1; s < setting_arr.length; s++){
						if(setting[setting_arr[s]] !== '' && setting[setting_arr[s]] !== null && setting[setting_arr[s]] !== undefined){
							setting = setting[setting_arr[s]];
						} else {
							b.log.debug('skipping ' + config.command_prefix + cmd + ' because requires ' + setting_cat + ' plugin_setting, but none is provided');
							callback(false);
							return;
						}
					}
				}
			}
		}

		var return_true_syntax;
		if(options.help){ //show long syntax
			return_true_syntax = _this.cmd_syntax(USER, cmd, options);
		} else {
			if(options.is_pm && cmd_data.no_pm){
				return_true_syntax = USER.t.null(config.command_prefix + cmd);
			} else {
				return_true_syntax = config.command_prefix + cmd;
			}

			if(cmd_data.perm && cmd_data.perm !== '') return_true_syntax += USER.t.success('(' + (cmd_data.perm === 'owner' ? 'α' : cmd_data.perm) + ')');

			if(config.require_nickserv_to_edit_user_data && cmd_data.registered && USER.registered === false) return_true_syntax += USER.t.fail('(ns)');
		}

		//if we require nickserv to edit this command, and user is not registered, skip command
		if(config.require_nickserv_to_edit_user_data && cmd_data.registered && USER.registered === false && options.show_nickserv_err){
			var err_msg = {err: config.command_prefix + cmd + ' command requires registration/ID with NickServ.'};

			if(USER.chan === 'PM'){
				b.pm.say(err_msg, {to: USER.nick});
			} else {
				b.channels[USER.chan].say(err_msg);
			}
			
			b.log.debug('skipping ' + config.command_prefix + cmd + ' because ' + USER.nick + ' is not registered with ' + config.nickserv_nick);
			callback(false)
			return;
		}

		//if this is the owner of the bot, they can run owner only commands, and gain all permissions, otherwise check permissions
		if(!USER.is_owner){
			//if this is a command with 'owner' for permissions, and this is not the owner, skip
			if(cmd_data.perm && cmd_data.perm === 'owner'){
				b.log.debug('skipping ' + config.command_prefix + cmd + ' because ' + USER.nick + ' is not the owner');
				callback(false);
				return;
			}

			//skip if required perms not met
			if(_this.check_perm(USER.perm, cmd_data.perm) === false){
				b.log.debug('skipping ' + config.command_prefix + cmd + ' because ' + USER.nick + ' does not have permission (has:' + USER.perm + ' needs:' + cmd_data.perm + ')');
				callback(false);
				return;
			} 

			//check if command is 'spammy' and if so, see when it was last called
			if(cmd_data.spammy && options.is_pm !== true && options.ignore_spammy === false){
				x.check_speak_timeout(USER.chan + '/spammy/' + cmd, b.channels[USER.chan].config.limit_spammy_commands, function(wait_ms){
					if(wait_ms){
						b.log.warn(USER.CHAN.chan, 'spammy, wait', _this.ms_to_time(wait_ms));
						b.channels[USER.chan].say({err: 'spammy, wait ' + _this.ms_to_time(wait_ms) + ' before you can use ' + config.command_prefix + cmd + ' in chat.'});
						callback(false);
						return;
					} else {
						x.update_speak_time(USER.chan + '/spammy/' + cmd, 1);
						callback(return_true_syntax)
						return;
					}
				})
			} else {
				callback(return_true_syntax)
			}
			return;
		}

		callback(return_true_syntax);
	}
	

	//user_perm = user permission to test
	//need_perm = permission needed (at least)
	check_perm(user_perm, need_perm){
		return need_perm !== '' && config.permissions.indexOf(user_perm) < config.permissions.indexOf(need_perm) ? false : true;
	}
}
