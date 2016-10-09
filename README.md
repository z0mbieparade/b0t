# b0t
irc node bot with trakt.tv, last.fm, urban dictionary, and more functionality

## Installation
In the directory you want to install the b0t, run:
```
cd b0t
npm install
git submodule foreach "npm install"
```
If you run into errors durring the install try running these commands:
```
npm update -g
run npm cache clear
```
And then run install again.
```
npm install
```

In the b0t folder, you should see a config.example.json. We want to make a copy of this file, and name it config.json.
```
cp config.example.json config.json
```
Open it in your favorite editor, nano, vim, etc.
```
vim config.json
```
----------

## Configuration

Go thru your new config.json file, line by line and make sure you have everything entered correctly.

key | description | example
--- | ----------- | -------
bot_nick  | the nickname your bot has on the irc server | "b0t"
permissions | order these from lowest to highest user permission symbols in the irc. these are used to permission commands if you don't want to give everyone access to a command in the chan. | ["+", "-", "@", "%", "&", "~"]
command_prefix | this is the character that starts every command that the bot listens for. (i.e. !np) | "!"
owner | your irc nick, or whomever owns the bot. | "your_nick"
network_name | the network name for the irc channel. if your bot is running on the same server your irc network is on, you can leave this as localhost. | irc.example.com
channels | an array of channels you want your bot to join. | ["#test1", "#test2"]
reg_password | NickServ registration password. You don't have to have this, but if your bot isn't registered it may cause problems with commands. | "bot_nickserv_pw"
op_password | if your bot is an oper on your network, set their oper password here. | "bot_oper_password"
speak_on_channel_join | What the bot says when it enters the chan. Can either be a string or qotd|string, in which case it will attempt to pull a random topic that was set, or if no topics have been set it will say the string. | "qotd|string"/"string"
voice_users_on_join | will autovoice everyone in the room when they join, or the bot joins. NOTE: atheme uses, if ChanServ baby sits your room, it may de-voice. | true/false
parse_links | parse links in chat, and say their title | true/false
less_chan_spam | action.say() level 2 messages go to notice instead of channel | true/false
limit_bot_speak_when_busy | when true, uses busy_interval (30 sec by default) to determine if the channel is busy, and if that is the case it sends bot messages to notice instead of spamming them in the channel. | true/false
busy_interval | (default 30 sec) If the average time between the last 5 user messages in the channel is <= busy_interval, the channel is determined to be busy. Or, if the last user mesage in the channel is 2x or greater this value, it is not busy. | milliseconds
wait_time_between_commands_when_busy | When channel is busy, how often command output will go to the chan vs to to notice | milliseconds
send_owner_bot_pms | If a user PM's the bot, it will send the output to the owner. If you're using the !speak command as owner, you need this to be true to see user replies. | true/false
debug | Generates more logs in your console. If you're having an issue with the bot, good to set to true, otherwise just leave it as false. | true/false
API | If you would like to use a set of commands that require and API key, you must go register for that API key and copy and paste it here. If you don't want to use a set of commands you can leave the key blank or delete the whole section. Commands relating to that api will be disabled | 

----------

## API Keys

Currently, comes with a handful of plugins, and these are the APIs they use. Here's where to get them, as of the time this readme was written:

**Last.FM** - http://www.last.fm/api/account/create
You will need an api key and a secret. You can enter an app_name here too, otherwise it defaults to b0t.

**Merriam-Webster** - xxx

**YouTube** - https://console.developers.google.com/apis
You will need a google account to use this. The first time you use a youtube command like !yt, the terminal console will throw an error with a link to enable your api key for youtube.

**Trakt.TV** - http://docs.trakt.apiary.io/
You will need an api key here. The docs should have a link for creating your key.

**Weather** - https://www.wunderground.com/weather/api/d/pricing.html
You can get a free key for Weather Underground here, so long as you don't go over a certain number of requests a day. 

**Untappd** - https://untappd.com/api/docs
Untappd.com takes a couple of weeks to approve your api_key and secret.

----------

## Starting your bot

