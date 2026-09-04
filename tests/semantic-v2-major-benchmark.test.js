"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const Interpretation=require("../src/Interpretation");
const batchTool=require("../tools/validate-semantic-v2-batch");
const catalog=require("../assets/semantic-v2/batches/major.json");
const legacy=require("../assets/cards.json");
const spreads=require("../assets/spreads.json");
const benchmark=require("./fixtures/semantic-v2-major-benchmark.json");

function duplicates(values) {
  const seen=new Set(), repeated=new Set();
  for (const value of values) seen.has(value) ? repeated.add(value) : seen.add(value);
  return [...repeated];
}

test("Major Arcana batch passes strict acceptance at the reviewed digest", () => {
  const result=batchTool.auditBatch(catalog,"major",legacy,spreads);
  assert.equal(result.outcome,"passed");
  assert.equal(result.cards,22);
  assert.equal(result.digest,benchmark.batchDigest);
});

test("Major Arcana benchmark covers the required method matrix", () => {
  assert.equal(benchmark.batchId,"major");
  assert.equal(duplicates(benchmark.cases.map(item => item.id)).length,0);
  const policies=new Set(benchmark.cases.map(item => item.request.reversalPolicy));
  assert.deepEqual([...policies].sort(),["energy_state","multi_hypothesis","none","traditional"]);
  assert.ok(benchmark.cases.some(item => item.request.spreadId === "single"));
  assert.ok(benchmark.cases.some(item => item.request.spreadId === "context-friction-doorway"));
  assert.ok(benchmark.cases.some(item => item.expect.alternative));
  assert.ok(benchmark.cases.some(item => !item.expect.alternative));
  assert.ok(benchmark.cases.some(item => item.expect.minInteractions > 0));
  assert.ok(benchmark.cases.some(item => item.expect.sharedEvidenceGroup));
  assert.ok(benchmark.cases.some(item => item.expect.reframeReason));
  assert.ok(benchmark.cases.some(item => item.request.cards.some(card => card.orientation === "reversed")));
  assert.ok(benchmark.cases.some(item => item.request.cards.some(card => card.orientation === "upright")));
});

test("every Major Arcana benchmark reading satisfies semantic expectations", () => {
  const indexes=Interpretation.validateCatalog(catalog,spreads);
  const primaryClaims=[];
  for (const item of benchmark.cases) {
    const reading=Interpretation.interpret(catalog,spreads,item.request);
    assert.equal(Interpretation.validateReading(indexes,reading),true,item.id);
    assert.deepEqual(reading.cards.map(card => card.selectedHypotheses.length),item.expect.hypothesisCounts,item.id);
    if (item.expect.selectedModes) assert.deepEqual(reading.cards[0].selectedHypotheses,item.expect.selectedModes,item.id);
    assert.equal(reading.interpretations.length === 2,item.expect.alternative,item.id);
    assert.equal(reading.distinguishingQuestions.length,item.expect.alternative ? 1 : 0,item.id);
    assert.equal(reading.reframeReason,item.expect.reframeReason,item.id);
    assert.ok(reading.interactions.length >= item.expect.minInteractions,item.id);
    for (const type of item.expect.requiredPatternTypes) assert.ok(reading.patterns.some(pattern => pattern.type === type),item.id+":"+type);
    if (item.expect.sharedEvidenceGroup) {
      const groups=new Map();
      for (const pattern of reading.patterns) groups.set(pattern.evidenceGroupId,(groups.get(pattern.evidenceGroupId) || 0)+1);
      assert.ok([...groups.values()].some(count => count > 1),item.id);
    }
    primaryClaims.push(reading.interpretations[0].claim);
  }
  assert.deepEqual(duplicates(primaryClaims),[]);
});

test("High Priestess and Moon retain distinct editorial centers", () => {
  const priestess=catalog.cards.find(card => card.id === "major-02-the-high-priestess");
  const moon=catalog.cards.find(card => card.id === "major-18-the-moon");
  assert.notDeepEqual([...priestess.coreThemes].sort(),[...moon.coreThemes].sort());
  assert.ok(priestess.coreThemes.includes("solitude"));
  assert.ok(moon.coreThemes.includes("ambiguity"));
  const priestessTexts=priestess.claims.concat(priestess.reflectionPrompts).map(item => item.text.toLowerCase());
  const moonTexts=new Set(moon.claims.concat(moon.reflectionPrompts).map(item => item.text.toLowerCase()));
  assert.ok(priestessTexts.every(text => !moonTexts.has(text)));
});
