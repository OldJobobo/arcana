"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const Interpretation=require("../src/Interpretation");
const catalog=require("../assets/semantic-v2/cards.json");
const spreads=require("../assets/spreads.json");
const benchmark=require("./fixtures/semantic-v2-corpus-benchmark.json");

function caseWhere(predicate) { return benchmark.cases.find(predicate); }
function readingFor(item) { return Interpretation.interpret(catalog,spreads,item.request); }

test("panel projection preserves semantic identity with arrays always present", () => {
  const item=caseWhere(entry => entry.expect.interpretationCount === 2);
  const reading=readingFor(item);
  const panel=Interpretation.toPanelReading(catalog,spreads,reading,{kind:"daily",createdAt:"2026-09-03T00:00:00.000Z"});
  assert.equal(panel.readingId,reading.id);
  assert.equal(panel.kind,"daily");
  assert.equal(panel.createdAt,"2026-09-03T00:00:00.000Z");
  assert.equal(panel.cards.length,reading.cards.length);
  assert.equal(panel.spreadName,"Context / Friction / Doorway");
  assert.ok(panel.cards.every((card,index) => card.instanceId === reading.cards[index].positionId+":"+reading.cards[index].cardId));
  assert.deepEqual(panel.cards.map(card => card.selectedHypotheses),reading.cards.map(card => card.selectedHypotheses));
  assert.ok(panel.cards.every(card => card.card.arcana === "major" || (card.card.omarchy && typeof card.card.omarchy.domain === "string" && card.card.omarchy.domain.length > 0)));
  assert.ok(panel.alternative);
  assert.equal(panel.alternative.id,reading.interpretations[1].id);
  assert.deepEqual(panel.distinguishingQuestions,reading.distinguishingQuestions);
  for (const field of ["cards","relationships","patterns","distinguishingQuestions","reflectionPrompts","evidenceSummary","provenanceSummary"]) assert.ok(Array.isArray(panel[field]),field);
});

test("no-alternative panel and copy projections omit empty alternative sections", () => {
  const item=caseWhere(entry => entry.expect.interpretationCount === 1 && entry.request.spreadId === "single");
  const reading=readingFor(item);
  const panel=Interpretation.toPanelReading(catalog,spreads,reading,null);
  const copied=Interpretation.copyReading(catalog,spreads,reading);
  assert.equal(panel.alternative,null);
  assert.deepEqual(panel.distinguishingQuestions,[]);
  assert.equal(copied.includes("\n\nALTERNATIVE "),false);
  assert.equal(copied.includes("DISTINGUISHING QUESTION"),false);
});

test("copied output is plain, bounded, structurally truncated, and ID preserving", () => {
  const item=caseWhere(entry => entry.expect.interpretationCount === 2);
  const reading=readingFor(item);
  const copied=Interpretation.copyReading(catalog,spreads,reading,2500);
  assert.ok(Interpretation.byteLength(copied) <= 2500);
  assert.match(copied,/TRUNCATION\nOptional sections omitted:/);
  assert.ok(copied.includes(reading.id));
  assert.ok(copied.includes(reading.interpretations[0].id));
  assert.ok(copied.includes(reading.interpretations[1].id));
  if (reading.originalQuestion !== null) assert.ok(copied.includes(reading.originalQuestion));
  assert.ok(reading.interpretations[0].evidence.every(id => copied.includes(id)));
  assert.doesNotMatch(copied,/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/);
  assert.doesNotMatch(copied,/[`#*<>\[\]]/);
});

test("handoff is a bounded validated semantic packet with exact question state", () => {
  const item=caseWhere(entry => entry.expect.reframeReason !== null && entry.expect.interpretationCount === 2);
  const selected=item || caseWhere(entry => entry.expect.reframeReason !== null);
  const reading=readingFor(selected);
  const packetText=Interpretation.buildHandoff(catalog,spreads,reading);
  const packet=JSON.parse(packetText);
  assert.ok(Interpretation.byteLength(packetText) <= 12000);
  assert.equal(packet.packetVersion,2);
  assert.equal(packet.semantic.readingId,reading.id);
  assert.equal(packet.semantic.methodVersion,"arcana-composer-v2");
  assert.equal(packet.question.original,reading.originalQuestion);
  assert.equal(packet.question.normalized,reading.normalizedQuestion);
  assert.equal(packet.question.reframeReason,reading.reframeReason);
  assert.deepEqual(packet.cards.map(card => card.selectedHypotheses),reading.cards.map(card => card.selectedHypotheses));
  assert.ok(packet.cards.every(card => card.activatedClaimIds.length > 0 && card.provenanceCategories.length > 0));
  assert.deepEqual(packet.reflectionPrompts.map(prompt => prompt.id),reading.reflectionPromptIds);
  assert.ok(packet.reflectionPrompts.every(prompt => typeof prompt.text === "string" && prompt.text.endsWith("?")));
  assert.equal(packet.alternative === null,reading.interpretations.length === 1);
  assert.deepEqual(["omarchy","agent","prompt",packetText].slice(3),[packetText]);
});

test("all corpus benchmark projections fit runtime copy and handoff limits", () => {
  for (const item of benchmark.cases) {
    const reading=readingFor(item);
    const copied=Interpretation.copyReading(catalog,spreads,reading,8000);
    const handoff=Interpretation.buildHandoff(catalog,spreads,reading,12000);
    assert.ok(Interpretation.byteLength(copied) <= 8000,item.id+" copy");
    assert.ok(Interpretation.byteLength(handoff) <= 12000,item.id+" handoff");
    const packet=JSON.parse(handoff);
    assert.equal(packet.semantic.readingId,reading.id,item.id);
    assert.equal(packet.alternative === null,reading.interpretations.length === 1,item.id);
  }
});

test("projection helpers fail closed on invalid semantic readings", () => {
  const item=caseWhere(entry => entry.expect.interpretationCount === 1);
  const reading=readingFor(item);
  reading.cards[0].cardId="unknown-card";
  assert.throws(() => Interpretation.toPanelReading(catalog,spreads,reading,null),error => error && error.code === "UNKNOWN_CARD");
  assert.throws(() => Interpretation.copyReading(catalog,spreads,reading),error => error && error.code === "UNKNOWN_CARD");
  assert.throws(() => Interpretation.buildHandoff(catalog,spreads,reading),error => error && error.code === "UNKNOWN_CARD");
});
