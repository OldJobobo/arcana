"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Interpretation = require("../src/Interpretation");
const pilot = require("./fixtures/semantic-v2-pilot.json");
const spreads = require("../assets/spreads.json");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validRequest(overrides) {
  return Object.assign({
    spreadId: "context-friction-doorway",
    cards: [
      {positionId:"context", cardId:"major-09-the-hermit", orientation:"upright"},
      {positionId:"friction", cardId:"major-16-the-tower", orientation:"reversed"},
      {positionId:"doorway", cardId:"major-17-the-star", orientation:"upright"}
    ],
    originalQuestion: "Should I keep forcing the current approach?",
    topicLens: "general",
    tradition: "rws",
    reversalPolicy: "energy_state",
    elementalDignity: "disabled",
    narratorId: "clear-reflective-v1"
  }, overrides || {});
}

function expectCode(code, action) {
  assert.throws(action, error => {
    assert.equal(error.name, "ArcanaValidationError");
    assert.equal(error.code, code);
    assert.equal(typeof error.path, "string");
    return true;
  });
}

test("schema-v2 pilot validates as one cross-referenced catalog", () => {
  const indexes=Interpretation.validateCatalog(pilot,spreads);
  assert.equal(pilot.schemaVersion,2);
  assert.equal(pilot.methodVersion,"arcana-composer-v2");
  assert.equal(Object.keys(indexes.cards).length,12);
  assert.equal(Object.keys(indexes.sources).length,5);
  assert.deepEqual(Object.keys(indexes.spreads).sort(),["context-friction-doorway","single"]);
  assert.equal(pilot.cards.filter(card => card.courtModes).length,5);
  assert.ok(pilot.cards.reduce((count,card) => count+card.claims.length,0) >= 113);
  assert.equal(pilot.cases.length,2);
  assert.deepEqual(pilot.cases.map(item => item.expectedReading.interpretations.length).sort(),[1,2]);
});

test("pilot records preserve identity and use only packaged artwork", () => {
  Interpretation.validateCatalog(pilot,spreads);
  assert.deepEqual(pilot.cards.map(card => card.order),pilot.cards.map(card => card.order).slice().sort((a,b) => a-b));
  assert.ok(new Set(pilot.cards.map(card => card.number)).size < pilot.cards.length);
  assert.ok(new Set(pilot.cards.map(card => card.rank)).size < pilot.cards.length);
  assert.deepEqual(new Set(pilot.cards.flatMap(card => Object.keys(card.reversalModes))),new Set(Interpretation.ENUMS.reversalMode));
  for (const card of pilot.cards) {
    assert.match(card.id,/^[a-z0-9][a-z0-9.:-]{0,95}$/);
    assert.match(card.image,/^assets\/card-art\/[a-z0-9-]+\.png$/);
    assert.ok(card.claims.some(claim => claim.lens === "traditional-core"));
    assert.ok(card.claims.some(claim => claim.lens === "omarchy"));
    assert.ok(Object.keys(card.reversalModes).length >= 2);
    assert.equal(card.reflectionPromptIds.length,2);
  }
});

test("catalog validation fails closed on unknown source references", () => {
  const broken=clone(pilot);
  broken.cards[0].claims[0].sourceRefs=["missing-source"];
  expectCode("INVALID_REFERENCE",() => Interpretation.validateCatalog(broken,spreads));
});

test("catalog validation fails closed on wrong position claim types", () => {
  const broken=clone(pilot);
  broken.cards[0].positionClaims.context=[broken.cards[0].positionClaims.doorway[0]];
  expectCode("INVALID_REFERENCE",() => Interpretation.validateCatalog(broken,spreads));
});

test("catalog validation rejects uncontrolled themes and duplicate IDs", () => {
  const badTheme=clone(pilot);
  badTheme.cards[0].coreThemes[0]="vibes";
  expectCode("INVALID_SCHEMA",() => Interpretation.validateCatalog(badTheme,spreads));

  const duplicate=clone(pilot);
  duplicate.cards[1].id=duplicate.cards[0].id;
  expectCode("INVALID_SCHEMA",() => Interpretation.validateCatalog(duplicate,spreads));
});

test("spread validation rejects undeclared positions and causal leakage", () => {
  const unknownPosition=clone(spreads);
  unknownPosition.spreads[1].edges[0].to="future";
  expectCode("INVALID_SCHEMA",() => Interpretation.validateCatalog(pilot,unknownPosition));

  const causal=clone(spreads);
  causal.spreads[1].edges[0].allowedRelations.push("cause_effect");
  expectCode("INVALID_SCHEMA",() => Interpretation.validateCatalog(pilot,causal));

  const bypass=clone(spreads);
  bypass.spreads[1].edges[0].allowedRelations.push("cause_effect");
  bypass.spreads[1].edges[0].causality=true;
  expectCode("INVALID_SCHEMA",() => Interpretation.validateCatalog(pilot,bypass));
});

