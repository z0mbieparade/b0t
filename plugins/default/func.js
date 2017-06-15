var dateWithOffset  = require("date-with-offset");

var DEF = exports.DEF = function(){};

/*DEF.prototype.validate = function(old_val, new_val){
    if(typeof old_val === 'number'){
        return +new_val;
    } else if(typeof old_val === 'boolean'){
        if(new_val.toLowerCase() === 't' || new_val.toLowerCase() === 'true') return true;
        if(new_val.toLowerCase() === 'f' || new_val.toLowerCase() === 'false') return false;
    } else if(typeof old_val === 'string' && new_val !== null){
        return new_val + '';
    } else if(typeof old_val === 'object' && Array.isArray(old_val)){
        return new_val.split(/,\s*/ //g);
 /*   }
    return null;
}

DEF.prototype.set_config = function(conf, args, callback){
	var _this = this;
    var key_arr = args.settings.split(':');

    var new_val = _this.validate(conf[args[0]], command_string);

    if(conf[key]){
        if(typeof conf[key] !== 'object'){
            if(new_val !== null){
                conf[key] = new_val;
                callback({succ: 'Updated ' + key_arr.join(' ') + ': ' + new_val}, key_arr, conf);
            } else {
                callback({err: 'To change a config setting, please type ' + config.command_prefix + 'config ' + key_arr.join(' ') + ' <' + typeof conf[key] + '>'});
            }
        } else {
            if(Array.isArray(conf[key])){
                conf[key] = new_val;
                callback({succ: 'Updated ' + key_arr.join(' ') + ': [' + new_val.join(', ') + ']'}, key_arr, conf);
            } else {
                if(command_string !== null){
                    args.shift();
                    key_arr.push(args[0]);

                    _this.set_config(conf[key], key_arr, args, command_string, function(response, key_arrr, conff){
                        if(conff) conf[key] = conff;
                        callback(response, key_arrr, conf)
                    });
                } else {
                    callback(x.input_object(conf[key]));
                }
            }
        }
    } else {
        callback({err: 'No setting in config with key \'' + key + '\''});
    }
}*/




            