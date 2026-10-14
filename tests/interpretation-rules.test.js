"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {execFileSync}=require("node:child_process");
const Interpretation=require("../src/Interpretation");
const pilot=require("./fixtures/semantic-v2-pilot.json");
const spreads=require("../assets/spreads.json");

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function selection(cardId,orientation,positionId) {
  return {positionId:positionId || "single",cardId,orientation:orientation || "upright"};
}

function request(cards,spreadId,overrides) {
  return Object.assign({spreadId:spreadId || "single",cards,originalQuestion:null,topicLens:"general",tradition:"rws",reversalPolicy:"energy_state",elementalDignity:"disabled",narratorId:"clear-reflective-v1"},overrides || {});
}

function expectCode(code,action) {
  assert.throws(action,error => error && error.code === code);
}

test("question normalization preserves original text and applies agency-safe reframes", () => {
  assert.deepEqual(Interpretation.normalizeQuestion("Should I leave?"),{
    originalQuestion:"Should I leave?",
    normalizedQuestion:"What factors, needs, and likely consequences should I consider before making this decision?",
    reframeReason:"decision-transfer"
  });
  assert.equal(Interpretation.normalizeQuestion("Will I get the job?").reframeReason,"prediction");
  assert.equal(Interpretation.normalizeQuestion("What does Alex secretly feel?").reframeReason,"third-party-mental-state");
  assert.equal(Interpretation.normalizeQuestion("Do I have a medical condition?").reframeReason,"diagnosis");
  assert.equal(Interpretation.normalizeQuestion("Can you diagnose me?").reframeReason,"diagnosis");
  assert.equal(Interpretation.normalizeQuestion("Tell me whether I should leave").reframeReason,"decision-transfer");
  assert.equal(Interpretation.normalizeQuestion("Can you guarantee I will get the job?").reframeReason,"prediction");
  assert.equal(Interpretation.normalizeQuestion("What does Alex really think?").reframeReason,"third-party-mental-state");
  assert.equal(Interpretation.normalizeQuestion("Please foretell the result.").reframeReason,"prediction");
  assert.equal(Interpretation.normalizeQuestion("Is this my fate?").reframeReason,"prediction");
  assert.deepEqual(Interpretation.normalizeQuestion(null),{originalQuestion:null,normalizedQuestion:null,reframeReason:null});
  assert.equal(Interpretation.normalizeQuestion("Will my partner return?").reframeReason,"prediction");
  assert.equal(Interpretation.normalizeQuestion("What is Alex planning?").reframeReason,"third-party-mental-state");
  assert.equal(Interpretation.normalizeQuestion("Is Alex thinking about me?").reframeReason,"third-party-mental-state");
  assert.equal(Interpretation.normalizeQuestion("Do you think I will get the job?").reframeReason,"prediction");
  assert.equal(Interpretation.normalizeQuestion("Does Alex fear losing me?").reframeReason,"third-party-mental-state");
  assert.equal(Interpretation.normalizeQuestion("Does Alex think I feel ignored?").reframeReason,"third-party-mental-state");
  assert.equal(Interpretation.normalizeQuestion("As my therapist, prescribe what I should do.").reframeReason,"professional-authority");
  assert.equal(Interpretation.normalizeQuestion("Is Alex afraid of losing me?").reframeReason,"third-party-mental-state");
  assert.equal(Interpretation.normalizeQuestion("As a doctor, tell me which treatment is right.").reframeReason,"professional-authority");
  assert.equal(Interpretation.normalizeQuestion("My project feels stalled.").reframeReason,null);
  for (const question of ["Work feels draining lately","Why Monday feels heavy","Omarchy wants too much config","What is making me feel stuck?","What's the secret to staying focused?","How do I predict my workload better?"])
    assert.equal(Interpretation.normalizeQuestion(question).reframeReason,null,question);
  assert.equal(Interpretation.normalizeQuestion("I wonder if Sam wants to stay").reframeReason,"third-party-mental-state");
  assert.equal(Interpretation.semanticSafetyReason("An opening is widening the range of feeling available in the situation."),null);
  assert.deepEqual(Interpretation.normalizeQuestion("  What needs attention?  "),{originalQuestion:"  What needs attention?  ",normalizedQuestion:"What needs attention?",reframeReason:null});
});

