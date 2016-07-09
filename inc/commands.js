var config = require('.././config.json'),
    c = require('irc-colors');

function score(score)
{
    score = Number((parseFloat(score) * 100).toFixed(1));

    var score_color = c.bold.teal;

    if (score < 25) score_color = c.bold.red;
    else if (score < 50) score_color = c.bold.brown;
    else if (score < 75) score_color = c.bold.olive;
    else if (score < 95) score_color = c.bold.green;

    score_str = score_color(score + '%');

    return score_str;
}

function er(err){ //error handling
    console.log(err);
    return c.bold.red('Error: ' + err);
}

var respond = {
    "err": function(d){
        if(d && d.err) return er(d.err);
    },
    "syntax": function(d){
        if(d && d.err) return er(d.err);
        return 'Please type ' + c.bold.teal(d.syntax) + ' to ' + d.action;
    },
    "enter_room": function(d){  //on chat enter
        if(d && d.err) return er(d.err);
        return 'holla'; 
    },
    "no_users_registered": function(d){
        if(d && d.err) return er(d.err);
        return 'No users registered with ' + c.bold(d.label) + ' currently in the channel';
    },
    "not_registered": function(d){
        if(d && d.err) return er(d.err);

        var register_syntax = config.command_prefix + d.col + ' <' + commands[d.cat][d.col].commands.join('> <') + '>'; 
        return 'Your ' + c.bold(d.label) + ' is not registered! Please type ' + c.bold.teal(register_syntax) + ' to register it';
        
    },
    "cmd_help": function(d){
        if(d && d.err) return er(d.err);

        var str = c.bold.teal('Usage: ') + d.usage + ' ';
        str += c.bold.teal('Description: ') + d.description + '.';
        return str;
    },
    "commands": function(d){
        if(d && d.err) return er(d.err);

        return "Your avaliable commands: " + d.commands.join(', ');
    }
}
exports.respond = respond;

