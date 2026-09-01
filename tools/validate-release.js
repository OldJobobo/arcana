"use strict";

const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const failures=[];
function fail(message){failures.push(message)}
function readJson(file){return JSON.parse(fs.readFileSync(path.join(root,file),"utf8"))}
function walk(dir,out=[]){for(const name of fs.readdirSync(dir)){const p=path.join(dir,name);const st=fs.lstatSync(p);if(st.isSymbolicLink())fail("symlink: "+path.relative(root,p));else if(st.isDirectory())walk(p,out);else out.push(p)}return out}
function pngSize(file){const b=fs.readFileSync(file);if(b.length<24||b.toString("hex",0,8)!=="89504e470d0a1a0a")return null;return [b.readUInt32BE(16),b.readUInt32BE(20)]}

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
for(const wanted of ["README.md","LICENSE","CHANGELOG.md","INTERPRETATION-RESEARCH-AND-SPEC.md","manifest.json"])if(!rel.includes(wanted))fail("missing release file "+wanted)
for(const file of files){const st=fs.statSync(file);if((st.mode&0o111)!==0)fail("executable file: "+path.relative(root,file))}
const runtime=rel.filter(x=>/\.(qml|js)$/.test(x)&&!x.startsWith("tests/")&&!x.startsWith("tools/")).map(x=>fs.readFileSync(path.join(root,x),"utf8")).join("\n")
for(const [name,re] of [["privilege escalation",/\b(?:sudo|pkexec)\b/],["system manager",/\bsystemctl\b/],["network downloader",/\b(?:curl|wget)\b/],["shell interpolation",/(?:bash|sh)\s*[-, ]+lc/]])if(re.test(runtime))fail("forbidden runtime capability: "+name)
const Arcana=require(path.join(root,"src/Arcana.js"));
const selection=Arcana.draw(deck.cards,{seed:"release-validator",count:3,reversals:true});
const reading=Arcana.compose(deck.cards,selection,"context-friction-doorway");
if(reading.cards.length!==3||reading.relationships.length<2)fail("runtime smoke reading failed")
const report={outcome:failures.length?"failed":"passed",version:manifest.version,files:rel.length,cards:deck.cards.length,pngs:pngs.length,selection:selection.map(x=>x.cardId),relationships:reading.relationships.length,failures};
console.log(JSON.stringify(report,null,2));
if(failures.length)process.exit(1);