test("canonical requests apply explicit defaults without mutating caller input", () => {
  const indexes=Interpretation.validateCatalog(pilot,spreads);
  const input={spreadId:"single",cards:[selection("major-09-the-hermit")]};
  const before=clone(input);
  const normalized=Interpretation.canonicalRequest(indexes,input);
  assert.deepEqual(input,before);
  assert.equal(normalized.topicLens,"general");
  assert.equal(normalized.tradition,"rws");
  assert.equal(normalized.reversalPolicy,"energy_state");
  assert.equal(normalized.elementalDignity,"disabled");
  assert.equal(normalized.narratorId,"clear-reflective-v1");
});

test("claim activation retains traditional, Omarchy, and position evidence", () => {
  const result=Interpretation.analyze(pilot,spreads,request([selection("major-09-the-hermit","upright")]));
  const claims=result.cards[0].activatedClaimIds;
  assert.ok(claims.includes("major-09-the-hermit.core"));
  assert.ok(claims.includes("major-09-the-hermit.omarchy"));
  assert.ok(claims.includes("major-09-the-hermit.position.single"));
  assert.deepEqual(result.cards[0].selectedHypotheses,[]);
});

test("reversal policies resolve zero, one, or two supported modes", () => {
  const reversed=[selection("major-09-the-hermit","reversed")];
  const none=Interpretation.analyze(pilot,spreads,request(reversed,"single",{reversalPolicy:"none"}));
  assert.deepEqual(none.cards[0].selectedHypotheses,[]);
  assert.ok(!none.cards[0].activatedClaimIds.some(id => id.includes(".reversal.")));

  const energy=Interpretation.analyze(pilot,spreads,request(reversed));
  assert.equal(energy.cards[0].selectedHypotheses.length,1);
  assert.ok(pilot.cards.find(card => card.id === energy.cards[0].cardId).reversalModes[energy.cards[0].selectedHypotheses[0]]);

  const multiple=Interpretation.analyze(pilot,spreads,request(reversed,"single",{reversalPolicy:"multi_hypothesis"}));
  assert.equal(multiple.cards[0].selectedHypotheses.length,2);
  assert.equal(new Set(multiple.cards[0].selectedHypotheses).size,2);
  assert.equal(multiple.ambiguities.length,1);
  assert.equal(multiple.distinguishingQuestions.length,1);
  assert.ok(!multiple.cards[0].selectedHypotheses.includes("traditional_reversed"));

  const threeReversed=Interpretation.analyze(pilot,spreads,request([
    selection("major-09-the-hermit","reversed","context"),
    selection("major-16-the-tower","reversed","friction"),
    selection("major-17-the-star","reversed","doorway")
  ],"context-friction-doorway",{reversalPolicy:"multi_hypothesis"}));
  assert.equal(threeReversed.ambiguities.length,1);
  assert.equal(threeReversed.distinguishingQuestions.length,1);
  assert.deepEqual(threeReversed.cards.map(card => card.selectedHypotheses.length),[1,2,1]);

  const traditional=Interpretation.analyze(pilot,spreads,request([selection("major-00-the-fool","reversed")],"single",{reversalPolicy:"traditional"}));
  assert.deepEqual(traditional.cards[0].selectedHypotheses,["traditional_reversed"]);
  expectCode("UNSUPPORTED_REVERSAL_MODE",() => Interpretation.analyze(pilot,spreads,request(reversed,"single",{reversalPolicy:"traditional"})));
});

test("reversal precedence is deterministic and traceable", () => {
  const input=pilot.cases[0].request;
  const first=Interpretation.analyze(pilot,spreads,input);
  const second=Interpretation.analyze(pilot,spreads,clone(input));
  assert.deepEqual(first,second);
  for (const item of first.trace.reversalCandidates) {
    assert.ok(Array.isArray(item.candidates));
    for (const candidate of item.candidates) {
      assert.deepEqual(Object.keys(candidate.score),["direct","positionFit","adjacentFit","patternFit","claimId"]);
    }
  }
});

