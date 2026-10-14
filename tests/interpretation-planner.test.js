"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {spawnSync}=require("node:child_process");
const Interpretation=require("../src/Interpretation");
const pilot=require("./fixtures/semantic-v2-pilot.json");
const spreads=require("../assets/spreads.json");

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function expectCode(code,action) { assert.throws(action,error => error && error.code === code); }

function supportedSpreadRequest() {
  return {spreadId:"context-friction-doorway",cards:[
    {positionId:"context",cardId:"wands-11-page",orientation:"upright"},
    {positionId:"friction",cardId:"wands-01-ace",orientation:"upright"},
    {positionId:"doorway",cardId:"wands-10-ten",orientation:"upright"}
  ],originalQuestion:"What needs attention in this workload?",topicLens:"general",tradition:"rws",reversalPolicy:"energy_state",elementalDignity:"disabled",narratorId:"clear-reflective-v1"};
}

test("candidate generation is evidence-bearing and covers each spread position", () => {
  const indexes=Interpretation.validateCatalog(pilot,spreads);
  const analysis=Interpretation.analyze(pilot,spreads,supportedSpreadRequest());
  const candidates=Interpretation.generateCandidates(indexes,analysis);
  const positions=candidates.filter(item => item.kind === "position");
  assert.deepEqual(positions.map(item => item.positionId).sort(),["context","doorway","friction"]);
  assert.ok(positions.every(item => item.eligible && item.evidence.length >= 2));
  assert.ok(candidates.every(item => typeof item.rhetoricalRole === "string" && Array.isArray(item.conflicts) && Object.prototype.hasOwnProperty.call(item,"ambiguityAxis")));
  assert.ok(candidates.some(item => item.kind === "interaction"));
  assert.ok(candidates.some(item => item.kind === "pattern"));
});

test("content planning satisfies coverage and selects one spread-level connection", () => {
  const plan=Interpretation.planInterpretation(pilot,spreads,supportedSpreadRequest());
  const covered=new Set(plan.selectedPropositions.flatMap(item => item.coverage));
  assert.deepEqual([...covered].sort(),["context","doorway","friction"]);
  assert.equal(plan.selectedPropositions.filter(item => item.kind === "interaction" || item.kind === "pattern").length,1);
  assert.equal(plan.selectedPropositions.find(item => item.kind === "interaction" || item.kind === "pattern").kind,"interaction");
  assert.deepEqual(plan.rhetoricalTree.map(item => item.role),["support","governing","tension","development","reflection"]);
  assert.equal(new Set(plan.rhetoricalTree.map(item => item.role)).size,plan.rhetoricalTree.length);
});

