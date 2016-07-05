var config = require('.././config.json');

var LastFmNode = require('lastfm').LastFmNode,
    log = require('log-simple')(null, {debug: config.debug}),
    c = require('irc-colors');

var lastfm = new LastFmNode({
        api_key: config.API.LastFM.api_key,
        secret: config.API.LastFM.secret,
        useragent: 'appname/necr0bot'
    });

var LFM = exports.LFM = function(){}

LFM.prototype.parseTrackInfo = function(track, irc_nick, lfm_nick, wp, callback) {
    var str;

    if (!track) return callback({'err': 'No Track'});

    var tags = (track.toptags instanceof Array) ? track.toptags : [track.toptags];

    var tag_names = [];
    for(var i = 0; i < tags.length; i++)
    {
        if(tags[i] && tags[i].name) tag_names.push(tags[i].name);
    }

    var data = {
        irc_nick: irc_nick,
        now_playing: track.now_playing,
        loved: track.userloved && track.userloved !== '0',
        name: track.name,
        artist: track.artist && track.artist.name ? track.artist.name : '',
        album: track.album && track.album.title ? track.album.title : '',
        play_count: track.userplaycount || 0,
        tags: tag_names
    };

    callback(data);
}

LFM.prototype.getArtistTags = function(track, irc_nick, lfm_nick, wp, callback) {
    var _this = this;
    log.debug('getting artist tags');
    lastfm.request('artist.getTopTags', {
        mbid: track && track.artist && track.artist.mbid,
        artist: track && track.artist && track.artist.name,
        autocorrect: 1,
        handlers: {
            success: function(data) {
                var tags;
                if (data && data.toptags && data.toptags.tag) {
                    tags = (data.toptags.tag instanceof Array) ? data.toptags.tag : [data.toptags];
                } else {
                    tags = [];
                }

                if (tags.length > 0) {
                    track.toptags = tags;
                    _this.parseTrackInfo(track, irc_nick, lfm_nick, wp, callback);
                } else {
                    _this.parseTrackInfo(track, irc_nick, lfm_nick, wp, callback); // no tags
                }
            },
            error: function(err) {
                log.debug('getArtistTags error:', err.stack);
                log.debug('you can probably ignore this error above, this track has no tags.');
                _this.parseTrackInfo(track, irc_nick, lfm_nick, wp, callback); // no tags
            }
        }
    });
}

LFM.prototype.getAlbumTags = function(track, irc_nick, lfm_nick, wp, callback) {
    var _this = this;
    log.debug('getting album tags', track, track.album);
    lastfm.request('album.getTopTags', {
        mbid: track && track.album && track.album.mbid,
        autocorrect: 1,
        handlers: {
            success: function(data) {
                var tags;
                if (data && data.toptags && data.toptags.tag) {
                    tags = (data.toptags.tag instanceof Array) ? data.toptags.tag : [data.toptags];
                } else {
                    tags = [];
                }

                if (tags.length > 0) {
                    track.toptags = tags;
                    _this.parseTrackInfo(track, irc_nick, lfm_nick, wp, callback);
                } else {
                    // get tags from artist
                    _this.getArtistTags(track, irc_nick, lfm_nick, wp, callback);
                }
            },
            error: function(err) {
                // get tags from artist
                log.debug('getAlbumTags error:', err);
                log.debug('you can probably ignore this error above, trying to get tags from artist...');
                _this.getArtistTags(track, irc_nick, lfm_nick, callback); // no tags
            }
        }
    });
}

LFM.prototype.getRecent = function(irc_nick, lfm_nick, wp, callback) {
    var _this = this;
    lastfm.request('user.getRecentTracks', {
        user: lfm_nick,
        limit: 1,
        handlers: {
            success: function(data) {
                if (data && data.recenttracks && data.recenttracks.hasOwnProperty('track')) {
                    var track = (data.recenttracks.track instanceof Array) ? data.recenttracks.track[0] : data.recenttracks.track;
                    var now_playing = track && track.hasOwnProperty('@attr') && track['@attr'].nowplaying === 'true';
                    var date = (track && track.date && track.date['#text']) ? track.date['#text'] : undefined;
                    lastfm.request('track.getInfo', {
                        mbid: track && track.mbid,
                        track: track && track.name,
                        artist: track && track.artist && track.artist['#text'],
                        username: lfm_nick,
                        handlers: {
                            success: function(data) {
                                if (!data || !data.track) {
                                    return callback({'err': 'missing track data'});
                                }

                                data.track.date = date;
                                data.track.now_playing = now_playing;

                                var tags;
                                if (data && data.track && data.track.toptags && data.track.toptags.tag && (data.track.toptags.tag instanceof Array)) {
                                    tags = data.track.toptags.tag;
                                } else {
                                    if ((typeof data.track.toptags === 'string') && (data.track.toptags.length > 0)) {
                                        var tag = data.track.toptags.trim().replace('\\n', '');
                                        tags = [tag];
                                    } else {
                                        tags = [];
                                    }
                                }

                                if (tags.length > 0) {
                                    data.track.toptags = tags;
                                    _this.parseTrackInfo(data.track, irc_nick, lfm_nick, wp, callback);
                                } else {
                                    if (data.album) {
                                        // get tags from album
                                        _this.getAlbumTags(data.track, irc_nick, lfm_nick, wp, callback);
                                    } else {
                                        // get tags from artist
                                        _this.getArtistTags(data.track, irc_nick, lfm_nick, wp, callback);
                                    }
                                }
                            },
                            error: function(err) {
                                log.error('getRecentTrack error:', err);
                                callback({'err': err.message});
                            }
                        }
                    });
                } else {
                    var msg = (wp ? '[' + c.bold(irc_nick) + ']' : c.bold(irc_nick)) + ' hasn\'t scrobbled any tracks yet.';
                    callback({'err': 'hasn\'t scrobbled any tracks'});
                }
            },

            error: function(err) {
                log.error('getRecentTrack error:', err);
                callback({'err': err.message});
            }
        }
    });
}

LFM.prototype.getSimilarArtists = function(artist, callback) {
    var _this = this;
    lastfm.request('artist.getSimilar', {
        artist: artist,
        autocorrect: 1,
        limit: 13,
        handlers: {
            success: function(res) {
                var data = {
                    artist: res.similarartists['@attr'].artist,
                    similar_artists: res.similarartists.artist
                }
                callback(data);
            },
            error: function(err) {
                log.error('getSimilarArtists error: ', err)
                callback({'err': err.message});
            }
        }
    });
}

LFM.prototype.getArtistInfo = function(artist, callback) {
    var _this = this;
    lastfm.request('artist.getInfo', {
        artist: artist,
        autocorrect: 1,
        handlers: {
            success: function(res) {
                var data = {
                    artist: res.artist.name,
                    bio: res.artist.bio.summary
                }
                callback(data);
            },
            error: function(err) {
                log.error('getArtistInfo error: ', err)
                callback({'err': err.message});
            }
        }
    });
}

