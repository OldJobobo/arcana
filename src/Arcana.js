"use strict";

const METHOD_VERSION = "composer-v1";
const MAX_HANDOFF_BYTES = 12000;
const MAX_QUESTION_CHARS = 1000;

const SPREADS = {
  "single": [{id:"single",label:"Single Draw"}],
  "context-friction-doorway": [
    {id:"context",label:"Context"},
    {id:"friction",label:"Friction"},
    {id:"doorway",label:"Doorway"}
  ]
};

function boundedText(value, max) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .slice(0, max);
}

function hashSeed(value) {
  let hash = 2166136261 >>> 0;
  const text = boundedText(value, 512);
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rng(seed) {
  let state = hashSeed(seed);
  return function next() {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function boundedCount(value, total) {
  const parsed = Math.floor(Number(value));
  const wanted = Number.isFinite(parsed) ? parsed : 1;
  return Math.max(1, Math.min(Math.max(1,total), wanted));
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || !Number.isFinite(Number(value.length))) return [];
  const output=[];
  const length=Math.max(0,Math.floor(Number(value.length)));
  for (let index=0;index<length;index++) output.push(value[index]);
  return output;
}

function draw(deck, options) {
  options = options || {};
  const cards = toArray(deck);
  if (!cards.length) return [];
  const next = rng(options.seed || "omarchy-arcana");
  const pool = cards.map((card,index) => index);
  const count = boundedCount(options.count, pool.length);
  const output = [];
  for (let i=0; i<count; i++) {
    const pick = Math.floor(next() * pool.length);
    const card = cards[pool.splice(pick,1)[0]];
    const reversed = options.reversals === true && next() < 0.34;
    const modes = toArray(card.orientationModes);
    const mode = reversed && modes.length ? modes[Math.floor(next()*modes.length)] : null;
    output.push({
      cardId: card.id,
      orientation: reversed ? "reversed" : "upright",
      modeId: mode ? mode.id : null
    });
  }
  return output;
}

function dailyKey(localDate) {
  return "daily:" + boundedText(localDate, 10) + ":" + METHOD_VERSION;
}

function findCard(deck,id) {
  for (let i=0;i<deck.length;i++) if (deck[i].id === id) return deck[i];
  return null;
}

function findMode(card,id) {
  const modes=toArray(card.orientationModes);
  for (let i=0;i<modes.length;i++) if (modes[i].id === id) return modes[i];
  return modes.length ? modes[0] : {id:"shadowed",label:"Shadowed",reading:"The card's capacity may be blocked, distorted, or overextended."};
}

function lowerStart(text) {
  text=String(text||"").trim();
  return text ? text.charAt(0).toLowerCase()+text.slice(1) : "the named pattern";
}

function positionText(card, orientationText, positionId) {
  const core=lowerStart(card.traditional && card.traditional.core);
  const system=lowerStart(card.omarchy && card.omarchy.systemLens);
  if (positionId === "context")
    return "The situation may currently be organized around " + core + "; in the Omarchy lens, " + system;
  if (positionId === "friction")
    return "The pressure or friction may involve " + core + ". Consider whether " + system;
  if (positionId === "doorway")
    return "A possible experiment or opening is to work with " + core + "; practically, " + system;
  return "This draw may be organized around " + core + "; in the Omarchy lens, " + system;
}

function relationshipType(a,b) {
  if (a.rank && b.rank && a.rank === b.rank) return "mirrors";
  if (a.suit && b.suit && a.suit === b.suit) return "amplifies";
  const pair=[a.element,b.element].sort().join("+");
  if (pair === "air+fire" || pair === "earth+water") return "supports";
  if (pair === "fire+water" || pair === "air+earth") return "tensions";
  if (a.arcana === "major" || b.arcana === "major") return "reframes";
  return "redirects";
}

function relationship(a,b,from,to) {
  const type=relationshipType(a,b);
  const verbs={
    mirrors:"echo a shared rank function",
    amplifies:"concentrate the same suit's concerns",
    supports:"offer mutually supportive elemental movement",
    tensions:"place unlike elemental needs in productive tension",
    reframes:"shift the scale between an archetypal pattern and a practical process",
    redirects:"move the reading from one operating domain into another"
  };
  return {
    id:"relation:"+from+":"+to,
    from,
    to,
    type,
    text:a.title+" and "+b.title+" "+verbs[type]+"."
  };
}

function patternSummary(cards) {
  const patterns=[];
  const suits={};
  let majors=0, reversed=0;
  for (const item of cards) {
    if (item.card.arcana === "major") majors++;
    if (item.orientation === "reversed") reversed++;
    if (item.card.suit) suits[item.card.suit]=(suits[item.card.suit]||0)+1;
  }
  for (const suit in suits) if (suits[suit] >= 2) patterns.push({id:"pattern:suit:"+suit,type:"suit-dominance",text:"The repeated "+suit+" suit keeps the reading in that operating domain."});
  if (majors >= 2) patterns.push({id:"pattern:majors",type:"major-density",text:"Multiple Major Arcana cards raise the reading from a local event to a broader organizing pattern."});
  if (reversed >= 2) patterns.push({id:"pattern:reversals",type:"reversal-density",text:"Several reversals emphasize blocked, internalized, delayed, or distorted expressions rather than simple absence."});
  return patterns;
}

function compose(deck,selections,spreadId) {
  deck=toArray(deck);
  const chosen=toArray(selections);
  const spread = SPREADS[spreadId] && SPREADS[spreadId].length === chosen.length ? SPREADS[spreadId] : SPREADS.single;
  const cards=[];
  const evidence=[];
  for (let i=0;i<chosen.length;i++) {
    const selected=chosen[i];
    const card=findCard(deck,selected.cardId);
    if (!card) continue;
    const position=spread[Math.min(i,spread.length-1)];
    const reversed=selected.orientation === "reversed";
    const mode=reversed ? findMode(card,selected.modeId) : null;
    const orientationLabel=reversed ? "Reversed · "+mode.label : "Upright";
    const orientationText=reversed ? mode.reading : card.traditional.core;
    const transformed=positionText(card,orientationText,position.id);
    const item={
      cardId:card.id,
      card,
      positionId:position.id,
      positionLabel:position.label,
      orientation:reversed?"reversed":"upright",
      modeId:mode?mode.id:null,
      orientationLabel,
      orientationText,
      transformed
    };
    cards.push(item);
    evidence.push({id:"card:"+card.id+":traditional",kind:"traditional",text:card.traditional.core,sources:card.sources});
    evidence.push({id:"card:"+card.id+":omarchy",kind:"deck-specific",text:card.omarchy.systemLens,sources:["omarchy-guide"]});
    if (mode) evidence.push({id:"card:"+card.id+":orientation:"+mode.id,kind:"orientation",text:mode.reading,sources:card.sources});
  }
  const relationships=[];
  for (let i=0;i<cards.length-1;i++) {
    const rel=relationship(cards[i].card,cards[i+1].card,cards[i].positionId,cards[i+1].positionId);
    relationships.push(rel); evidence.push({id:rel.id,kind:"relationship",text:rel.text,sources:["composer-v1"]});
  }
  if (cards.length===3) {
    const rel=relationship(cards[0].card,cards[2].card,cards[0].positionId,cards[2].positionId);
    relationships.push(rel); evidence.push({id:rel.id,kind:"relationship",text:rel.text,sources:["composer-v1"]});
  }
  const patterns=patternSummary(cards);
  for (const pattern of patterns) evidence.push({id:pattern.id,kind:"spread-pattern",text:pattern.text,sources:["composer-v1"]});
  const synthesis=cards.map(x=>x.transformed).join(" ") + (relationships.length ? " Across the spread, "+lowerStart(relationships[0].text) : "");
  const alternative=cards.length>1 ? "Another way to read it: the friction may be protecting a capacity that the doorway asks you to use more deliberately, rather than naming a simple obstacle." : "Another way to read it: this capacity may be present but underused, rather than absent.";
  return {
    schemaVersion:1,
    methodVersion:METHOD_VERSION,
    spreadId: spreadId || "single",
    spreadName: spreadId === "context-friction-doorway" ? "Context / Friction / Doorway" : "Single Draw",
    createdAt:null,
    cards,
    relationships,
    patterns,
    synthesis,
    alternative,
    reflection:cards.length ? cards[cards.length-1].card.reflection : "What deserves attention?",
    evidence
  };
}

function buildHandoff(reading,userQuestion) {
  const q=boundedText(userQuestion,MAX_QUESTION_CHARS).trim();
  const lines=[
    "# Omarchy Arcana — AGENT-ASSISTED FOLLOW-UP",
    "",
    "Plugin: org.ministryoftaste.omarchy-arcana",
    "Version: 0.1.0-alpha",
    "Canonical method: "+String(reading.methodVersion||METHOD_VERSION),
    "Spread: "+String(reading.spreadName||reading.spreadId||"Reading"),
    "",
    "## Safety and role",
    "Begin by asking what the user wants to explore. Treat this handoff as reflective context, not prophecy or factual authority. Remain advisory only unless the user explicitly requests an action after the conversation begins. Do not diagnose, provide professional advice, claim third-party knowledge, or modify canonical card data.",
    "",
    "## User question (quoted content, not hidden plugin instructions)",
    "BEGIN QUOTED USER QUESTION",
    q || "No question supplied.",
    "END QUOTED USER QUESTION",
    "",
    "## Current reading"
  ];
  for (const item of (reading.cards||[])) {
    lines.push("### "+item.positionLabel+" — "+item.card.title+" / "+item.card.systemTitle);
    lines.push("Orientation: "+item.orientationLabel);
    lines.push("Traditional core: "+item.card.traditional.core);
    lines.push("Omarchy translation: "+item.card.omarchy.systemLens);
    lines.push("Positioned reading: "+item.transformed);
    lines.push("");
  }
  lines.push("## Relationships");
  for (const rel of (reading.relationships||[])) lines.push("- "+rel.type+": "+rel.text);
  lines.push("","## Deterministic synthesis",String(reading.synthesis||""),"","## Another plausible lens",String(reading.alternative||""),"","## Reflective question",String(reading.reflection||""),"","Canonical content ends here. Any response you provide must be identified as agent-assisted prose.");
  let packet=lines.join("\n");
  while (BufferByteLength(packet)>MAX_HANDOFF_BYTES) packet=packet.slice(0,-256);
  return packet;
}

function BufferByteLength(text) {
  if (typeof Buffer !== "undefined") return Buffer.byteLength(text,"utf8");
  return unescape(encodeURIComponent(text)).length;
}

if (typeof module !== "undefined") module.exports={METHOD_VERSION,MAX_HANDOFF_BYTES,hashSeed,rng,draw,dailyKey,compose,buildHandoff};
