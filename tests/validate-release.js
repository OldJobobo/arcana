"use strict";

const fs=require("node:fs");
const path=require("node:path");
const zlib=require("node:zlib");
const crypto=require("node:crypto");
const root=path.resolve(__dirname,"..");
const failures=[];
function fail(message){failures.push(message)}
function readJson(file){return JSON.parse(fs.readFileSync(path.join(root,file),"utf8"))}
function walk(dir,out=[]){for(const name of fs.readdirSync(dir)){if(dir===root&&[".git",".release-local","dist","graphify-out"].includes(name))continue;const p=path.join(dir,name);const st=fs.lstatSync(p);if(st.isSymbolicLink())fail("symlink: "+path.relative(root,p));else if(st.isDirectory())walk(p,out);else out.push(p)}return out}
function paeth(left,above,upperLeft){const p=left+above-upperLeft;const pa=Math.abs(p-left),pb=Math.abs(p-above),pc=Math.abs(p-upperLeft);return pa<=pb&&pa<=pc?left:pb<=pc?above:upperLeft}
function validatePng(file,expectedWidth,expectedHeight,allowedColorTypes){
 const b=fs.readFileSync(file);
 if(b.length<33||b.toString("hex",0,8)!=="89504e470d0a1a0a")throw new Error("invalid PNG signature");
 const idat=[];let offset=8,chunkIndex=0,sawIhdr=false,sawIdat=false,idatClosed=false,sawIend=false,width=0,height=0,channels=0;
 while(offset<b.length){
  if(offset+12>b.length)throw new Error("truncated PNG chunk header");
  const length=b.readUInt32BE(offset),typeBytes=b.subarray(offset+4,offset+8),type=typeBytes.toString("ascii");
  const dataStart=offset+8,dataEnd=dataStart+length,chunkEnd=dataEnd+4;
  if(chunkEnd>b.length)throw new Error("PNG chunk exceeds file bounds");
  const data=b.subarray(dataStart,dataEnd),expectedCrc=b.readUInt32BE(dataEnd),actualCrc=zlib.crc32(Buffer.concat([typeBytes,data]))>>>0;
  if(actualCrc!==expectedCrc)throw new Error("PNG CRC mismatch in "+type);
  if(chunkIndex===0&&type!=="IHDR")throw new Error("IHDR must be first");
  if(type==="IHDR"){
   if(sawIhdr||length!==13)throw new Error("invalid IHDR");
   sawIhdr=true;width=data.readUInt32BE(0);height=data.readUInt32BE(4);
   const bitDepth=data[8],colorType=data[9];channels=colorType===2?3:colorType===6?4:0;
   if(!width||!height||bitDepth!==8||!allowedColorTypes.has(colorType)||!channels||data[10]!==0||data[11]!==0||data[12]!==0)throw new Error("unexpected PNG encoding");
   if(width!==expectedWidth||height!==expectedHeight)throw new Error("unexpected PNG dimensions");
  }else if(type==="IDAT"){
   if(!sawIhdr||idatClosed)throw new Error("invalid IDAT ordering");
   sawIdat=true;idat.push(data);
  }else if(type==="IEND"){
   if(!sawIhdr||!sawIdat||sawIend||length!==0)throw new Error("invalid IEND");
   sawIend=true;offset=chunkEnd;chunkIndex++;break;
  }else if(sawIdat){idatClosed=true}
  offset=chunkEnd;chunkIndex++;
 }
 if(!sawIend)throw new Error("missing IEND");
 if(offset!==b.length)throw new Error("trailing bytes after IEND");
 const stride=width*channels,expectedLength=height*(stride+1);
 const raw=zlib.inflateSync(Buffer.concat(idat),{maxOutputLength:expectedLength});
 if(raw.length!==expectedLength)throw new Error("unexpected inflated PNG length");
 for(let row=0;row<height;row++)if(raw[row*(stride+1)]>4)throw new Error("unsupported PNG filter");
 return {raw,width,height,channels,stride};
}
function pngAlpha(file,expectedWidth,expectedHeight){
 const png=validatePng(file,expectedWidth,expectedHeight,new Set([6]));
 const {raw,width,height,channels,stride}=png;
 const alpha=Buffer.alloc(width*height);let position=0,previous=Buffer.alloc(stride);
 for(let row=0;row<height;row++){
  const filter=raw[position++],current=Buffer.alloc(stride);
  for(let index=0;index<stride;index++){
   const encoded=raw[position++],left=index>=channels?current[index-channels]:0,above=previous[index],upperLeft=index>=channels?previous[index-channels]:0;
   let value;if(filter===0)value=encoded;else if(filter===1)value=encoded+left;else if(filter===2)value=encoded+above;else if(filter===3)value=encoded+Math.floor((left+above)/2);else if(filter===4)value=encoded+paeth(left,above,upperLeft);else throw new Error("unsupported PNG filter");
   current[index]=value&255;if(index%channels===channels-1)alpha[row*width+(index-(channels-1))/channels]=current[index];
  }
  previous=current;
 }
 return alpha;
}

