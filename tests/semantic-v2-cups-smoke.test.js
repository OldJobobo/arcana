"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const Interpretation=require("../src/Interpretation");
const batchTool=require("../tools/validate-semantic-v2-batch");
const catalog=require("../assets/semantic-v2/batches/cups.json");
const legacy=require("../assets/cards.json");
const spreads=require("../assets/spreads.json");

function request(cards,policy) {
  return {spreadId:cards.length === 1 ? "single" : "context-friction-doorway",cards,originalQuestion:null,topicLens:"general",tradition:"rws",reversalPolicy:policy,elementalDignity:"disabled",narratorId:"clear-reflective-v1"};
}

test("Cups batch passes strict acceptance at its reviewed digest", () => {
  const result=batchTool.auditBatch(catalog,"cups",legacy,spreads);
  assert.equal(result.digest,"89cf3134bab59da76795ed8c908423654dce97a0e9ae1d3b225b682498489a09");
});

test("ordinary Ace-Two-Three Cups spread fits exact planner density", () => {
  const cards=[
    {positionId:"context",cardId:"cups-01-ace",orientation:"upright"},
    {positionId:"friction",cardId:"cups-02-two",orientation:"upright"},
    {positionId:"doorway",cardId:"cups-03-three",orientation:"upright"}
  ];
  const reading=Interpretation.interpret(catalog,spreads,request(cards,"energy_state"));
  const synthesis=reading.utterances.expanded.filter(item => item.role !== "reflection" && item.role !== "alternative").map(item => item.text).join(" ");
  assert.ok(synthesis.length <= 1200);
  assert.ok(reading.interactions.length >= 1);
});

test("Four of Cups exposes materially distinct blocked and recovering hypotheses", () => {
  const cards=[{positionId:"single",cardId:"cups-04-four",orientation:"reversed"}];
  const reading=Interpretation.interpret(catalog,spreads,request(cards,"multi_hypothesis"));
  assert.deepEqual(reading.cards[0].selectedHypotheses,["blocked","recovering"]);
  assert.equal(reading.interpretations.length,2);
  assert.equal(reading.distinguishingQuestions.length,1);
});
