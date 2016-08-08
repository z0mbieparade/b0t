
// you can run these test by running: node_modules/.bin/jasmine-node inc/

var stock = require('./stock');

describe('stock', function() {
    var testdata = {
        symbol : '"aapl"',
        price : 100.35,
        change : -0.06,
        change_pct : '"-0.06%"',
        _52week_low : 89.47,
        _52week_high : 132.97,
        pe_ratio : 11.17,
        dividend : 2.28,
        yield : 2.33,
        name : 'apple inc'
    };

    it('gets a quote', function() {
        var d = {};
        var callback = d_ => {d = d_;
            callback.called = true;
        };
        runs(() => stock.get_quote('aapl', callback));
        waitsFor(() => callback.called, 'OH NO callback not called?', 50000);
        runs(() => {
        expect(d.err).toBeUndefined();
        expect(d.symbol).toBeDefined();
        expect(d.price).toBeDefined();
        expect(d.change).toBeDefined();
        expect(d.change_pct).toBeDefined();
        expect(d._52week_low).toBeDefined();
        expect(d._52week_high).toBeDefined();
        expect(d.pe_ratio).toBeDefined();
        expect(d.dividend).toBeDefined();
        expect(d.yield).toBeDefined();
        expect(d.name).toBeDefined();
        });
    });
    it('formats and quotes are stripped from fields', function() {
        let msg = stock.format(testdata);
        expect(msg).toEqual("apple inc (AAPL) -> 100.35 (-0.06 -0.06%) | 52w L/H 89.47/132.97 | P/E: 11.17 | Div/yield: 2.28/2.33");
    });
    it('does nothing on not found', () => {
        var d = {};
        let cb = v => {d = v; cb.called = true;};
        runs( () => stock.get_quote('', cb) );
        waitsFor(() => cb.called);
        runs( () => expect(d.err).toBeDefined()
        );
    });
    it('format does nothing if there is err', () => {
        let q = stock.format({err:"oh no!"});
        expect(q).toEqual('');
    });
});

