"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const Interpretation=require("../src/Interpretation");
const catalog=require("../assets/semantic-v2/cards.json");
const spreads=require("../assets/spreads.json");
const benchmark=require("./fixtures/semantic-v2-corpus-benchmark.json");

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function stripRequestField(analysis,field) { const value=clone(analysis); delete value.request[field]; return value; }
function request(overrides) {
  return Object.assign({spreadId:"context-friction-doorway",cards:[{positionId:"context",cardId:"major-16-the-tower",orientation:"reversed"},{positionId:"friction",cardId:"swords-01-ace",orientation:"upright"},{positionId:"doorway",cardId:"wands-01-ace",orientation:"upright"}],originalQuestion:null,topicLens:"general",tradition:"rws",reversalPolicy:"multi_hypothesis",elementalDignity:"disabled",narratorId:"clear-reflective-v1"},overrides || {});
}

function localRequests(count) {
  let state=0x6d2b79f5;
  function next() { state=Math.imul(state^state>>>15,1|state); state=(state+Math.imul(state^state>>>7,61|state))^state; return (state^state>>>14)>>>0; }
  const output=[];
  for (let index=0;index<count;index++) {
    const chosen=[];
    while (chosen.length<3) { const id=catalog.cards[next()%catalog.cards.length].id; if (!chosen.includes(id)) chosen.push(id); }
    output.push(request({cards:["context","friction","doorway"].map((positionId,i) => ({positionId,cardId:chosen[i],orientation:(next()&3) === 0 ? "reversed" : "upright"})),reversalPolicy:["none","traditional","energy_state","multi_hypothesis"][next()%4]}));
  }
  return output;
}

test("test-local generated analyses repeat byte-for-byte without production RNG", () => {
  const requests=localRequests(48);
  assert.deepEqual(localRequests(48),requests);
  for (const item of requests) {
    const first=Interpretation.analyze(catalog,spreads,item);
    const second=Interpretation.analyze(catalog,spreads,clone(item));
    assert.equal(JSON.stringify(first),JSON.stringify(second));
  }
});

test("cached interpreter preserves public output, typed failures, and input isolation", () => {
  const source=clone(catalog);
  const cached=Interpretation.createInterpreter(source,spreads);
  const item=request();
  assert.deepEqual(cached.analyze(item),Interpretation.analyze(catalog,spreads,item));
  assert.deepEqual(cached.plan(item),Interpretation.planInterpretation(catalog,spreads,item));
  assert.deepEqual(cached.interpret(item),Interpretation.interpret(catalog,spreads,item));
  source.cards[0].title="Mutated after validation";
  item.cards[0].cardId="unknown";
  assert.equal(cached.interpret(request()).cards[0].cardId,"major-16-the-tower");
  for (const invalid of [request({reversalPolicy:"random"}),request({cards:request().cards.slice(0,2)})]) {
    let publicCode=null,cachedCode=null;
    try { Interpretation.interpret(catalog,spreads,invalid); } catch (error) { publicCode=error.code; }
    try { cached.interpret(invalid); } catch (error) { cachedCode=error.code; }
    assert.ok(publicCode);
    assert.equal(cachedCode,publicCode);
  }
});

test("ordered spread positions remain semantically order-sensitive", () => {
  const first=request({reversalPolicy:"energy_state"});
  const second=clone(first);
  const left=second.cards[0].cardId;
  second.cards[0].cardId=second.cards[2].cardId;
  second.cards[2].cardId=left;
  const firstAnalysis=Interpretation.analyze(catalog,spreads,first);
  const secondAnalysis=Interpretation.analyze(catalog,spreads,second);
  assert.notDeepEqual(firstAnalysis.cards,secondAnalysis.cards);
  assert.notEqual(Interpretation.interpret(catalog,spreads,first).id,Interpretation.interpret(catalog,spreads,second).id);
});

