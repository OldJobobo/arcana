"use strict";

const fs=require("node:fs");
const path=require("node:path");
const zlib=require("node:zlib");
const root=path.resolve(__dirname,"..");
const failures=[];
function fail(message){failures.push(message)}
function readJson(file){return JSON.parse(fs.readFileSync(path.join(root,file),"utf8"))}
function walk(dir,out=[]){for(const name of fs.readdirSync(dir)){const p=path.join(dir,name);const st=fs.lstatSync(p);if(st.isSymbolicLink())fail("symlink: "+path.relative(root,p));else if(st.isDirectory())walk(p,out);else out.push(p)}return out}
function pngSize(file){const b=fs.readFileSync(file);if(b.length<24||b.toString("hex",0,8)!=="89504e470d0a1a0a")return null;return [b.readUInt32BE(16),b.readUInt32BE(20)]}
function paeth(left,above,upperLeft){const p=left+above-upperLeft;const pa=Math.abs(p-left),pb=Math.abs(p-above),pc=Math.abs(p-upperLeft);return pa<=pb&&pa<=pc?left:pb<=pc?above:upperLeft}
function pngHasVisibleAlpha(file){
 const b=fs.readFileSync(file);
 if(b.length<33||b.toString("hex",0,8)!=="89504e470d0a1a0a")throw new Error("invalid PNG");
 const width=b.readUInt32BE(16),height=b.readUInt32BE(20);
 if(b[24]!==8||b[25]!==6||b[28]!==0)throw new Error("expected non-interlaced 8-bit RGBA PNG");
 const chunks=[];let offset=8;
 while(offset+12<=b.length){const length=b.readUInt32BE(offset);const type=b.toString("ascii",offset+4,offset+8);if(type==="IDAT")chunks.push(b.subarray(offset+8,offset+8+length));offset+=12+length;if(type==="IEND")break}
 const raw=zlib.inflateSync(Buffer.concat(chunks));const stride=width*4;let position=0;let previous=Buffer.alloc(stride);let visible=false;
 for(let row=0;row<height;row++){
  const filter=raw[position++];const current=Buffer.alloc(stride);
  for(let index=0;index<stride;index++){
   const encoded=raw[position++],left=index>=4?current[index-4]:0,above=previous[index],upperLeft=index>=4?previous[index-4]:0;
   let value;if(filter===0)value=encoded;else if(filter===1)value=encoded+left;else if(filter===2)value=encoded+above;else if(filter===3)value=encoded+Math.floor((left+above)/2);else if(filter===4)value=encoded+paeth(left,above,upperLeft);else throw new Error("unsupported PNG filter");
   current[index]=value&255;if(index%4===3&&current[index]!==0)visible=true;
  }
  previous=current;
 }
 return visible;
}

const manifest=readJson("manifest.json");
const deck=readJson("assets/cards.json");
const sources=readJson("assets/sources.json");
const files=walk(root).filter(p=>!p.includes(path.sep+".git"+path.sep));
const rel=files.map(p=>path.relative(root,p));

