"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const Interpretation=require("../src/Interpretation");
const catalog=require("../assets/semantic-v2/cards.json");
const spreads=require("../assets/spreads.json");

const hooks=Interpretation.createMatrixTestHooks(catalog,spreads);
const spread=spreads.spreads.find(item => item.id === "context-friction-doorway");

function intersects(left,right) { return left.some(value => right.includes(value)); }
function supports(left,right,leftThemes,rightThemes) {
  return intersects(leftThemes || left.coreThemes,rightThemes || right.coreThemes) || left.rank === right.rank || left.number === right.number;
}
function primaryId(card) {
  const claim=card.claims.find(item => item.lens === "traditional-core") || card.claims.find(item => item.orientation === "upright" || item.orientation === "both");
  return claim.id;
}
function modeThemes(card,mode) {
  const output=card.coreThemes.slice();
  for (const id of card.reversalModes[mode]) for (const theme of card.claims.find(claim => claim.id === id).themes) if (!output.includes(theme)) output.push(theme);
  return output.sort();
}
function representative(card,mode) {
  const themes=modeThemes(card,mode);
  const modeOnly=themes.filter(theme => !card.coreThemes.includes(theme));
  return catalog.cards.find(candidate => candidate.id !== card.id && intersects(modeOnly,candidate.coreThemes))
    || catalog.cards.find(candidate => candidate.id !== card.id && supports(card,candidate,themes,candidate.coreThemes))
    || catalog.cards.find(candidate => candidate.id !== card.id);
}

test("all 18,018 ordered upright pairs obey each canonical spread edge", () => {
  let cases=0;
  for (const edge of spread.edges) for (const left of catalog.cards) for (const right of catalog.cards) {
    if (left.id === right.id) continue;
    const result=hooks.interactionPair(edge.from,edge.to,left.id,right.id,null,null);
    const supported=supports(left,right);
    assert.equal(result.accepted.length,supported ? 1 : 0,edge.from+":"+edge.to+":"+left.id+":"+right.id);
    if (supported) {
      assert.equal(result.accepted[0].type,edge.allowedRelations[0]);
      assert.deepEqual(result.accepted[0].evidence,[primaryId(left),primaryId(right)].sort());
    }
    assert.ok(result.accepted.every(item => edge.allowedRelations.includes(item.type)));
    assert.equal(result.rejected.length,edge.allowedRelations.length-result.accepted.length);
    cases++;
  }
  assert.equal(cases,3*78*77);
});

test("every reversal hypothesis exercises accepted and intentionally rejected relation families", () => {
  let cases=0;
  const acceptedRelations=new Set();
  const rejectedDirectionalRelations=new Set();
  const shadowedPositiveRelations=new Set();
  for (const card of catalog.cards) for (const mode of Object.keys(card.reversalModes).sort()) {
    const partner=representative(card,mode);
    const effective=modeThemes(card,mode);
    for (const edge of spread.edges) {
      const left=hooks.interactionPair(edge.from,edge.to,card.id,partner.id,mode,null);
      const right=hooks.interactionPair(edge.from,edge.to,partner.id,card.id,null,mode);
      for (const result of [left,right]) {
        for (const accepted of result.accepted) acceptedRelations.add(accepted.type);
        for (const rejected of result.rejected) {
          if (rejected.reason === "missing-directional-rule") rejectedDirectionalRelations.add(rejected.candidateRelation);
          if (rejected.reason === "lower-priority-supported") shadowedPositiveRelations.add(rejected.candidateRelation);
          assert.ok(["missing-directional-rule","no-shared-evidence","lower-priority-supported"].includes(rejected.reason),rejected.candidateRelation+":"+rejected.reason);
        }
        assert.ok(result.accepted.every(item => edge.allowedRelations.includes(item.type)));
        assert.ok(result.rejected.every(item => edge.allowedRelations.includes(item.candidateRelation)));
      }
      assert.equal(left.accepted.length,supports(card,partner,effective,partner.coreThemes) ? 1 : 0,card.id+":"+mode+":"+edge.from+":left");
      assert.equal(right.accepted.length,supports(partner,card,partner.coreThemes,effective) ? 1 : 0,card.id+":"+mode+":"+edge.from+":right");
      cases+=2;
    }
  }
  assert.equal(cases,catalog.cards.reduce((sum,card) => sum+Object.keys(card.reversalModes).length*spread.edges.length*2,0));
  assert.deepEqual([...acceptedRelations].sort(),["continues","reinforces","returns"]);
  assert.deepEqual([...rejectedDirectionalRelations].sort(),["contrasts","corrects","departs","qualifies","releases","reverses","transforms"]);
  assert.deepEqual([...shadowedPositiveRelations],["matures"]);
  assert.ok(spread.edges.flatMap(edge => edge.allowedRelations).every(relation => acceptedRelations.has(relation) || rejectedDirectionalRelations.has(relation) || shadowedPositiveRelations.has(relation)));
});

test("pair hook fails closed on illegal edges, duplicates, cards, and modes", () => {
  assert.throws(() => hooks.interactionPair("doorway","context",catalog.cards[0].id,catalog.cards[1].id,null,null),error => error && error.code === "INVALID_REFERENCE");
  assert.throws(() => hooks.interactionPair("context","friction",catalog.cards[0].id,catalog.cards[0].id,null,null),error => error && error.code === "DUPLICATE_SELECTION");
  assert.throws(() => hooks.interactionPair("context","friction","unknown",catalog.cards[0].id,null,null),error => error && error.code === "UNKNOWN_CARD");
  assert.throws(() => hooks.interactionPair("context","friction",catalog.cards[0].id,catalog.cards[1].id,"unknown",null),error => error && error.code === "UNSUPPORTED_REVERSAL_MODE");
});
