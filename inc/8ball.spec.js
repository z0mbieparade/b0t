var ball = require('./8ball');

describe('8ball', () => {
    it('returns one of the 20', ()=> {
        expect(ball.options).toContain(ball.shake());
    });
});