test("multi-hypothesis alternatives require material support and remain optional", () => {
  const multi=Interpretation.planInterpretation(pilot,spreads,pilot.cases[0].request);
  assert.ok(multi.alternative);
  assert.ok(multi.alternative.ambiguityAxis);
  assert.match(multi.alternative.distinguishingQuestion,/observable/i);
  assert.ok(multi.alternative.distinguishingQuestion.endsWith("?"));
  assert.ok(multi.alternative.evidence.length >= 1);
  assert.equal(multi.alternative.counterEvidence.length,1);
  const hypothesis=multi.candidates.find(item => item.kind === "hypothesis");
  const primary=multi.candidates.find(item => item.id === hypothesis.conflicts[0]);
  assert.ok(primary.conflicts.includes(hypothesis.id));

  const energyRequest=clone(pilot.cases[0].request);
  energyRequest.reversalPolicy="energy_state";
  assert.equal(Interpretation.planInterpretation(pilot,spreads,energyRequest).alternative,null);
  assert.equal(Interpretation.planInterpretation(pilot,spreads,pilot.cases[1].request).alternative,null);

  const sameFamily=clone(pilot);
  const ace=sameFamily.cards.find(item => item.id === "wands-01-ace");
  ace.reversalModes={blocked:ace.reversalModes.blocked,reduced:ace.reversalModes.reduced};
  const sameFamilyRequest={spreadId:"single",cards:[{positionId:"single",cardId:"wands-01-ace",orientation:"reversed"}],originalQuestion:null,topicLens:"general",tradition:"rws",reversalPolicy:"multi_hypothesis",elementalDignity:"disabled",narratorId:"clear-reflective-v1"};
  assert.equal(Interpretation.planInterpretation(sameFamily,spreads,sameFamilyRequest).alternative,null);

  const unsupported=clone(pilot);
  const hermit=unsupported.cards.find(item => item.id === "major-09-the-hermit");
  const unsupportedPosition=clone(hermit.claims.find(item => item.id === hermit.positionClaims.single[0]));
  unsupportedPosition.id=hermit.id+".position.aaa-single";
  unsupportedPosition.text="Attend to the rupture without assigning it a hidden purpose.";
  unsupportedPosition.themes=["collaboration"];
  hermit.claims.push(unsupportedPosition);
  hermit.claims.sort((a,b) => a.id.localeCompare(b.id));
  hermit.positionClaims.single=[unsupportedPosition.id];
  const unsupportedRequest={spreadId:"single",cards:[{positionId:"single",cardId:hermit.id,orientation:"reversed"}],originalQuestion:null,topicLens:"general",tradition:"rws",reversalPolicy:"multi_hypothesis",elementalDignity:"disabled",narratorId:"clear-reflective-v1"};
  const unsupportedPlan=Interpretation.planInterpretation(unsupported,spreads,unsupportedRequest);
  assert.equal(unsupportedPlan.analysis.cards[0].selectedHypotheses.length,1);
  assert.equal(unsupportedPlan.alternative,null);
  assert.equal(Interpretation.validateReading(unsupportedPlan.indexes,Interpretation.interpret(unsupported,spreads,unsupportedRequest)),true);

  const unsafeHypothesisCatalog=clone(pilot);
  const unsafeHypothesisRequest={spreadId:"single",cards:[{positionId:"single",cardId:"major-16-the-tower",orientation:"reversed"}],originalQuestion:null,topicLens:"general",tradition:"rws",reversalPolicy:"multi_hypothesis",elementalDignity:"disabled",narratorId:"clear-reflective-v1"};
  const baseline=Interpretation.analyze(unsafeHypothesisCatalog,spreads,unsafeHypothesisRequest);
  assert.equal(baseline.cards[0].selectedHypotheses.length,2);
  const [firstMode,secondMode]=baseline.cards[0].selectedHypotheses;
  const unsafeTower=unsafeHypothesisCatalog.cards.find(item => item.id === "major-16-the-tower");
  const retainedModes={};
  for (const modeId of [firstMode,secondMode].sort()) retainedModes[modeId]=unsafeTower.reversalModes[modeId];
  unsafeTower.reversalModes=retainedModes;
  unsafeTower.claims.find(item => item.id === baseline.cards[0].selectedHypothesisClaims[1].claimId).text="Your partner fears losing you.";
  const safePlan=Interpretation.planInterpretation(unsafeHypothesisCatalog,spreads,unsafeHypothesisRequest);
  assert.equal(safePlan.analysis.cards[0].selectedHypotheses.length,1);
  assert.equal(safePlan.alternative,null);
  assert.equal(safePlan.analysis.trace.reversalCandidates[0].safetyRejections.length,1);
  assert.equal(Interpretation.validateReading(safePlan.indexes,Interpretation.interpret(unsafeHypothesisCatalog,spreads,unsafeHypothesisRequest)),true);
});

test("unsafe proposition text is ineligible before ranking and cannot leave partial coverage", () => {
  const unsafe=clone(pilot);
  const card=unsafe.cards.find(item => item.id === "wands-01-ace");
  const claim=card.claims.find(item => item.id === card.positionClaims.friction[0]);
  claim.text="The cards decide that you must accept this outcome.";
  const indexes=Interpretation.validateCatalog(unsafe,spreads);
  const analysis=Interpretation.analyze(unsafe,spreads,supportedSpreadRequest());
  const candidate=Interpretation.generateCandidates(indexes,analysis).find(item => item.id === "proposition:position:friction");
  assert.equal(candidate.eligible,false);
  assert.equal(candidate.rejectionReason,"decision-transfer");
  expectCode("NO_COVERAGE_PLAN",() => Interpretation.planInterpretation(unsafe,spreads,supportedSpreadRequest()));
});

