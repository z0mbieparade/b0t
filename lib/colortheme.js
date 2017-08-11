var Hash = require('hashish');

var theme = {
    "text_blocks": "",
    "username": "",
    "highlight": "teal",
    "highlight2": "fuchsia",
    "term": "underline",
    "success": "green",
    "waiting": "blue",
    "considering": "purple",
    "warn": "olive",
    "fail": "red",
    "null": "gray",
    "errors": "red"
};

function T(theme_config, disable_colors){
  this.disable_colors = disable_colors;
  if(theme_config){
    for(var code in theme_config){
      theme[code] = theme_config[code];
    }
  }
}

Hash(theme).forEach(function(colornames, code) {
  T.prototype[code] = function(str){
      if(this.disable_colors){
        return str;
      } else {
        return c[colornames](str);
      }
    };
});

module.exports = T;