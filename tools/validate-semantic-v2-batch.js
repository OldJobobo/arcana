"use strict";

const crypto=require("node:crypto");
const fs=require("node:fs");
const path=require("node:path");
const Interpretation=require("../src/Interpretation");
const {cardNumber}=require("./generate-semantic-v2-scaffold");

const BATCHES={
  major:{arcana:"major",suit:null,count:22},
  wands:{arcana:"minor",suit:"wands",count:14},
  cups:{arcana:"minor",suit:"cups",count:14},
  swords:{arcana:"minor",suit:"swords",count:14},
  pentacles:{arcana:"minor",suit:"pentacles",count:14}
};
const REQUIRED_LENSES=["traditional-core","omarchy","position-single","position-context","position-friction","position-doorway"];
const COURT_RANKS=new Set(["page","knight","queen","king"]);

function expectedCards(legacyCatalog,batchId) {
  const definition=BATCHES[batchId];
  if (!definition) throw new Error("Unknown semantic batch: "+batchId);
  return legacyCatalog.cards.filter(card => card.arcana === definition.arcana && card.suit === definition.suit).sort((a,b) => a.order-b.order);
}

function qualityIssues(card,legacyCard) {
  const issues=[];
  const identityFields=[["order",card.order,legacyCard.order],["arcana",card.arcana,legacyCard.arcana],["number",card.number,cardNumber(legacyCard)],["rank",card.rank,legacyCard.rank],["title",card.title,legacyCard.title],["omarchyTitle",card.omarchyTitle,legacyCard.systemTitle],["suit",card.suit,legacyCard.suit],["element",card.element,legacyCard.element],["image",card.image,legacyCard.image]];
  for (const [field,actual,expected] of identityFields) if (actual !== expected) issues.push({code:"IDENTITY_DRIFT",path:card.id+"."+field});
  for (const lens of REQUIRED_LENSES) if (!card.claims.some(claim => claim.lens === lens)) issues.push({code:"MISSING_LENS",path:card.id+".claims."+lens});
  if (card.coreThemes.length < 2) issues.push({code:"THIN_THEMES",path:card.id+".coreThemes"});
  if (Object.keys(card.reversalModes).length < 2) issues.push({code:"THIN_REVERSALS",path:card.id+".reversalModes"});
  if (card.reflectionPrompts.length < 2) issues.push({code:"THIN_REFLECTION",path:card.id+".reflectionPrompts"});
  if (!card.imagery.some(item => item.deckSpecific && item.kind === "observed" && item.sourceRefs.indexOf("arcana-artwork") >= 0)) issues.push({code:"MISSING_ARTWORK_OBSERVATION",path:card.id+".imagery"});
  if (COURT_RANKS.has(card.rank) && !card.courtModes) issues.push({code:"MISSING_COURT_RANGE",path:card.id+".courtModes"});
  if (!COURT_RANKS.has(card.rank) && card.courtModes) issues.push({code:"UNEXPECTED_COURT_RANGE",path:card.id+".courtModes"});
  const nestedRecords=[...card.claims,...card.imagery,...card.reflectionPrompts];
  for (const record of nestedRecords) if (!record.id.startsWith(card.id+".")) issues.push({code:"FOREIGN_ID_NAMESPACE",path:record.id,expectedPrefix:card.id+"."});
  const prose=[];
  for (const claim of card.claims) {
    const unsafe=Interpretation.semanticSafetyReason(claim.text);
    if (unsafe) issues.push({code:"UNSAFE_PROSE",path:claim.id,reason:unsafe});
    prose.push([claim.id,claim.text.trim().toLowerCase()]);
  }
  for (const prompt of card.reflectionPrompts) {
    const unsafe=Interpretation.semanticSafetyReason(prompt.text);
    if (unsafe) issues.push({code:"UNSAFE_PROSE",path:prompt.id,reason:unsafe});
    prose.push([prompt.id,prompt.text.trim().toLowerCase()]);
  }
  const seen=Object.create(null);
  for (const [id,text] of prose) {
    if (seen[text]) issues.push({code:"DUPLICATE_PROSE",path:id,other:seen[text]});
    else seen[text]=id;
  }
  return issues;
}