test("valid requests accept explicit defaults and preserve strict spread order", () => {
  const indexes=Interpretation.validateCatalog(pilot,spreads);
  assert.equal(Interpretation.validateRequest(indexes,validRequest()),true);
  assert.equal(Interpretation.validateRequest(indexes,{
    spreadId:"single",
    cards:[{positionId:"single",cardId:"wands-01-ace",orientation:"upright"}]
  }),true);
});

test("pilot expected readings validate alternatives and distinguishing questions", () => {
  const indexes=Interpretation.validateCatalog(pilot,spreads);
  for (const item of pilot.cases) {
    assert.equal(Interpretation.validateRequest(indexes,item.request),true);
    assert.equal(Interpretation.validateReading(indexes,item.expectedReading),true);
  }
  const alternative=pilot.cases.find(item => item.expectedReading.interpretations.length === 2).expectedReading;
  assert.equal(alternative.distinguishingQuestions.length,1);
  assert.equal(alternative.cards[0].selectedHypotheses.length,2);
  const noAlternative=pilot.cases.find(item => item.expectedReading.interpretations.length === 1).expectedReading;
  assert.deepEqual(noAlternative.distinguishingQuestions,[]);
});

test("request validation fails closed on malformed cardinality and position", () => {
  const indexes=Interpretation.validateCatalog(pilot,spreads);
  expectCode("INVALID_SPREAD_CARDINALITY",() => Interpretation.validateRequest(indexes,validRequest({cards:validRequest().cards.slice(0,2)})));
  const wrongPosition=validRequest();
  wrongPosition.cards[0].positionId="doorway";
  expectCode("INVALID_POSITION",() => Interpretation.validateRequest(indexes,wrongPosition));
});

test("request validation rejects duplicate, unknown, and invalid card selections", () => {
  const indexes=Interpretation.validateCatalog(pilot,spreads);
  const duplicate=validRequest();
  duplicate.cards[1].cardId=duplicate.cards[0].cardId;
  expectCode("DUPLICATE_SELECTION",() => Interpretation.validateRequest(indexes,duplicate));

  const unknown=validRequest();
  unknown.cards[0].cardId="major-99-unknown";
  expectCode("UNKNOWN_CARD",() => Interpretation.validateRequest(indexes,unknown));

  const orientation=validRequest();
  orientation.cards[0].orientation="sideways";
  expectCode("INVALID_ORIENTATION",() => Interpretation.validateRequest(indexes,orientation));
});

test("normalized question, unknown options, and legacy mode IDs fail closed", () => {
  const indexes=Interpretation.validateCatalog(pilot,spreads);
  expectCode("INVALID_SCHEMA",() => Interpretation.validateRequest(indexes,validRequest({normalizedQuestion:"Trust me."})));
  expectCode("INVALID_SCHEMA",() => Interpretation.validateRequest(indexes,validRequest({revesalPolicy:"none"})));
  const legacy=validRequest();
  legacy.cards[0].modeId="blocked";
  expectCode("INVALID_SCHEMA",() => Interpretation.validateRequest(indexes,legacy));
  expectCode("INVALID_REVERSAL_POLICY",() => Interpretation.validateRequest(indexes,validRequest({reversalPolicy:"random"})));
  expectCode("INVALID_TOPIC_LENS",() => Interpretation.validateRequest(indexes,validRequest({topicLens:"fortune"})));
  expectCode("INVALID_TRADITION",() => Interpretation.validateRequest(indexes,validRequest({tradition:"invented"})));
  expectCode("INVALID_SCHEMA",() => Interpretation.validateRequest(indexes,validRequest({elementalDignity:"automatic"})));
  expectCode("INVALID_NARRATOR",() => Interpretation.validateRequest(indexes,validRequest({narratorId:"oracle"})));
});

test("catalog IDs are unique across cards and canonical provenance stays eligible", () => {
  const duplicate=clone(pilot);
  duplicate.cards[1].claims[0].id=duplicate.cards[0].claims[0].id;
  expectCode("INVALID_SCHEMA",() => Interpretation.validateCatalog(duplicate,spreads));

  const quotation=clone(pilot);
  quotation.cards[0].claims[0].provenanceKind="source-quotation";
  expectCode("INVALID_SCHEMA",() => Interpretation.validateCatalog(quotation,spreads));
});

