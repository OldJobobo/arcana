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
function pngAlpha(file){
 const b=fs.readFileSync(file);
 if(b.length<33||b.toString("hex",0,8)!=="89504e470d0a1a0a")throw new Error("invalid PNG signature");
 const idat=[];let offset=8,chunkIndex=0,sawIhdr=false,sawIdat=false,idatClosed=false,sawIend=false,width=0,height=0;
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
   if(!width||!height||data[8]!==8||data[9]!==6||data[10]!==0||data[11]!==0||data[12]!==0)throw new Error("expected non-interlaced 8-bit RGBA PNG");
   if(width!==600||height!==1050)throw new Error("expected 600x1050 mask dimensions");
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
 const stride=width*4,expectedLength=height*(stride+1);
 const raw=zlib.inflateSync(Buffer.concat(idat),{maxOutputLength:expectedLength});
 if(raw.length!==expectedLength)throw new Error("unexpected inflated PNG length");
 const alpha=Buffer.alloc(width*height);let position=0,previous=Buffer.alloc(stride);
 for(let row=0;row<height;row++){
  const filter=raw[position++],current=Buffer.alloc(stride);
  for(let index=0;index<stride;index++){
   const encoded=raw[position++],left=index>=4?current[index-4]:0,above=previous[index],upperLeft=index>=4?previous[index-4]:0;
   let value;if(filter===0)value=encoded;else if(filter===1)value=encoded+left;else if(filter===2)value=encoded+above;else if(filter===3)value=encoded+Math.floor((left+above)/2);else if(filter===4)value=encoded+paeth(left,above,upperLeft);else throw new Error("unsupported PNG filter");
   current[index]=value&255;if(index%4===3)alpha[row*width+(index-3)/4]=current[index];
  }
  previous=current;
 }
 return alpha;
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
for(const file of pngs){const size=pngSize(path.join(root,file));if(!size||size[0]!==600||size[1]!==1050)fail("wrong PNG dimensions: "+file+" "+String(size))}
const baseNames=pngs.map(file=>path.basename(file)).sort();
const maskPngs=rel.filter(x=>x.startsWith("assets/card-masks/")&&x.endsWith(".png"))
if(maskPngs.length!==237)fail("expected 237 runtime mask PNGs, got "+maskPngs.length)
const roles=["primary","secondary","fault"],rolePaths={},visibleMasks={primary:[],secondary:[],fault:[]};
let inventoriesAligned=true;
for(const role of roles){
 const roleMasks=maskPngs.filter(x=>x.startsWith("assets/card-masks/"+role+"/"));
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
  const masks=[];
  for(const role of roles){
   const file=rolePaths[role].get(name),size=pngSize(path.join(root,file));
   if(!size||size[0]!==600||size[1]!==1050)fail("wrong mask dimensions: "+file+" "+String(size));
   try{
    const alpha=pngAlpha(path.join(root,file));masks.push(alpha);
    if(alpha.some(value=>value!==0))visibleMasks[role].push(name);
   }catch(error){fail("invalid mask pixels: "+file+" "+error.message);masks.push(null)}
  }
  if(masks.every(Boolean))for(let left=0;left<masks.length;left++)for(let right=left+1;right<masks.length;right++){
   for(let index=0;index<masks[left].length;index++)if(masks[left][index]!==0&&masks[right][index]!==0)overlappingMaskPixels++;
  }
 }
}
if(overlappingMaskPixels!==0)fail("semantic masks overlap at "+overlappingMaskPixels+" pixels")
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