if(manifest.schemaVersion!==1)fail("manifest schemaVersion")
if(manifest.id!=="org.ministryoftaste.omarchy-arcana")fail("manifest id")
if(manifest.version!=="0.1.0-alpha")fail("manifest version")
for(const kind of ["service","panel","bar-widget"])if(!manifest.kinds.includes(kind))fail("missing kind "+kind)
for(const ep of Object.values(manifest.entryPoints))if(!fs.existsSync(path.join(root,ep)))fail("missing entry point "+ep)
if(deck.cards.length!==78)fail("deck must contain 78 cards")
if(new Set(deck.cards.map(c=>c.id)).size!==78)fail("card ids not unique")
if(deck.cards.some((c,i)=>c.order!==i+1))fail("canonical order not contiguous")
const sourceIds=new Set(sources.sources.map(s=>s.id))
for(const c of deck.cards){
 if(!c.sources.every(x=>sourceIds.has(x)))fail("unknown source on "+c.id)
 if(!c.orientationModes.length)fail("missing reversal modes on "+c.id)
 if(!c.observed.length)fail("missing observed details on "+c.id)
}
const pngs=rel.filter(x=>x.startsWith("assets/cards/")&&x.endsWith(".png"))
if(pngs.length!==79)fail("expected 79 runtime PNGs, got "+pngs.length)
for(const file of pngs){const size=pngSize(path.join(root,file));if(!size||size[0]!==300||size[1]!==525)fail("wrong PNG dimensions: "+file+" "+String(size))}
const maskPngs=rel.filter(x=>x.startsWith("assets/card-masks/")&&x.endsWith(".png"))
if(maskPngs.length!==237)fail("expected 237 runtime mask PNGs, got "+maskPngs.length)
const visibleMasks={};
for(const role of ["primary","secondary","fault"]){
 const roleMasks=maskPngs.filter(x=>x.startsWith("assets/card-masks/"+role+"/"));
 if(roleMasks.length!==79)fail("expected 79 "+role+" masks, got "+roleMasks.length);
 visibleMasks[role]=[];
 for(const file of roleMasks){
  const size=pngSize(path.join(root,file));if(!size||size[0]!==300||size[1]!==525)fail("wrong mask dimensions: "+file+" "+String(size));
  try{if(pngHasVisibleAlpha(path.join(root,file)))visibleMasks[role].push(path.basename(file))}catch(error){fail("invalid mask pixels: "+file+" "+error.message)}
 }
 visibleMasks[role].sort();
}
if(visibleMasks.primary.length!==79)fail("all 79 primary masks must contain visible pixels")
if(visibleMasks.secondary.length!==79)fail("all 79 secondary masks must contain visible pixels")
const faultContract=readJson("assets/card-masks/fault-contract.json");
const expectedFaultMasks=[...faultContract.active].sort();
if(JSON.stringify(visibleMasks.fault)!==JSON.stringify(expectedFaultMasks))fail("fault mask coverage does not match fault-contract.json")
if(79-visibleMasks.fault.length!==faultContract.transparentCount)fail("fault transparentCount does not match mask pixels")
for(const wanted of ["README.md","LICENSE","CHANGELOG.md","INTERPRETATION-RESEARCH-AND-SPEC.md","manifest.json"])if(!rel.includes(wanted))fail("missing release file "+wanted)
for(const file of files){const st=fs.statSync(file);if((st.mode&0o111)!==0)fail("executable file: "+path.relative(root,file))}
const runtime=rel.filter(x=>/\.(qml|js)$/.test(x)&&!x.startsWith("tests/")&&!x.startsWith("tools/")).map(x=>fs.readFileSync(path.join(root,x),"utf8")).join("\n")
for(const [name,re] of [["privilege escalation",/\b(?:sudo|pkexec)\b/],["system manager",/\bsystemctl\b/],["network downloader",/\b(?:curl|wget)\b/],["shell interpolation",/(?:bash|sh)\s*[-, ]+lc/]])if(re.test(runtime))fail("forbidden runtime capability: "+name)
const Arcana=require(path.join(root,"src/Arcana.js"));
const selection=Arcana.draw(deck.cards,{seed:"release-validator",count:3,reversals:true});
const reading=Arcana.compose(deck.cards,selection,"context-friction-doorway");
if(reading.cards.length!==3||reading.relationships.length<2)fail("runtime smoke reading failed")
const report={outcome:failures.length?"failed":"passed",version:manifest.version,files:rel.length,cards:deck.cards.length,pngs:pngs.length,masks:maskPngs.length,faultMasksActive:visibleMasks.fault.length,faultMasksTransparent:79-visibleMasks.fault.length,selection:selection.map(x=>x.cardId),relationships:reading.relationships.length,failures};
console.log(JSON.stringify(report,null,2));
if(failures.length)process.exit(1);
