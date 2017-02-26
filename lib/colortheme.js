var Hash = require('hashish');
var c    = require('irc-colors');


var theme = {
    "text_blocks": "",
    "username": "",
    "highlight": "teal",
    "term": "underline",
    "success": "green",
    "warn": "olive",
    "fail": "red",
    "null": "gray",
    "errors": "red"
};

if(config.theme){
  for(var code in config.theme){
    theme[code] = config.theme[code];
  }
}


Hash(theme).forEach(function(colornames, code) {
    exports[code] = function(str){
      if(config.disable_colors){
        return str;
      } else {
        return c[colornames](str);
      }
    };
});