test("the planner preserves the exact reversal claim selected by rule scoring", () => {
  const extended=clone(pilot);
  const tower=extended.cards.find(item => item.id === "major-16-the-tower");
  const original=tower.claims.find(item => item.id === tower.reversalModes.internalized[0]);
  const competing=clone(original);
  competing.id=tower.id+".reversal.aaa-internalized";
  competing.text="The disruption is being processed internally while its outward structure remains unsettled.";
  tower.claims.push(competing);
  tower.claims.sort((a,b) => a.id.localeCompare(b.id));
  tower.reversalModes.internalized.push(competing.id);
  tower.reversalModes.internalized.sort();
  const plan=Interpretation.planInterpretation(extended,spreads,pilot.cases[0].request);
  const analysisCard=plan.analysis.cards.find(item => item.cardId === tower.id);
  assert.equal(analysisCard.selectedHypothesisClaims[0].claimId,competing.id);
  assert.ok(plan.primary.evidence.includes(competing.id));
});

test("concise and expanded renderings preserve one selected semantic plan", () => {
  const plan=Interpretation.planInterpretation(pilot,spreads,pilot.cases[0].request);
  const concise=Interpretation.renderPlan(plan,"concise");
  const expanded=Interpretation.renderPlan(plan,"expanded");
  assert.ok(concise.length >= plan.rhetoricalTree.length);
  assert.ok(expanded.length >= concise.length);
  assert.deepEqual(concise.slice(0,2).map(item => item.role),["support","governing"]);
  assert.deepEqual(expanded.slice(0,2).map(item => item.role),["support","governing"]);
  const selectedEvidence=new Set(plan.selectedPropositions.flatMap(item => item.evidence).concat(plan.alternative ? plan.alternative.evidence : []));
  assert.ok(concise.every(item => item.evidence.every(id => selectedEvidence.has(id))));
  assert.ok(expanded.every(item => item.evidence.every(id => selectedEvidence.has(id))));
  expectCode("INVALID_SCHEMA",() => Interpretation.renderPlan(plan,"ornate"));
  const corrupted=clone(plan);
  corrupted.selectedPropositions=corrupted.selectedPropositions.filter(item => item.id !== corrupted.rhetoricalTree[0].propositionId);
  expectCode("INVALID_REFERENCE",() => Interpretation.renderPlan(corrupted,"concise"));
  const conflicting=clone(plan);
  conflicting.selectedPropositions[0].conflicts=[conflicting.selectedPropositions[1].id];
  expectCode("NO_COVERAGE_PLAN",() => Interpretation.renderPlan(conflicting,"concise"));
  const unsafeAlternative=clone(plan);
  unsafeAlternative.alternative.claim="You will know tomorrow.";
  expectCode("UNSAFE_UNRESOLVED_REQUEST",() => Interpretation.renderPlan(unsafeAlternative,"concise"));
});

test("semantic safety blocks timing, certainty, and demographic essentialism", () => {
  for (const unsafeText of ["You will receive an offer tomorrow.","This outcome is definitely guaranteed.","As a woman, this court card requires compliance.","Your partner thinks you are leaving.","Your partner fears losing you.","Your partner is afraid of losing you.","Your partner thinks you feel ignored.","As your therapist, I prescribe this course of action.","As a doctor, I know this treatment is right.","I am your lawyer, so you must comply."]) {
    const unsafe=clone(pilot);
    const card=unsafe.cards.find(item => item.id === "wands-01-ace");
    card.claims.find(item => item.id === card.positionClaims.single[0]).text=unsafeText;
    const request=clone(pilot.cases[1].request);
    expectCode("NO_COVERAGE_PLAN",() => Interpretation.planInterpretation(unsafe,spreads,request));
  }
});

test("planner enforces aggregate synthesis density before realization", () => {
  const dense=clone(pilot);
  const request=supportedSpreadRequest();
  for (const selected of request.cards) {
    const card=dense.cards.find(item => item.id === selected.cardId);
    card.claims.find(item => item.id === card.positionClaims[selected.positionId][0]).text="A".repeat(359)+".";
  }
  expectCode("NO_COVERAGE_PLAN",() => Interpretation.planInterpretation(dense,spreads,request));
});