test("reversal claims share a card or position theme and catalogs use canonical order", () => {
  const positionOnly=clone(pilot);
  const targetCard=positionOnly.cards[0];
  const positionOnlyReversalId=Object.values(targetCard.reversalModes)[0][0];
  targetCard.claims.find(claim => claim.id === positionOnlyReversalId).themes=["attention"];
  targetCard.claims.find(claim => claim.id === targetCard.positionClaims.context[0]).themes=["attention"];
  assert.doesNotThrow(() => Interpretation.validateCatalog(positionOnly,spreads));

  const unrelated=clone(pilot);
  const reversalId=Object.values(unrelated.cards[0].reversalModes)[0][0];
  unrelated.cards[0].claims.find(claim => claim.id === reversalId).themes=["grief"];
  expectCode("INVALID_REFERENCE",() => Interpretation.validateCatalog(unrelated,spreads));

  const unordered=clone(pilot);
  [unordered.cards[0],unordered.cards[1]]=[unordered.cards[1],unordered.cards[0]];
  expectCode("INVALID_SCHEMA",() => Interpretation.validateCatalog(unordered,spreads));
});

test("schema-1 spread shapes and v2-only card fields are exact", () => {
  const missingEdge=clone(spreads);
  missingEdge.spreads[1].edges.pop();
  expectCode("INVALID_SCHEMA",() => Interpretation.validateCatalog(pilot,missingEdge));

  const changedRelations=clone(spreads);
  changedRelations.spreads[1].edges[0].allowedRelations.reverse();
  expectCode("INVALID_SCHEMA",() => Interpretation.validateCatalog(pilot,changedRelations));

  const hybrid=clone(pilot);
  hybrid.cards[0].orientationModes=[];
  expectCode("INVALID_SCHEMA",() => Interpretation.validateCatalog(hybrid,spreads));
});

test("reading validation rejects alternative and hypothesis cardinality drift", () => {
  const indexes=Interpretation.validateCatalog(pilot,spreads);
  const missingQuestion=clone(pilot.cases[0].expectedReading);
  missingQuestion.distinguishingQuestions=[];
  expectCode("INVALID_SCHEMA",() => Interpretation.validateReading(indexes,missingQuestion));

  const extraMode=clone(pilot.cases[1].expectedReading);
  extraMode.cards[0].selectedHypotheses=["blocked"];
  expectCode("INVALID_SCHEMA",() => Interpretation.validateReading(indexes,extraMode));

  const duplicateMode=clone(pilot.cases[0].expectedReading);
  duplicateMode.cards[0].selectedHypotheses=["excessive","excessive"];
  expectCode("UNSUPPORTED_REVERSAL_MODE",() => Interpretation.validateReading(indexes,duplicateMode));

  const traditional=clone(pilot.cases[0].expectedReading);
  traditional.reversalPolicy="traditional";
  traditional.cards[0].selectedHypotheses=["excessive"];
  traditional.cards[1].selectedHypotheses=["recovering"];
  expectCode("UNSUPPORTED_REVERSAL_MODE",() => Interpretation.validateReading(indexes,traditional));
});

test("reading relations, patterns, utterances, and counterevidence are fully referenced", () => {
  const indexes=Interpretation.validateCatalog(pilot,spreads);
  const malformed=clone(pilot.cases[0].expectedReading);
  malformed.interactions=[null];
  expectCode("INVALID_SCHEMA",() => Interpretation.validateReading(indexes,malformed));

  const pattern=clone(pilot.cases[0].expectedReading);
  pattern.patterns=[null];
  expectCode("INVALID_SCHEMA",() => Interpretation.validateReading(indexes,pattern));

  const noUtterances=clone(pilot.cases[0].expectedReading);
  delete noUtterances.utterances;
  expectCode("INVALID_SCHEMA",() => Interpretation.validateReading(indexes,noUtterances));

  const badTarget=clone(pilot.cases[0].expectedReading);
  badTarget.interpretations[1].counterEvidence[0].targetPropositionId="proposition:missing";
  expectCode("INVALID_REFERENCE",() => Interpretation.validateReading(indexes,badTarget));

  const repeatedEdge=clone(pilot.cases[0].expectedReading);
  repeatedEdge.interactions=[
    {id:"relation:context:friction:contrasts",from:"context",to:"friction",type:"contrasts",evidence:["major-09-the-hermit.core","major-16-the-tower.core"]},
    {id:"relation:context:friction:qualifies",from:"context",to:"friction",type:"qualifies",evidence:["major-09-the-hermit.core","major-16-the-tower.core"]}
  ];
  expectCode("INVALID_SCHEMA",() => Interpretation.validateReading(indexes,repeatedEdge));

  const duplicatePattern=clone(pilot.cases[0].expectedReading);
  duplicatePattern.patterns=[
    {id:"pattern:theme:recovery",type:"theme-recurrence",evidence:["major-16-the-tower.reversal.recovering","major-17-the-star.core"]},
    {id:"pattern:theme:recovery",type:"theme-recurrence",evidence:["major-16-the-tower.reversal.recovering","major-17-the-star.core"]}
  ];
  expectCode("INVALID_SCHEMA",() => Interpretation.validateReading(indexes,duplicatePattern));
});
