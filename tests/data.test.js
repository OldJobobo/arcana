"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const Interpretation = require("../src/Interpretation");
const deck = JSON.parse(fs.readFileSync(path.join(root,"assets/semantic-v2/cards.json"),"utf8"));
const spreads = JSON.parse(fs.readFileSync(path.join(root,"assets/spreads.json"),"utf8"));

test("production semantic-v2 deck contains the complete canonical 78-card structure", () => {
  assert.doesNotThrow(() => Interpretation.validateCatalog(deck,spreads));
  assert.equal(deck.schemaVersion, 2);
  assert.equal(deck.methodVersion, "arcana-composer-v2");
  assert.equal(deck.cards.length, 78);
  assert.equal(new Set(deck.cards.map(c => c.id)).size, 78);
  assert.deepEqual(Object.fromEntries(["major","wands","cups","swords","pentacles"].map(k => [k,deck.cards.filter(c => c.arcana === k || c.suit === k).length])),{major:22,wands:14,cups:14,swords:14,pentacles:14});
});

test("every production card has authored v2 semantics, provenance, and packaged artwork", () => {
  for (const card of deck.cards) {
    assert.ok(card.id && card.title && card.omarchyTitle,card.id);
    assert.ok(card.coreThemes.length >= 2,card.id + " themes");
    assert.ok(card.imagery.length >= 1,card.id + " imagery");
    assert.ok(card.claims.length >= 6,card.id + " claims");
    assert.ok(Object.keys(card.reversalModes).length >= 2,card.id + " reversal modes");
    assert.ok(card.reflectionPrompts.length >= 1,card.id + " reflection prompts");
    assert.ok(card.claims.every(claim => claim.provenanceKind && claim.sourceRefs.length),card.id + " claim provenance");
    assert.equal(Object.prototype.hasOwnProperty.call(card,"orientationModes"),false,card.id + " legacy modes");
    assert.equal(path.posix.normalize(card.image),card.image);
    assert.equal(card.image.startsWith("assets/card-art/"),true);
    assert.equal(fs.existsSync(path.join(root,card.image)),true,card.image);
  }
});

test("the reversible back is packaged as artwork", () => {
  assert.equal(fs.existsSync(path.join(root,"assets/card-art/card-back.png")),true);
});

test("every illustration and back package three semantic spot-color masks", () => {
  const names=[...deck.cards.map(card => path.basename(card.image)),"card-back.png"];
  for (const role of ["primary","secondary","fault"]) {
    for (const name of names) {
      const file=path.join(root,"assets/card-art-masks",role,name);
      assert.equal(fs.existsSync(file),true,path.relative(root,file));
    }
  }
});

test("fault masks declare the exact sparse semantic coverage", () => {
  const contract = JSON.parse(fs.readFileSync(path.join(root, "assets/card-art-masks/fault-contract.json"), "utf8"));
  assert.deepEqual(contract.active, [
    "14-major-arcana-13-death.png",
    "16-major-arcana-15-the-devil.png",
    "17-major-arcana-16-the-tower.png",
    "41-cups-05-five-of-cups.png",
    "53-swords-03-three-of-swords.png",
    "55-swords-05-five-of-swords.png",
    "59-swords-09-nine-of-swords.png",
    "60-swords-10-ten-of-swords.png",
    "69-pentacles-05-five-of-pentacles.png"
  ]);
  assert.equal(contract.transparentCount, 70);
  assert.match(contract.policy, /failure|conflict|destructive/i);
});

test("runtime source catalog separates public-domain, vault, and original work", () => {
  const sources=JSON.parse(fs.readFileSync(path.join(root,"assets/sources.json"),"utf8"));
  assert.equal(sources.schemaVersion,1);
  assert.ok(sources.sources.some(s => s.kind === "historical-public-domain"));
  assert.ok(sources.sources.some(s => s.kind === "user-vault-reference"));
  assert.ok(sources.sources.some(s => s.kind === "original-deck-authorship"));
});
