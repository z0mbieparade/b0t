var JsonDB      = require('node-json-db'),
    mv          = require('mv');

module.exports = class DB{
    constructor(options){
        var _this = this;
        this.options = Object.assign({}, {
            db_name: 'db',
            readable: false, //save in human readable format
            on_load: function(db_root){
                return db_root;
            },
            on_empty: function(){
                try {
                    b.log.info('Default ' + options.db_name + ' loaded!');
                    return require(__botdir + '/db/default/./default_' + options.db_name + '.json');
                } catch (e) {
                    b.log.warn('No default ' + options.db_name);
                    return {};
                }
            },
            after_load: function()
            {

            }

        }, options);

        if(!_this.options.db_name_new) _this.options.db_name_new = _this.options.db_name;

        var old_path = __botdir + '/' + this.options.db_name + '.json';
        var new_path = __botdir + '/db/' + this.options.db_name_new + '.json';

        if (!fs.existsSync(new_path) && fs.existsSync(old_path)){
            mv(old_path, new_path, function(err) {
                if(err) {
                    b.log.error('Reverting to old path', err);
                    new_path = old_path;
                } else {
                    b.log.debug('Moved', old_path, 'to', new_path);
                }

                _this.jdb = new JsonDB(new_path, true, _this.options.readable);
                _this.clean_db();
            });
        } else {
            _this.jdb = new JsonDB(new_path, true, _this.options.readable);
            _this.clean_db();
        }
        
    }

    clean_db(){
        var _this = this;
        this.get_data('/', function(db_root){
            function filter_empty(data){
                for(var key in data){

                    if(typeof(data) === 'object' && !Array.isArray(data))
                    {
                        var new_key = _this.fix_key(key);
                        if(new_key !== key)
                        {
                            data[new_key] = data[key];
                            delete data[key];
                            key = new_key;
                        }
                    }

                    if(typeof(data[key]) === 'object' && data[key] !== null && data[key] !== undefined){
                        if(Array.isArray(data[key])){
                            if(data[key].length === 0){ 
                                delete data[key];
                            } else {
                                filter_empty(data[key]);
                            }
                        } else {
                            if(Object.keys(data[key]).length === 0){
                                delete data[key];
                            } else {
                                filter_empty(data[key]);
                            }       
                        }
                    }
                }
                return data;
            }

            if(db_root === null || 
                (typeof db_root === 'object' && Array.isArray(db_root) === false && (Object.keys(db_root)).length === 0) || 
                (typeof db_root === 'object' && Array.isArray(db_root) === true && db_root.length === 0)
            ){
                db_root = _this.options.on_empty();
            }

            db_root = _this.options.on_load(db_root);

            _this.update('/', filter_empty(db_root), true, function(){
                b.log.info('Engaged the quantum ' + _this.options.db_name_new + ' database');
                _this.options.after_load();
            });
        });
    }

    //jsondb doesn't accept non-JS compliant variable first chars (a-zA-Z$_)
    fix_key(key){
        var _this = this;
        if(key.match(/^\#/)){
            b.log.warn(_this.options.db_name, '#key matched', key);
            key = key.replace(/^\#/, '$');
            return key;
        } else if (key.match(/^[^a-zA-Z$_]/)){
            b.log.warn(_this.options.db_name, 'wrong first char key matched', key);
            key = '__$__' + key;
            return key;
        }
        return key;
    }
    fix_path(path){ 
        var _this = this;
        if (path.match(/\/[^a-zA-Z$_]/gm)){
            b.log.warn(_this.options.db_name, 'incorrect keys in path', path);
            var path = path.split('/').map(function(key){
                return _this.fix_key(key);
            }).join('/');
        } 
        return path; 
    }

    //case_insensitive tries to pull the parent node, do regex search, and return that instead
    //case_insensitive = path value to search for insensitive 
    get_data(path, callback, deep_copy, case_insensitive){
        var _this = this;
        path = _this.fix_path(path);

        deep_copy = deep_copy === undefined ? true : deep_copy;
        case_insensitive = case_insensitive === undefined ? false : case_insensitive;
      

        try {

            function get_some_data(pth, clbk){
                var data = _this.jdb.getData(pth);
                if(deep_copy === true){
                    clbk(JSON.parse(JSON.stringify(data)));
                } else {
                    clbk(data);
                }
            }

            if(case_insensitive !== false){
                var path_arr = path.split('/');
                path_arr = path_arr.filter(function(x){
                    return x !== '';
                });

                var p1 = path_arr.slice(0, path_arr.indexOf(case_insensitive));
                var p2 = path_arr.slice(path_arr.indexOf(case_insensitive) + 1);

                _this.merge_case(p1.join('/'), case_insensitive, function(rtn){
                    if(!rtn.err){
                        get_some_data(rtn + (p2.length > 0 ? '/' + p2.join('/') : ''), callback);
                    } else {
                        get_some_data(path, callback);
                    }
                });
            }
            else 
            {
                get_some_data(path, callback);
            }
        } catch(e) {
            if(e.message.match(/Can't Load Database/) !== null){ //fail here, cuz something is W R O N G
                b.log.error('db.get_data', e.message);
                process.exit(1);
            } else {
                if(e.message.match(/Can't find dataPath/) === null){
                    //b.log.warn('db.get_data', e.message);
                    b.log.warn('db.get_data', e);
                }
                callback(null);
            }
        }
    }

    //merges objects in a case insensitive way
    //base_path = base data path to search
    //key = search key case insensitve
    merge_case(base_path, key_search, callback){
        var _this = this;
        base_path = _this.fix_path(base_path);
        key_search = _this.fix_key(key_search);

        try {
            var key_search_regex = '^' + key_search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$';
            var case_insensitive_regex = new RegExp(key_search_regex, 'i');

            var base_path_arr = base_path.split('/');
            base_path_arr = base_path_arr.filter(function(x){
                return x !== '';
            });

            base_path = '/' + base_path_arr.join('/');

            var get_data = _this.jdb.getData(base_path);
            var get_data_arr = [];
            var get_paths = [];

            for(var key in get_data){
                if(key.match(case_insensitive_regex)){
                    get_paths.push(base_path + '/' + key);
                    get_data_arr.push(get_data[key]);
                }
            }


            if(get_paths.length > 0){
                var save_path = get_paths.shift();
                if(get_paths.length === 0){
                    callback(save_path);
                } else {
                    for(var i = 0; i < get_paths.length; i++){
                        _this.jdb.delete(get_paths[i]);
                        b.log.debug('delete dup path', get_paths[i]);
                    }
                    var merge_data = merge.all(get_data_arr);
                    _this.jdb.push(save_path, merge_data, true);

                    b.log.debug('save merged', save_path, merge_data);
                    callback(save_path);
                }
            } else {
                b.log.warn('merge_case: no data found at ' + base_path + '/' + key_search_regex);
                callback({err: 'no data found at ' + base_path + '/' + key_search_regex})
            }
        } catch(e) {
            if(e.message.match(/Can't find dataPath/) === null){
                //b.log.warn('db.merge_case', e.message);
                b.log.warn('merge_case', e);
            }
            callback({err: e.message})
        }
    }

    //case_insensitive tries to pull the parent node, do regex search, and return that instead
    //case_insensitive = path value to search for insensitive 
    update(path, data, overwrite, callback, case_insensitive){
        var _this = this;
        path = _this.fix_path(path);
        case_insensitive = case_insensitive === undefined ? false : case_insensitive;

        try {
            function update_some_data(pth, dat, clbk){
                if(dat === '' || dat === undefined || dat === null){
                    _this.jdb.delete(pth);
                    if(callback) clbk('remove');
                } else {
                    _this.jdb.push(pth, dat, overwrite);
                    if(callback) clbk('add');
                }
            }

            var get_paths = [];

            if(case_insensitive !== false){
                
                var path_arr = path.split('/');
                path_arr = path_arr.filter(function(x){
                    return x !== '';
                });

                var p1 = path_arr.slice(0, path_arr.indexOf(case_insensitive));
                var p2 = path_arr.slice(path_arr.indexOf(case_insensitive) + 1);

                _this.merge_case(p1.join('/'), case_insensitive, function(rtn){
                    if(!rtn.err){
                        update_some_data(rtn + (p2.length > 0 ? '/' + p2.join('/') : ''), data, callback);
                    } else {
                        update_some_data(path, data, callback);
                    }
                });
            }
            else 
            {
                update_some_data(path, data, callback);
            }
        } catch(e) {
            b.log.error('db.update', e);
        }
    }

    delete(path, callback, case_insensitive){
        var _this = this;
        path = _this.fix_path(path);

        try{
            if(typeof(case_insensitive) === 'string'){
                
                var path_arr = path.split('/');
                path_arr = path_arr.filter(function(x){
                    return x !== '';
                });

                var p1 = path_arr.slice(0, path_arr.indexOf(case_insensitive));
                var p2 = path_arr.slice(path_arr.indexOf(case_insensitive) + 1);

                _this.merge_case(p1.length === 0 ? '/' : p1.join('/'), case_insensitive, function(rtn){
                    if(!rtn.err){
                        var data = _this.jdb.delete(rtn + (p2.length > 0 ? '/' + p2.join('/') : ''));
                        if(callback) callback(true);
                    } else {
                       var data = _this.jdb.delete(path);
                        if(callback) callback(true);
                    }
                });
            }
            else 
            {
                var data = _this.jdb.delete(path);
                if(callback) callback(true);
            }
        }catch(e){
            b.log.error('db.delete', e.message)
            if(callback) callback(false);
        }
    }

    //path to array to manage in db, ie: /bugs, /username/tags
    //args are the args from the command
    //id is required by -delete and -edit
    manage_arr(USER, path, args, options, callback){
        var _this = this;
        path = _this.fix_path(path);

        options = Object.assign({}, {
            case_insensitive: false,
            format: function(item){ return item; }
        }, options);

        function loop_thru(){
            b.log.debug('loop_thru');
            _this.get_data(path, function(d){

                if(d === null || d.length < 1){
                    b.log.warn('nothing to loop thru in ' + path);
                    callback({err: 'No data to ' + args.flag}, 3);
                    return;
                }

                var matched = false;
                var matched_arr = [];

                for(var i = 0; i < d.length; i++){
                    var str = USER.t.warn('[' + (i + 1) + '] ') + options.format(d[i]);

                   if(args.id !== undefined && (i + 1) === args.id){
                        if(args.flag === '-delete'){
                            _this.delete(path + '[' + i + ']', function(deleted){
                                if(deleted){
                                    matched = true;
                                    callback({succ: 'Deleted: '  + options.format(d[i])}, 3);
                                    return;
                                } 
                            })
                        } else if(args.flag === '-edit'){
                            d[i] = options.format(args.new_val);
                            _this.update(path, d, true, function(act){
                                matched = true;
                                callback({succ: 'Updated ' + str + ' -> ' + args.new_val}, 3);
                                return;
                            });
                        }
                    } else if (args.id === undefined) {
                        matched = true;
                        matched_arr.push(str);
                    } 
                }

                if (matched === false) {
                    callback({err: 'No value by that id found'}, 2);
                    return;
                } else if(matched === true && matched_arr.length > 0) {
                    callback(matched_arr, 3);
                    return;
                }
            }, true, options.case_insensitive);
        }


        if(args.flag !== '-add'){
            loop_thru();
        } else {
            _this.update(path, [args.new_val], false, function(act){
                callback({succ: 'Added: ' + args.new_val});
            });
        }
    };

    //rand = true, send back a random value if no id or search term set
    //rand = false, send back the last item in the array
    search_arr(USER, path, args, rand, callback, case_insensitive){
        var _this = this;
        path = _this.fix_path(path);

        if(args.query !== undefined){
            if(USER.is_discord_user){
                callback({err: 'Discord users cannot search.'});
                return;
            }
        }

        _this.get_data(path, function(data){
            if(data && data.length > 0){
                if(args.id !== undefined){
                    if(data[args.id] === undefined){
                        callback({err: 'No item with that id found!'}, 0);
                    } else {
                        callback(data[args.id], 1);
                    }
                } else if(args.query !== undefined){
                    var search_vals = {};
                    var count_found = 0;
                    var msg_found = [];
                    for(var i = 0; i < data.length; i++){
                        if(data[i].toLowerCase().indexOf(args.query.toLowerCase().trim()) > -1){
                            count_found++;
                            search_vals[i] = data[i];
                            msg_found.push(USER.t.warn('[' + i + '] ') + data[i]);
                        }
                    }

                    if(count_found === 0){
                        callback({err: 'No values with that search term found!'}, 0);
                    } else if (count_found === 1) {
                        for(var idd in search_vals){
                            callback(data[idd], 1);
                        }
                    } else {
                        callback(msg_found, count_found);
                    }
                } else {
                    if(rand){
                        callback(x.rand_arr(data), 1);
                    } else {
                        callback(data.slice(-1), 1);
                    }
                }
            } else {
                callback({err: 'no values have been set yet!'}, 0);
            }
        }, true, case_insensitive);
    }
}
