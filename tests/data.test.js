"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const deck = JSON.parse(fs.readFileSync(path.join(root,"assets/cards.json"),"utf8"));

test("semantic deck contains the complete canonical 78-card structure", () => {
  assert.equal(deck.schemaVersion, 1);
  assert.equal(deck.methodVersion, "composer-v1");
  assert.equal(deck.cards.length, 78);
  assert.equal(new Set(deck.cards.map(c => c.id)).size, 78);
  assert.deepEqual(
    Object.fromEntries(["major","wands","cups","swords","pentacles"].map(k => [k,deck.cards.filter(c => c.arcana === k || c.suit === k).length])),
    {major:22,wands:14,cups:14,swords:14,pentacles:14}
  );
});

test("every card has authored semantic layers, provenance, and a packaged image", () => {
  for (const card of deck.cards) {
    assert.ok(card.id && card.title && card.systemTitle, card.id);
    assert.ok(card.traditional.core.length >= 12, card.id + " traditional core");
    assert.ok(card.traditional.uprightKeywords.length >= 3, card.id + " upright");
    assert.ok(card.traditional.reversedKeywords.length >= 2, card.id + " reversed");
    assert.ok(card.omarchy.systemLens.length >= 20, card.id + " system lens");
    assert.ok(card.orientationModes.length >= 1, card.id + " orientation modes");
    assert.ok(card.observed.length >= 2, card.id + " observed details");
    assert.ok(card.reflection.endsWith("?"), card.id + " reflection");
    assert.ok(card.sources.includes("omarchy-guide"), card.id + " source");
    assert.equal(path.posix.normalize(card.image), card.image);
    assert.equal(card.image.startsWith("assets/cards/"), true);
    assert.equal(fs.existsSync(path.join(root,card.image)), true, card.image);
  }
});

test("the reversible back is packaged at shell resolution", () => {
  assert.equal(fs.existsSync(path.join(root,"assets/cards/card-back.png")),true);
});

test("runtime source catalog separates public-domain, vault, and original work", () => {
  const sources=JSON.parse(fs.readFileSync(path.join(root,"assets/sources.json"),"utf8"));
  assert.equal(sources.schemaVersion,1);
  assert.ok(sources.sources.some(s => s.kind === "historical-public-domain"));
  assert.ok(sources.sources.some(s => s.kind === "user-vault-reference"));
  assert.ok(sources.sources.some(s => s.kind === "original-deck-authorship"));
});
