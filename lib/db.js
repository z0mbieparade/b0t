var JsonDB      = require('node-json-db'),
    jdb         = new JsonDB(__botdir + '/db.json', true, true);

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
        }

        _this.update_db('/', filter_empty(db_root), true, function(){
            b.log.info('Engaged the quantum Database');
        });
    });
}

//case_insensitive tries to pull the parent node, do regex search, and return that instead
//case_insensitive = path value to search for insensitive 
DB.prototype.get_db_data = function(path, callback, deep_copy, case_insensitive){
    deep_copy = deep_copy === undefined ? true : deep_copy;
    case_insensitive = case_insensitive === undefined ? false : case_insensitive;
    try {

        function get_some_data(pth){
            var data = jdb.getData(pth);
            if(deep_copy === true){
                return JSON.parse(JSON.stringify(data));
            } else {
                return data;
            }
        }

        var new_data = null;

        if(case_insensitive !== false){
            var case_insensitive_regex = new RegExp('^' + case_insensitive + '$', 'i');

            var path_arr = path.split('/');
            path_arr = path_arr.filter(function(x){
                return x !== '';
            });

            var get_path = '/' + (path_arr.splice(0, path_arr.indexOf(case_insensitive))).join('/');
            
            var data = get_some_data(get_path);

            new_data = null;
            for(var key in data){
                if(key.match(case_insensitive_regex)){
                new_data = data[key];
                break;
              }
            }

            if(new_data === null){
                callback(null);
                return;
            };

            path_arr.splice(0, 1);

            function search_data(dat, key){
                if(dat[key] !== undefined) return dat[key];
                return null;
            }

            for(var i = 0; i < path_arr.length; i++){
                var new_data = search_data(new_data, path_arr[i]);
                if(new_data === null) break;
            }
        }
        else 
        {
            new_data = get_some_data(path);
        }
        
        callback(new_data);
    } catch(e) {
        callback(null);
        if(e.message.match(/Can't find dataPath/) === null){
            b.log.warn('get_db_data', e.message)
            //b.log.warn('get_db_data', e);
        }
    }
}

DB.prototype.update_db = function(path, data, overwrite, callback) {
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
