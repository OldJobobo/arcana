"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const legacy=require("../assets/cards.json");
const spreads=require("../assets/spreads.json");
const pilot=require("./fixtures/semantic-v2-pilot.json");
const batchTool=require("../tools/validate-semantic-v2-batch");

function clone(value) { return JSON.parse(JSON.stringify(value)); }

test("five migration batches partition the canonical 78-card deck", () => {
  const expected={major:22,wands:14,cups:14,swords:14,pentacles:14};
  const all=[];
  for (const batchId of Object.keys(expected)) {
    const cards=batchTool.expectedCards(legacy,batchId);
    assert.equal(cards.length,expected[batchId]);
    all.push(...cards.map(card => card.id));
  }
  assert.equal(all.length,78);
  assert.equal(new Set(all).size,78);
  assert.throws(() => batchTool.expectedCards(legacy,"trumps"),/Unknown semantic batch/);
});

test("batch audit rejects incomplete or out-of-order canonical card sets", () => {
  const incomplete={schemaVersion:2,deckId:"test",deckTitle:"Test",methodVersion:"arcana-composer-v2",sources:pilot.sources,cards:pilot.cards.filter(card => card.arcana === "major")};
  assert.throws(() => batchTool.auditBatch(incomplete,"major",legacy,spreads),error => error && error.code === "BATCH_CARD_SET");
});

test("per-card editorial checks detect identity, safety, and thin semantics", () => {
  const card=clone(pilot.cards.find(item => item.id === "major-00-the-fool"));
  const legacyCard=legacy.cards.find(item => item.id === card.id);
  card.title="A Different Card";
  card.number=99;
  card.imagery[0].id="major-01-the-magician.image.stolen";
  card.reversalModes={excessive:card.reversalModes.excessive};
  card.claims.find(claim => claim.lens === "traditional-core").text="You will know tomorrow.";
  const issues=batchTool.qualityIssues(card,legacyCard);
  assert.ok(issues.some(issue => issue.code === "IDENTITY_DRIFT" && issue.path.endsWith(".title")));
  assert.ok(issues.some(issue => issue.code === "IDENTITY_DRIFT" && issue.path.endsWith(".number")));
  assert.ok(issues.some(issue => issue.code === "FOREIGN_ID_NAMESPACE"));
  assert.ok(issues.some(issue => issue.code === "THIN_REVERSALS"));
  assert.ok(issues.some(issue => issue.code === "UNSAFE_PROSE" && issue.reason === "guaranteed-outcome"));
});

test("batch digests ignore registration order for semantically unordered records", () => {
  const ordered=clone(pilot);
  const reordered=clone(pilot);
  reordered.sources.sources.reverse();
  reordered.cards.reverse();
  for (const card of reordered.cards) {
    card.claims.reverse();
    card.imagery.reverse();
    card.reflectionPrompts.reverse();
    card.coreThemes.reverse();
    for (const modeId of Object.keys(card.reversalModes)) card.reversalModes[modeId].reverse();
  }
  assert.equal(batchTool.canonicalDigest(reordered),batchTool.canonicalDigest(ordered));
});

test("court acceptance requires person, role, and approach ranges", () => {
  const card=clone(pilot.cards.find(item => item.id === "wands-11-page"));
  const legacyCard=legacy.cards.find(item => item.id === card.id);
  delete card.courtModes;
  const issues=batchTool.qualityIssues(card,legacyCard);
  assert.ok(issues.some(issue => issue.code === "MISSING_COURT_RANGE"));
});