test("adding an ineligible claim cannot alter semantic output", () => {
  const changed=clone(catalog);
  changed.cards[0].claims.push({id:"major-00-the-fool.zz-agent-assisted",text:"An uncatalogued presentation layer remains outside canonical selection.",lens:"traditional-range",orientation:"upright",tradition:"rws",provenanceKind:"original-paraphrase",sourceRefs:["vault-keywords"],themes:["agency"],topicLenses:["work"]});
  const item={spreadId:"single",cards:[{positionId:"single",cardId:"major-00-the-fool",orientation:"upright"}],originalQuestion:null,topicLens:"general",tradition:"rws",reversalPolicy:"none",elementalDignity:"disabled",narratorId:"clear-reflective-v1"};
  assert.doesNotThrow(() => Interpretation.validateCatalog(changed,spreads));
  assert.deepEqual(Interpretation.analyze(changed,spreads,item),Interpretation.analyze(catalog,spreads,item));
  assert.deepEqual(Interpretation.interpret(changed,spreads,item),Interpretation.interpret(catalog,spreads,item));
});

test("removing alternative-only support removes only the alternative", () => {
  const item={spreadId:"single",cards:[{positionId:"single",cardId:"major-00-the-fool",orientation:"reversed"}],originalQuestion:null,topicLens:"general",tradition:"rws",reversalPolicy:"multi_hypothesis",elementalDignity:"disabled",narratorId:"clear-reflective-v1"};
  const baseline=Interpretation.planInterpretation(catalog,spreads,item);
  assert.ok(baseline.alternative);
  const changed=clone(catalog);
  const card=changed.cards.find(value => value.id === "major-00-the-fool");
  const alternativeMode=baseline.analysis.cards[0].selectedHypotheses[1];
  delete card.reversalModes[alternativeMode];
  const reduced=Interpretation.planInterpretation(changed,spreads,item);
  assert.equal(reduced.alternative,null);
  assert.equal(reduced.analysis.cards[0].selectedHypotheses.length,1);
  assert.equal(reduced.analysis.cards[0].selectedHypotheses[0],baseline.analysis.cards[0].selectedHypotheses[0]);
  assert.deepEqual(reduced.primary.evidence,baseline.primary.evidence);
  assert.deepEqual(reduced.selectedPropositions.map(value => value.id),baseline.selectedPropositions.map(value => value.id));
});

test("dignity toggle changes no undocumented semantic field", () => {
  const disabled=Interpretation.analyze(catalog,spreads,request({elementalDignity:"disabled"}));
  const enabled=Interpretation.analyze(catalog,spreads,request({elementalDignity:"enabled"}));
  assert.deepEqual(stripRequestField(enabled,"elementalDignity"),stripRequestField(disabled,"elementalDignity"));
});

test("all declared narrators preserve proposition identity and evidence", () => {
  const baseline=Interpretation.planInterpretation(catalog,spreads,request());
  assert.ok(Interpretation.ENUMS.narrator.length >= 1);
  for (const narratorId of Interpretation.ENUMS.narrator) {
    const plan=Interpretation.planInterpretation(catalog,spreads,request({narratorId}));
    assert.deepEqual(plan.selectedPropositions.map(item => ({id:item.id,evidence:item.evidence})),baseline.selectedPropositions.map(item => ({id:item.id,evidence:item.evidence})));
    assert.deepEqual(plan.primary.evidence,baseline.primary.evidence);
  }
});

test("every benchmark proposition reconstructs from candidates and drawn evidence", () => {
  for (const item of benchmark.cases) {
    const plan=Interpretation.planInterpretation(catalog,spreads,item.request);
    const candidateIndex=new Map(plan.candidates.map(candidate => [candidate.id,candidate]));
    const drawn=new Set();
    for (const selection of item.request.cards) for (const claim of catalog.cards.find(card => card.id === selection.cardId).claims) drawn.add(claim.id);
    for (const proposition of plan.selectedPropositions) {
      const candidate=candidateIndex.get(proposition.id);
      assert.ok(candidate,item.id+":"+proposition.id);
      assert.deepEqual(candidate.evidence,proposition.evidence,item.id+":"+proposition.id);
      assert.ok(proposition.evidence.every(id => drawn.has(id)),item.id+":"+proposition.id+":undrawn evidence");
    }
    assert.ok(plan.primary.evidence.every(id => drawn.has(id)),item.id+":primary undrawn evidence");
    if (plan.alternative) {
      assert.ok(plan.alternative.evidence.every(id => drawn.has(id)),item.id+":alternative undrawn evidence");
      assert.ok(plan.alternative.counterEvidence.every(entry => drawn.has(entry.evidenceId)),item.id+":counterevidence undrawn");
    }
  }
});
