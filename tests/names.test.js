const test = require('node:test');
const assert = require('node:assert/strict');
const Lingo = require('../core.js');

const names = texts => {
  const blocks = texts.map(text => ({text}));
  return Lingo.nameTokens(blocks).map((set, i) => [...set].map(k => Lingo.tokens(texts[i])[k].word));
};

test('capitalized words inside a sentence are names, the pronoun I is not', () => {
  assert.deepEqual(names(['Yesterday the caretaker Prime Minister Benjamin Netanyahu said I’m ready.'])[0], ['prime', 'minister', 'benjamin', 'netanyahu']);
});

test('a sentence-initial word is a name only when the page uses it as a name elsewhere', () => {
  const [first, second] = names(['Netanyahu insists he should lead.', 'On Sunday, Netanyahu met Eisenkot.']);
  assert.deepEqual(first, ['netanyahu']);
  assert.deepEqual(second, ['sunday', 'netanyahu', 'eisenkot']);
  assert.deepEqual(names(['Peace talks continue.', 'They want peace.'])[0], []);
});

test('title case headings and shouting labels are not treated as names on their own', () => {
  assert.deepEqual(names(['Board of Peace Warns of Humanitarian Emergency'])[0], []);
  assert.deepEqual(names(['LATEST NEWS'])[0], []);
});

test('short all-caps words are acronyms', () => {
  assert.deepEqual(names(['Officials in the US and NATO said so.'])[0], ['us', 'nato']);
});