const manifest=readJson("manifest.json");
const deck=readJson("assets/semantic-v2/cards.json");
const spreads=readJson("assets/spreads.json");
const registry=readJson("assets/semantic-v2/accepted-batches.json");
const legacyDeck=readJson("assets/cards.json");
const benchmark=readJson("tests/fixtures/semantic-v2-corpus-benchmark.json");
const tripleReport=readJson("tests/fixtures/semantic-v2-triple-matrix.json");
const Interpretation=require(path.join(root,"src/Interpretation.js"));
const assembled=require(path.join(root,"tools/assemble-semantic-v2-catalog.js")).assemble(root,registry,legacyDeck,spreads);
const files=walk(root).filter(p=>!p.includes(path.sep+".git"+path.sep));
const rel=files.map(p=>path.relative(root,p));

if(manifest.schemaVersion!==1)fail("manifest schemaVersion")
if(manifest.id!=="org.ministryoftaste.arcana")fail("manifest id")
if(!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version))fail("manifest version")
if(manifest.version!==readJson("package.json").version)fail("package and manifest versions differ")
if(manifest.license!=="MIT AND CC-BY-NC-ND-4.0")fail("mixed license declaration")
if(!fs.existsSync(path.join(root,"LICENSES/CC-BY-NC-ND-4.0.txt")))fail("missing artwork license")
for(const kind of ["service","panel","bar-widget"])if(!manifest.kinds.includes(kind))fail("missing kind "+kind)
for(const ep of Object.values(manifest.entryPoints))if(!fs.existsSync(path.join(root,ep)))fail("missing entry point "+ep)
try{Interpretation.validateCatalog(deck,spreads)}catch(error){fail("semantic-v2 catalog rejected: "+error.message)}
if(deck.cards.length!==78)fail("deck must contain 78 cards")
if(new Set(deck.cards.map(c=>c.id)).size!==78)fail("card ids not unique")
if(deck.cards.some((c,i)=>c.order!==i+1))fail("canonical order not contiguous")
if(assembled.digest!==benchmark.candidateDigest)fail("accepted catalog digest does not match benchmark")
if(JSON.stringify(assembled.catalog)!==JSON.stringify(deck))fail("runtime catalog differs from accepted batch assembly")
for(const c of deck.cards){
 if(Object.keys(c.reversalModes).length<2)fail("missing reversal modes on "+c.id)
 if(!c.imagery.length)fail("missing observed imagery on "+c.id)
 if(Object.prototype.hasOwnProperty.call(c,"orientationModes"))fail("legacy orientationModes on "+c.id)
}
const pngs=rel.filter(x=>x.startsWith("assets/card-art/")&&x.endsWith(".png"))
if(pngs.length!==79)fail("expected 79 card artwork PNGs, got "+pngs.length)
for(const file of pngs){
 const back=path.basename(file)==="card-back.png",expectedWidth=back?600:536,expectedHeight=back?1050:786;
 try{validatePng(path.join(root,file),expectedWidth,expectedHeight,new Set([2,6]))}
 catch(error){fail("invalid artwork PNG: "+file+" "+error.message)}
}
const baseNames=pngs.map(file=>path.basename(file)).sort();
const maskPngs=rel.filter(x=>x.startsWith("assets/card-art-masks/")&&x.endsWith(".png"))
if(maskPngs.length!==237)fail("expected 237 runtime mask PNGs, got "+maskPngs.length)
const roles=["primary","secondary","fault"],rolePaths={},visibleMasks={primary:[],secondary:[],fault:[]};
let inventoriesAligned=true;
for(const role of roles){
 const roleMasks=maskPngs.filter(x=>x.startsWith("assets/card-art-masks/"+role+"/"));
 const roleNames=roleMasks.map(file=>path.basename(file)).sort();
 if(JSON.stringify(roleNames)!==JSON.stringify(baseNames)){
  fail(role+" mask basename inventory does not exactly match card PNGs");
  inventoriesAligned=false;
 }
 rolePaths[role]=new Map(roleMasks.map(file=>[path.basename(file),file]));
}
let overlappingMaskPixels=0;
if(inventoriesAligned){
 for(const name of baseNames){
  const masks=[],back=name==="card-back.png",expectedWidth=back?600:536,expectedHeight=back?1050:786;
  for(const role of roles){
   const file=rolePaths[role].get(name);
   try{
    const alpha=pngAlpha(path.join(root,file),expectedWidth,expectedHeight);masks.push(alpha);
    if(alpha.some(value=>value!==0))visibleMasks[role].push(name);
   }catch(error){fail("invalid mask pixels: "+file+" "+error.message);masks.push(null)}
  }
  if(masks.every(Boolean))for(let left=0;left<masks.length;left++)for(let right=left+1;right<masks.length;right++){
   for(let index=0;index<masks[left].length;index++)if(masks[left][index]!==0&&masks[right][index]!==0)overlappingMaskPixels++;
  }
 }
}
if(overlappingMaskPixels!==0)fail("semantic masks overlap at "+overlappingMaskPixels+" pixels")
const illustrationContract=readJson("assets/card-art-masks/illustration-contract.json");
if(JSON.stringify(illustrationContract.frontSize)!==JSON.stringify([536,786])||JSON.stringify(illustrationContract.backSize)!==JSON.stringify([600,1050]))fail("illustration-contract dimensions do not match runtime contract")
for(const role of ["primary","secondary"]){
 const transparent=baseNames.filter(name=>!visibleMasks[role].includes(name));
 const expected=[...illustrationContract[role==="primary"?"transparentPrimary":"transparentSecondary"]].sort();
 if(JSON.stringify(transparent)!==JSON.stringify(expected))fail(role+" transparent masks do not match illustration-contract.json");
}
const faultContract=readJson("assets/card-art-masks/fault-contract.json");
const expectedFaultMasks=[...faultContract.active].sort();
if(JSON.stringify(visibleMasks.fault)!==JSON.stringify(expectedFaultMasks))fail("fault mask coverage does not match fault-contract.json")
if(79-visibleMasks.fault.length!==faultContract.transparentCount)fail("fault transparentCount does not match mask pixels")
for(const wanted of ["README.md","LICENSE","CHANGELOG.md","INTERPRETATION-RESEARCH-AND-SPEC.md","manifest.json"])if(!rel.includes(wanted))fail("missing release file "+wanted)
for(const file of files){const st=fs.statSync(file);if((st.mode&0o111)!==0)fail("executable file: "+path.relative(root,file))}
const runtime=rel.filter(x=>/\.(qml|js)$/.test(x)&&!x.startsWith("tests/")&&!x.startsWith("tools/")).map(x=>fs.readFileSync(path.join(root,x),"utf8")).join("\n")
for(const [name,re] of [["privilege escalation",/\b(?:sudo|pkexec)\b/],["system manager",/\bsystemctl\b/],["network downloader",/\b(?:curl|wget)\b/],["shell interpolation",/(?:bash|sh)\s*[-, ]+lc/]])if(re.test(runtime))fail("forbidden runtime capability: "+name)
const serviceSource=fs.readFileSync(path.join(root,"ArcanaService.qml"),"utf8");
if(/Arcana\.(?:compose|buildHandoff|draw)\(/.test(serviceSource)||/assets\/cards\.json/.test(serviceSource))fail("production service retains legacy semantic runtime use")
if(/fallback prose|Date\.now\(\)/i.test(serviceSource))fail("production service retains fallback interpretation or entropy")
const legalCase=benchmark.cases.find(item=>item.id==="tower-and-aces-rebuild-beginning");
const noAlternativeCase=benchmark.cases.find(item=>item.id==="reframe-diagnosis");
let legalReading=null,noAlternativeReading=null;
try{
 legalReading=Interpretation.interpret(deck,spreads,legalCase.request);
 noAlternativeReading=Interpretation.interpret(deck,spreads,noAlternativeCase.request);
}catch(error){fail("curated semantic release reading failed: "+error.message)}
if(legalReading){
 if(legalReading.methodVersion!=="arcana-composer-v2"||legalReading.schemaVersion!==2||legalReading.interactions.length!==2)fail("curated legal-relation reading invalid")
 const spread=spreads.spreads.find(item=>item.id===legalReading.spreadId);
 for(const relation of legalReading.interactions){const edge=spread.edges.find(item=>item.from===relation.from&&item.to===relation.to);if(!edge||!edge.allowedRelations.includes(relation.type))fail("curated reading contains illegal relation")}
}
if(noAlternativeReading){
 if(noAlternativeReading.interpretations.length!==1||noAlternativeReading.distinguishingQuestions.length!==0)fail("no-alternative semantic reading invalid")
 const panel=Interpretation.toPanelReading(deck,spreads,noAlternativeReading,null);
 const copied=Interpretation.copyReading(deck,spreads,noAlternativeReading);
 const packet=JSON.parse(Interpretation.buildHandoff(deck,spreads,noAlternativeReading));
 if(panel.alternative!==null||packet.alternative!==null||copied.includes("ALTERNATIVE"))fail("no-alternative projection leaked empty alternative")
}
if(legalReading&&noAlternativeReading){
 const readings=[legalReading,noAlternativeReading];
 const repeated=[Interpretation.interpret(deck,spreads,legalCase.request),Interpretation.interpret(deck,spreads,noAlternativeCase.request)];
 if(JSON.stringify(readings)!==JSON.stringify(repeated))fail("canonical semantic readings are not deterministic")
 const semanticDigest=crypto.createHash("sha256").update(readings.map(JSON.stringify).join("\n")).digest("hex");
 if(semanticDigest!=="f3471c38bd9f61f06c6a1663e5e7711f4c1b4526e3963187bd6391c2fd40616a")fail("canonical semantic release digest drift")
}
try{Interpretation.interpret(deck,spreads,Object.assign({},legalCase.request,{cards:legalCase.request.cards.slice(0,2)}));fail("malformed request did not fail closed")}catch(error){if(error.code!=="INVALID_SPREAD_CARDINALITY")fail("malformed request returned wrong typed failure")}
if(tripleReport.outcome!=="passed"||!tripleReport.complete||tripleReport.cases!==78*77*76||tripleReport.candidateDigest!==benchmark.candidateDigest||!tripleReport.blockingBudget.met)fail("complete triple-matrix release report invalid")
const selection=legalCase.request.cards;
const report={outcome:failures.length?"failed":"passed",version:manifest.version,files:rel.length,cards:deck.cards.length,candidateDigest:assembled.digest,tripleDigest:tripleReport.semanticDigest,pngs:pngs.length,masks:maskPngs.length,faultMasksActive:visibleMasks.fault.length,faultMasksTransparent:79-visibleMasks.fault.length,selection:selection.map(x=>x.cardId),relationships:legalReading?legalReading.interactions.length:0,failures};
console.log(JSON.stringify(report,null,2));
if(failures.length)process.exit(1);
