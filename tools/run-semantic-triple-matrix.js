"use strict";

const fs=require("node:fs");
const path=require("node:path");
const os=require("node:os");
const crypto=require("node:crypto");
const {Worker,isMainThread,parentPort,workerData}=require("node:worker_threads");
const Interpretation=require("../src/Interpretation");
const catalog=require("../assets/semantic-v2/cards.json");
const spreads=require("../assets/spreads.json");
const benchmark=require("../tests/fixtures/semantic-v2-corpus-benchmark.json");

const POSITIONS=["context","friction","doorway"];
const EXPECTED_CASES=78*77*76;

function requestFor(left,middle,right) {
  return {spreadId:"context-friction-doorway",cards:[left,middle,right].map((card,index) => ({positionId:POSITIONS[index],cardId:card.id,orientation:"upright"})),originalQuestion:null,topicLens:"general",tradition:"rws",reversalPolicy:"none",elementalDignity:"disabled",narratorId:"clear-reflective-v1"};
}

function verifyReading(reading,drawn) {
  if (reading.schemaVersion !== 2 || reading.methodVersion !== "arcana-composer-v2" || reading.cards.length !== 3) throw new Error("Invalid triple reading shape: "+reading.id);
  if (reading.interpretations.length !== 1 || reading.distinguishingQuestions.length !== 0) throw new Error("Upright-none triple gained unsupported alternative: "+reading.id);
  const evidence=new Set();
  for (const card of drawn) for (const claim of card.claims) evidence.add(claim.id);
  for (const projection of [reading.utterances.concise,reading.utterances.expanded]) for (const utterance of projection) {
    if (!utterance.evidence.length || !utterance.evidence.every(id => evidence.has(id))) throw new Error("Triple utterance has invalid evidence: "+reading.id);
  }
  for (const relation of reading.interactions) {
    const edge=spreads.spreads[1].edges.find(item => item.from === relation.from && item.to === relation.to);
    if (!edge || !edge.allowedRelations.includes(relation.type) || !relation.evidence.every(id => evidence.has(id))) throw new Error("Triple relation is not spread-legal: "+reading.id);
  }
}

function runShard(shardIndex,shardCount) {
  const interpreter=Interpretation.createInterpreter(catalog,spreads);
  const hash=crypto.createHash("sha256");
  let cases=0;
  for (let left=0;left<catalog.cards.length;left++) {
    if (left%shardCount !== shardIndex) continue;
    for (let middle=0;middle<catalog.cards.length;middle++) {
      if (middle === left) continue;
      for (let right=0;right<catalog.cards.length;right++) {
        if (right === left || right === middle) continue;
        const drawn=[catalog.cards[left],catalog.cards[middle],catalog.cards[right]];
        const reading=interpreter.interpret(requestFor(drawn[0],drawn[1],drawn[2]));
        verifyReading(reading,drawn);
        hash.update(JSON.stringify(reading));
        hash.update("\n");
        cases++;
      }
    }
  }
  return {shardIndex,shardCount,cases,digest:hash.digest("hex")};
}

function numberArg(name,fallback) {
  const prefix="--"+name+"=";
  const found=process.argv.find(value => value.indexOf(prefix) === 0);
  if (!found) return fallback;
  const value=Number(found.slice(prefix.length));
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid --"+name);
  return value;
}

