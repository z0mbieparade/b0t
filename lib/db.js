var JsonDB      = require('node-json-db'),
    jdb         = new JsonDB(__plugindir + '/db.json', true, true);

function DB(){
    var _this = this;
    //CLEAN DB
    this.get_db_data('/', function(db_root){
        var filter_empty = function(data){
          for(var key in data){
            if(typeof(data[key]) === 'object'){
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
        }

        _this.update_db('/', filter_empty(db_root), true, function(){
            b.log.info('Engaged the quantum Database');
        });
    });
}

DB.prototype.get_db_data = function(path, callback, deep_copy){
    try{
        var data = jdb.getData(path);
        if(deep_copy === true){
            var new_data = JSON.parse(JSON.stringify(data));
        } else {
            var new_data = data;
        }
        callback(new_data);
    }catch(e){
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
