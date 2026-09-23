const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../calculators.html'), 'utf8');
function sourceFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  return html.slice(start, html.indexOf('\nfunction ', start + 1));
}
function chart(width) {
  const shapes = [], labels = [];
  const ctx = new Proxy({ fillText(text) { labels.push(text); } }, {
    get(target, key) { return key in target ? target[key] : () => {}; },
  });
  const canvas = { clientWidth: width, style: {}, getContext: () => ctx };
  const context = vm.createContext({
    document: { getElementById: () => canvas, documentElement: {} },
    window: { devicePixelRatio: 2 },
    getComputedStyle: () => ({ getPropertyValue: () => '#2E1A50' }),
    roundRect(ctx, x, y, w, h) { shapes.push({ x, y, w, h, color: ctx.fillStyle }); },
  });
  vm.runInContext(sourceFunction('calcLoan') + sourceFunction('drawAmortChart'), context);
  return { context, canvas, shapes, labels };
}

for (const width of [240, 740]) {
  for (const [principal, years] of [[25000, 5], [250000, 30]]) {
    test(`zero-interest chart renders principal-only bars: ${width}px, ${years} years`, () => {
      const f = chart(width);
      const result = f.context.calcLoan(principal, 0, years);
      assert.equal(result.totalInterest, 0);
      assert.equal(result.total, principal);
      assert.equal(result.monthly, principal / (years * 12));
      f.context.drawAmortChart('chart', principal, 0, years);
      assert.equal(f.canvas.width, width * 2);
      assert.equal(f.shapes.filter(s => s.color === '#C9A84C' && s.h > 0).length, years);
      assert.equal(f.shapes.filter(s => s.color === '#E74C3C').length, 0);
      assert.ok(f.labels.includes('Yr 1: 0% to interest'));
      assert.ok(f.shapes.every(s => [s.x, s.y, s.w, s.h].every(Number.isFinite)));
    });
  }
}

test('positive-rate loan retains principal and interest bars and correct payment', () => {
  const f = chart(740);
  assert.ok(Math.abs(f.context.calcLoan(25000, 4, 5).monthly - 460.413) < 0.01);
  f.context.drawAmortChart('chart', 25000, 4, 5);
  assert.equal(f.shapes.filter(s => s.color === '#E74C3C' && s.h > 0).length, 5);
});

test('invalid inputs and hidden panels do not draw invalid bars', () => {
  for (const args of [[0, 0, 5], [25000, -1, 5], [25000, 4, 0], [NaN, 4, 5]]) {
    const f = chart(740);
    f.context.drawAmortChart('chart', ...args);
    assert.equal(f.shapes.length, 0);
  }
  const hidden = chart(0);
  hidden.context.drawAmortChart('chart', 25000, 0, 5);
  assert.equal(hidden.shapes.length, 0);
});
