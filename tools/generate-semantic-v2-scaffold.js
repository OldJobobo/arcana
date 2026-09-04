"use strict";

const fs=require("node:fs");
const path=require("node:path");

const TARGET_SCHEMA_VERSION=2;
const SCAFFOLD_VERSION=1;
const POSITION_IDS=["single","context","friction","doorway"];
const COURT_RANKS=new Set(["page","knight","queen","king"]);
const RANK_NUMBERS={ace:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,page:11,knight:12,queen:13,king:14};

function claimSlot(id) {
  return {id,text:null,themes:[],sourceRefs:[]};
}

function cardNumber(card) {
  if (card.arcana === "major") {
    const match=String(card.id).match(/^major-(\d{2})-/);
    if (!match) throw new Error("Cannot derive Major Arcana number for "+card.id);
    return Number(match[1]);
  }
  const number=RANK_NUMBERS[card.rank];
  if (!number) throw new Error("Cannot derive Minor Arcana number for "+card.id);
  return number;
}

function scaffoldCard(card) {
  const positions={};
  for (const positionId of POSITION_IDS) positions[positionId]=claimSlot(card.id+".position."+positionId);
  const output={
    id:card.id,
    order:card.order,
    arcana:card.arcana,
    number:cardNumber(card),
    rank:card.rank,
    title:card.title,
    omarchyTitle:card.systemTitle,
    suit:card.suit,
    element:card.element,
    image:card.image,
    slots:{
      coreThemes:[],
      imagery:[{id:card.id+".image.primary",detail:null,themes:[],sourceRefs:[]}],
      traditionalCore:claimSlot(card.id+".core"),
      omarchy:claimSlot(card.id+".omarchy"),
      positions,
      reversals:[],
      reversalModes:{},
      courtModes:COURT_RANKS.has(card.rank) ? {
        person:claimSlot(card.id+".court.person"),
        role:claimSlot(card.id+".court.role"),
        approach:claimSlot(card.id+".court.approach")
      } : null,
      reflectionPrompts:[
        {id:card.id+".prompt.notice",text:null,themes:[]},
        {id:card.id+".prompt.act",text:null,themes:[]}
      ]
    }
  };
  return output;
}

function generateScaffold(legacyCatalog) {
  if (!legacyCatalog || legacyCatalog.schemaVersion !== 1 || !Array.isArray(legacyCatalog.cards)) throw new Error("Expected schema-v1 card catalog");
  const cards=legacyCatalog.cards.slice().sort((left,right) => left.order-right.order).map(scaffoldCard);
  return {
    scaffoldVersion:SCAFFOLD_VERSION,
    targetSchemaVersion:TARGET_SCHEMA_VERSION,
    deckId:legacyCatalog.deckId,
    deckTitle:legacyCatalog.deckTitle,
    sourceSchemaVersion:legacyCatalog.schemaVersion,
    sourceMethodVersion:legacyCatalog.methodVersion,
    cards
  };
}

function writeScaffold(targetPath) {
  const root=fs.realpathSync(path.resolve(__dirname,".."));
  const target=path.resolve(root,targetPath);
  if (target !== root && !target.startsWith(root+path.sep)) throw new Error("Output must remain inside the repository");
  let existingParent=path.dirname(target);
  while (!fs.existsSync(existingParent)) {
    const parent=path.dirname(existingParent);
    if (parent === existingParent) throw new Error("Cannot resolve output parent");
    existingParent=parent;
  }
  const canonicalParent=fs.realpathSync(existingParent);
  if (canonicalParent !== root && !canonicalParent.startsWith(root+path.sep)) throw new Error("Output parent must remain inside the repository");
  try {
    if (fs.lstatSync(target).isSymbolicLink()) throw new Error("Output cannot be a symbolic link");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const legacy=JSON.parse(fs.readFileSync(path.join(root,"assets","cards.json"),"utf8"));
  const scaffold=generateScaffold(legacy);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  const flags=fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_TRUNC|fs.constants.O_NOFOLLOW;
  fs.writeFileSync(target,JSON.stringify(scaffold,null,2)+"\n",{flag:flags,mode:0o644});
  return target;
}

if (require.main === module) {
  const target=process.argv[2];
  if (!target) {
    console.error("Usage: node tools/generate-semantic-v2-scaffold.js <repository-relative-output.json>");
    process.exitCode=2;
  } else {
    try { console.log(writeScaffold(target)); }
    catch (error) { console.error(error.message); process.exitCode=1; }
  }
}

module.exports={TARGET_SCHEMA_VERSION,SCAFFOLD_VERSION,POSITION_IDS,cardNumber,generateScaffold,writeScaffold};
