"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Interpretation=require("../src/Interpretation");
const batchTool=require("../tools/validate-semantic-v2-batch");
const assembler=require("../tools/assemble-semantic-v2-catalog");
const catalog=require("../assets/semantic-v2/cards.json");
const legacy=require("../assets/cards.json");
const registry=require("../assets/semantic-v2/accepted-batches.json");
const spreads=require("../assets/spreads.json");
const benchmark=require("./fixtures/semantic-v2-corpus-benchmark.json");

const EXPECTATION_KEYS=[
  "readingKind","hypothesisCounts","selectedModes","interpretationCount",
  "distinguishingQuestionCount","interactionCount","interactionTypes",
  "patternCount","patternTypes","correlatedEvidenceGroupCount",
  "reflectionPromptCount","utteranceCounts","reframeReason","courtActivationModes"
];
const UNSAFE_REFRAME_REASONS=[
  "decision-transfer","diagnosis","prediction","professional-authority",
  "third-party-mental-state"
];

function sorted(values) { return [...values].sort(); }
function duplicates(values) {
  const seen=new Set(),repeated=new Set();
  for(const value of values) seen.has(value)?repeated.add(value):seen.add(value);
  return [...repeated];
}
function correlatedEvidenceGroupCount(patterns) {
  const groups=new Map();
  for(const pattern of patterns) groups.set(pattern.evidenceGroupId,(groups.get(pattern.evidenceGroupId)||0)+1);
  return [...groups.values()].filter(count=>count>1).length;
}
function evidenceIds(reading) {
  const ids=[];
  for(const interaction of reading.interactions) ids.push(...interaction.evidence);
  for(const pattern of reading.patterns) ids.push(...pattern.evidence);
  for(const interpretation of reading.interpretations) {
    ids.push(...interpretation.evidence);
    ids.push(...interpretation.counterEvidence.map(item=>item.evidenceId));
  }
  for(const projection of ["concise","expanded"]) {
    for(const utterance of reading.utterances[projection]) ids.push(...utterance.evidence);
  }
  return ids;
}

function assertInvariantExpectationShape(item) {
  assert.deepEqual(sorted(Object.keys(item)),["expect","id","request"],item.id);
  assert.deepEqual(sorted(Object.keys(item.expect)),sorted(EXPECTATION_KEYS),item.id);
  const forbidden=new Set(["claim","text","normalizedQuestion","distinguishingQuestion","utterances"]);
  function visit(value) {
    if(Array.isArray(value)) return value.forEach(visit);
    if(!value||typeof value!=="object") return;
    for(const [key,nested] of Object.entries(value)) {
      assert.equal(forbidden.has(key),false,item.id+":"+key);
      visit(nested);
    }
  }
  visit(item.expect);
}

test("assembled semantic-v2 catalog and accepted registry match the benchmark digest",()=>{
  const root=fs.realpathSync(path.resolve(__dirname,".."));
  const assembled=assembler.assemble(root,registry,legacy,spreads);
  assert.equal(benchmark.candidateDigest,"7ebcbba02fdcdd4f5b755be0b937b1cc2bf65b9b4a8a647c912c9163ba695c5d");
  assert.equal(assembled.digest,benchmark.candidateDigest);
  assert.equal(batchTool.canonicalDigest(catalog),benchmark.candidateDigest);
  assert.deepEqual(assembled.catalog,catalog);
  assert.deepEqual(registry.batches.map(batch=>batch.id),["major","wands","cups","swords","pentacles"]);
  assert.equal(registry.batches.reduce((count,batch)=>count+batch.cards,0),78);
  assert.equal(catalog.cards.length,78);
  assert.equal(new Set(catalog.cards.map(card=>card.id)).size,78);
});

test("corpus benchmark covers the complete editorial method matrix",()=>{
  assert.equal(benchmark.benchmarkVersion,1);
  assert.equal(benchmark.cases.length,35);
  assert.deepEqual(duplicates(benchmark.cases.map(item=>item.id)),[]);
  for(const item of benchmark.cases) assertInvariantExpectationShape(item);

  const coveredCards=new Set(benchmark.cases.flatMap(item=>item.request.cards.map(card=>card.cardId)));
  assert.deepEqual(sorted(coveredCards),sorted(catalog.cards.map(card=>card.id)));
  assert.deepEqual(sorted(new Set(benchmark.cases.map(item=>item.request.spreadId))),["context-friction-doorway","single"]);
  assert.deepEqual(sorted(new Set(benchmark.cases.map(item=>item.request.reversalPolicy))),["energy_state","multi_hypothesis","none","traditional"]);
  assert.deepEqual(sorted(new Set(benchmark.cases.flatMap(item=>item.request.cards.map(card=>card.orientation)))),["reversed","upright"]);
  assert.deepEqual(sorted(new Set(benchmark.cases.map(item=>item.request.topicLens))),["creative-practice","general","relationship","wellbeing","work"]);
  assert.deepEqual(sorted(new Set(benchmark.cases.map(item=>item.expect.reframeReason).filter(Boolean))),UNSAFE_REFRAME_REASONS);
  assert.deepEqual(sorted(new Set(benchmark.cases.flatMap(item=>item.expect.selectedModes.flat()))),sorted(Interpretation.ENUMS.reversalMode));

  const patternTypes=new Set(benchmark.cases.flatMap(item=>item.expect.patternTypes));
  for(const type of ["theme-recurrence","suit-recurrence","element-recurrence","rank-recurrence","number-recurrence","arcana-balance","major-density","court-density","orientation-concentration"]) assert.ok(patternTypes.has(type),type);
  assert.deepEqual(sorted(new Set(benchmark.cases.flatMap(item=>item.expect.interactionTypes))),["continues","reinforces","returns"]);
  assert.ok(benchmark.cases.some(item=>item.expect.correlatedEvidenceGroupCount>0));
  assert.ok(benchmark.cases.some(item=>item.expect.interpretationCount===2));
  assert.ok(benchmark.cases.some(item=>item.request.reversalPolicy==="multi_hypothesis"&&item.expect.interpretationCount===1));

  const mixed=benchmark.cases.filter(item=>{
    const cards=item.request.cards.map(selection=>catalog.cards.find(card=>card.id===selection.cardId));
    return cards.some(card=>card.arcana==="major")&&cards.some(card=>card.arcana==="minor");
  });
  assert.ok(mixed.length>=1);

  const coveredCourts=new Set(benchmark.cases.flatMap(item=>Object.keys(item.expect.courtActivationModes)));
  const catalogCourts=catalog.cards.filter(card=>card.courtModes).map(card=>card.id);
  assert.deepEqual(sorted(coveredCourts),sorted(catalogCourts));
});

