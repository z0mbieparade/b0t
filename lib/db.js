var JsonDB      = require('node-json-db'),
    jdb         = new JsonDB(__botdir + '/db.json', true, true),
    merge       = require('deepmerge');

function DB(){
    var _this = this;
    //CLEAN DB
    this.get_db_data('/', function(db_root){
        var filter_empty = function(data){
            for(var key in data){
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

        if(db_root){
            if(db_root.buffer) delete db_root.buffer;
            if(db_root.speak) delete db_root.speak;
            if(db_root.pong) delete db_root.pong;

            if(db_root.nicks){
                for(var nick in db_root.nicks){
                    delete db_root.nicks[nick].cache;
                }
            }
        }

        _this.update_db('/', filter_empty(db_root), true, function(){
            b.log.info('Engaged the quantum Database');
        });
    });
}

//case_insensitive tries to pull the parent node, do regex search, and return that instead
//case_insensitive = path value to search for insensitive 
DB.prototype.get_db_data = function(path, callback, deep_copy, case_insensitive){
    var _this = this;
    deep_copy = deep_copy === undefined ? true : deep_copy;
    case_insensitive = case_insensitive === undefined ? false : case_insensitive;

    try {

        function get_some_data(pth, clbk){
            var data = jdb.getData(pth);
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
        //b.log.warn('get_db_data', e);
        if(e.message.match(/Can't find dataPath/) === null){
            b.log.warn('get_db_data', e.message)
        }
        callback(null);
    }
}

//merges objects in a case insensitive way
//base_path = base data path to search
//key = search key case insensitve
DB.prototype.merge_case = function(base_path, key_search, callback){
    try {
        var key_search_regex = '^' + key_search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$';
        var case_insensitive_regex = new RegExp(key_search_regex, 'i');

        var base_path_arr = base_path.split('/');
        base_path_arr = base_path_arr.filter(function(x){
            return x !== '';
        });

        base_path = '/' + base_path_arr.join('/');

        var get_data = jdb.getData(base_path);
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
                    jdb.delete(get_paths[i]);
                    b.log.debug('delete dup path', get_paths[i]);
                }
                var merge_data = merge.all(get_data_arr);
                jdb.push(save_path, merge_data, true);

                b.log.debug('save merged', save_path, merge_data);
                callback(save_path);
            }
        } else {
            b.log.warn('merge_case: no data found at ' + base_path + '/' + key_search_regex);
            callback({err: 'no data found at ' + base_path + '/' + key_search_regex})
        }
    } catch(e) {
        //b.log.warn('merge_case', e);
        if(e.message.match(/Can't find dataPath/) === null){
            b.log.warn('merge_case', e.message)
        }
        callback({err: e.message})
    }
}

//case_insensitive tries to pull the parent node, do regex search, and return that instead
//case_insensitive = path value to search for insensitive 
DB.prototype.update_db = function(path, data, overwrite, callback, case_insensitive){
    var _this = this;
    case_insensitive = case_insensitive === undefined ? false : case_insensitive;

    try {
        function update_some_data(pth, dat, clbk){
            if(dat === '' || dat === undefined || dat === null){
                jdb.delete(pth);
                if(callback) clbk('remove');
            } else {
                jdb.push(pth, dat, overwrite);
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
        b.log.error('update_db', e);
    }
}

DB.prototype.update_db_old = function(path, data, overwrite, callback) {
    try{
        if(data === '' || data === undefined || data === null){
            jdb.delete(path);
            if(callback) callback('remove');
        } else {
            jdb.push(path, data, overwrite);
            if(callback) callback('add');
        }
    } catch(e) {
        b.log.error('update_db', e);
    }
}

DB.prototype.delete_from_db = function(path, callback){
    try{
        var data = jdb.delete(path);
        if(callback) callback(true);
    }catch(e){
        b.log.error('delete_from_db', e.message)
        if(callback) callback(false);
    }
}

module.exports = DB;