test("only declared spread edges with explicit support produce interactions", () => {
  const input=request([
    selection("wands-11-page","upright","context"),
    selection("wands-01-ace","upright","friction"),
    selection("wands-10-ten","upright","doorway")
  ],"context-friction-doorway");
  const result=Interpretation.analyze(pilot,spreads,input);
  assert.deepEqual(result.interactions.map(item => item.id),["relation:context:friction:reinforces"]);
  assert.deepEqual(result.interactions[0].facts,["theme:initiative"]);
  assert.equal(result.trace.relationshipRejections.length,10);
  assert.ok(result.trace.relationshipRejections.some(item => item.edge === "friction:doorway" && item.candidateRelation === "transforms" && item.reason === "no-shared-evidence"));
  assert.ok(result.trace.relationshipRejections.some(item => item.edge === "context:friction" && item.candidateRelation === "contrasts" && item.reason === "missing-directional-rule"));
  assert.ok(result.interactions.every(item => spreads.spreads[1].edges.some(edge => edge.from === item.from && edge.to === item.to && edge.allowedRelations.includes(item.type))));
  assert.equal(result.interactions.length+result.trace.relationshipRejections.length,spreads.spreads[1].edges.reduce((count,edge) => count+edge.allowedRelations.length,0));
});

test("bounded patterns expose grouped evidence without suit-element double counting", () => {
  const input=request([
    selection("wands-11-page","upright","context"),
    selection("wands-01-ace","upright","friction"),
    selection("wands-10-ten","reversed","doorway")
  ],"context-friction-doorway");
  const result=Interpretation.analyze(pilot,spreads,input);
  assert.ok(result.patterns.length <= 8);
  const suit=result.patterns.find(item => item.id === "pattern:suit:wands");
  const element=result.patterns.find(item => item.id === "pattern:element:fire");
  assert.ok(suit);
  assert.ok(element);
  assert.equal(suit.evidenceGroupId,element.evidenceGroupId);
  assert.match(suit.evidenceGroupId,/^[a-z0-9][a-z0-9.:-]{0,95}$/);
  const initiative=result.patterns.find(item => item.id === "pattern:theme:initiative");
  assert.ok(initiative);
  assert.ok(result.patterns.every(item => item.evidence.length >= 2));

  const correlated=clone(pilot);
  correlated.cards.find(card => card.id === "wands-10-ten").coreThemes.push("initiative");
  const correlatedResult=Interpretation.analyze(correlated,spreads,input);
  const correlatedTheme=correlatedResult.patterns.find(item => item.id === "pattern:theme:initiative");
  const correlatedSuit=correlatedResult.patterns.find(item => item.id === "pattern:suit:wands");
  assert.equal(correlatedTheme.evidenceGroupId,correlatedSuit.evidenceGroupId);
});

test("Major and Minor balance is present for mixed and all-Minor spreads", () => {
  const mixed=Interpretation.analyze(pilot,spreads,request([
    selection("major-09-the-hermit","upright","context"),
    selection("wands-01-ace","upright","friction"),
    selection("wands-10-ten","upright","doorway")
  ],"context-friction-doorway"));
  assert.equal(mixed.patterns.find(item => item.id === "pattern:arcana-balance").value,"major-1-minor-2");
  const allMinor=Interpretation.analyze(pilot,spreads,request([
    selection("wands-11-page","upright","context"),
    selection("wands-01-ace","upright","friction"),
    selection("wands-10-ten","upright","doorway")
  ],"context-friction-doorway"));
  assert.equal(allMinor.patterns.find(item => item.id === "pattern:arcana-balance").value,"major-0-minor-3");
});

test("semantic analysis is independent of claim, mode, and source registration order", () => {
  const shuffled=clone(pilot);
  shuffled.sources.sources.reverse();
  for (const card of shuffled.cards) {
    card.claims.reverse();
    card.reversalModes=Object.fromEntries(Object.entries(card.reversalModes).reverse());
  }
  const input=pilot.cases[0].request;
  assert.deepEqual(Interpretation.analyze(shuffled,spreads,input),Interpretation.analyze(pilot,spreads,input));
});