test("planner structurally omits optional expanded support to preserve density", () => {
  const dense=clone(pilot);
  const request=supportedSpreadRequest();
  for (const selected of request.cards) {
    const card=dense.cards.find(item => item.id === selected.cardId);
    for (const lens of ["traditional-core","omarchy"]) card.claims.find(item => item.lens === lens).text="B".repeat(359)+".";
  }
  const plan=Interpretation.planInterpretation(dense,spreads,request);
  const positioned=plan.selectedPropositions.filter(item => item.kind === "position");
  assert.ok(positioned.some(item => item.coreClaim === null || item.omarchyClaim === null));
  const expanded=Interpretation.renderPlan(plan,"expanded");
  const synthesis=expanded.filter(item => item.role !== "reflection" && item.role !== "alternative").map(item => item.text).join(" ");
  assert.ok(synthesis.length <= 1200);
  assert.doesNotThrow(() => Interpretation.interpret(dense,spreads,request));
});

test("complete readings are stable under unordered position-reference registration", () => {
  const ordered=clone(pilot);
  const tower=ordered.cards.find(item => item.id === "major-16-the-tower");
  const extra=clone(tower.claims.find(item => item.id === tower.positionClaims.friction[0]));
  extra.id=tower.id+".position.aaa-friction";
  extra.text="The friction is whether the failed structure is released or defended.";
  tower.claims.push(extra);
  tower.claims.sort((a,b) => a.id.localeCompare(b.id));
  tower.positionClaims.friction.push(extra.id);
  tower.positionClaims.friction.sort();
  const reordered=clone(ordered);
  reordered.cards.find(item => item.id === tower.id).positionClaims.friction.reverse();
  assert.deepEqual(Interpretation.interpret(reordered,spreads,pilot.cases[0].request),Interpretation.interpret(ordered,spreads,pilot.cases[0].request));
});

test("complete rendered readings are byte-stable across fresh processes", () => {
  const script="const I=require('./src/Interpretation'),p=require('./tests/fixtures/semantic-v2-pilot.json'),s=require('./assets/spreads.json');process.stdout.write(JSON.stringify(I.interpret(p,s,p.cases[0].request)));";
  const first=spawnSync(process.execPath,["-e",script],{cwd:process.cwd(),encoding:"utf8"});
  const second=spawnSync(process.execPath,["-e",script],{cwd:process.cwd(),encoding:"utf8"});
  assert.equal(first.status,0,first.stderr);
  assert.equal(second.status,0,second.stderr);
  assert.equal(first.stdout,second.stdout);
});

test("interpret produces a valid immutable semantic reading projection", () => {
  const indexes=Interpretation.validateCatalog(pilot,spreads);
  const reading=Interpretation.interpret(pilot,spreads,pilot.cases[0].request);
  assert.equal(Interpretation.validateReading(indexes,reading),true);
  assert.equal(reading.schemaVersion,2);
  assert.equal(reading.methodVersion,"arcana-composer-v2");
  assert.equal(reading.interpretations.length,2);
  assert.equal(reading.distinguishingQuestions.length,1);
  assert.equal(reading.originalQuestion,pilot.cases[0].request.originalQuestion);
  assert.equal(reading.reframeReason,"decision-transfer");
  assert.equal(reading.utterances.concise.filter(item => item.role === "alternative").length,1);
  assert.deepEqual(Interpretation.interpret(pilot,spreads,clone(pilot.cases[0].request)),reading);
});

test("no-alternative readings omit alternative semantics in every projection", () => {
  const reading=Interpretation.interpret(pilot,spreads,pilot.cases[1].request);
  assert.equal(reading.interpretations.length,1);
  assert.deepEqual(reading.distinguishingQuestions,[]);
  assert.ok(reading.utterances.concise.every(item => item.role !== "alternative"));
  assert.ok(reading.utterances.expanded.every(item => item.role !== "alternative"));
});

test("every realized utterance and counterevidence reference stays in-reading", () => {
  const reading=Interpretation.interpret(pilot,spreads,pilot.cases[0].request);
  const evidence=new Set(reading.cards.flatMap(item => pilot.cards.find(card => card.id === item.cardId).claims.map(claim => claim.id)));
  for (const projection of ["concise","expanded"]) for (const utterance of reading.utterances[projection]) {
    assert.ok(utterance.evidence.length > 0);
    assert.ok(utterance.evidence.every(id => evidence.has(id)));
  }
  const propositionIds=new Set(reading.interpretations.map(item => item.id));
  for (const interpretation of reading.interpretations) for (const counter of interpretation.counterEvidence) {
    assert.ok(evidence.has(counter.evidenceId));
    assert.ok(propositionIds.has(counter.targetPropositionId));
  }
});
