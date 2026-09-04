"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const legacy=require("../assets/cards.json");
const scaffoldTool=require("../tools/generate-semantic-v2-scaffold");

function allTextSlots(card) {
  const slots=card.slots;
  const claims=[slots.traditionalCore,slots.omarchy,...Object.values(slots.positions),...slots.reversals];
  if (slots.courtModes) claims.push(...Object.values(slots.courtModes));
  return claims.map(item => item.text).concat(slots.imagery.map(item => item.detail),slots.reflectionPrompts.map(item => item.text));
}

test("v2 scaffold preserves all 78 identities in canonical deck order", () => {
  const scaffold=scaffoldTool.generateScaffold(legacy);
  assert.equal(scaffold.scaffoldVersion,1);
  assert.equal(scaffold.targetSchemaVersion,2);
  assert.equal(scaffold.cards.length,78);
  assert.deepEqual(scaffold.cards.map(card => card.id),legacy.cards.slice().sort((a,b) => a.order-b.order).map(card => card.id));
  for (let i=0;i<scaffold.cards.length;i++) {
    const actual=scaffold.cards[i], expected=legacy.cards.find(card => card.id === actual.id);
    assert.deepEqual({order:actual.order,arcana:actual.arcana,number:actual.number,rank:actual.rank,title:actual.title,omarchyTitle:actual.omarchyTitle,suit:actual.suit,element:actual.element,image:actual.image},{order:expected.order,arcana:expected.arcana,number:scaffoldTool.cardNumber(expected),rank:expected.rank,title:expected.title,omarchyTitle:expected.systemTitle,suit:expected.suit,element:expected.element,image:expected.image});
  }
});

test("scaffold creates stable semantic IDs without manufacturing authored meaning", () => {
  const first=scaffoldTool.generateScaffold(legacy);
  const second=scaffoldTool.generateScaffold(JSON.parse(JSON.stringify(legacy)));
  assert.deepEqual(second,first);
  for (const card of first.cards) {
    assert.ok(allTextSlots(card).every(value => value === null));
    assert.deepEqual(card.slots.coreThemes,[]);
    assert.deepEqual(card.slots.reversals,[]);
    assert.deepEqual(card.slots.reversalModes,{});
    assert.ok(card.slots.imagery.every(item => item.themes.length === 0 && item.sourceRefs.length === 0));
    assert.ok(Object.values(card.slots.positions).every(item => item.id.startsWith(card.id+".position.") && item.themes.length === 0 && item.sourceRefs.length === 0));
    assert.equal(card.slots.courtModes === null,["page","knight","queen","king"].indexOf(card.rank) < 0);
  }
});

test("scaffold writer is repository-bounded and rejects symlink escapes", () => {
  assert.throws(() => scaffoldTool.writeScaffold(path.join("..","outside.json")),/inside the repository/);
  const scratch=path.join(__dirname,"..",`.tmp-scaffold-${process.pid}`);
  fs.mkdirSync(scratch,{recursive:true});
  const escape=path.join(scratch,"escape");
  fs.symlinkSync("/tmp",escape,"dir");
  assert.throws(() => scaffoldTool.writeScaffold(path.relative(path.join(__dirname,".."),path.join(escape,"must-not-write.json"))),/inside the repository/);
  fs.unlinkSync(escape);
  const dangling=path.join(scratch,"dangling.json");
  fs.symlinkSync(`/tmp/arcana-scaffold-must-not-exist-${process.pid}.json`,dangling,"file");
  assert.throws(() => scaffoldTool.writeScaffold(path.relative(path.join(__dirname,".."),dangling)),/symbolic link/);
  fs.unlinkSync(dangling);
  const relative=path.relative(path.join(__dirname,".."),path.join(scratch,"semantic-v2-scaffold.json"));
  const target=scaffoldTool.writeScaffold(relative);
  try {
    const written=JSON.parse(fs.readFileSync(target,"utf8"));
    assert.equal(written.cards.length,78);
  } finally {
    fs.rmSync(scratch,{recursive:true,force:true});
  }
});