function canonicalValue(value) {
  if (Array.isArray(value)) {
    const items=value.map(canonicalValue);
    if (items.every(item => typeof item === "string")) return items.sort();
    if (items.every(item => item && typeof item === "object" && Number.isInteger(item.order))) return items.sort((a,b) => a.order-b.order || String(a.id).localeCompare(String(b.id)));
    if (items.every(item => item && typeof item === "object" && typeof item.id === "string")) return items.sort((a,b) => a.id.localeCompare(b.id));
    return items;
  }
  if (value && typeof value === "object") {
    const output={};
    for (const key of Object.keys(value).sort()) output[key]=canonicalValue(value[key]);
    return output;
  }
  return value;
}

function canonicalDigest(catalog) {
  return crypto.createHash("sha256").update(JSON.stringify(canonicalValue(catalog))).digest("hex");
}

function auditBatch(catalog,batchId,legacyCatalog,spreadCatalog,rootPath) {
  const expected=expectedCards(legacyCatalog,batchId);
  const expectedIds=expected.map(card => card.id);
  const actualIds=Array.isArray(catalog.cards) ? catalog.cards.map(card => card.id) : [];
  if (actualIds.length !== expectedIds.length || actualIds.some((id,index) => id !== expectedIds[index])) {
    const error=new Error("Batch card set does not match canonical "+batchId+" order");
    error.code="BATCH_CARD_SET";
    throw error;
  }
  const indexes=Interpretation.validateCatalog(catalog,spreadCatalog);
  const issues=[];
  for (let i=0;i<catalog.cards.length;i++) {
    issues.push(...qualityIssues(catalog.cards[i],expected[i]));
    if (rootPath && !fs.existsSync(path.join(rootPath,catalog.cards[i].image))) issues.push({code:"MISSING_ARTWORK",path:catalog.cards[i].image});
  }
  const globalProse=Object.create(null);
  for (const card of catalog.cards) for (const claim of card.claims) {
    const normalized=claim.text.trim().toLowerCase();
    if (globalProse[normalized]) issues.push({code:"CROSS_CARD_DUPLICATE_PROSE",path:claim.id,other:globalProse[normalized]});
    else globalProse[normalized]=claim.id;
  }
  if (issues.length) {
    const error=new Error("Semantic batch failed editorial checks");
    error.code="BATCH_EDITORIAL_REJECTED";
    error.issues=issues;
    throw error;
  }
  const digest=canonicalDigest(catalog);
  return {outcome:"passed",batchId,cards:catalog.cards.length,digest,indexes};
}

function run(filePath,batchId) {
  const root=path.resolve(__dirname,"..");
  const catalog=JSON.parse(fs.readFileSync(path.resolve(root,filePath),"utf8"));
  const legacy=JSON.parse(fs.readFileSync(path.join(root,"assets","cards.json"),"utf8"));
  const spreads=JSON.parse(fs.readFileSync(path.join(root,"assets","spreads.json"),"utf8"));
  const result=auditBatch(catalog,batchId,legacy,spreads,root);
  return {outcome:result.outcome,batchId:result.batchId,cards:result.cards,digest:result.digest};
}

if (require.main === module) {
  if (process.argv.length !== 4) {
    console.error("Usage: node tools/validate-semantic-v2-batch.js <batch.json> <major|wands|cups|swords|pentacles>");
    process.exitCode=2;
  } else {
    try { console.log(JSON.stringify(run(process.argv[2],process.argv[3]),null,2)); }
    catch (error) {
      console.error(JSON.stringify({outcome:"failed",code:error.code || "ERROR",message:error.message,issues:error.issues || []},null,2));
      process.exitCode=1;
    }
  }
}

module.exports={BATCHES,REQUIRED_LENSES,expectedCards,qualityIssues,canonicalValue,canonicalDigest,auditBatch,run};