var commands = {
    "other" : {
        "commands": {
            "action": "list all of the available bot commands.",
            "commands": [],
            "format": function(d){
                if(d && d.err) return er(d.err);
                var str = c.bold.teal("Avaliable commands: ") + d.commands.join(', ');
                str += c.red(' (for more info, you can type any command followed by help)');
                return str;
            }
        },
        "set": {
            "action": "set the channel topic",
            "commands": ["topic"],
            "perm": "+",
            "format": function(d){ 
                if(d && d.err) return er(d.err);
                return "Topic set!"; 
            }
        },
        "reg": {
            "action": "register a user for any service (lastfm, trakt, location, untappd)",
            "commands": ["service", "irc nick", "data"],
            "perm": "~",
            "format": function(d){ 
                if(d && d.err) return er(d.err);
                
                var str = c.bold(d.irc_nick) + '\'s ' + d.label + ' has now been set';
                return str;
            }
        },
        "unreg": {
            "action": "unregister a user for any service (lastfm, trakt, location, untappd)",
            "commands": ["service", "irc nick"],
            "perm": "~",
            "format": function(d){ 
                if(d && d.err) return er(d.err);
                
                var str = c.bold(d.irc_nick) + '\'s ' + d.label + ' has now been removed';
                return str;
            }
        }
    },
    "LastFM" : {
        "np" : {
            "action": "get your last scrobbled song from last.fm",
            "commands": [],
            "register": "lastfm",
            "format": function(d){
                if(d && d.err) return er(d.err);

                var title = [];
                if(d.artist !== '') title.push(d.artist);
                if(d.name !== '') title.push(d.name);
                if(d.album !== '') title.push(d.album); 

                var str = c.bold(d.irc_nick) + ' ';
                str += d.now_playing ? 'is now playing: ' + c.bold.green(title.join(' - ')) : 'last played: ' + c.bold.gray(title.join(' - ')) 
                str += ' [' + c.bold(d.play_count + 'x') + '] ' + (d.loved ? c.red('♥') + ' (' : '('); 

                if(d.tags.length > 0){
                    var tags = d.tags.splice(0, 4); //max 4 tags
                    tags = tags.map(function(tag){ return c.teal(tag); });
                    str += tags.join(', ');
                } else {
                    str += c.gray('No Tags');
                }

                str += ')';

                return str;
            }
        },
        "wp" : {
            "action": "get all users in current chan w/ registered last.fm nicks last scrobbled song",
            "commands": [],
            "format": function(d){
                if(d && d.err) return er(d.err);

                var title = [];
                if(d.artist !== '') title.push(d.artist);
                if(d.name !== '') title.push(d.name);
                if(d.album !== '') title.push(d.album); 

                var str = '[ ' + (d.now_playing ? c.bold.green(d.irc_nick) : c.bold.gray(d.irc_nick)) + ' ] ';
                str += c.teal(title.join(' - ')) + ' [' + c.bold(d.play_count + 'x') + '] ' + (d.loved ? c.red('♥') + ' (' : '('); 

                if(d.tags.length > 0){
                    var tags = d.tags.splice(0, 2); //max 2 tags
                    str += tags.join(', ');
                } else {
                    str += c.gray('No Tags');
                }

                str += ')';

                return str;
            }
        },
        "sa" : {
            "action": "get similar artists by percentage",
            "commands": ["artist"],
            "format": function(d){
                if(d && d.err) return er(d.err);

                var str =  c.teal(' Similar to ' + c.bold(d.artist) + ': ');
                var sa = d.similar_artists.map(function(artist){ 
                    return artist.name + ' ' + score(artist.match); 
                });
                str += sa.join(', ');

                return str;
            }
        },
        "bio" : {
            "action": "get artist bio",
            "commands": ["artist"],
            "format": function(d){
                if(d && d.err) return er(d.err);

                var str =  c.teal(' Bio for ' + c.bold(d.artist) + ': ') + d.bio;
                return str;
            }
        },
        "lastfm" : {
            "action": "register your last.fm username with your irc nick",
            "commands": ["last.fm username"],
            "format": function(d){
                if(d && d.err) return er(d.err);

                var str = 'Thanks ' + c.bold(d.irc_nick) + ' your last.fm username was set!';
                return str;
            }
        }
    },
    "TraktTV" : {
        "nw" : {
            "action": "get your last scrobbled show/movie from trakt.tv",
            "commands": [],
            "register": "trakt",
            "format": function(d) {
                if(d && d.err) return er(d.err);

                var str = c.bold(d.irc_nick);
                str += (d.now_watching ? ' is now watching: ' + this.symbols[d.type] + ' ' + c.green.bold(d.title) :
                 ' last watched: ' + this.symbols[d.type] + ' ' + c.gray.bold(d.title));
                str += (d.year !== '' ? ' (' + d.year + ')' : '');
            
                return str;
            },
            "symbols": {
                "episode": "📺",
                "movie": "🎥"
            }
        },
        "ww" : {
            "action": "get all users in current chan w/ registered trakt.tv nicks last scrobbled show/movie",
            "commands": [],
            "format": function(d) {
                if(d && d.err) return er(d.err);

                var str = '[ ';
                str += d.now_watching ? c.bold.green(d.irc_nick) : c.bold.gray(d.irc_nick);
                str += ' ] ' + this.symbols[d.type] + ' ' + c.teal.bold(d.title) + ' ';
                (d.year !== '' ? ' (' + d.year + ')' : '');
            
                return str;
            },
            "symbols": {
                "episode": "📺",
                "movie": "🎥"
            }
        },
        "trakt" : {
            "action": "register your trakt.tv username with your irc nick",
            "commands": ["trakt.tv username"],
            "format": function(d){
                if(d && d.err) return er(d.err);

                var str = 'Thanks ' + c.bold(d.irc_nick) + ' your trakt.tv username was set!';
                return str;
            }
        }
    },
    "UNTAPPD" : {
        "ut" : {
            "action": "get your last beer drank from untappd.com",
            "commands": [],
            "register": "untappd",
            "format": function(d) {
                if(d && d.err) return er(d.err);

                var str = c.bold(d.irc_nick);
                str += ' last drank ' + c.yellow.bold(this.symbols['beer']) + ' ' + c.gray.bold(d.beer_name);
		str += ' (' + d.beer_style + ' - ' + d.beer_abv + '%abv)';
		str += ' (from ' + d.brewery + ')';

		if (d.venue) {
			str += ' (at ' + c.green.bold(d.venue) + ')';
			//UntappdMsg += " on " + checkin.created_at;
		}
            
                return str;
            },
            "symbols": {
                "beer":  "🍺",
                "cider": "🍺",
                "mead":  "🍺",
                "other": "🍺"
            }
        },
        "wu" : {
            "action": "get all users in current chan w/ registered untappd nicks last checked in beer",
            "commands": [],
            "format": function(d) {
                if(d && d.err) return er(d.err);

                var str = '[ ' + c.bold(d.irc_nick) + ' ] ';
                str += c.gray.bold(d.beer_name);
		str += ' (' + d.beer_style + ' - ' + d.beer_abv + '%abv)';
		str += ' (from ' + d.brewery + ')';

		if (d.venue) {
			str += ' (at ' + c.green.bold(d.venue) + ')';
			//UntappdMsg += " on " + checkin.created_at;
		}
            
                return str;
            },
            "symbols": {
                "beer":  "🍺",
                "cider": "🍺",
                "mead":  "🍺",
                "other": "🍺"
            }
        },
        "untappd" : {
            "action": "register your untappd username with your irc nick",
            "commands": ["untappd username"],
            "format": function(d){
                if(d && d.err) return er(d.err);

                var str = 'Thanks ' + c.bold(d.irc_nick) + ' your untappd username was set!';
                return str;
            }
        }
    },
    "Weather" : {
        "w" : {
            "action": "get current weather (if no zip or city/state is used, attempts to get weather for your registered location)",
            "commands": ["*zip/city, state"],
            "register": "location",
            "format": function(d){
                if(d && d.err) return er(d.err);

                var str = 'Weather for ' + c.bold(d.location) + ': ' + this.symbols[d.icon] + ' ' + d.weath + ' ' + d.temp + ' ' + d.humid + ' humidity';
                return str;
            },
            "symbols": {
                "chanceflurries": "🌨",
                "chancerain": "🌧",
                "chancesleet": "🌨",
                "chancesnow": "🌨",
                "chancetstorms": "⛈",
                "clear": "🌞",
                "flurries": "🌨",
                "fog": "🌫",
                "hazy": "",
                "mostlycloudy": "🌥",
                "mostlysunny": "🌤",
                "partlycloudy": "⛅",
                "partlysunny": "⛅",
                "sleet": "🌨🌧",
                "rain": "🌧",
                "snow": "🌨",
                "sunny": "🌞",
                "tstorms": "⛈",
                "cloudy": "🌥"
            }
        },
        "location" : {
            "action": "register your location with your irc nick",
            "commands": ["zip/city, state"],
            "format": function(d){
                if(d && d.err) return er(d.err);

                var str = 'Thanks ' + c.bold(d.irc_nick) + ' your location was set!';
                return str;
            }
        }
    },
    "UrbanDictionary" : {
        "ud" : {
            "action": "get urban dictionary term/word definition",
            "commands": ["term"],
            "format": function(d){
                if(d && d.err) return er(d.err);

                var str = c.teal(' UD ' + c.underline(d.term) + ': ') + ' ' + d.definition;
                if(d.example !== '') str += '\n' + c.teal('i.e. ') + d.example;

                return str;
            }
        }
    }
}
exports.commands = commands;
