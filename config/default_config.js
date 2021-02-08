/* ----------------------------------------------------------
  * THIS IS THE DEFAULT BASE CONFIG, DO NOT MODIFY THIS FILE *
	 Your custom config will be generated on first start in
	 the base b0t folder, if you don't create one yourself.
   ---------------------------------------------------------- */

exports.default = {
	//Depending on the level here, will see more or less info in your console and log.
	//Default is INFO, which only shows startup messages and fatal warnings. Levels uses are from log4js
	debug_level					: "INFO",

	owner 						: "", //Whomever owns the b0t. "nick!user@ip.address" or "nick!*@*" or "*!user@ip.address" etc.
	send_errors_to_owner_pm 	: false, //This will send errors to the owner's PM.
	send_owner_bot_pms 			: true, //If a user PM's the b0t, it will send the output to the owner. If you're using the !speak command as owner, you need this to be true to see user replies.

	//Order these from lowest to highest user permission symbols in the irc.
	//These are used to permission commands if you don't want to give everyone access to a command in the chan.
	permissions 				: ["", "+", "-", "%", "@", "&", "~", "!"],
	command_prefix 				: "!", //This is the character that starts every command that the b0t listens for. (i.e. !np)

	//If true, then some commands require registration and ID with NickServ before a user can update their data.
	//(Mostly commands that update user data in db, such as !location, !lastfm, !untappd, etc, however the b0t owner can still use !reg to force set these for a user.)
	require_nickserv_to_edit_user_data 	: true,

	bot_nick					: "b0t", //the nickname your b0t has on the irc server
	network_name 				: "localhost", //The network name for the irc channel. if your b0t is running on the same server your irc network is on, you can leave this as localhost.
	nickserv_nick 				: "NickServ", //NickServ service name. Barring some kind of custom setup, NickServ is likely fine.
	nickserv_password			: "", //NickServ registration password. You don't have to have this, but if your b0t isn't registered it may cause problems with commands.
	ircop_password				: "", //If your b0t is an ircop on your network, set their oper password here.

	//These are all the settings that are used to connect the b0t to the server
	//http://node-irc.readthedocs.io/en/latest/API.html
	bot_config: {
		port 			: 6667,
		localAddress 	: null,
		debug 			: false,
		showErrors 		: false,
		autoRejoin 		: false,
		autoConnect 	: true,
		channels 		: [],
		secure 			: false,
		selfSigned 		: false,
		password 		: ""
	},

	chan_default: {
		//The owner of the channel, will +q on entry if make_owner_chan_owner true.
		//"nick!user@ip.address" or "nick!*@*" or "*!user@ip.address" etc.
		chan_owner 				: "",
		make_owner_chan_owner 	: false, //When user listed under "chan_owner" enters the room, or the b0t enters the room, add +q mode to that user.

		//What the b0t says when it enters the chan. Can either be a string or "qotd|string",
		//in which case it will attempt to pull a random topic that was set, or if no topics have been set it will say the string.
		speak_on_channel_join 	: "qotd|holla",

		force_join 				: false, //b0t must have sajoin privileges to use this feature. If room is invite only b0t will attempt to sajoin itself to the room.
		voice_users_on_join 	: false, //Will autovoice everyone in the room when they join, or the b0t joins. NOTE: atheme uses, if ChanServ baby sits your room, it may de-voice.
		parse_links 			: true, //Parse links in chat, and say their title
		respond_to_bot_name 	: true, //When user says the b0t name, b0t will respond with info about itself

		less_chan_spam 			: true, //SAY.say() level 2 messages go to PM instead of channel (errors by default)

		//When true, uses busy_interval to determine if the channel is busy,
		//and if that is the case it sends b0t messages to PM instead of spamming them in the channel.
		limit_bot_speak_when_busy 				: false,
		//If the average time between the last 5 user messages in the channel is <= busy_interval,
		//the channel is determined to be busy. Or, if the last user mesage in the channel is 2x or greater this value, it is not busy.
		busy_interval 							: 30000, // = 30sec
		//When channel is busy, how often command output will go to the chan vs to to PM.
		wait_time_between_commands_when_busy 	: 600000, // = 10min

		//Some commands are considered 'spammy commands' and if flag is true, and a user attempts to do !wp multiple times in a row,
		//it'll wait this length of time before letting them use the command again. Stop user from spamming channel.
		limit_spammy_commands 					: 300000, // = 5min

		//for adding some personality to the b0t (beta)
		//moody				: false,

		//Adds basic infobot functionality: https://github.com/z0mbieparade/b0t/wiki/Info-Bot
		info_bot 			: false,
		//an array of words for info_bot to ignore.
		info_bot_ignore 	: ["who", "what", "wat", "wot", "where", "why", "y", "he", "she", "they", "it", "us", "me", "you", "I", "but", "up"],

		//auto kick/ban users who are inactive for a long enough period of time
		autokb_users_inactive_for: 0, //2629746000 = 1mo, setting a time in ms > 0 enables this setting
		autokb_new_user_threshold: 604800000, // = 1wk, new users that join have this amount of time to speak or be kb. requires above to not be 0

		//disables all color output for b0t in channel, and all color input from users in color accepted commands.
		disable_colors 		: false,

		//if you wish to change the color theme of the commands, you can do so here, otherwise if left out will just set the default theme colors.
		theme: {
			text_blocks 	: "",
			username 		: "",
			highlight 		: "teal",
			highlight2 		: "fuchsia",
			term 			: "underline",
			success 		: "green",
			waiting 		: "blue",
			considering 	: "purple",
			warn 			: "olive",
			fail 			: "red",
			null 			: "gray",
			errors 			: "red"
		},

		//These are plugin specific settings.
		plugin_settings: {
			potd: {
				imgur_album 	: ""
			},
			stock: {
				url 			: ""
			},
			poll_timer 			: 600000 // = 10min
		},

		//If you wish to change command permissions, or disable commands you can do that here.
		cmd_override: {
			wp 			: "+",
			bug 		: "disabled",
			request 	: "disabled"
		}
	},

	//If you would like to use a set of commands that require an API key, you must go register for that API key and copy and paste it here.
	//If you don't want to use a set of commands you can leave the key blank or delete the whole section. Commands relating to that api will be disabled
	API: {

		// https://coinmarketcap.com (!cc crypto command)
		coinmarketcap: {
			key 		: ""
		},

		// https://www.goodreads.com/api You will need an API key and secret. (Book commands)
		goodreads: {
			key 			: "",
			secret 		: ""
		},

		// https://api.imgur.com/ You will need to have an imgur account, and then scroll down on this page to where it say Register an Application.
		// client_id is the key, client_secret is the secret.
		imgur: {
			key 		: "",
			secret 		: ""
		},

		// http://www.last.fm/api/account/create You will need an API key and a secret.
		//You can enter an app_name here too, otherwise it defaults to b0t. (Music/Artist commands)
		lastfm: {
			key 			: "",
			secret 		: "",
			app_name 	: ""
		},

		//https://developer.mapquest.com/ This isn't strictly necessary, but unless you have a wunderground key this improves
		//the openweathermaps location stuff drastically esp for canadians.
		mapquest: {
			key 		: ""
		},

		// http://www.dictionaryapi.com/ You will need to set up an account and then request a dictionary key. (!d command)
		mwdictionary: {
			key 		: ""
		},

		// http://developer.nutritionix.com/admin/access_details (n command)
		nutritionix: {
			key 		: "",
			app_id	 	: ""
		},

		// http://www.openweathermap.org is the new replacement API for wunderground. If you have a wunderground API key that
		//still works, you can continue to use it, but this weather API is free and works just fine.
		//If you want to use any weather/forecast/set location commands you need this or a working wunderground key.
		openweathermap: {
			key 		: ""
		},

		// https://www.themoviedb.org You will need an API key.
		//Movie commands for getting which movies are in theaters
		themoviedb: {
			key 		: ""
		},

		//https://timezonedb.com not necessary PER SAY, but it helps with things like timezone abreviation, location names, etc.
		timezonedb: {
			key 		: ""
		},

		// http://docs.trakt.apiary.io/ You will need an api key here.
		// The docs should have a link for creating your key. (TV/Movie commands)
		trakt: {
			key 		: ""
		},

		// https://developer.twitter.com, you need to register for a dev account, create a project
		// and add an app to it for your irc bot. This will allow you to get an API Key/secret and Bearer token.
		// protip: if it's not working, make sure you're using v2 developer portal. This is currently only used
		// to get the tweet for a twitter link to use as the sup text in irc. So not super important.
		twitter: {
			api_key				: "",
			api_secret		: "",
			bearer_token 	: ""
		},

		// https://untappd.com/api/docs Untappd.com takes a couple of weeks to approve your api_key and secret. (Beer commands)
		untappd: {
			key 			: "",
			secret 		: ""
		},

		// https://whois.whoisxmlapi.com (domain lookup)
		whoisxmlapi: {
			key			: ""
		},

		// https://www.wunderground.com/weather/api/d/pricing.html Unfortunately Wunderground has clamped down on their API
		// usage for non-paying customers. Eventually this will be replaced with something else.
		// (Required for Weather/Forecast, however uses location info for users to set times for other things such as !seen)
		wunderground: {
			key 		: ""
		},

		// http://products.wolframalpha.com/api/ You can get a free appID from here (Required for !wr command)
		wolframalpha: {
			key 		: ""
		},

		// https://console.developers.google.com The youtube API is a bit fiddly, you have to have a gmail account first off.
		// Create credentials, for an API key and then you have to grant access for your server IP your b0t is running on.
		// (Needed !yt, also useful for !movie/!show in trakt commands if no trailer is attached to media info.)
		youtube: {
			key 		: ""
		}
	}

}
