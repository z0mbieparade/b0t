# b0t
irc node bot with trakt.tv, last.fm, urban dictionary, and more functionality

## Installation
You can either download this repository, or git clone it into the directory you want your bot installed in. After the folder is in your installation location, run:
```
cd b0t
npm install
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
path | The path to your b0t folder | "/home/user/b0t/"
bot_nick  | the nickname your bot has on the irc server | "b0t"
permissions | order these from lowest to highest user permission symbols in the irc. these are used to permission commands if you don't want to give everyone access to a command in the chan. | ["+", "-", "@", "%", "&", "~"]
command_prefix | this is the character that starts every command that the bot listens for. (i.e. !np) | "!"
owner | your irc nick, or whomever owns the bot. | "your_nick"
network_name | the network name for the irc channel. if your bot is running on the same server your irc network is on, you can leave this as localhost. | irc.example.com
channels | an array of channels you want your bot to join. | ["#test1", "#test2"]
reg_password | NickServ registration password. You don't have to have this, but if your bot isn't registered it may cause problems with commands. | "bot_nickserv_pw"
op_password | if your bot is an oper on your network, set their oper password here. | "bot_oper_password"
API | If you would like to use a set of commands that require and API key, you must go register for that API key and copy and paste it here. DO NOT DELETE THESE SECTIONS. If you don't want to use a set of commands, just leave the api_key section blank. This will automatically disable all of the commands that require the key. | 
debug | Generates more logs in your console. If you're having an issue with the bot, good to set to true, otherwise just leave it as false. | false


----------

## API Keys

Currently, the bot uses 3 different api's that require a key. Here's where to get them, as of the time this readme was written:

**Last.FM** - http://www.last.fm/api/account/create
You will need an api_key and a secret. You can enter an app_name here too, otherwise it defaults to b0t.

**Trakt.TV** - http://docs.trakt.apiary.io/
You will need an api_key here. The docs should have a link for creating your key.

**Weather** - https://www.wunderground.com/weather/api/d/pricing.html
You can get a free key for Weather Underground here, so long as you don't go over a certain number of requests a day. 

----------

## Starting your bot

Test your bot out by running
```
node b0t.js
```
If all goes well your bot should start up and join your network and channels. You may want to look into an easier solution to manage your bot, as running it this way can be a bit annoying and hard to maintain. I prefer [forever](https://www.npmjs.com/package/forever) which takes two seconds to set up.

----------

## Bot Commands
A list of all of the currently available commands.

###Other Commands
general commands that don't have a specific category

command | action | default permission | syntax
------- | ------ | ------------------ | ------
commands | list all of the available bot commands for user's permission level | all users | `!commands`
set | set the channel topic | all users with voice | `!set <topic>`
reg | register a user for any service (lastfm, trakt, location) | owner | `!reg <service> <irc nick> <data>`
unreg | unregister a user for any service (lastfm, trakt, location) | owner | `!unreg <service> <irc nick>`

###Last.FM Commands
!np and !wp require a last.fm account, and registration with the bot to use.

command | action | default permission | syntax
------- | ------ | ------------------ | ------
np | get your last scrobbled song from last.fm | all users | `!np`
wp | get all users in current chan w/ registered last.fm nicks last scrobbled song | all users | `!wp`
sa | get similar artists by percentage | all users | `!sa <artist name>`
bio | get artist bio | all users | `!bio <artist name>`
lastfm | register your last.fm username with your irc nick | all users | `!lastfm <last.fm username>`



###Trakt.TV Commands
!nw and !ww require a trakt.tv account, and registration with the bot to use. Note that trakt.tv accounts must be set to PUBLIC to use with these commands.

command | action | default permission | syntax
------- | ------ | ------------------ | ------
nw | get your last scrobbled show/movie from trakt.tv | all users | `!nw`
ww | get all users in current chan w/ registered trakt.tv nicks last scrobbled show/movie | all users | `!ww`
trakt | register your trakt.tv username with your irc nick | all users | `!trakt <trakt.tv username>`

###Weather Commands

command | action | default permission | syntax
------- | ------ | ------------------ | ------
w | get current weather (if no zip or city/state is used, attempts to get weather for your registered location) | all users | `!w <*zip/city, state>`
location | register your location with your irc nick | all users | `!location <zip/city, state>`

###Urban Dictionary
Note that urban dictionary doesn't require an api key to use.

command | action | default permission | syntax
------- | ------ | ------------------ | ------
ud | get urban dictionary term/word definition | all users | `!ud <term>`


----------

## Modifying Commands
If you wish to modify any of the default command responses, other bot responses, command permissions, or manually disabled commands, you can modify the inc/commands.js file. Keep in mind if you break this file, your bot will be sad.

The **respond** variable is for general bot responses. Formatting is done using the npm package irc-colors, which you can read about here: https://www.npmjs.com/package/irc-colors

The **commands** variable is for each of the bot commands. If a command set requires an API, it's listed under that API section. If you do not enter an API, that section of commands is disabled automatically.

Command syntax:
*note: commands that have an* * *next to them are optional, and do not throw errors if you do not enter them when calling the command in the channel.*

    "Section/API Name from config.json" : {
        "command" : {
            "action": "what action this command attempts to perform",
            "commands": ["input", "*input"],
            "format": function(d){
                if(d && d.err) return er(d.err); //error handling, best to leave this in here.

                //do some stuff with d (data) variable here, return a string for the bot to say in chan.

                return str;
            },
            "perm": "+", //if this section isn't present, all users have permission to use command. Otherwise everyone with a + and up can use it.
            "disabled": true //if you add this it disables the command.
        }
    }   