const test = require('node:test');
const assert = require('node:assert/strict');
require('../phrases.js');
const Lingo = require('../core.js');

const index = Lingo.candidateIndex(globalThis.LingoPhrases);
const suggestions = (text, selected, saved = {}) => {
  const start = text.indexOf(selected);
  assert.notEqual(start, -1);
  return Lingo.phraseSuggestions(text, start, start + selected.length, index, saved);
};

test('bundled WordNet candidates include give up', () => {
  assert.ok(globalThis.LingoPhrases.includes('give up'));
  assert.ok(globalThis.LingoPhrases.length > 1000);
});

test('recognizes inflected and separable phrasal verbs', () => {
  assert.equal(suggestions('I gave up yesterday.', 'gave')[0].word, 'give up');
  assert.equal(suggestions('She is giving up.', 'giving')[0].surface, 'giving up');
  assert.equal(suggestions('I gave it up yesterday.', 'it')[0].surface, 'gave it up');
  assert.equal(suggestions('I gave the plan up.', 'gave')[0].surface, 'gave the plan up');
  assert.equal(suggestions('I am ruling anyone out.', 'ruling')[0].word, 'rule out');
});

test('keeps word boundaries and respects saved phrases', () => {
  assert.deepEqual(suggestions('I forgave upset people.', 'forgave'), []);
  assert.deepEqual(suggestions('I give, up is a direction.', 'give'), []);
  assert.deepEqual(suggestions('I give up.', 'give', {'give up': {status:'learning'}}), []);
});

test('selects the surrounding sentence for context', () => {
  const text = 'He insisted that he should lead. She gave up.';
  assert.equal(Lingo.sentenceContext(text, text.indexOf('insisted')), 'He insisted that he should lead.');
});

test('recognizes irregular and consonant-doubling verb forms', () => {
  assert.equal(suggestions('The car broke down.', 'broke')[0].word, 'break down');
  assert.equal(suggestions('He fought back.', 'fought')[0].word, 'fight back');
  assert.equal(suggestions('She dropped off the kids.', 'dropped')[0].word, 'drop off');
  assert.equal(suggestions('They are shutting down.', 'shutting')[0].word, 'shut down');
});

test('extracts phrases as whole terms without repeating their words', () => {
  assert.deepEqual(Lingo.terms('I gave the plan up yesterday.', index), ['i', 'give up', 'the', 'plan', 'yesterday']);
  assert.deepEqual(Lingo.terms('She gave it up and gave up.', index), ['she', 'give up', 'it', 'and']);
  assert.deepEqual(Lingo.terms('I give, up is a direction.', index), ['i', 'give', 'up', 'is', 'a', 'direction']);
  const [term] = Lingo.extractTerms('broke down', index);
  assert.deepEqual(term, {word: 'break down', phrase: true, surface: 'broke down'});
});

test('saved phrases are extracted and highlighted before bundled candidates', () => {
  const saved = {'in spite of': {word: 'in spite of', status: 'learning'}, 'give up': {word: 'give up', status: 'learned'}};
  assert.deepEqual(Lingo.terms('We ran into him in spite of it.', index, saved), ['we', 'run into', 'him', 'in spite of', 'it']);
  const marked = Lingo.matchedTokens('She gave it up.', Lingo.phraseIndex(saved)).map(t => t.phraseStatus || null);
  assert.deepEqual(marked, [null, 'learned', null, 'learned']);
});
