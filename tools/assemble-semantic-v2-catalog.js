"use strict";

const fs=require("node:fs");
const path=require("node:path");
const Interpretation=require("../src/Interpretation");
const batchTool=require("./validate-semantic-v2-batch");

function assemble(rootPath,registry,legacy,spreads) {
  const cards=[];
  let sources=null;
  for (const entry of registry.batches) {
    const batch=JSON.parse(fs.readFileSync(path.join(rootPath,entry.file),"utf8"));
    const result=batchTool.auditBatch(batch,entry.id,legacy,spreads,rootPath);
    if (result.digest !== entry.digest || result.cards !== entry.cards) throw new Error("Accepted batch drift: "+entry.id);
    if (!sources) sources=batch.sources;
    else if (batchTool.canonicalDigest(batch.sources) !== batchTool.canonicalDigest(sources)) throw new Error("Source catalog drift: "+entry.id);
    cards.push(...batch.cards);
  }
  cards.sort((left,right) => left.order-right.order);
  if (cards.length !== 78 || new Set(cards.map(card => card.id)).size !== 78) throw new Error("Candidate catalog must contain 78 unique cards");
  const catalog={schemaVersion:2,deckId:"arcana",deckTitle:"Arcana",methodVersion:"arcana-composer-v2",sources,cards};
  Interpretation.validateCatalog(catalog,spreads);
  return {catalog,digest:batchTool.canonicalDigest(catalog)};
}

function run() {
  const root=fs.realpathSync(path.resolve(__dirname,".."));
  const registry=JSON.parse(fs.readFileSync(path.join(root,"assets","semantic-v2","accepted-batches.json"),"utf8"));
  const legacy=JSON.parse(fs.readFileSync(path.join(root,"assets","cards.json"),"utf8"));
  const spreads=JSON.parse(fs.readFileSync(path.join(root,"assets","spreads.json"),"utf8"));
  const result=assemble(root,registry,legacy,spreads);
  const target=path.join(root,"assets","semantic-v2","cards.json");
  try {
    if (fs.lstatSync(target).isSymbolicLink()) throw new Error("Candidate output cannot be a symbolic link");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const flags=fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_TRUNC|fs.constants.O_NOFOLLOW;
  fs.writeFileSync(target,JSON.stringify(result.catalog,null,2)+"\n",{flag:flags,mode:0o644});
  return {outcome:"passed",cards:result.catalog.cards.length,digest:result.digest,target:path.relative(root,target)};
}

if (require.main === module) {
  try { console.log(JSON.stringify(run(),null,2)); }
  catch (error) { console.error(error.message); process.exitCode=1; }
}

module.exports={assemble,run};
