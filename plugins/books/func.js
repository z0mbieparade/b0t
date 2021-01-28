module.exports = class BK{
	get_url(CHAN, url, params, callback){

		url = "https://www.goodreads.com/" + url + "?key=" + config.API.goodreads.key;

		for(var key in params){
			url += '&' + key + '=' + encodeURIComponent(params[key].replace(' ', '+'))
		}

		x.get_url(url, 'xml', function(d){
			if(d.err && d.err === 404) return callback({err: 'None found.'});
			if(d.err) return callback({err: 'Something went wrong.'});

			callback(d);

		 }, { return_err: true });
	}

	get_user_info(CHAN, irc_nick, gr_nick, callback) {
		var _this = this;
		this.get_url(CHAN, "user/show/", {username: gr_nick}, function(d){
			if(d.err) return callback(d);

			try{
				var user = d.GoodreadsResponse.user[0];

				var data = {
					user_id: user.id[0],
					username: user.user_name[0],
					irc_nick: irc_nick,
					updates: {}
				}

				if(user.private && user.private[0] && user.private[0] == 'true'){
					return callback({err: 'This goodreads user profile is private.'});
				}

				var updates = user.updates[0].update

				if(!user.updates || user.updates.length < 1 || !user.updates[0].update || user.updates[0].update.length < 1){
					return callback({err: 'This goodreads user has never updated.'});
				}

				updates.forEach(function(update){

					data.updates[update['$'].type] = data.updates[update['$'].type] || [];

					var u = {
						action: update.action_text[0],
						at: update.updated_at[0],
						link: update.link[0]
					};
					if(update.object && update.object[0])
					{

						if(update.object[0].book && update.object[0].book[0]){
							u.book = _this.parse_book(CHAN, update.object[0].book[0]);
						}

						if(update.object[0].read_status && update.object[0].read_status[0]){
							u.status = update.object[0].read_status[0].status[0];

							if(update.object[0].read_status[0].review[0] &&
								update.object[0].read_status[0].review[0].book &&
								update.object[0].read_status[0].review[0].book[0]) u.book = _this.parse_book(CHAN, update.object[0].read_status[0].review[0].book[0]);
						}
					}

					data.updates[update['$'].type].push(u);
				});

				callback(data);
			} catch(e) {
				CHAN.log.error('book.func get_user_info', e.message, e);
				callback({err: 'Something went wrong.'})
			}

		});
	}

	parse_author(author){

		var a = {
			name: author.name[0],
			id: typeof author.id[0] === 'object' ? author.id[0]._ : author.id[0],
			role: null,
			genre: []
		};

		if(author.role) a.role = author.role[0];

		if(author.genre1 && typeof author.genre1[0] === 'string') a.genre = a.genre.concat(author.genre1);
		if(author.genre2 && typeof author.genre2[0] === 'string') a.genre = a.genre.concat(author.genre2);
		if(author.genre3 && typeof author.genre3[0] === 'string') a.genre = a.genre.concat(author.genre3);

		a.genre = a.genre.filter(genre => genre !== '');

		return a;
	}

	parse_book(CHAN, book){
		var _this = this;

		var data = {
			title: book.title[0],
			id: typeof book.id[0] !== 'object' ? book.id[0] : book.id[0]._,
			pub_year: book.publication_year ? book.publication_year[0] : null,
			rating: book.average_rating ? book.average_rating[0] : null,
			description: book.description ? book.description[0] : null,
			url: book.url ? book.url[0] : book.link[0],
			authors: [],
			shelves: [],
			similar_books: []
		};

		if(data.pub_year !== null & typeof data.pub_year === 'object') data.pub_year = data.pub_year._;

		//do a little shuffle here to try and make the 'shelves' sound like more relevent genres
		var title_arr = (book.title[0].split(' ')).filter(function(word){
			if(word.length < 4) return false;
			if(word.match(/^[a-z]+$/i) === null) return false;
			return true;
		});
		var skip_arr = [
			'read','current','shelf','shelves','default','own','book','novel','best',
			'fav','love','dnf','mrp','kindle','worst','bad','literature','buy','sort',
			'wish','list','goal'].concat(title_arr);
		var combo_obj = {
			'sci-fi': ['science-fiction', 'scifi'],
			'young-adult': ['ya', 'youngadult', 'young'],
			'classic': ['classics'],
			'dystopian': ['dystopia', 'apocalyptic', 'apocalypse']
		}

		try{
			book.authors[0].author.forEach(function(author){
				data.authors.push(_this.parse_author(author));

				var name_arr = author.name[0].split(' ');
				skip_arr = skip_arr.concat(name_arr);
			});
		} catch(e) {
			//CHAN.log.warn('parse_book: authors', e.message);
			try{
				book.author.forEach(function(author){
					data.authors.push(_this.parse_author(author));

					var name_arr = author.name[0].split(' ');
					skip_arr = skip_arr.concat(name_arr);
				});
			} catch(e) {
				//CHAN.log.warn('parse_book: author', e.message);
			}
		}

		try{
			var skip_reg = new RegExp(skip_arr.join('|'), 'ig');
			book.popular_shelves[0].shelf.forEach(function(shelf){
				var name = shelf['$'].name.toLowerCase();
				if(data.shelves.length === 5 || name.match(skip_reg) !== null){
					return;
				} else {
					for(var key in combo_obj){
						if(combo_obj[key].indexOf(name) > -1) name = key;
					}

					if(data.shelves.indexOf(name) > -1) return;

					data.shelves.push(name);
				}
			});
		} catch(e) {
			//CHAN.log.warn('parse_book: popular_shelves', e.message);
		}


		try{
			book.similar_books[0].book.forEach(function(sbook){
				var sdata = {
					title: sbook.title[0],
					id: sbook.id[0],
					pub_year: sbook.publication_year[0],
					rating: sbook.average_rating[0],
					url: sbook.link[0],
					authors: []
				};

			   sbook.authors[0].author.forEach(function(auth){
					sdata.authors.push(auth.name[0]);
				});

				data.similar_books.push(sdata)
			});
		} catch(e) {
			//CHAN.log.warn('parse_book: similar_books', e.message);
		}

		return data;
	}


	get_book_info_by_title(CHAN, title, callback){
		var _this = this;
		this.get_url(CHAN, "book/title.xml", {title: title}, function(d){
			if(d.err) return callback(d);

			try {
				var book = d.GoodreadsResponse.book[0];
				callback(_this.parse_book(CHAN, d.GoodreadsResponse.book[0]));

			} catch(e) {
				CHAN.log.warn(e);
				callback({err: 'None found.'});
			}
		});
	}

	get_author_by_name(CHAN, name, callback){
		var _this = this;
		this.get_url(CHAN, 'api/author_url/' + encodeURIComponent(name), {}, function(d){
			if(d.err) return callback(d);

			try {
				var auth = d.GoodreadsResponse.author[0];

				var data = {
					name: auth.name[0],
					id: auth['$'].id,
					url: auth.link[0]
				};

				_this.get_author_info_by_id(CHAN, data, callback);
			} catch(e) {
				CHAN.log.warn(e);
				callback({err: 'None found.'});
			}
		});
	}

	get_author_info_by_id(CHAN, data, callback){
		var _this = this;
		this.get_url(CHAN, 'author/show/' + data.id, {}, function(d){
			if(d.err) return callback(d);

			try {

				var auth = d.GoodreadsResponse.author[0];

				data = Object.assign({}, data, {
					name: auth.name[0],
					id: auth.id[0],
					url: auth.link[0],
					about: auth.about[0],
					hometown: auth.hometown[0],
					born: auth.born_at[0],
					died: auth.died_at[0],
					books: []
				});

				d.GoodreadsResponse.author[0].books[0].book.forEach(function(book){
					data.books.push(_this.parse_book(CHAN, book));
				});


				callback(data);
			} catch(e) {
				CHAN.log.warn(e);
				callback({err: 'None found.'});
			}
		});
	}
}
