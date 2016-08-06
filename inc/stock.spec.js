
// you can run these test by running: node_modules/.bin/jasmine-node inc/

var stock = require('./stock');

describe('stock', function() {

    it('gets a quote', function() {
        var callback = jasmine.createSpy('callback');
        stock.get_quote('aapl', callback);
        expect(callback).toHaveBeenCalled();
        var d = callback.mostRecentCall.args[0];
        expect(d.err).toNotBeDefined();
        expect(d.symbol).toNotBeDefined();
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
    it('formats', function() {
        var msg = stock.format({
            symbol : 'aapl',
            price : 100.35,
            change : -0.06,
            change_pct : '-0.06%',
            _52week_low : 89.47,
            _52week_high : 132.97,
            pe_ratio : 11.17,
            dividend : 2.28,
            yield : 2.33,
            name : 'unused'
        });
        expect(msg).toEqual("AAPL -> 100.35 (-0.06 -0.06%) | 52w L/H 89.47/132.97 | P/E: 11.17 | Div/yield: 2.28/2.33");
    });
});

