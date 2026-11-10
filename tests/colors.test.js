const test = require('node:test');
const assert = require('node:assert/strict');
const Lingo = require('../core.js');

const rgb = value => value.match(/\d+/g).slice(0, 3).map(Number);
const grounds = {white: [[255, 255, 255], [30, 30, 30]], cream: [[250, 244, 230], [60, 50, 40]], dark: [[18, 18, 18], [230, 230, 230]], navy: [[20, 30, 60], [200, 210, 230]]};

test('highlight text stays readable on light and dark grounds', () => {
  for (const [name, [bg, text]] of Object.entries(grounds))
    for (const intensity of ['soft', 'normal', 'strong'])
      for (const hex of Object.values(Lingo.defaults.colors)) {
        const style = Lingo.highlightStyle(hex, bg, text, intensity);
        assert.ok(style.contrast >= 4.5, `${name} ${intensity} ${hex}: ${style.contrast}`);
      }
});

test('statuses keep distinct hues instead of fading into the text color', () => {
  const [bg, text] = grounds.white;
  const colors = Object.values(Lingo.defaults.colors).map(hex => rgb(Lingo.highlightStyle(hex, bg, text).color));
  for (let i = 0; i < colors.length; i++) {
    assert.ok(Math.max(...colors[i]) - Math.min(...colors[i]) > 60, `color ${i} is too grey: ${colors[i]}`);
    for (let j = i + 1; j < colors.length; j++) assert.ok(colors[i].some((v, k) => Math.abs(v - colors[j][k]) > 50));
  }
});

test('large headings may be lighter, thin small text gets more contrast', () => {
  const [bg, text] = grounds.white, hex = Lingo.defaults.colors.unknown;
  const body = Lingo.highlightStyle(hex, bg, text, 'soft', {size: 16, weight: 400});
  const heading = Lingo.highlightStyle(hex, bg, text, 'soft', {size: 40, weight: 700});
  const thin = Lingo.highlightStyle(hex, bg, text, 'soft', {size: 12, weight: 300});
  assert.ok(heading.contrast >= 3 && heading.contrast < body.contrast);
  assert.ok(thin.contrast >= 5.5);
});

test('only normal and strong intensities add a background tint', () => {
  const [bg, text] = grounds.white, hex = Lingo.defaults.colors.learning;
  assert.equal(Lingo.highlightStyle(hex, bg, text, 'soft').background, '');
  assert.match(Lingo.highlightStyle(hex, bg, text, 'normal').background, /^rgba\(.+,0\.07\)$/);
  assert.match(Lingo.highlightStyle(hex, bg, text, 'strong').background, /^rgba\(.+,0\.14\)$/);
});
