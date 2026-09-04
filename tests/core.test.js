"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const Arcana=require("../src/Arcana");
const Interpretation=require("../src/Interpretation");
const catalog=require("../assets/semantic-v2/cards.json");
const spreads=require("../assets/spreads.json");
const cards=catalog.cards;

function arrayLike(values) { const output={length:values.length}; values.forEach((value,index) => { output[index]=value; }); return output; }

test("semantic-v2 draw accepts QML array-like cards without mutation", () => {
  const qmlCards=arrayLike(cards);
  const before=JSON.stringify(qmlCards);
  const selected=Arcana.drawV2(qmlCards,{seed:"qml",count:3,reversals:true});
  assert.equal(selected.length,3);
  assert.equal(new Set(selected.map(item => item.cardId)).size,3);
  assert.ok(selected.every(item => item.orientation === "upright" || item.orientation === "reversed"));
  assert.equal(JSON.stringify(qmlCards),before);
});

test("semantic-v2 daily seed is versioned independently", () => {
  assert.equal(Arcana.dailyKeyV2("2026-09-01"),"daily:2026-09-01:arcana-composer-v2");
});

test("semantic-v2 draw is deterministic and duplicate-free", () => {
  const first=Arcana.drawV2(cards,{seed:"same",count:78,reversals:true});
  const second=Arcana.drawV2(cards,{seed:"same",count:78,reversals:true});
  assert.deepEqual(first,second);
  assert.equal(new Set(first.map(item => item.cardId)).size,78);
  assert.ok(first.some(item => item.orientation === "reversed"));
  assert.ok(first.every(item => !Object.prototype.hasOwnProperty.call(item,"modeId")));
});

test("drawn semantic-v2 selections produce validated readings", () => {
  const selected=Arcana.drawV2(cards,{seed:"runtime-smoke",count:3,reversals:true});
  const positions=["context","friction","doorway"];
  const reading=Interpretation.interpret(catalog,spreads,{spreadId:"context-friction-doorway",cards:selected.map((item,index) => ({positionId:positions[index],cardId:item.cardId,orientation:item.orientation})),originalQuestion:null,topicLens:"general",tradition:"rws",reversalPolicy:"energy_state",elementalDignity:"disabled",narratorId:"clear-reflective-v1"});
  assert.equal(reading.schemaVersion,2);
  assert.equal(reading.methodVersion,"arcana-composer-v2");
  assert.equal(reading.cards.length,3);
  assert.ok(reading.cards.every(item => Array.isArray(item.selectedHypotheses)));
  assert.ok(reading.cards.filter(item => item.orientation === "reversed").every(item => item.selectedHypotheses.length > 0));
});

test("draw caps count and rejects oversized native or array-like inputs", () => {
  assert.equal(Arcana.drawV2(cards,{seed:"large",count:999}).length,78);
  assert.throws(() => Arcana.drawV2(new Array(10001),{count:1}),/resource bound/);
  assert.throws(() => Arcana.drawV2({length:10001},{count:1}),/resource bound/);
  assert.throws(() => Arcana.drawV2({length:-1},{count:1}),/array-like length/);
});
