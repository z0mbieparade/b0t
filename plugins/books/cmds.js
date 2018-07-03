var info = {
    name: 'Books',
    about: 'various book related commands',
    last_book: null,
    last_book_id: null,
    last_author: null,
    last_author_id: null
}
exports.info = info;

if(config.API.goodreads && config.API.goodreads.key !== '') {
    var BK = require(__dirname + '/func.js'),
        bk = new BK();
} else {
    b.log.warn('Missing Goodreads API key!');
}

var cmds = {
    nr: {
        action: 'get last read book from goodreads',
        params: [{
            optional: true,
            name: 'irc nick',
            type: 'string',
            default: function(USER){ return USER.nick; }
        }],
        register: 'goodreads',
        API: ['goodreads'],
        func: function(CHAN, USER, say, args, command_string){
            b.users.get_user_data(args.irc_nick === USER.nick ? USER : args.irc_nick, {col: 'goodreads'}, function(gr_un){
                if(gr_un.err){
                    if(args.irc_nick === USER.nick){
                        say(gr_un, 2);
                    } else {
                        say({err: args.irc_nick + ' does not have a registered goodreads account'}, 2);
                    }
                    return;
                }

                bk.get_user_info(CHAN, args.irc_nick, gr_un, function(d) {
                    if(d.err) return say(d);
                    if(!d.updates.readstatus) return say({err: d.irc_nick + ' has not read any books.'})

                    function format_book(book, color){

                        var genres = [];
                        var authors = [];
                        book.authors.forEach(function(author){
                            if(author.genre.length > 0){
                                author.genre.forEach(function(genre){
                                    if(genres.indexOf(genre) < 0) genres.push(genre);
                                });
                            }

                            if(author.role){
                                authors.push(author.name + ' (' + author.role + ')');
                            } else {
                                authors.push(author.name);
                                info.last_author = author.name;
                                info.last_author_id = author.id;
                            }
                        });

                        var ret = CHAN.t[color](book.title + (book.pub_year ? ' (' + book.pub_year + ')' : '') + (authors.length > 0 ? ' (' + authors.join(', ') + ') ' : ' '));
                        if(book.rating) ret += '[' + x.score(book.rating, {max:5, end:'/5', score_str: parseFloat(book.rating), config: CHAN.config}) + '] ';
                        ret += '(' + (genres.length > 0 ? CHAN.t.highlight(genres.join(', ')) : CHAN.t.null('no genres')) + ')';

                        return ret;
                    }


                    var by_status = {};
                    d.updates.readstatus.forEach(function(read){
                        by_status[read.status] = by_status[read.status] || [];
                        by_status[read.status].push(read);
                    });

                    var str = CHAN.t.highlight(x.no_highlight(d.irc_nick)) + ' ';

                    if(by_status['currently-reading'] && by_status['currently-reading'].length > 0){
                        str += 'is now reading: ';
                        var str_arr = [];

                        by_status['currently-reading'].forEach(function(read, i){
                            if(i < 3) str_arr.push(format_book(read.book, 'success'));
                        });

                        str += str_arr.join(', ');

                    } else if(by_status['read'] && by_status['read'].length > 0){
                        str += 'last read: '

                        var book = by_status['read'][0].book;
                        str += format_book(book, 'null');

                    } else if(by_status['to-read'] && by_status['to-read'].length > 0){
                        str += 'wants to read: '
                        var str_arr = [];

                        by_status['to-read'].forEach(function(read, i){
                            if(i < 3) str_arr.push(format_book(read.book, 'warn'));
                        });

                        str += str_arr.join(', ');
                    } else {
                        return say({err: d.irc_nick + ' has not read any books.'});
                    }

                    say(str, 1, {skip_verify: true});
                });
            });
        }
    },
    ra: {
        action: 'get all users in current chan w/ registered goodreads nicks last read book',
        API: ['goodreads'],
        no_pm: true,
        spammy: true,
        func: function(CHAN, USER, say, args, command_string){
            CHAN.get_all_users_in_chan_data({col: 'goodreads', label: 'Goodreads'}, function(data){

                var currently_reading = [];
                var last_read = [];
                var to_read = [];

                let requests = (Object.keys(data)).map((gr_un) => {
                    return new Promise((resolve) => {
                        bk.get_user_info(CHAN, data[gr_un], gr_un, function(d){
                            if(d.err) {
                                CHAN.log.error(d.err);
                            } else if(!d.updates.readstatus) {
                                CHAN.log.warn('No readstatus for user', gr_un);
                            } else {

                                var by_status = {};
                                d.updates.readstatus.forEach(function(read){
                                    by_status[read.status] = by_status[read.status] || [];
                                    by_status[read.status].push(read);
                                });

                                var status = null;

                                if(by_status['currently-reading'] && by_status['currently-reading'].length > 0){
                                    status = 'currently-reading';
                                } else if(by_status['read'] && by_status['read'].length > 0){
                                    status = 'read';
                                } else if(by_status['to-read'] && by_status['to-read'].length > 0){
                                    status = 'to-read';
                                } else {
                                    CHAN.log.warn('Unknown status for', gr_un, Object.keys(by_status));
                                }

                                if(status !== 'skip'){

                                    var book = by_status[status][0].book;

                                    var genres = [];
                                    var authors = [];
                                    book.authors.forEach(function(author){
                                        if(author.genre.length > 0){
                                            author.genre.forEach(function(genre){
                                                if(genres.indexOf(genre) < 0) genres.push(genre);
                                            });
                                        }

                                        if(author.role){
                                            authors.push(author.name + ' (' + author.role + ')');
                                        } else {
                                            authors.push(author.name);
                                        }
                                    });


                                    var read_data = {
                                        user: d.irc_nick,
                                        status_hidden: status,
                                        title: book.title ? book.title : null,
                                        author: authors.length > 0 ? authors.join(', ') : null,
                                        year: book.pub_year ? book.pub_year : null,
                                        genres: genres.length > 0 ? (genres.splice(0, 2)).join(', ') : 'No Genres'
                                    }

                                    if(status === 'currently-reading'){
                                        currently_reading.push(read_data);
                                    } else if(status === 'read'){
                                        last_read.push(read_data);
                                    } else if(status === 'to-read'){
                                        to_read.push(read_data);
                                    } 
                                }
                            }
                            resolve();
                        });
               
                    });
                });

                Promise.all(requests).then(() => { 

                    var say_data = [currently_reading, last_read, to_read];

                    CHAN.log.debug(say_data);

                    say(say_data, 1, {
                        table: true, 
                        table_opts: {
                            header: true, 
                            outline: false, 
                            cluster: [CHAN.t.success, CHAN.t.null, CHAN.t.warn],
                            cluster_symbols: ['▸', '॥', '◼'],
                            full_width: ['user', 'year'],
                            col_format: {
                                user: function(row, cell){ 

                                    if(row.status_hidden === 'currently-reading'){
                                        return CHAN.t.success(cell);
                                    } else if(row.status_hidden === 'read'){
                                        return CHAN.t.null(cell);
                                    } else {
                                        return CHAN.t.warn(cell);
                                    } 
                                },
                                title: function(row, cell){ return CHAN.t.highlight(cell) },
                                author: function(row, cell){ return CHAN.t.highlight(cell) },
                                year: function(row, cell){ return CHAN.t.highlight(cell) },
                                genres: function(row, cell) { 
                                    return row.genres === 'No Genres' ? CHAN.t.null(cell) : CHAN.t.warn(cell)
                                }
                            }
                        }, 
                        lines: 15, 
                        force_lines: true
                    });

                });
            });
        }
    },
    book: {
        action: 'get info about a book',
        params: [{
            name: 'title',
            type: 'text'
        }],
        API: ['goodreads'],
        func: function(CHAN, USER, say, args, command_string){
            bk.get_book_info_by_title(CHAN, args.title, function(d){
                if(d.err) return say(d);

                info.last_book = d.title;
                info.last_book_id = d.id;
                info.last_author = null;
                info.last_author_id = null;

                var authors = [];
                d.authors.forEach(function(author){
                    if(author.role){
                        authors.push(author.name + ' (' + author.role + ')');
                    } else {
                        authors.push(author.name);
                        info.last_author = author.name;
                        info.last_author_id = author.id;
                    }
                });

                if(info.last_author === null && authors.length > 0){
                    info.last_author = d.authors[0].name;
                    info.last_author_id = d.authors[0].id;
                }

                var data = [
                    CHAN.t.highlight(CHAN.t.term(d.title) + (d.pub_year ? ' (' + d.pub_year + ')' : '')) + ' by ' + CHAN.t.highlight2(authors.join(', ')),
                    'Rating ' + x.score(d.rating, {max:5, end:'/5', score_str: parseFloat(d.rating), config: CHAN.config}) + ' Shelves ' + (d.shelves.length > 0 ? CHAN.t.warn(d.shelves.join(', ')) : CHAN.t.null('none')),
                    CHAN.t.highlight('Summary ') + x.verify_string(d.description)
                ];

                say(data, 1, {skip_verify: true, url: d.url, join: '\n', ellipsis: true, lines: 3, force_lines: true});

            });
        }
    },
    sb: {
        action: 'get similar books, if no title entered uses last book title' ,
        params: [{
            optional: function(){ return info.last_book !== null },
            name: 'title',
            type: 'text',
            default: function(){ return info.last_book === null ? undefined : info.last_book; }
        }],
        API: ['goodreads'],
        func: function(CHAN, USER, say, args, command_string){
            bk.get_book_info_by_title(CHAN, args.title, function(d){
                if(d.err) return say(d);

                info.last_book = d.title;
                info.last_book_id = d.id;
                info.last_author = null;
                info.last_author_id = null;

                var authors = [];
                d.authors.forEach(function(author){
                    if(author.role){
                        authors.push(author.name + ' (' + author.role + ')');
                    } else {
                        authors.push(author.name);
                        info.last_author = author.name;
                        info.last_author_id = author.id;
                    }
                });

                if(info.last_author === null && authors.length > 0){
                    info.last_author = d.authors[0].name;
                    info.last_author_id = d.authors[0].id;
                }

                if(d.similar_books.length === 0) return say({err: 'No similar books found.'});

                var data = [CHAN.t.highlight('Similar to ' + CHAN.t.term(d.title) + ' by ' + authors.join(', ') + ': ')];

                d.similar_books.forEach(function(book){ 
                    data.push(book.title + CHAN.t.null(' by ' + book.authors.join(', ')) + ' ' + x.score(book.rating, {max:5, end:'/5', score_str: parseFloat(book.rating), config: CHAN.config})); 
                });

                say(data, 1, {skip_verify: true, ellipsis: true});
            });
        }
    },
    author: {
        action: 'get author info' ,
        params: [{
            optional: function(){ return info.last_author !== null },
            name: 'name',
            type: 'text',
            default: function(){ return info.last_author === null ? undefined : info.last_author; }
        }],
        API: ['goodreads'],
        func: function(CHAN, USER, say, args, command_string){
            bk.get_author_by_name(CHAN, args.name, function(d){
                if(d.err) return say(d);

                info.last_author = d.name;
                info.last_author_id = d.id;

                var books = [];
                d.books.forEach(function(book){
                    if(books.length > 2) return;
                    books.push(book.title + ' ' + x.score(book.rating, {max:5, end:'/5', score_str: parseFloat(book.rating), config: CHAN.config}));
                });


                var data = [
                    CHAN.t.highlight(CHAN.t.term(d.name)) + CHAN.t.null((d.hometown ? ' from ' + d.hometown : '') + (d.born ? ' ' + d.born + ' - ' + (d.died ? d.died : 'Present') : '')),
                    CHAN.t.highlight('Books(' + d.books.length + ') ') + books.join(', ')
                ];

                if(d.about) data.push(CHAN.t.highlight('Bio ') + x.verify_string(d.about));

                say(data, 1, {skip_verify: true, url: d.url, join: '\n', ellipsis: true, lines: 3, force_lines: true});

            });
        }
    },
    goodreads: {
        action: 'register your goodreads username with your irc nick',
        params: [{
            name: 'goodreads username',
            type: 'string',
            key: 'username'
        }],
        registered: true,
        API: ['goodreads'],
        func: function(CHAN, USER, say, args, command_string){
            b.users.update_user(USER.nick, {goodreads: args.username}, function(msg){
                say(msg, 2);
            });
        }
    }

}
exports.cmds = cmds;
