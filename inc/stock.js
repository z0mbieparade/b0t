
var request  = require('request');

function get_quote(stock, cb) {
    request('http://download.finance.yahoo.com/d/quotes.csv?s=' +
        stock + '&f=sl1c1p2jkgvrdyn&e=.csv',
        function(error, response, body) {
        if(error) {
            return log.error('get_quote request error:', error);
        }
        if (response.statusCode !== 200) {
            return log.error('get_quote request !200 response:', response.statusCode);
        }
        if (body.trim()=='') {
            let v = {err: 'empty body'};
            cb(v);
            return v;
        }
        // example response:
        // "aapl",107.48,+1.61,"+1.52%",89.47,123.82,106.18,40553402,12.53,2.28,2.16,"Apple Inc."
        var f = body.trim().split(',');
        var quote = {
            symbol : f[0],
            price : f[1],
            change : f[2],
            change_pct : f[3],
            _52week_low : f[4],
            _52week_high : f[5],
            day_low : f[6],
            // what is f[7]?
            pe_ratio : f[8],
            dividend : f[9],
            yield : f[10],
            name : f[11]
        };
        if(quote.price==='N/A') { quote.err = 'looks like junk'; }
        cb(quote);
    });
}

function format(d) {
    // AAPL -> 100.35 (-0.06 -0.06%) | 52w L/H 89.47/132.97 | P/E: 11.17 | Div/yield: 2.28/2.33
    if(d.err){ return ''; }
    return d.name + ' (' +
        d.symbol.replace('"','').replace('"','').toUpperCase() +
        ') -> ' + d.price + ' (' + d.change + ' ' +
        d.change_pct.replace('"','').replace('"','') +
        ') | 52w L/H ' +
        d._52week_low + '/' + d._52week_high + ' | P/E: ' +
        d.pe_ratio + ' | Div/yield: ' + d.dividend + '/' +
        d.yield;
}

exports.format = format;
exports.get_quote = get_quote;
