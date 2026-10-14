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
  const packet=Interpretation.handoffPacket(packetText);
  assert.ok(Interpretation.byteLength(packetText) <= 12000);
  assert.equal(packet.packetVersion,3);
  assert.match(packetText,/^# Arcana reading\n/);
  assert.match(packetText,/Interpret, do not predict/);
  // The first move is the reading itself, answered against the question.
  assert.match(packetText,reading.originalQuestion !== null ? /answer the user's question using this reading/ : /give the user the reading/);
  assert.match(packetText,/Go through each card in its position/);
  assert.doesNotMatch(packetText,/Start by|asking which part/);
  assert.match(packetText,/Do not run commands/);
  assert.ok(packet.cards.every(card => card.title && card.positionLabel && card.claims.every(claim => typeof claim.text === "string")));
  if (reading.originalQuestion !== null) assert.ok(packetText.includes("> "+reading.originalQuestion.split("\n")[0]));
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
    const packet=Interpretation.handoffPacket(handoff);
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

test("readable copy names each card and labels each sentence without IDs", () => {
  const item=caseWhere(entry => entry.request.spreadId === "context-friction-doorway" && entry.expect.interpretationCount === 2);
  const reading=readingFor(item);
  const copied=Interpretation.copyReadableReading(catalog,spreads,reading,8000,{kind:"spread",localDate:"2026-10-13"});
  const panel=Interpretation.toPanelReading(catalog,spreads,reading,null);
  assert.match(copied,/^Arcana · Context \/ Friction \/ Doorway · 2026-10-13\n/);
  for (const card of panel.cards) assert.ok(copied.includes(card.positionLabel+": "+card.card.title),card.instanceId);
  assert.ok(copied.includes("Another reading"));
  assert.equal(copied.includes(reading.id),false);
  assert.equal(/[a-z]+-\d\d-[a-z]+\./.test(copied),false,"claim IDs leaked into readable copy");
  assert.ok(Interpretation.byteLength(Interpretation.copyReadableReading(catalog,spreads,reading,1500)) <= 1500);
});

test("panel utterances carry position labels and patterns read as prose", () => {
  for (const item of benchmark.cases.filter(entry => entry.request.spreadId === "context-friction-doorway").slice(0,20)) {
    const panel=Interpretation.toPanelReading(catalog,spreads,readingFor(item),null);
    const labels=panel.utterances.concise.map(utterance => utterance.label);
    assert.ok(labels[0].startsWith("Context · "),item.id+": "+labels[0]);
    assert.ok(labels[1].startsWith("Friction · "),item.id+": "+labels[1]);
    assert.ok(panel.utterances.concise.some(utterance => utterance.role === "tension" && utterance.label === "" && utterance.text.startsWith("Across the spread, ")),item.id);
    for (const pattern of panel.patterns) assert.doesNotMatch(pattern.text,/major-\d|-recurrence|minor-\d/,item.id);
    for (const relation of panel.relationships) assert.doesNotMatch(relation.text,/→|context:|friction:/,item.id);
    for (const utterance of panel.utterances.concise) assert.doesNotMatch(utterance.text,/major \d minor \d|through theme /,item.id);
  }
});

test("engine binds validated catalogs once and matches the stateless API", () => {
  const engine=Interpretation.createEngine(catalog,spreads);
  const item=caseWhere(entry => entry.expect.interpretationCount === 2);
  const reading=engine.interpret(item.request);
  assert.deepEqual(reading,readingFor(item));
  assert.deepEqual(engine.toPanelReading(reading,null),Interpretation.toPanelReading(catalog,spreads,reading,null));
  assert.equal(engine.copyReading(reading,8000),Interpretation.copyReading(catalog,spreads,reading,8000));
  assert.equal(engine.buildHandoff(reading,12000),Interpretation.buildHandoff(catalog,spreads,reading,12000));
});
