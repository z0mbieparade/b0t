var config  = require('.././config.json'),
    request  = require('request');

var TVM = exports.TVM = function(){}

var get_url = function(url, callback){
  request(url, function (error, response, body) {
    if(error){
        return log.error('Error:', error);
        callback({'err': error})
    }

    if(response.statusCode !== 200){
        return log.error('Invalid Status Code Returned:', response.statusCode);
        callback({'err': 'Invalid Status Code Returned: ' + response.statusCode})
    }

    callback(JSON.parse(body));
  });
}

TVM.prototype.getNextAirdate = function(nick, search, callback) {
  get_url(
    'http://api.tvmaze.com/singlesearch/shows?q=' + search,
    function(t) {
      if(t.err){callback(t); return;} 
      var nextep = JSON.parse(JSON.stringify(t));

      if (t.status == "Running" && t._links.nextepisode) {
        get_url(
          t._links.nextepisode.href,
          function(a) {
            if(a.err){callback(a); return;} 
            var data = {
              season: (a.season < 10 ? '0' + a.season : a.season),
              episode: (a.number < 10 ? '0' + a.number : a.number),
              name: t.name,
              status: t.status,
              airdate: a.airdate
            }

            callback(data);
            return;
          }
        );
      } else if (t.status == "Ended") {
        get_url(
          t._links.previousepisode.href,
          function(a) {
            if(a.err){callback(a); return;} 
            var data = {
              season: (a.season < 10 ? '0' + a.season : a.season),
              episode: (a.number < 10 ? '0' + a.number : a.number),
              name: t.name,
              status: t.status,
              airdate: a.airdate
            }

            callback(data);
            return;
          }
        );
      } else {
        get_url(
          t._links.previousepisode.href,
          function(a) {
            if(a.err){callback(a); return;} 
            var data = {
              season: (a.season < 10 ? '0' + a.season : a.season),
              episode: (a.number < 10 ? '0' + a.number : a.number),
              name: t.name,
              status: t.status,
              airdate: a.airdate
            }

            callback(data);
            return;
          }
        );
      }
    }
  );
};