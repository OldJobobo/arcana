"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const Legacy=require("../src/Arcana");
const Interpretation=require("../src/Interpretation");
const legacyCatalog=require("../assets/cards.json");
const catalog=require("../assets/semantic-v2/cards.json");
const spreads=require("../assets/spreads.json");

function legacyReading() {
  return Legacy.compose(legacyCatalog.cards,[
    {cardId:"major-09-the-hermit",orientation:"reversed",modeId:"excessive"},
    {cardId:"major-16-the-tower",orientation:"upright",modeId:null},
    {cardId:"major-17-the-star",orientation:"upright",modeId:null}
  ],"context-friction-doorway");
}

function v1State() {
  return {schemaVersion:1,dailyDate:"2026-09-03",dailySeed:"daily-seed",dailySelection:[{cardId:"major-00-the-fool",orientation:"reversed",modeId:"contextually-shadowed"}],lastReading:legacyReading(),lastReadingKind:"spread",freeCounter:17,preferences:{reversals:true,uiScale:1.25,themeMode:"system"}};
}

test("state migration preserves identity and preferences while removing legacy semantic authority", () => {
  const source=v1State();
  const before=JSON.stringify(source);
  const migrated=Interpretation.migrateState(catalog,spreads,source);
  assert.equal(JSON.stringify(source),before);
  assert.equal(migrated.schemaVersion,2);
  assert.deepEqual(migrated.dailySelection,[{cardId:"major-00-the-fool",orientation:"reversed"}]);
  assert.equal(migrated.dailyDate,source.dailyDate);
  assert.equal(migrated.dailySeed,source.dailySeed);
  assert.equal(migrated.freeCounter,17);
  assert.deepEqual(migrated.preferences,source.preferences);
  assert.equal(migrated.lastReadingKind,"spread");
  assert.equal(migrated.lastReading.schemaVersion,2);
  assert.equal(migrated.lastReading.methodVersion,"arcana-composer-v2");
  assert.deepEqual(migrated.lastReadingSelection.map(item => item.cardId),source.lastReading.cards.map(item => item.cardId));
  assert.ok(migrated.lastReadingSelection.every(item => !Object.prototype.hasOwnProperty.call(item,"modeId")));
  assert.equal(migrated.migration.legacyReadingRecovered,true);
  const serialized=JSON.stringify(migrated);
  assert.equal(serialized.includes(source.lastReading.synthesis),false);
  assert.equal(serialized.includes('"modeId"'),false);
});

test("unrecoverable last-reading data clears only the last-reading boundary", () => {
  const source=v1State();
  source.lastReading.cards[1].cardId="unknown-card";
  const migrated=Interpretation.migrateState(catalog,spreads,source);
  assert.equal(migrated.lastReading,null);
  assert.deepEqual(migrated.lastReadingSelection,[]);
  assert.deepEqual(migrated.dailySelection,[{cardId:"major-00-the-fool",orientation:"reversed"}]);
  assert.equal(migrated.freeCounter,17);
  assert.deepEqual(migrated.preferences,source.preferences);
});

test("valid schema-v2 state migration is idempotent", () => {
  const migrated=Interpretation.migrateState(catalog,spreads,v1State());
  assert.deepEqual(Interpretation.migrateState(catalog,spreads,migrated),migrated);
});

test("schema-v2 persisted prose is recomposed rather than trusted", () => {
  const migrated=Interpretation.migrateState(catalog,spreads,v1State());
  const canonical=JSON.stringify(migrated.lastReading);
  migrated.lastReading.interpretations[0].claim="Altered but structurally plausible persisted prose.";
  migrated.lastReading.utterances.concise[0].text="Altered but structurally plausible persisted prose.";
  assert.notEqual(JSON.stringify(migrated.lastReading),canonical);
  const restored=Interpretation.migrateState(catalog,spreads,migrated);
  assert.equal(JSON.stringify(restored.lastReading),canonical);
});

test("invalid daily identity is cleared without disturbing recoverable last reading", () => {
  const source=v1State();
  source.dailySelection=[{cardId:"unknown-card",orientation:"upright"}];
  const migrated=Interpretation.migrateState(catalog,spreads,source);
  assert.equal(migrated.dailyDate,"");
  assert.equal(migrated.dailySeed,"");
  assert.deepEqual(migrated.dailySelection,[]);
  assert.equal(migrated.lastReading.schemaVersion,2);
});