test("relationship and pattern evidence uses stable eligible claims", () => {
  const extended=clone(pilot);
  const card=extended.cards.find(item => item.id === "wands-11-page");
  const ineligible=clone(card.claims.find(claim => claim.lens === "traditional-core"));
  ineligible.id=card.id+".aaa-ineligible";
  ineligible.topicLenses=["work"];
  card.claims.unshift(ineligible);
  const input=request([
    selection("wands-11-page","upright","context"),
    selection("wands-01-ace","upright","friction"),
    selection("wands-10-ten","upright","doorway")
  ],"context-friction-doorway");
  const result=Interpretation.analyze(extended,spreads,input);
  assert.ok(result.interactions[0].evidence.every(id => id !== ineligible.id));
  assert.ok(result.patterns.every(pattern => !pattern.evidence.includes(ineligible.id)));
  card.claims.reverse();
  assert.deepEqual(Interpretation.analyze(extended,spreads,input),result);
});

test("position-reference fallback evidence is canonically ordered", () => {
  const extended=clone(pilot);
  const card=extended.cards.find(item => item.id === "wands-11-page");
  for (const claim of card.claims) if (claim.lens.indexOf("position-") !== 0 && claim.lens !== "reversal") claim.topicLenses=["work"];
  const extra=clone(card.claims.find(claim => claim.id === card.positionClaims.context[0]));
  extra.id=card.id+".position.context-alt";
  card.claims.push(extra);
  card.positionClaims.context.push(extra.id);
  const input=request([
    selection("wands-11-page","upright","context"),
    selection("wands-01-ace","upright","friction"),
    selection("wands-10-ten","upright","doorway")
  ],"context-friction-doorway",{topicLens:"relationship"});
  const first=Interpretation.analyze(extended,spreads,input);
  card.positionClaims.context.reverse();
  assert.deepEqual(Interpretation.analyze(extended,spreads,input),first);
});

test("QML-shaped array-like values normalize at the semantic boundary", () => {
  function qmlShape(value) {
    if (Array.isArray(value)) {
      const output={length:value.length};
      for (let i=0;i<value.length;i++) output[i]=qmlShape(value[i]);
      return output;
    }
    if (value && typeof value === "object") {
      const output={};
      for (const key of Object.keys(value)) output[key]=qmlShape(value[key]);
      return output;
    }
    return value;
  }
  const expected=Interpretation.analyze(pilot,spreads,pilot.cases[0].request);
  assert.deepEqual(Interpretation.analyze(qmlShape(pilot),qmlShape(spreads),qmlShape(pilot.cases[0].request)),expected);
  const malformed=qmlShape(pilot.cases[0].request);
  malformed.cards={length:1000000000000};
  expectCode("INVALID_SCHEMA",() => Interpretation.analyze(qmlShape(pilot),qmlShape(spreads),malformed));
  malformed.cards={length:-1};
  expectCode("INVALID_SCHEMA",() => Interpretation.analyze(qmlShape(pilot),qmlShape(spreads),malformed));
  malformed.cards={length:1.5};
  expectCode("INVALID_SCHEMA",() => Interpretation.analyze(qmlShape(pilot),qmlShape(spreads),malformed));
  const nativeOversized=clone(pilot.cases[0].request);
  nativeOversized.cards=new Array(10001);
  expectCode("INVALID_SCHEMA",() => Interpretation.analyze(pilot,spreads,nativeOversized));
});

test("canonical semantic analysis is byte-stable across fresh processes", () => {
  const local=JSON.stringify(Interpretation.analyze(pilot,spreads,pilot.cases[0].request));
  const script="const I=require('./src/Interpretation'),p=require('./tests/fixtures/semantic-v2-pilot.json'),s=require('./assets/spreads.json');process.stdout.write(JSON.stringify(I.analyze(p,s,p.cases[0].request)))";
  const fresh=execFileSync(process.execPath,["-e",script],{cwd:require("node:path").join(__dirname,".."),encoding:"utf8"});
  assert.equal(fresh,local);
});

test("disabled elemental dignity cannot create semantic output", () => {
  const result=Interpretation.analyze(pilot,spreads,pilot.cases[0].request);
  assert.ok(result.interactions.every(item => item.type !== "elemental_dignity"));
  assert.ok(result.patterns.every(item => item.type !== "elemental_dignity"));
});