test("every corpus benchmark reading satisfies invariant expectations and evidence scope",()=>{
  const indexes=Interpretation.validateCatalog(catalog,spreads);
  const cardIndex=new Map(catalog.cards.map(card=>[card.id,card]));
  const spreadIndex=new Map(spreads.spreads.map(spread=>[spread.id,spread]));
  const primaryClaims=[];
  const semanticShapes=new Set();

  for(const item of benchmark.cases) {
    const reading=Interpretation.interpret(catalog,spreads,item.request);
    const repeated=Interpretation.interpret(catalog,spreads,JSON.parse(JSON.stringify(item.request)));
    assert.deepEqual(repeated,reading,item.id+": deterministic output");
    assert.equal(Interpretation.validateReading(indexes,reading),true,item.id);

    assert.equal(reading.kind,item.expect.readingKind,item.id);
    assert.deepEqual(reading.cards.map(card=>card.selectedHypotheses.length),item.expect.hypothesisCounts,item.id);
    assert.deepEqual(reading.cards.map(card=>card.selectedHypotheses),item.expect.selectedModes,item.id);
    assert.equal(reading.interpretations.length,item.expect.interpretationCount,item.id);
    assert.equal(reading.distinguishingQuestions.length,item.expect.distinguishingQuestionCount,item.id);
    assert.equal(reading.interactions.length,item.expect.interactionCount,item.id);
    assert.deepEqual(sorted(reading.interactions.map(interaction=>interaction.type)),item.expect.interactionTypes,item.id);
    assert.equal(reading.patterns.length,item.expect.patternCount,item.id);
    assert.deepEqual(sorted(reading.patterns.map(pattern=>pattern.type)),item.expect.patternTypes,item.id);
    assert.equal(correlatedEvidenceGroupCount(reading.patterns),item.expect.correlatedEvidenceGroupCount,item.id);
    assert.equal(reading.reflectionPromptIds.length,item.expect.reflectionPromptCount,item.id);
    assert.deepEqual({concise:reading.utterances.concise.length,expanded:reading.utterances.expanded.length},item.expect.utteranceCounts,item.id);
    assert.equal(reading.reframeReason,item.expect.reframeReason,item.id);

    const selectedCards=item.request.cards.map(selection=>cardIndex.get(selection.cardId));
    const inScopeClaims=new Set(selectedCards.flatMap(card=>card.claims.map(claim=>claim.id)));
    const inScopePrompts=new Set(selectedCards.flatMap(card=>card.reflectionPrompts.map(prompt=>prompt.id)));
    assert.ok(evidenceIds(reading).every(id=>inScopeClaims.has(id)),item.id+": out-of-scope evidence");
    assert.ok(reading.reflectionPromptIds.every(id=>inScopePrompts.has(id)),item.id+": out-of-scope prompt");

    const spread=spreadIndex.get(reading.spreadId);
    for(const interaction of reading.interactions) {
      const edge=spread.edges.find(candidate=>candidate.from===interaction.from&&candidate.to===interaction.to);
      assert.ok(edge,item.id+":"+interaction.id);
      assert.equal(edge.causality,false,item.id+":"+interaction.id);
      assert.ok(edge.allowedRelations.includes(interaction.type),item.id+":"+interaction.id);
    }

    const analysis=Interpretation.analyze(catalog,spreads,item.request);
    for(const [cardId,modes] of Object.entries(item.expect.courtActivationModes)) {
      const card=cardIndex.get(cardId);
      const activated=new Set(analysis.cards.find(entry=>entry.cardId===cardId).activatedClaimIds);
      for(const mode of modes) assert.ok(card.courtModes[mode].some(id=>activated.has(id)),item.id+":"+cardId+":"+mode);
    }

    primaryClaims.push(reading.interpretations[0].claim);
    semanticShapes.add(JSON.stringify({
      kind:reading.kind,
      modes:reading.cards.map(card=>card.selectedHypotheses),
      interactions:reading.interactions.map(interaction=>interaction.type),
      patterns:reading.patterns.map(pattern=>pattern.type),
      alternatives:reading.interpretations.length-1,
      reframe:reading.reframeReason
    }));
  }

  assert.deepEqual(duplicates(primaryClaims),[]);
  assert.ok(semanticShapes.size>=25,"expected at least 25 distinct non-prose semantic shapes");
});

test("benchmark fixture stores requests and invariants rather than generated prose",()=>{
  const serialized=JSON.stringify(benchmark);
  for(const field of ["\"claim\":","\"text\":","\"normalizedQuestion\":","\"distinguishingQuestion\":","\"utterances\":"]) assert.equal(serialized.includes(field),false,field);
  assert.ok(benchmark.cases.every(item=>Object.prototype.hasOwnProperty.call(item.request,"originalQuestion")));
});