function writeReport(report) {
  const root=fs.realpathSync(path.resolve(__dirname,".."));
  const target=path.join(root,"tests","fixtures","semantic-v2-triple-matrix.json");
  try { if (fs.lstatSync(target).isSymbolicLink()) throw new Error("Triple report cannot be a symbolic link"); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  fs.writeFileSync(target,JSON.stringify(report,null,2)+"\n",{flag:fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_TRUNC|fs.constants.O_NOFOLLOW,mode:0o644});
}

async function main() {
  Interpretation.validateCatalog(catalog,spreads);
  if (benchmark.candidateDigest !== "7ebcbba02fdcdd4f5b755be0b937b1cc2bf65b9b4a8a647c912c9163ba695c5d") throw new Error("Unexpected candidate benchmark digest");
  const explicitShard=process.argv.some(value => value.indexOf("--shard-index=") === 0 || value.indexOf("--shard-count=") === 0);
  const started=Date.now();
  let results=[];
  if (explicitShard) {
    const shardIndex=numberArg("shard-index",0),shardCount=numberArg("shard-count",1);
    if (shardCount < 1 || shardIndex >= shardCount) throw new Error("Invalid shard range");
    results=[runShard(shardIndex,shardCount)];
  } else {
    const workerLimit=Math.max(1,Math.min(numberArg("workers",Math.min(6,os.availableParallelism())),78));
    const queue=Array.from({length:78},(_,index) => index);
    results=await new Promise((resolve,reject) => {
      const completed=[];
      let active=0,failed=false;
      function launch() {
        if (failed) return;
        if (!queue.length && active === 0) { resolve(completed); return; }
        while (active < workerLimit && queue.length) {
          const shardIndex=queue.shift();
          const worker=new Worker(__filename,{workerData:{shardIndex,shardCount:78},resourceLimits:{maxOldGenerationSizeMb:128,maxYoungGenerationSizeMb:16}});
          let answered=false;
          active++;
          worker.once("message",message => {
            answered=true; active--;
            if (message && message.error) { failed=true; reject(new Error(message.error)); return; }
            completed.push(message); launch();
          });
          worker.once("error",error => { if (!failed) { failed=true; reject(error); } });
          worker.once("exit",code => { if (!answered && code !== 0 && !failed) { failed=true; reject(new Error("Triple worker exited "+code)); } });
        }
      }
      launch();
    });
  }
  results.sort((left,right) => left.shardIndex-right.shardIndex);
  const cases=results.reduce((sum,result) => sum+result.cases,0);
  const aggregate=crypto.createHash("sha256");
  const complete=!explicitShard && cases === EXPECTED_CASES && results.length === 78 && results.every((result,index) => result.shardIndex === index && result.shardCount === 78);
  if (complete) for (const result of results) aggregate.update(result.shardIndex+":"+result.digest+"\n");
  const elapsedMs=Date.now()-started;
  const peakRssMb=Math.ceil(process.resourceUsage().maxRSS/1024);
  const semanticDigest=complete ? aggregate.digest("hex") : null;
  const shardDigest=complete ? null : crypto.createHash("sha256").update(results.map(result => result.shardIndex+":"+result.shardCount+":"+result.cases+":"+result.digest).join("\n")).digest("hex");
  const report={suiteVersion:1,outcome:"passed",candidateDigest:benchmark.candidateDigest,cases,complete,shards:results.length,semanticDigest,shardDigest,observed:{elapsedMs,peakRssMb},blockingBudget:{elapsedMs:120000,peakRssMb:1024,met:complete && elapsedMs <= 120000 && peakRssMb <= 1024}};
  if (!explicitShard && !complete) throw new Error("Incomplete triple matrix: "+cases);
  if (process.argv.includes("--enforce-budget") && !report.blockingBudget.met) throw new Error("Triple matrix exceeded blocking budget");
  if (process.argv.includes("--verify-report")) {
    const pinned=JSON.parse(fs.readFileSync(path.join(__dirname,"..","tests","fixtures","semantic-v2-triple-matrix.json"),"utf8"));
    if (!complete || pinned.candidateDigest !== report.candidateDigest || pinned.cases !== report.cases || pinned.semanticDigest !== report.semanticDigest) throw new Error("Fresh triple matrix does not match pinned release report");
  }
  if (process.argv.includes("--write-report")) writeReport(report);
  console.log(JSON.stringify(report,null,2));
}

if (!isMainThread) {
  try { parentPort.postMessage(runShard(workerData.shardIndex,workerData.shardCount)); }
  catch (error) { parentPort.postMessage({error:error && error.stack ? error.stack : String(error)}); }
} else if (require.main === module) {
  main().catch(error => { console.error(error && error.stack ? error.stack : error); process.exitCode=1; });
}

module.exports={runShard,verifyReading,EXPECTED_CASES};