Test your bot out by running
```
node b0t.js
```
If all goes well your bot should start up and join your network and channels. You may want to look into an easier solution to manage your bot, as running it this way can be a bit annoying and hard to maintain. I prefer [forever](https://www.npmjs.com/package/forever) which takes two seconds to set up.

----------

## Bot Commands in plugins that come with b0t. Other plugins should have their own readme.
A list of all of the currently available commands.
You can also type [bot_nick] -owner to bot say it's owner, -version for the bot version, and -link for a link to this repo.

### Default Commands

command | action | default permission | syntax
------- | ------ | ------------------ | ------
commands | list all of the available bot commands for user's permission level | all users | `!commands <*-list>`
set | set the channel topic, chains topics based on last three | all users with voice | `!set <topic>`
qotd | get a random topic | all users | `!qotd`
reg | register a user for any service (lastfm, trakt, location, untappd) | b0t owner | `!reg <service> <irc nick> <data>`
unreg | unregister a user for any service (lastfm, trakt, location, untappd) | b0t owner | `!unreg <service> <irc nick>`
tell | tell another user something when they they are next active | all users | `!tell <irc nick> <message>`
speak | allows owner to speak through bot to channel or to user | b0t owner | `!speak <to> <message>`
tag | have the bot say something when a user enters the room | all users | `!tag <tagline>`
updates | check for updates to b0t script | ops | `!updates`
bug | send a bug report to the owner | all users | `!bug <*-list> <*-delete> <explain>`
request | send a feature request to the owner | all users | `!request  <*-list> <*-delete> <explain>`
mergedb | merge old flatfile db into new json db (needed when upgrading from 0.0.* -> 0.1.* | b0t owner | `!mergedb`

### Last.FM Commands
!np and !wp require a last.fm account, and registration with the bot to use.

command | action | default permission | API | syntax
------- | ------ | ------------------ | ----| ------
np | get last scrobbled song from last.fm | all users | lastfm | `!np <*irc nick>`
yt | get last scrobbled song from last.fm and attempt to locate a youtube video of it | all users | lastfm, youtube | `!yt <*irc nick>`
wp | get all users in current chan w/ registered last.fm nicks last scrobbled song | all users | lastfm | `!wp`
sa | get similar artists by percentage | all users | lastfm | `!sa <*artist>` *uses last !np or !yt artist if none entered
bio | get artist bio | all users | lastfm | `!bio <*artist>` *uses last !np or !yt artist if none entered
lastfm | register your last.fm username with your irc nick | all users | lastfm | `!lastfm <last.fm username>`

### Trakt.TV Commands
!nw and !ww require a trakt.tv account, and registration with the bot to use. Note that trakt.tv accounts must be set to PUBLIC to use with these commands.

command | action | default permission | API | syntax
------- | ------ | ------------------ | ----|------
nw | get last scrobbled show/movie from trakt.tv | all users | trakt | `!nw <*irc nick>`
ww | get all users in current chan w/ registered trakt.tv nicks last scrobbled show/movie | all users | trakt | `!ww`
trend | list top 5 trending movies/shows | all users | trakt | `!trend <-movies|-shows>`
show | get show info | all users | trakt, youtube | `!show <show name>`
movie | get movie info | all users | trakt, youtube | `!movie <movie name`
trakt | register your trakt.tv username with your irc nick | all users | trakt | `!trakt <trakt.tv username>`

### Weather Commands
command | action | default permission | API | syntax
------- | ------ | ------------------ | --- | ------
w | get current weather (if no zip or city/state is used, attempts to get weather for your registered location) | all users | wunderground | `!w <*zip/city, state>`
location | register your location with your irc nick | all users | wunderground | `!location <zip/city, state>`

### Untappd Commands
!ut and !wu require a untappd.com account, and registration with the bot to use.

command | action | default permission | API | syntax
------- | ------ | ------------------ | --- | ------
ut | get last beer drank from untappd.com | all users | untappd | `!ut <*irc nick>`
wu | get all users in current chan w/ registered untappd nicks last checked in beer | all users | untappd | `!wu`
untappd | register your untappd username with your irc nick | all users | untappd | `!untappd <untapped.com username>`

### Dictionary Commands
command | action | default permission | API | syntax
------- | ------ | ------------------ | --- | ------
d | get Merriam-Webster dictionary word definition | all users | Merriam-Webster | `!d <word>`
ud | get urban dictionary term/word definition | all users | - | `!ud <term>`

### Random Commands
A spot for commands that are one-offs.

command | action | default permission | syntax
------- | ------ | ------------------ | ------
8ball | magic 8ball answer | all users | `!8ball <*question>`
stock | get stock info | all users | `!stock <symbol>`

----------

## Modifying Commands
If you wish to modify any of the default command responses, other bot responses, command permissions, or manually disabled commands, you can modify them in plugins/plugin-folder/cmds.js. Keep in mind if you break this file, your bot will be sad. Things might explode.

The **cmds** variable is for each of the bot commands. If a command set requires an API, it's listed under that API section in the main config.json file. There should be an example of what all needs to go in that plugin's api config bit in the plugin folder under config.example.json. If you do not enter an API, that section of commands is disabled automatically.

Command syntax:
*note: commands that have an* * *next to them are optional, and do not throw errors if you do not enter them when calling the command in the channel.*

## Building a Plugin
Shown below is the most basic form of a plugin for the bot. You can look through the ones that come with it to get more of an idea.

    var info = {name: 'LastFM'}
    exports.info = info;

    var cmds = {
        np : { //command name
            action: 'get last scrobbled song from last.fm', //what the command does
            params: ['*irc nick'], //input parameters for command. * means optional.
            register: 'lastfm', //if the command requires registration with the bot, enter the command used to register it here. delete if not needed.
            API: ['lastfm'], //array of requred APIs (named same as in config file) needed to enable this command. delete if not needed.
            func: function(action, nick, chan, args, command_string){
                //action: various useful bot functions.
                //nick: the nick of the user that typed the command
                //chan: the channel it was typed in
                //args: an array of all of the command parameters
                //command_string: the un-exploded version of whatever was typed after the command.
            
               //do stuff here, see other plugins for examples
            }
        }
    }
    exports.cmds = cmds;


----------


### Contributers
Thanks to everyone in oontz, but especially:
- [jrwren](https://github.com/jrwren )
- [plstate](https://github.com/plstate )
- [thegleek](https://github.com/thegleek )