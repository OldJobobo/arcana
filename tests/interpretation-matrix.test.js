"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const Interpretation=require("../src/Interpretation");
const catalog=require("../assets/semantic-v2/cards.json");
const spreads=require("../assets/spreads.json");

const POSITION_IDS=["single","context","friction","doorway"];
const SPREAD_POSITIONS=["context","friction","doorway"];

function deterministicCards(target,positionId,orientation) {
  if (positionId === "single") return [{positionId:"single",cardId:target.id,orientation}];
  const chosen=[];
  for (let offset=1;chosen.length<2;offset++) {
    const candidate=catalog.cards[(target.order-1+offset)%catalog.cards.length];
    if (candidate.id !== target.id) chosen.push(candidate);
  }
  let filler=0;
  return SPREAD_POSITIONS.map(id => ({positionId:id,cardId:id === positionId ? target.id : chosen[filler++].id,orientation:id === positionId ? orientation : "upright"}));
}

function request(target,positionId,orientation,reversalPolicy) {
  return {spreadId:positionId === "single" ? "single" : "context-friction-doorway",cards:deterministicCards(target,positionId,orientation),originalQuestion:null,topicLens:"general",tradition:"rws",reversalPolicy,elementalDignity:"disabled",narratorId:"clear-reflective-v1"};
}

test("every card activates upright and positioned evidence in every default position", () => {
  let cases=0;
  for (const card of catalog.cards) for (const positionId of POSITION_IDS) {
    const analysis=Interpretation.analyze(catalog,spreads,request(card,positionId,"upright","energy_state"));
    const instance=analysis.cards.find(item => item.cardId === card.id);
    assert.ok(instance,card.id+":"+positionId);
    assert.deepEqual(instance.selectedHypotheses,[],card.id+":"+positionId);
    assert.ok(card.positionClaims[positionId].every(id => instance.activatedClaimIds.includes(id)),card.id+":"+positionId+":position evidence");
    assert.ok(instance.activatedClaimIds.some(id => card.claims.find(claim => claim.id === id && claim.lens === "traditional-core")),card.id+":"+positionId+":core evidence");
    cases++;
  }
  assert.equal(cases,78*4);
});

test("every declared reversal mode is eligible and policy-correct in every position", () => {
  let cases=0;
  for (const card of catalog.cards) for (const positionId of POSITION_IDS) {
    const energy=Interpretation.analyze(catalog,spreads,request(card,positionId,"reversed","energy_state"));
    const energyCard=energy.cards.find(item => item.cardId === card.id);
    const trace=energy.trace.reversalCandidates.find(item => item.cardId === card.id);
    const expectedEnergy=Object.keys(card.reversalModes).filter(mode => mode !== "traditional_reversed").sort();
    assert.deepEqual(trace.candidates.map(item => item.modeId).sort(),expectedEnergy,card.id+":"+positionId+":energy candidates");
    assert.equal(energyCard.selectedHypotheses.length,1,card.id+":"+positionId+":energy selection");
    assert.ok(expectedEnergy.includes(energyCard.selectedHypotheses[0]),card.id+":"+positionId+":energy mode");
    for (const mode of expectedEnergy) assert.ok(card.reversalModes[mode].some(id => trace.candidates.some(candidate => candidate.modeId === mode && candidate.claimId === id)),card.id+":"+positionId+":"+mode);

    const traditional=Interpretation.analyze(catalog,spreads,request(card,positionId,"reversed","traditional"));
    const traditionalCard=traditional.cards.find(item => item.cardId === card.id);
    assert.deepEqual(traditionalCard.selectedHypotheses,["traditional_reversed"],card.id+":"+positionId+":traditional");
    assert.ok(card.reversalModes.traditional_reversed.includes(traditionalCard.selectedHypothesisClaims[0].claimId));

    const disabled=Interpretation.analyze(catalog,spreads,request(card,positionId,"reversed","none"));
    assert.deepEqual(disabled.cards.find(item => item.cardId === card.id).selectedHypotheses,[],card.id+":"+positionId+":none");
    cases++;
  }
  assert.equal(cases,78*4);
});

test("all authored semantic text families remain plain and safety-clean", () => {
  const control=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
  for (const card of catalog.cards) {
    for (const claim of card.claims) {
      assert.equal(control.test(claim.text),false,claim.id);
      assert.equal(Interpretation.semanticSafetyReason(claim.text),null,claim.id);
    }
    for (const prompt of card.reflectionPrompts) {
      assert.equal(control.test(prompt.text),false,prompt.id);
      assert.equal(Interpretation.semanticSafetyReason(prompt.text),null,prompt.id);
      assert.ok(prompt.text.endsWith("?"),prompt.id);
    }
    for (const image of card.imagery) assert.equal(control.test(image.detail),false,image.id);
  }
});
