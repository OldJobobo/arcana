"use strict";

const METHOD_VERSION = "arcana-composer-v2";
const STATE_SCHEMA_VERSION = 2;
const CARD_SCHEMA_VERSION = 2;
const SOURCE_SCHEMA_VERSION = 2;
const SPREAD_SCHEMA_VERSION = 1;
const ID_PATTERN = /^[a-z0-9][a-z0-9.:-]{0,95}$/;
const CONTROL_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

const ENUMS = {
  arcana: ["major", "minor"],
  suit: ["wands", "cups", "swords", "pentacles"],
  element: ["fire", "water", "air", "earth", "spirit"],
  lens: ["traditional-core", "traditional-range", "omarchy", "position-single", "position-context", "position-friction", "position-doorway", "reversal", "structural"],
  orientation: ["upright", "reversed", "both"],
  selectionOrientation: ["upright", "reversed"],
  tradition: ["rws", "golden-dawn-structural", "arcana"],
  provenanceKind: ["source-quotation", "original-paraphrase", "deck-observation", "omarchy-original", "structural-convention", "composer-inference", "agent-assisted"],
  licenseStatus: ["public-domain", "private-reference", "original-work", "structural-convention"],
  imageryKind: ["observed"],
  agency: ["descriptive", "diagnostic-reflective", "conditional"],
  polarity: ["neutral"],
  relation: ["reinforces", "contrasts", "qualifies", "continues", "corrects", "transforms", "releases", "returns", "reverses", "matures", "departs", "sequence", "cause_effect", "figure_direction", "elemental_dignity"],
  reversalPolicy: ["none", "traditional", "energy_state", "multi_hypothesis"],
  reversalMode: ["reduced", "blocked", "internalized", "private", "unavailable", "delayed", "developing", "excessive", "distorted", "misdirected", "turning_away", "reconsidered", "released", "recovering", "traditional_reversed"],
  topicLens: ["general", "work", "relationship", "creative-practice", "wellbeing"],
  narrator: ["clear-reflective-v1"],
  dignity: ["disabled", "enabled"]
};

const THEMES = ["agency", "ambiguity", "attention", "beginning", "boundary", "burden", "change", "clarity", "collaboration", "conflict", "connection", "courage", "discernment", "discipline", "exchange", "focus", "grief", "guidance", "initiative", "integration", "intuition", "leadership", "momentum", "opportunity", "perspective", "recovery", "release", "resilience", "rest", "risk", "skill", "solitude", "stability", "truth"];
const POSITION_LENS = {single:"position-single", context:"position-context", friction:"position-friction", doorway:"position-doorway"};
const REVERSAL_FAMILY = {
  reduced:"availability",blocked:"availability",unavailable:"availability",delayed:"availability",developing:"availability",
  internalized:"location",private:"location",
  excessive:"intensity",distorted:"intensity",misdirected:"intensity",
  turning_away:"transition",reconsidered:"transition",released:"transition",recovering:"transition",
  traditional_reversed:"traditional"
};
const SPREAD_SHAPES = {
  single:{positions:["single"],edges:[]},
  "context-friction-doorway":{positions:["context","friction","doorway"],edges:[
    ["context","friction",["reinforces","contrasts","qualifies"]],
    ["friction","doorway",["continues","corrects","transforms","releases"]],
    ["context","doorway",["returns","reverses","matures","departs"]]
  ]}
};

function validationError(code, path, message) {
  const error = new Error(message + " at " + path);
  error.name = "ArcanaValidationError";
  error.code = code;
  error.path = path;
  return error;
}

function fail(code, path, message) {
  throw validationError(code, path, message);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeExternal(value) {
  if (Array.isArray(value)) {
    if (value.length > 10000) fail("INVALID_SCHEMA","external.length","Array exceeds resource bound");
    return value.map(normalizeExternal);
  }
  if (value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value,"length") && !Object.prototype.hasOwnProperty.call(value,"schemaVersion")) {
    const rawLength=Number(value.length);
    if (!Number.isSafeInteger(rawLength) || rawLength < 0 || rawLength > 10000) fail("INVALID_SCHEMA","external.length","Invalid array-like length");
    const output=[];
    for (let i=0;i<rawLength;i++) output.push(normalizeExternal(value[i]));
    return output;
  }
  if (value && typeof value === "object") {
    const output={};
    const keys=Object.keys(value);
    for (let i=0;i<keys.length;i++) output[keys[i]]=normalizeExternal(value[keys[i]]);
    return output;
  }
  return value;
}

function object(value, path) {
  if (!isObject(value)) fail("INVALID_SCHEMA", path, "Expected object");
  return value;
}

function array(value, path, min, max) {
  if (!Array.isArray(value)) fail("INVALID_SCHEMA", path, "Expected array");
  if (value.length < min || value.length > max) fail("INVALID_SCHEMA", path, "Unexpected array cardinality");
  return value;
}

function text(value, path, max) {
  if (typeof value !== "string" || !value.trim() || value.length > max || CONTROL_PATTERN.test(value)) fail("INVALID_TEXT", path, "Expected bounded plain text");
  return value;
}

function nullableText(value, path, max) {
  if (value === null || value === undefined) return null;
  return text(value, path, max);
}

function id(value, path) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) fail("INVALID_SCHEMA", path, "Invalid stable ID");
  return value;
}

function oneOf(value, values, path, code) {
  if (values.indexOf(value) < 0) fail(code || "INVALID_SCHEMA", path, "Unsupported value");
  return value;
}

function integer(value, path, min) {
  if (!Number.isInteger(value) || value < min) fail("INVALID_SCHEMA", path, "Expected integer");
  return value;
}

function exactKeys(value, allowed, path) {
  const keys=Object.keys(value);
  for (let i=0;i<keys.length;i++) if (allowed.indexOf(keys[i]) < 0) fail("INVALID_SCHEMA", path+"."+keys[i], "Unknown field");
}

function uniqueRecords(records, path) {
  const seen = Object.create(null);
  for (let index=0; index<records.length; index++) {
    const recordId = id(records[index] && records[index].id, path+"["+index+"].id");
    if (seen[recordId]) fail("INVALID_SCHEMA", path+"["+index+"].id", "Duplicate ID");
    seen[recordId] = records[index];
  }
  return seen;
}

function themes(values, path, min) {
  const items = array(values, path, min, 8);
  const seen = Object.create(null);
  for (let index=0; index<items.length; index++) {
    const value = oneOf(items[index], THEMES, path+"["+index+"]");
    if (seen[value]) fail("INVALID_SCHEMA", path+"["+index+"]", "Duplicate theme");
    seen[value] = true;
  }
  return items;
}

function validateSources(sourceCatalog) {
  object(sourceCatalog, "sources");
  exactKeys(sourceCatalog,["schemaVersion","sources"],"sources");
  if (sourceCatalog.schemaVersion !== SOURCE_SCHEMA_VERSION) fail("INVALID_SCHEMA", "sources.schemaVersion", "Unsupported source schema");
  const records = array(sourceCatalog.sources, "sources.sources", 1, 256);
  const index = uniqueRecords(records, "sources.sources");
  for (let i=0; i<records.length; i++) {
    const source=object(records[i], "sources.sources["+i+"]");
    exactKeys(source,["id","author","title","url","tradition","publicationYear","licenseStatus","use"],"sources.sources["+i+"]");
    text(source.title, "sources.sources["+i+"].title", 120);
    nullableText(source.author, "sources.sources["+i+"].author", 120);
    nullableText(source.url, "sources.sources["+i+"].url", 500);
    oneOf(source.tradition, ENUMS.tradition, "sources.sources["+i+"].tradition");
    if (source.publicationYear !== null && source.publicationYear !== undefined) integer(source.publicationYear, "sources.sources["+i+"].publicationYear", 1);
    oneOf(source.licenseStatus, ENUMS.licenseStatus, "sources.sources["+i+"].licenseStatus");
    const uses=array(source.use, "sources.sources["+i+"].use", 1, 16);
    for (let j=0;j<uses.length;j++) text(uses[j], "sources.sources["+i+"].use["+j+"]", 48);
  }
  return index;
}

function validateSpreads(spreadCatalog) {
  object(spreadCatalog, "spreads");
  exactKeys(spreadCatalog,["schemaVersion","spreads"],"spreads");
  if (spreadCatalog.schemaVersion !== SPREAD_SCHEMA_VERSION) fail("INVALID_SCHEMA", "spreads.schemaVersion", "Unsupported spread schema");
  const records=array(spreadCatalog.spreads, "spreads.spreads", 2, 2);
  const spreadIndex=uniqueRecords(records, "spreads.spreads");
  for (const requiredId of Object.keys(SPREAD_SHAPES)) if (!spreadIndex[requiredId]) fail("INVALID_SCHEMA", "spreads.spreads", "Missing canonical spread");
  for (let i=0;i<records.length;i++) {
    const spread=object(records[i], "spreads.spreads["+i+"]");
    const base="spreads.spreads["+i+"]";
    exactKeys(spread,["id","title","cardCount","positions","edges","centrality"],base);
    const canonical=SPREAD_SHAPES[spread.id];
    if (!canonical) fail("INVALID_SCHEMA", base+".id", "Unknown spread in schema 1");
    text(spread.title, base+".title", 120);
    integer(spread.cardCount, base+".cardCount", 1);
    const positions=array(spread.positions, base+".positions", spread.cardCount, spread.cardCount);
    const positionIndex=uniqueRecords(positions, base+".positions");
    for (let j=0;j<positions.length;j++) {
      const position=positions[j];
      exactKeys(position,["id","label","prompt","agency","polarity"],base+".positions["+j+"]");
      if (position.id !== canonical.positions[j]) fail("INVALID_SCHEMA", base+".positions["+j+"].id", "Non-canonical position order");
      text(position.label, base+".positions["+j+"].label", 120);
      text(position.prompt, base+".positions["+j+"].prompt", 280);
      oneOf(position.agency, ENUMS.agency, base+".positions["+j+"].agency");
      oneOf(position.polarity, ENUMS.polarity, base+".positions["+j+"].polarity");
    }
    const edges=array(spread.edges, base+".edges", canonical.edges.length, canonical.edges.length);
    const edgeIds=Object.create(null);
    for (let j=0;j<edges.length;j++) {
      const edge=object(edges[j], base+".edges["+j+"]");
      exactKeys(edge,["from","to","allowedRelations","causality"],base+".edges["+j+"]");
      const expectedEdge=canonical.edges[j];
      if (edge.from !== expectedEdge[0] || edge.to !== expectedEdge[1]) fail("INVALID_SCHEMA", base+".edges["+j+"]", "Non-canonical spread edge");
      if (!positionIndex[edge.from] || !positionIndex[edge.to] || edge.from === edge.to) fail("INVALID_REFERENCE", base+".edges["+j+"]", "Invalid spread edge");
      const edgeId=edge.from+":"+edge.to;
      if (edgeIds[edgeId]) fail("INVALID_SCHEMA", base+".edges["+j+"]", "Duplicate spread edge");
      edgeIds[edgeId]=true;
      if (edge.causality !== false) fail("INVALID_SCHEMA", base+".edges["+j+"].causality", "Spread schema 1 forbids causality");
      const relations=array(edge.allowedRelations, base+".edges["+j+"].allowedRelations", expectedEdge[2].length, expectedEdge[2].length);
      if (relations.join("|") !== expectedEdge[2].join("|")) fail("INVALID_SCHEMA", base+".edges["+j+"].allowedRelations", "Non-canonical relation set");
      for (let k=0;k<relations.length;k++) {
        oneOf(relations[k], ENUMS.relation, base+".edges["+j+"].allowedRelations["+k+"]");
        if (relations[k] === "cause_effect") fail("INVALID_SCHEMA", base+".edges["+j+"]", "Spread schema 1 forbids causal relations");
      }
    }
    const centrality=array(spread.centrality, base+".centrality", 1, positions.length);
    for (let j=0;j<centrality.length;j++) if (!positionIndex[centrality[j]]) fail("INVALID_REFERENCE", base+".centrality["+j+"]", "Unknown central position");
  }
  return spreadIndex;
}

function validateCards(catalog, sourceIndex) {
  if (catalog.schemaVersion !== CARD_SCHEMA_VERSION) fail("INVALID_SCHEMA", "catalog.schemaVersion", "Unsupported card schema");
  text(catalog.deckId, "catalog.deckId", 96);
  text(catalog.deckTitle, "catalog.deckTitle", 120);
  if (catalog.methodVersion !== METHOD_VERSION) fail("INVALID_SCHEMA", "catalog.methodVersion", "Unsupported method version");
  const records=array(catalog.cards, "catalog.cards", 1, 78);
  const cardIndex=uniqueRecords(records, "catalog.cards");
  const orderIndex=Object.create(null);
  const globalClaims=Object.create(null);
  const globalImagery=Object.create(null);
  const globalPrompts=Object.create(null);
  let previousOrder=0;
  for (let i=0;i<records.length;i++) {
    const card=object(records[i], "catalog.cards["+i+"]");
    const base="catalog.cards["+i+"]";
    exactKeys(card,["schemaVersion","id","order","arcana","number","rank","title","omarchyTitle","suit","element","image","coreThemes","imagery","claims","reversalModes","positionClaims","reflectionPrompts","reflectionPromptIds","courtModes"],base);
    if (card.schemaVersion !== CARD_SCHEMA_VERSION) fail("INVALID_SCHEMA", base+".schemaVersion", "Unsupported card schema");
    integer(card.order, base+".order", 1);
    if (orderIndex[card.order]) fail("INVALID_SCHEMA", base+".order", "Duplicate card order");
    if (card.order <= previousOrder) fail("INVALID_SCHEMA", base+".order", "Cards must use canonical ascending order");
    orderIndex[card.order]=true;
    previousOrder=card.order;
    oneOf(card.arcana, ENUMS.arcana, base+".arcana");
    integer(card.number, base+".number", 0);
    text(card.rank, base+".rank", 24);
    text(card.title, base+".title", 120);
    text(card.omarchyTitle, base+".omarchyTitle", 120);
    if (card.arcana === "minor") oneOf(card.suit, ENUMS.suit, base+".suit");
    else if (card.suit !== null) fail("INVALID_SCHEMA", base+".suit", "Major Arcana suit must be null");
    oneOf(card.element, ENUMS.element, base+".element");
    if (typeof card.image !== "string" || !/^assets\/card-art\/[a-z0-9-]+\.png$/.test(card.image)) fail("INVALID_SCHEMA", base+".image", "Invalid packaged image path");
    themes(card.coreThemes, base+".coreThemes", 1);

    const imagery=array(card.imagery, base+".imagery", 1, 8);
    const imageryIndex=uniqueRecords(imagery, base+".imagery");
    for (const imageryId of Object.keys(imageryIndex)) {
      if (globalImagery[imageryId]) fail("INVALID_SCHEMA", base+".imagery", "Duplicate catalog-wide imagery ID");
      globalImagery[imageryId]=true;
    }
    for (let j=0;j<imagery.length;j++) {
      const item=imagery[j], itemBase=base+".imagery["+j+"]";
      exactKeys(item,["id","detail","kind","deckSpecific","sourceRefs"],itemBase);
      text(item.detail, itemBase+".detail", 360);
      oneOf(item.kind, ENUMS.imageryKind, itemBase+".kind");
      if (item.deckSpecific !== true) fail("INVALID_SCHEMA", itemBase+".deckSpecific", "Pilot imagery must be deck-specific");
      validateRefs(item.sourceRefs, sourceIndex, itemBase+".sourceRefs");
    }

    const claims=array(card.claims, base+".claims", 8, 32);
    const claimIndex=uniqueRecords(claims, base+".claims");
    for (const claimId of Object.keys(claimIndex)) {
      if (globalClaims[claimId]) fail("INVALID_SCHEMA", base+".claims", "Duplicate catalog-wide claim ID");
      globalClaims[claimId]=true;
    }
    for (let j=0;j<claims.length;j++) {
      const item=claims[j], itemBase=base+".claims["+j+"]";
      exactKeys(item,["id","text","lens","orientation","tradition","provenanceKind","sourceRefs","themes","topicLenses"],itemBase);
      text(item.text, itemBase+".text", 360);
      oneOf(item.lens, ENUMS.lens, itemBase+".lens");
      oneOf(item.orientation, ENUMS.orientation, itemBase+".orientation");
      oneOf(item.tradition, ENUMS.tradition, itemBase+".tradition");
      oneOf(item.provenanceKind, ENUMS.provenanceKind, itemBase+".provenanceKind");
      if (item.provenanceKind === "source-quotation" || item.provenanceKind === "agent-assisted") fail("INVALID_SCHEMA", itemBase+".provenanceKind", "Canonical pilot claims cannot use excluded provenance");
      validateRefs(item.sourceRefs, sourceIndex, itemBase+".sourceRefs");
      themes(item.themes, itemBase+".themes", 1);
      const lenses=array(item.topicLenses, itemBase+".topicLenses", 1, ENUMS.topicLens.length);
      for (let k=0;k<lenses.length;k++) oneOf(lenses[k], ENUMS.topicLens, itemBase+".topicLenses["+k+"]");
    }
    if (!claims.some(item => item.lens === "traditional-core") || !claims.some(item => item.lens === "omarchy")) fail("INVALID_SCHEMA", base+".claims", "Traditional and Omarchy claims are required");

    object(card.reversalModes, base+".reversalModes");
    const allowedReversalThemes=card.coreThemes.slice();
    for (let claimOffset=0;claimOffset<claims.length;claimOffset++) if (claims[claimOffset].lens.indexOf("position-") === 0) {
      for (let themeOffset=0;themeOffset<claims[claimOffset].themes.length;themeOffset++) allowedReversalThemes.push(claims[claimOffset].themes[themeOffset]);
    }
    const modes=Object.keys(card.reversalModes);
    if (!modes.length) fail("INVALID_SCHEMA", base+".reversalModes", "At least one reversal mode is required");
    for (let j=0;j<modes.length;j++) {
      const mode=oneOf(modes[j], ENUMS.reversalMode, base+".reversalModes."+modes[j]);
      const refs=validateRefs(card.reversalModes[mode], claimIndex, base+".reversalModes."+mode);
      for (let k=0;k<refs.length;k++) {
        const target=claimIndex[refs[k]];
        if (target.lens !== "reversal" || target.orientation !== "reversed") fail("INVALID_REFERENCE", base+".reversalModes."+mode+"["+k+"]", "Reversal mode must reference reversed reversal claim");
        if (!target.themes.some(theme => allowedReversalThemes.indexOf(theme) >= 0)) fail("INVALID_REFERENCE", base+".reversalModes."+mode+"["+k+"]", "Reversal claim must share a card or position theme");
      }
    }

    object(card.positionClaims, base+".positionClaims");
    exactKeys(card.positionClaims,Object.keys(POSITION_LENS),base+".positionClaims");
    for (const position of Object.keys(POSITION_LENS)) {
      const refs=validateRefs(card.positionClaims[position], claimIndex, base+".positionClaims."+position);
      for (let j=0;j<refs.length;j++) if (claimIndex[refs[j]].lens !== POSITION_LENS[position]) fail("INVALID_REFERENCE", base+".positionClaims."+position+"["+j+"]", "Position reference has wrong lens");
    }

    const prompts=array(card.reflectionPrompts, base+".reflectionPrompts", 2, 6);
    const promptIndex=uniqueRecords(prompts, base+".reflectionPrompts");
    for (const promptId of Object.keys(promptIndex)) {
      if (globalPrompts[promptId]) fail("INVALID_SCHEMA", base+".reflectionPrompts", "Duplicate catalog-wide prompt ID");
      globalPrompts[promptId]=true;
    }
    for (let j=0;j<prompts.length;j++) {
      exactKeys(prompts[j],["id","text","themes"],base+".reflectionPrompts["+j+"]");
      text(prompts[j].text, base+".reflectionPrompts["+j+"].text", 280);
      themes(prompts[j].themes, base+".reflectionPrompts["+j+"].themes", 1);
    }
    validateRefs(card.reflectionPromptIds, promptIndex, base+".reflectionPromptIds", 1, 2);

    const isCourt=card.arcana === "minor" && ["page","knight","queen","king"].indexOf(card.rank) >= 0;
    if (isCourt) {
      object(card.courtModes, base+".courtModes");
      exactKeys(card.courtModes,["person","role","approach"],base+".courtModes");
      for (const mode of ["person","role","approach"]) validateRefs(card.courtModes[mode], claimIndex, base+".courtModes."+mode, 1, 8);
    } else if (card.courtModes !== undefined) fail("INVALID_SCHEMA", base+".courtModes", "Only court cards may define court modes");
    void imageryIndex;
  }
  return cardIndex;
}

function validateRefs(values, index, path, min, max) {
  const refs=array(values, path, min === undefined ? 1 : min, max === undefined ? 16 : max);
  const seen=Object.create(null);
  for (let i=0;i<refs.length;i++) {
    const ref=id(refs[i], path+"["+i+"]");
    if (seen[ref]) fail("INVALID_REFERENCE", path+"["+i+"]", "Duplicate reference");
    if (!index[ref]) fail("INVALID_REFERENCE", path+"["+i+"]", "Unknown reference");
    seen[ref]=true;
  }
  return refs;
}

function validateCatalog(catalog, spreadCatalog) {
  catalog=normalizeExternal(catalog);
  spreadCatalog=normalizeExternal(spreadCatalog);
  object(catalog, "catalog");
  exactKeys(catalog,["schemaVersion","deckId","deckTitle","methodVersion","sources","cards","cases"],"catalog");
  const sourceIndex=validateSources(catalog.sources);
  const spreadIndex=validateSpreads(spreadCatalog);
  const cardIndex=validateCards(catalog, sourceIndex);
  return {cards:cardIndex, sources:sourceIndex, spreads:spreadIndex};
}

function validateRequest(indexes, request) {
  indexes=normalizeExternal(indexes);
  request=normalizeExternal(request);
  object(indexes, "indexes");
  object(request, "request");
  exactKeys(request,["spreadId","cards","originalQuestion","topicLens","tradition","reversalPolicy","elementalDignity","narratorId"],"request");
  const spread=indexes.spreads[request.spreadId];
  if (!spread) fail("UNKNOWN_SPREAD", "request.spreadId", "Unknown spread");
  if (!Array.isArray(request.cards) || request.cards.length !== spread.cardCount) fail("INVALID_SPREAD_CARDINALITY", "request.cards", "Selection count does not match spread");
  const selections=request.cards;
  const seen=Object.create(null);
  for (let i=0;i<selections.length;i++) {
    const selection=object(selections[i], "request.cards["+i+"]");
    exactKeys(selection,["positionId","cardId","orientation"],"request.cards["+i+"]");
    if (selection.positionId !== spread.positions[i].id) fail("INVALID_POSITION", "request.cards["+i+"].positionId", "Selection position does not match spread order");
    if (!indexes.cards[selection.cardId]) fail("UNKNOWN_CARD", "request.cards["+i+"].cardId", "Unknown card");
    if (seen[selection.cardId]) fail("DUPLICATE_SELECTION", "request.cards["+i+"].cardId", "Duplicate card selection");
    seen[selection.cardId]=true;
    oneOf(selection.orientation, ENUMS.selectionOrientation, "request.cards["+i+"].orientation", "INVALID_ORIENTATION");
  }
  if (request.originalQuestion !== null && request.originalQuestion !== undefined) nullableText(request.originalQuestion, "request.originalQuestion", 1000);
  oneOf(request.topicLens === undefined ? "general" : request.topicLens, ENUMS.topicLens, "request.topicLens", "INVALID_TOPIC_LENS");
  oneOf(request.tradition === undefined ? "rws" : request.tradition, ENUMS.tradition, "request.tradition", "INVALID_TRADITION");
  oneOf(request.reversalPolicy === undefined ? "energy_state" : request.reversalPolicy, ENUMS.reversalPolicy, "request.reversalPolicy", "INVALID_REVERSAL_POLICY");
  oneOf(request.elementalDignity === undefined ? "disabled" : request.elementalDignity, ENUMS.dignity, "request.elementalDignity");
  oneOf(request.narratorId === undefined ? "clear-reflective-v1" : request.narratorId, ENUMS.narrator, "request.narratorId", "INVALID_NARRATOR");
  return true;
}

function hasInaccessibleMentalState(value) {
  const original=String(value || "");
  const verb="(?:think|thinks|thinking|feel|feels|feeling|want|wants|wanting|believe|believes|believing|plan|plans|planning|intend|intends|intending|fear|fears|fearing|hope|hopes|hoping|love|loves|loving|hate|hates|hating|expect|expects|expecting|know|knows|knowing|afraid|worried|anxious|jealous|angry|upset)";
  const auxiliary="(?:(?:is|are|was|were|does|do|did|may|might|could|would)\\s+)?";
  const human="(?:partner|friend|boss|manager|coworker|colleague|ex|spouse|parent|mother|father|child|client|therapist|doctor|lawyer|attorney|adviser|advisor)";
  const thirdParty="(?:he|she|they|someone|somebody|another person|"+human+"|(?:your|their|his|her|my)\\s+"+human+")";
  if (new RegExp("\\b"+thirdParty+"\\s+"+auxiliary+verb+"\\b","i").test(original)) return true;
  const proper=new RegExp("\\b([A-Z][a-z'-]+)\\s+"+auxiliary+verb+"\\b","g");
  let match;
  while ((match=proper.exec(original)) !== null) if (["The","This","That","What","Does","Why","How","My","Your","Our"].indexOf(match[1]) < 0) return true;
  return false;
}

function normalizeQuestion(originalQuestion) {
  if (originalQuestion === null || originalQuestion === undefined || String(originalQuestion).trim() === "") return {originalQuestion:null,normalizedQuestion:null,reframeReason:null};
  const original=String(originalQuestion);
  const question=original.trim();
  const lower=question.toLowerCase();
  if (/\b(diagnos(?:e|es|ed|ing|is)?|disorder|disease|medical condition|mentally ill)\b/.test(lower)) return {originalQuestion:original,normalizedQuestion:"What observable experiences and support options should I consider?",reframeReason:"diagnosis"};
  if (/\b(as (?:my|your|a|an|the) (?:therapist|doctor|physician|lawyer|attorney|financial advis(?:er|or))|i(?: am|'m) (?:your|a|an) (?:therapist|doctor|physician|lawyer|attorney|financial advis(?:er|or))|(?:therapist|doctor|physician|lawyer|attorney|financial advis(?:er|or)) (?:says|knows|orders|requires|advises)|prescribe|professional (?:medical|legal|financial) advice)\b/.test(lower)) return {originalQuestion:original,normalizedQuestion:"What factors should I consider, and what qualified guidance may be appropriate?",reframeReason:"professional-authority"};
  if (hasInaccessibleMentalState(question) || /\b(?:what does|does|is|why is|what is)\s+(?!the\b|my\b|our\b|i\b|we\b|you\b)[a-z][a-z'-]*\s+.*\b(?:feel|feeling|think|thinking|fear|fearing|afraid|worried|anxious|jealous|angry|upset|hope|hoping|love|want|wanting|hiding|plan|planning|intend|intending|believe|believing)\b/i.test(question)) return {originalQuestion:original,normalizedQuestion:"What can I observe in this relationship, and how can I communicate responsibly?",reframeReason:"third-party-mental-state"};
  if (/\b(should\s+i|tell\s+me\s+(whether|if)\s+i\s+should|decide\s+for\s+me)\b/i.test(question)) return {originalQuestion:original,normalizedQuestion:"What factors, needs, and likely consequences should I consider before making this decision?",reframeReason:"decision-transfer"};
  if (/^will\b/i.test(question) || /\b(i|we|he|she|they|it|my\s+[a-z'-]+)\s+will\b/i.test(question) || /\b(am\s+i\s+going\s+to|when\s+will|guarantee|certain\s+that)\b/i.test(question)) return {originalQuestion:original,normalizedQuestion:"What can I understand or do to improve my approach to this uncertain outcome?",reframeReason:"prediction"};
  if (/\b(secret|fate|foretell|predict|diagnos|guarantee|decide for)\b/i.test(question)) fail("UNSAFE_UNRESOLVED_REQUEST","request.originalQuestion","Unsafe request could not be normalized");
  return {originalQuestion:original,normalizedQuestion:question,reframeReason:null};
}

function canonicalRequest(indexes, request) {
  const normalizedInput=normalizeExternal(request);
  validateRequest(indexes,normalizedInput);
  request=normalizedInput;
  const question=normalizeQuestion(request.originalQuestion);
  return {
    spreadId:request.spreadId,
    cards:request.cards.map(item => ({positionId:item.positionId,cardId:item.cardId,orientation:item.orientation})),
    originalQuestion:question.originalQuestion,
    normalizedQuestion:question.normalizedQuestion,
    reframeReason:question.reframeReason,
    topicLens:request.topicLens === undefined ? "general" : request.topicLens,
    tradition:request.tradition === undefined ? "rws" : request.tradition,
    reversalPolicy:request.reversalPolicy === undefined ? "energy_state" : request.reversalPolicy,
    elementalDignity:request.elementalDignity === undefined ? "disabled" : request.elementalDignity,
    narratorId:request.narratorId === undefined ? "clear-reflective-v1" : request.narratorId
  };
}

function intersect(left,right) {
  const output=[];
  for (let i=0;i<left.length;i++) if (right.indexOf(left[i]) >= 0 && output.indexOf(left[i]) < 0) output.push(left[i]);
  return output.sort();
}

function primaryEvidenceId(instance) {
  for (let i=0;i<instance.baseClaims.length;i++) if (instance.baseClaims[i].lens === "traditional-core") return instance.baseClaims[i].id;
  if (instance.baseClaims.length) return instance.baseClaims[0].id;
  if (instance.positionClaims.length) return instance.positionClaims[0].id;
  fail("INVALID_REFERENCE","analysis.evidence","No eligible evidence claim");
}

function claimById(card,claimId) {
  for (let i=0;i<card.claims.length;i++) if (card.claims[i].id === claimId) return card.claims[i];
  return null;
}

function eligibleClaim(claim,request) {
  const traditionAllowed=claim.tradition === request.tradition || claim.tradition === "arcana" || claim.tradition === "golden-dawn-structural";
  const lensAllowed=claim.topicLenses.indexOf("general") >= 0 || claim.topicLenses.indexOf(request.topicLens) >= 0;
  return traditionAllowed && lensAllowed && claim.provenanceKind !== "source-quotation" && claim.provenanceKind !== "agent-assisted";
}

function baseInstances(indexes,spread,request) {
  const output=[];
  for (let i=0;i<request.cards.length;i++) {
    const selection=request.cards[i];
    const card=indexes.cards[selection.cardId];
    const positionClaimIds=card.positionClaims[selection.positionId];
    const positionClaims=[];
    for (let j=0;j<positionClaimIds.length;j++) {
      const positioned=claimById(card,positionClaimIds[j]);
      if (positioned && eligibleClaim(positioned,request)) positionClaims.push(positioned);
    }
    positionClaims.sort((left,right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
    const baseClaims=[];
    for (let j=0;j<card.claims.length;j++) {
      const baseClaim=card.claims[j];
      if (eligibleClaim(baseClaim,request) && (baseClaim.orientation === "upright" || baseClaim.orientation === "both") && baseClaim.lens.indexOf("position-") !== 0 && baseClaim.lens !== "reversal") baseClaims.push(baseClaim);
    }
    baseClaims.sort((left,right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
    const candidates=[];
    const modeIds=Object.keys(card.reversalModes).sort();
    for (let j=0;j<modeIds.length;j++) {
      const refs=card.reversalModes[modeIds[j]];
      for (let k=0;k<refs.length;k++) {
        const candidateClaim=claimById(card,refs[k]);
        if (candidateClaim && eligibleClaim(candidateClaim,request)) candidates.push({modeId:modeIds[j],claim:candidateClaim});
      }
    }
    output.push({positionId:spread.positions[i].id,cardId:card.id,orientation:selection.orientation,card,baseThemes:card.coreThemes.slice().sort(),baseClaims,positionClaims,candidates});
  }
  return output;
}

function relationEvidence(left,right) {
  const sharedThemes=intersect(left.baseThemes,right.baseThemes);
  const sameRank=left.card.rank === right.card.rank;
  const sameNumber=left.card.number === right.card.number;
  return {sharedThemes,sameRank,sameNumber,supported:sharedThemes.length > 0 || sameRank || sameNumber};
}

function buildInteractions(spread,instances,useEffectiveThemes) {
  const accepted=[];
  const rejected=[];
  const positiveRelations=["reinforces","continues","returns","matures"];
  const directionalRelations=["contrasts","qualifies","corrects","transforms","releases","reverses","departs"];
  for (let i=0;i<spread.edges.length;i++) {
    const edge=spread.edges[i];
    const edgeId=edge.from+":"+edge.to;
    const left=instances.find(item => item.positionId === edge.from);
    const right=instances.find(item => item.positionId === edge.to);
    if (!left || !right) {
      for (let j=0;j<edge.allowedRelations.length;j++) rejected.push({edge:edgeId,candidateRelation:edge.allowedRelations[j],reason:"missing-endpoint"});
      continue;
    }
    const leftThemes=useEffectiveThemes && left.effectiveThemes ? left.effectiveThemes : left.baseThemes;
    const rightThemes=useEffectiveThemes && right.effectiveThemes ? right.effectiveThemes : right.baseThemes;
    const support=relationEvidence(Object.assign({},left,{baseThemes:leftThemes}),Object.assign({},right,{baseThemes:rightThemes}));
    const facts=[];
    for (let j=0;j<support.sharedThemes.length;j++) facts.push("theme:"+support.sharedThemes[j]);
    if (support.sameRank) facts.push("rank:"+left.card.rank);
    if (support.sameNumber) facts.push("number:"+left.card.number);
    let edgeAccepted=false;
    for (let j=0;j<edge.allowedRelations.length;j++) {
      const relation=edge.allowedRelations[j];
      let reason=null;
      let eligible=false;
      if (positiveRelations.indexOf(relation) >= 0) {
        eligible=support.supported;
        if (!eligible) reason="no-shared-evidence";
      } else if (directionalRelations.indexOf(relation) >= 0) {
        reason=support.supported ? "missing-directional-rule" : "no-shared-evidence";
      } else if (relation === "sequence") {
        eligible=Math.abs(left.card.number-right.card.number) === 1;
        if (!eligible) reason="not-an-authored-sequence";
      } else if (relation === "figure_direction") reason="missing-figure-direction";
      else if (relation === "elemental_dignity") reason="no-dignity-rule";
      else if (relation === "cause_effect") reason="causality-disabled";
      else reason="unsupported-relation";
      if (eligible && !edgeAccepted) {
        accepted.push({id:"relation:"+edge.from+":"+edge.to+":"+relation,from:edge.from,to:edge.to,type:relation,evidence:[primaryEvidenceId(left),primaryEvidenceId(right)].sort(),facts:facts.sort()});
        edgeAccepted=true;
      } else rejected.push({edge:edgeId,candidateRelation:relation,reason:eligible ? "lower-priority-supported" : reason});
    }
  }
  return {accepted,rejected};
}

function stableHash(values) {
  let hash=2166136261 >>> 0;
  const source=values.join("|");
  for (let i=0;i<source.length;i++) {
    hash ^= source.charCodeAt(i);
    hash=Math.imul(hash,16777619);
  }
  return ("00000000"+(hash >>> 0).toString(16)).slice(-8);
}

function idToken(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9.-]+/g,"-").replace(/^-+|-+$/g,"");
}

function patternRecord(patternId,type,value,matches) {
  const evidence=matches.map(item => primaryEvidenceId(item)).sort();
  return {id:patternId,type,value:String(value),evidence,evidenceGroupId:"evidence-set:"+stableHash(evidence)};
}

function collectPatterns(instances,useEffectiveThemes) {
  const dimensions={theme:Object.create(null),suit:Object.create(null),element:Object.create(null),rank:Object.create(null),number:Object.create(null)};
  function add(dimension,value,item) {
    if (value === null || value === undefined || value === "") return;
    const key=String(value);
    if (!dimensions[dimension][key]) dimensions[dimension][key]=[];
    dimensions[dimension][key].push(item);
  }
  let majors=0,courts=0,reversed=0;
  for (let i=0;i<instances.length;i++) {
    const item=instances[i], card=item.card;
    const itemThemes=useEffectiveThemes && item.effectiveThemes ? item.effectiveThemes : item.baseThemes;
    for (let j=0;j<itemThemes.length;j++) add("theme",itemThemes[j],item);
    add("suit",card.suit,item); add("element",card.element,item); add("rank",card.rank,item); add("number",card.number,item);
    if (card.arcana === "major") majors++;
    if (card.arcana === "minor" && ["page","knight","queen","king"].indexOf(card.rank) >= 0) courts++;
    if (item.orientation === "reversed") reversed++;
  }
  const patterns=[];
  for (const dimension of ["theme","suit","element","rank","number"]) {
    const values=Object.keys(dimensions[dimension]).sort();
    for (let i=0;i<values.length;i++) {
      const matches=dimensions[dimension][values[i]];
      if (matches.length < 2) continue;
      patterns.push(patternRecord("pattern:"+dimension+":"+idToken(values[i]),dimension+"-recurrence",values[i],matches));
    }
  }
  if (instances.length > 1) patterns.push(patternRecord("pattern:arcana-balance","arcana-balance","major-"+majors+"-minor-"+(instances.length-majors),instances));
  if (majors >= 2) patterns.push(patternRecord("pattern:major-density","major-density",majors,instances.filter(item => item.card.arcana === "major")));
  if (courts >= 2) patterns.push(patternRecord("pattern:court-density","court-density",courts,instances.filter(item => item.card.arcana === "minor" && ["page","knight","queen","king"].indexOf(item.card.rank) >= 0)));
  if (reversed >= 2) patterns.push(patternRecord("pattern:orientation:reversed","orientation-concentration",reversed,instances.filter(item => item.orientation === "reversed")));
  return patterns.sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).slice(0,8);
}

function candidateScore(candidate,instance,provisionalInteractions,basePatterns) {
  const positionThemes=[];
  for (let i=0;i<instance.positionClaims.length;i++) for (let j=0;j<instance.positionClaims[i].themes.length;j++) positionThemes.push(instance.positionClaims[i].themes[j]);
  const positionFit=intersect(candidate.claim.themes,positionThemes).length > 0 ? 1 : 0;
  let adjacentFit=0;
  for (let i=0;i<provisionalInteractions.length;i++) {
    const relation=provisionalInteractions[i];
    if (relation.from !== instance.positionId && relation.to !== instance.positionId) continue;
    for (let j=0;j<relation.facts.length;j++) if (relation.facts[j].indexOf("theme:") === 0 && candidate.claim.themes.indexOf(relation.facts[j].slice(6)) >= 0) adjacentFit=1;
  }
  let patternFit=0;
  for (let i=0;i<basePatterns.length;i++) if (basePatterns[i].type === "theme-recurrence" && candidate.claim.themes.indexOf(basePatterns[i].value) >= 0) patternFit=1;
  return {direct:1,positionFit,adjacentFit,patternFit,claimId:candidate.claim.id};
}

function compareCandidates(left,right) {
  for (const key of ["direct","positionFit","adjacentFit","patternFit"]) if (left.score[key] !== right.score[key]) return right.score[key]-left.score[key];
  return left.score.claimId < right.score.claimId ? -1 : left.score.claimId > right.score.claimId ? 1 : 0;
}

function resolveHypotheses(request,spread,instances,provisionalInteractions,basePatterns) {
  const ambiguities=[];
  for (let i=0;i<instances.length;i++) {
    const item=instances[i];
    item.selectedHypotheses=[];
    item.selectedReversalClaims=[];
    item.scoredCandidates=[];
    item.reversalSafetyRejections=[];
    if (item.orientation === "upright" || request.reversalPolicy === "none") continue;
    for (let j=0;j<item.candidates.length;j++) {
      if (request.reversalPolicy !== "traditional" && item.candidates[j].modeId === "traditional_reversed") continue;
      if (request.reversalPolicy === "traditional" && item.candidates[j].modeId !== "traditional_reversed") continue;
      const safetyReason=semanticSafetyReason(item.candidates[j].claim.text);
      if (safetyReason) item.reversalSafetyRejections.push({modeId:item.candidates[j].modeId,claimId:item.candidates[j].claim.id,reason:safetyReason});
      else item.scoredCandidates.push(Object.assign({},item.candidates[j],{score:candidateScore(item.candidates[j],item,provisionalInteractions,basePatterns)}));
    }
    item.scoredCandidates.sort(compareCandidates);
    const uniqueCandidates=[];
    const seenModes=Object.create(null);
    const seenMeanings=Object.create(null);
    for (let j=0;j<item.scoredCandidates.length;j++) if (!seenModes[item.scoredCandidates[j].modeId] && !seenMeanings[item.scoredCandidates[j].claim.text]) {
      seenModes[item.scoredCandidates[j].modeId]=true;
      seenMeanings[item.scoredCandidates[j].claim.text]=true;
      uniqueCandidates.push(item.scoredCandidates[j]);
    }
    item.scoredCandidates=uniqueCandidates;
    const selectedCandidates=[];
    if (item.scoredCandidates.length) selectedCandidates.push(item.scoredCandidates[0]);
    if (request.reversalPolicy === "multi_hypothesis" && selectedCandidates.length) {
      const firstFamily=REVERSAL_FAMILY[selectedCandidates[0].modeId];
      const distinct=item.scoredCandidates.find((candidate,index) => index > 0 && REVERSAL_FAMILY[candidate.modeId] !== firstFamily && (candidate.score.positionFit || candidate.score.adjacentFit || candidate.score.patternFit));
      if (distinct) selectedCandidates.push(distinct);
    }
    if (!selectedCandidates.length) fail(item.reversalSafetyRejections.length ? "UNSAFE_UNRESOLVED_REQUEST" : "UNSUPPORTED_REVERSAL_MODE","request.cards["+i+"]","No eligible reversal hypothesis");
    for (let j=0;j<selectedCandidates.length;j++) {
      item.selectedHypotheses.push(selectedCandidates[j].modeId);
      item.selectedReversalClaims.push(selectedCandidates[j].claim);
    }
    if (selectedCandidates.length === 2) {
      const firstFamily=REVERSAL_FAMILY[item.selectedHypotheses[0]], secondFamily=REVERSAL_FAMILY[item.selectedHypotheses[1]];
      ambiguities.push({cardId:item.cardId,positionId:item.positionId,axis:firstFamily+"-or-"+secondFamily,distinguishingQuestion:"Which is more observable now: a change in "+firstFamily+", or a change in "+secondFamily+"?"});
    }
    const effective=item.baseThemes.slice();
    for (let j=0;j<item.selectedReversalClaims.length;j++) for (let k=0;k<item.selectedReversalClaims[j].themes.length;k++) if (effective.indexOf(item.selectedReversalClaims[j].themes[k]) < 0) effective.push(item.selectedReversalClaims[j].themes[k]);
    item.effectiveThemes=effective.sort();
  }
  if (ambiguities.length > 1) {
    ambiguities.sort((left,right) => {
      const leftRank=spread.centrality.indexOf(left.positionId);
      const rightRank=spread.centrality.indexOf(right.positionId);
      if (leftRank !== rightRank) return leftRank-rightRank;
      return left.cardId < right.cardId ? -1 : left.cardId > right.cardId ? 1 : 0;
    });
    const winner=ambiguities[0];
    for (let i=0;i<instances.length;i++) if (instances[i].cardId !== winner.cardId && instances[i].selectedHypotheses.length === 2) {
      instances[i].selectedHypotheses=instances[i].selectedHypotheses.slice(0,1);
      instances[i].selectedReversalClaims=instances[i].selectedReversalClaims.slice(0,1);
      const effective=instances[i].baseThemes.slice();
      const selected=instances[i].selectedReversalClaims[0];
      for (let j=0;selected && j<selected.themes.length;j++) if (effective.indexOf(selected.themes[j]) < 0) effective.push(selected.themes[j]);
      instances[i].effectiveThemes=effective.sort();
    }
    return [winner];
  }
  return ambiguities;
}

function analyzeValidated(indexes,request) {
  const normalized=canonicalRequest(indexes,request);
  const spread=indexes.spreads[normalized.spreadId];
  const instances=baseInstances(indexes,spread,normalized);
  const provisionalResult=buildInteractions(spread,instances,false);
  const basePatterns=collectPatterns(instances,false);
  const ambiguities=resolveHypotheses(normalized,spread,instances,provisionalResult.accepted,basePatterns);
  for (let i=0;i<instances.length;i++) if (!instances[i].effectiveThemes) instances[i].effectiveThemes=instances[i].baseThemes.slice();
  const interactionResult=buildInteractions(spread,instances,true);
  const interactions=interactionResult.accepted;
  const patterns=collectPatterns(instances,true);
  const cards=instances.map(item => ({positionId:item.positionId,cardId:item.cardId,orientation:item.orientation,selectedHypotheses:item.selectedHypotheses.slice(),selectedHypothesisClaims:item.selectedHypotheses.map((modeId,index) => ({modeId,claimId:item.selectedReversalClaims[index].id})),activatedClaimIds:item.baseClaims.map(claim => claim.id).concat(item.positionClaims.map(claim => claim.id),item.selectedReversalClaims.map(claim => claim.id)).sort()}));
  const trace={provisionalInteractionIds:provisionalResult.accepted.map(item => item.id),basePatternIds:basePatterns.map(item => item.id),relationshipRejections:interactionResult.rejected,reversalCandidates:instances.map(item => ({cardId:item.cardId,candidates:item.scoredCandidates.map(candidate => ({modeId:candidate.modeId,claimId:candidate.claim.id,score:candidate.score})),safetyRejections:(item.reversalSafetyRejections || []).slice(),selected:item.selectedHypotheses.slice()}))};
  return {methodVersion:METHOD_VERSION,request:normalized,cards,interactions,patterns,ambiguities,distinguishingQuestions:ambiguities.map(item => item.distinguishingQuestion),trace};
}

function analyze(catalog,spreadCatalog,request) {
  return analyzeValidated(validateCatalog(catalog,spreadCatalog),request);
}

function createMatrixTestHooks(catalog,spreadCatalog) {
  const indexes=validateCatalog(catalog,spreadCatalog);
  const spread=indexes.spreads["context-friction-doorway"];
  function matrixInstance(cardId,positionId,modeId) {
    const card=indexes.cards[cardId];
    if (!card) fail("UNKNOWN_CARD","matrix.cardId","Unknown matrix card");
    const baseClaims=card.claims.filter(claim => (claim.orientation === "upright" || claim.orientation === "both") && claim.lens.indexOf("position-") !== 0 && claim.lens !== "reversal" && eligibleClaim(claim,{tradition:"rws",topicLens:"general"}));
    const instance={positionId,cardId,card,baseThemes:card.coreThemes.slice().sort(),baseClaims,positionClaims:[]};
    if (modeId !== null && modeId !== undefined) {
      if (!card.reversalModes[modeId]) fail("UNSUPPORTED_REVERSAL_MODE","matrix.modeId","Card does not permit matrix hypothesis");
      const effective=instance.baseThemes.slice();
      for (const claimId of card.reversalModes[modeId]) {
        const claim=claimById(card,claimId);
        if (!claim || semanticSafetyReason(claim.text)) fail("UNSAFE_UNRESOLVED_REQUEST","matrix.modeId","Unsafe matrix hypothesis");
        for (const theme of claim.themes) if (effective.indexOf(theme) < 0) effective.push(theme);
      }
      instance.effectiveThemes=effective.sort();
    } else instance.effectiveThemes=instance.baseThemes.slice();
    return instance;
  }
  return Object.freeze({interactionPair:function(from,to,leftCardId,rightCardId,leftModeId,rightModeId) {
    const edge=spread.edges.find(item => item.from === from && item.to === to);
    if (!edge) fail("INVALID_REFERENCE","matrix.edge","Unknown spread edge");
    if (leftCardId === rightCardId) fail("DUPLICATE_SELECTION","matrix.cards","Matrix pair must contain distinct cards");
    const result=buildInteractions({edges:[edge]},[matrixInstance(leftCardId,from,leftModeId),matrixInstance(rightCardId,to,rightModeId)],true);
    return {edge:{from:edge.from,to:edge.to,allowedRelations:edge.allowedRelations.slice()},accepted:result.accepted.map(item => ({id:item.id,from:item.from,to:item.to,type:item.type,evidence:item.evidence.slice(),facts:item.facts.slice()})),rejected:result.rejected.map(item => Object.assign({},item))};
  }});
}

function semanticSafetyReason(value) {
  const source=String(value || "").toLowerCase();
  if (/\b(guaranteed|guarantees|definitely|certainly|inevitable|tomorrow|next week|will)\b/.test(source)) return "guaranteed-outcome";
  if (/\b(diagnos(?:e|es|ed|ing|is)|disorder|disease)\b/.test(source)) return "diagnosis";
  if (hasInaccessibleMentalState(value)) return "third-party-mental-state";
  if (/\b(as (?:my|your|a|an|the) (?:therapist|doctor|physician|lawyer|attorney|financial advis(?:er|or))|i(?: am|'m) (?:your|a|an) (?:therapist|doctor|physician|lawyer|attorney|financial advis(?:er|or))|(?:therapist|doctor|physician|lawyer|attorney|financial advis(?:er|or)) (?:says|knows|orders|requires|advises)|prescribe|professional (?:medical|legal|financial) advice)\b/.test(source)) return "professional-authority";
  if (/\b(the cards|tarot)\s+(decide|decides|command|commands|require|requires)\b/.test(source)) return "decision-transfer";
  if (/\b(woman|man|male|female|mother|father|husband|wife|elderly|young person)\b/.test(source)) return "demographic-essentialism";
  return null;
}

function positionCandidate(indexes,analysisCard,request) {
  const card=indexes.cards[analysisCard.cardId];
  const positionRefs=card.positionClaims[analysisCard.positionId].slice().sort();
  let positionClaim=null;
  for (let i=0;i<positionRefs.length;i++) {
    const candidate=claimById(card,positionRefs[i]);
    if (candidate && eligibleClaim(candidate,request)) { positionClaim=candidate; break; }
  }
  if (!positionClaim) return {id:"proposition:position:"+analysisCard.positionId,kind:"position",rhetoricalRole:analysisCard.positionId === "friction" || analysisCard.positionId === "single" ? "governing" : analysisCard.positionId === "doorway" ? "development" : "support",ambiguityAxis:null,conflicts:[],positionId:analysisCard.positionId,eligible:false,rejectionReason:"missing-position-claim",claim:"",evidence:[],counterEvidence:[],coverage:[analysisCard.positionId],salience:[0,0,0,0,"proposition:position:"+analysisCard.positionId]};
  const evidence=[positionClaim.id];
  const coreClaims=card.claims.filter(claim => analysisCard.activatedClaimIds.indexOf(claim.id) >= 0 && (claim.lens === "traditional-core" || claim.lens === "omarchy") && !semanticSafetyReason(claim.text)).sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  for (let i=0;i<coreClaims.length;i++) if (evidence.indexOf(coreClaims[i].id) < 0) evidence.push(coreClaims[i].id);
  if (analysisCard.selectedHypothesisClaims.length) {
    const selectedClaimId=analysisCard.selectedHypothesisClaims[0].claimId;
    if (evidence.indexOf(selectedClaimId) < 0) evidence.push(selectedClaimId);
  }
  const rejectionReason=semanticSafetyReason(positionClaim.text);
  return {id:"proposition:position:"+analysisCard.positionId,kind:"position",rhetoricalRole:analysisCard.positionId === "friction" || analysisCard.positionId === "single" ? "governing" : analysisCard.positionId === "doorway" ? "development" : "support",ambiguityAxis:null,conflicts:[],positionId:analysisCard.positionId,eligible:!rejectionReason,rejectionReason,claim:positionClaim.text,evidence:evidence.slice(0,8),counterEvidence:[],coverage:[analysisCard.positionId],salience:[1,1,0,0,"proposition:position:"+analysisCard.positionId],cardId:card.id,coreClaim:coreClaims.find(claim => claim.lens === "traditional-core") || null,omarchyClaim:coreClaims.find(claim => claim.lens === "omarchy") || null};
}

function interactionCandidate(interaction) {
  const verbs={reinforces:"reinforce one another",continues:"carry one concern forward",returns:"return to a shared concern",matures:"develop a shared concern",sequence:"form an ordered sequence"};
  const detail=interaction.facts.length ? " through "+interaction.facts.map(value => value.replace(":"," ")).join(", ") : "";
  const tensionRelations=["contrasts","qualifies","corrects","reverses","departs"];
  let claim="The "+interaction.from+" and "+interaction.to+" positions "+(verbs[interaction.type] || interaction.type)+detail+".";
  if (tensionRelations.indexOf(interaction.type) < 0) claim+=" Treat that link as connected support rather than independent confirmation.";
  const rejectionReason=semanticSafetyReason(claim);
  return {id:"proposition:"+interaction.id,kind:"interaction",rhetoricalRole:"tension",ambiguityAxis:null,conflicts:[],eligible:!rejectionReason,rejectionReason,claim,evidence:interaction.evidence.slice(),counterEvidence:[],coverage:[interaction.from,interaction.to],salience:[2,interaction.evidence.length,0,0,"proposition:"+interaction.id],interactionId:interaction.id};
}

function patternCandidate(pattern) {
  let claim;
  if (pattern.type === "theme-recurrence") claim="The repeated theme of "+pattern.value+" links more than one position in the spread; treat the overlap as one connected signal rather than repeated confirmation.";
  else if (pattern.type === "arcana-balance") claim="The "+pattern.value.replace(/-/g," ")+" balance qualifies the scale of the reading rather than deciding its outcome.";
  else claim="The repeated "+pattern.type.replace(/-/g," ")+" of "+pattern.value+" is one connected spread-level signal rather than repeated confirmation.";
  const rejectionReason=semanticSafetyReason(claim);
  return {id:"proposition:"+pattern.id,kind:"pattern",rhetoricalRole:"tension",ambiguityAxis:null,conflicts:[],eligible:!rejectionReason,rejectionReason,claim,evidence:pattern.evidence.slice(),counterEvidence:[],coverage:[],salience:[pattern.type === "theme-recurrence" ? 1 : 0,pattern.evidence.length,0,0,"proposition:"+pattern.id],patternId:pattern.id};
}

function reflectionCandidate(indexes,analysis) {
  const analysisCard=analysis.cards[analysis.cards.length-1];
  const card=indexes.cards[analysisCard.cardId];
  const promptId=card.reflectionPromptIds.slice().sort()[0];
  const prompt=card.reflectionPrompts.find(item => item.id === promptId);
  const positionRef=card.positionClaims[analysisCard.positionId].slice().sort()[0];
  const rejectionReason=prompt ? semanticSafetyReason(prompt.text) : "missing-reflection-prompt";
  return {id:"proposition:reflection",kind:"reflection",rhetoricalRole:"reflection",ambiguityAxis:null,conflicts:[],eligible:!!prompt && !rejectionReason,rejectionReason,claim:prompt ? prompt.text : "",evidence:positionRef ? [positionRef] : [],counterEvidence:[],coverage:[],salience:[0,0,0,0,"proposition:reflection"],cardId:card.id,promptId};
}

function generateCandidates(indexes,analysis) {
  const candidates=[];
  for (let i=0;i<analysis.cards.length;i++) candidates.push(positionCandidate(indexes,analysis.cards[i],analysis.request));
  for (let i=0;i<analysis.interactions.length;i++) candidates.push(interactionCandidate(analysis.interactions[i]));
  for (let i=0;i<analysis.patterns.length;i++) candidates.push(patternCandidate(analysis.patterns[i]));
  candidates.push(reflectionCandidate(indexes,analysis));
  for (let i=0;i<analysis.ambiguities.length;i++) {
    const ambiguity=analysis.ambiguities[i];
    const analysisCard=analysis.cards.find(item => item.cardId === ambiguity.cardId);
    const selected=analysisCard.selectedHypothesisClaims[1];
    const claim=selected ? claimById(indexes.cards[analysisCard.cardId],selected.claimId) : null;
    const id="proposition:hypothesis:"+analysisCard.positionId+":"+(selected ? selected.modeId : "missing");
    const primaryId="proposition:position:"+analysisCard.positionId;
    const rejectionReason=claim ? semanticSafetyReason(claim.text) : "missing-hypothesis-claim";
    candidates.push({id,kind:"hypothesis",rhetoricalRole:"alternative",ambiguityAxis:ambiguity.axis,conflicts:[primaryId],eligible:!!claim && !rejectionReason,rejectionReason,claim:claim ? claim.text : "",evidence:claim ? [claim.id] : [],counterEvidence:[],coverage:[analysisCard.positionId],salience:[0,0,0,0,id],cardId:analysisCard.cardId,modeId:selected ? selected.modeId : null});
    const primary=candidates.find(item => item.id === primaryId);
    if (primary) primary.conflicts.push(id);
  }
  return candidates.sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function comparePropositions(left,right) {
  for (let i=0;i<4;i++) if (left.salience[i] !== right.salience[i]) return right.salience[i]-left.salience[i];
  return left.salience[4] < right.salience[4] ? -1 : left.salience[4] > right.salience[4] ? 1 : 0;
}

function selectedReversalClaim(indexes,analysisCard,index) {
  const selected=analysisCard.selectedHypothesisClaims[index];
  return selected ? claimById(indexes.cards[analysisCard.cardId],selected.claimId) : null;
}

function boundExpandedSupport(selected,rhetoricalTree) {
  const byId=Object.create(null);
  for (const proposition of selected) byId[proposition.id]=proposition;
  let length=0;
  for (const node of rhetoricalTree) {
    const proposition=byId[node.propositionId];
    if (!proposition || node.role === "reflection" || node.role === "alternative") continue;
    if (length) length++;
    length+=rhetoricalPrefix(node.role).length+proposition.claim.length;
  }
  if (length > 1200) fail("NO_COVERAGE_PLAN","plan.density","Required reading synthesis exceeds output-density bound");
  for (const node of rhetoricalTree) {
    const proposition=byId[node.propositionId];
    if (!proposition || proposition.kind !== "position") continue;
    for (const key of ["coreClaim","omarchyClaim"]) {
      const support=proposition[key];
      if (!support) continue;
      if (length+support.text.length+1 <= 1200) length+=support.text.length+1;
      else proposition[key]=null;
    }
  }
}

function planInterpretationValidated(indexes,request) {
  const analysis=analyzeValidated(indexes,request);
  const spread=indexes.spreads[analysis.request.spreadId];
  const candidates=generateCandidates(indexes,analysis);
  const selected=[];
  for (let i=0;i<spread.positions.length;i++) {
    const candidate=candidates.find(item => item.kind === "position" && item.positionId === spread.positions[i].id && item.eligible);
    if (!candidate) fail("NO_COVERAGE_PLAN","planner.positions."+spread.positions[i].id,"No safe proposition covers required position");
    selected.push(candidate);
  }
  if (spread.cardCount > 1) {
    const connections=candidates.filter(item => item.eligible && (item.kind === "interaction" || item.kind === "pattern")).sort(comparePropositions);
    const connection=connections.find(item => !item.conflicts.some(conflictId => selected.some(selectedItem => selectedItem.id === conflictId)));
    if (!connection) fail("NO_COVERAGE_PLAN","planner.connection","No safe non-conflicting spread-level connection");
    selected.push(connection);
  }
  for (let i=0;i<selected.length;i++) for (let j=i+1;j<selected.length;j++) if (selected[i].conflicts.indexOf(selected[j].id) >= 0 || selected[j].conflicts.indexOf(selected[i].id) >= 0) fail("NO_COVERAGE_PLAN","planner.conflicts","Selected propositions conflict");
  const reflection=candidates.find(item => item.kind === "reflection" && item.eligible);
  if (!reflection) fail("NO_COVERAGE_PLAN","planner.reflection","No safe reflection proposition");
  selected.push(reflection);
  const rhetoricalTree=[];
  function addRole(role,positionId) {
    const candidate=selected.find(item => item.positionId === positionId);
    if (candidate) rhetoricalTree.push({role,propositionId:candidate.id});
  }
  if (spread.cardCount === 1) addRole("governing",spread.positions[0].id);
  else {
    addRole("governing","friction");
    addRole("support","context");
    const connection=selected.find(item => item.kind === "interaction" || item.kind === "pattern");
    if (connection) rhetoricalTree.push({role:connection.rhetoricalRole,propositionId:connection.id});
    addRole("development","doorway");
  }
  rhetoricalTree.push({role:"reflection",propositionId:reflection.id});
  boundExpandedSupport(selected,rhetoricalTree);
  let alternative=null;
  if (analysis.ambiguities.length === 1) {
    const ambiguity=analysis.ambiguities[0];
    const analysisCard=analysis.cards.find(item => item.cardId === ambiguity.cardId);
    const first=selectedReversalClaim(indexes,analysisCard,0);
    const second=selectedReversalClaim(indexes,analysisCard,1);
    const traceCard=analysis.trace.reversalCandidates.find(item => item.cardId === ambiguity.cardId);
    const secondTrace=traceCard && traceCard.candidates.find(item => item.modeId === analysisCard.selectedHypotheses[1]);
    const materiallySupported=first && second && REVERSAL_FAMILY[analysisCard.selectedHypotheses[0]] !== REVERSAL_FAMILY[analysisCard.selectedHypotheses[1]] && secondTrace && (secondTrace.score.positionFit || secondTrace.score.adjacentFit || secondTrace.score.patternFit);
    const hypothesisCandidate=candidates.find(item => item.kind === "hypothesis" && item.cardId === ambiguity.cardId && item.modeId === analysisCard.selectedHypotheses[1]);
    if (materiallySupported && hypothesisCandidate && hypothesisCandidate.eligible) {
      const position=selected.find(item => item.cardId === ambiguity.cardId);
      alternative={id:"proposition:alternative",status:"alternative",claim:hypothesisCandidate.claim,evidence:hypothesisCandidate.evidence.concat(position ? position.evidence.filter(value => value !== first.id && value !== second.id).slice(0,2) : []),counterEvidence:first ? [{evidenceId:first.id,reason:"supports-competing-hypothesis",targetPropositionId:"proposition:alternative"}] : [],ambiguityAxis:ambiguity.axis,distinguishingQuestion:ambiguity.distinguishingQuestion};
    }
  }
  const primaryEvidence=[];
  for (let i=0;i<selected.length;i++) for (let j=0;j<selected[i].evidence.length;j++) if (primaryEvidence.indexOf(selected[i].evidence[j]) < 0) primaryEvidence.push(selected[i].evidence[j]);
  const primaryCounter=alternative ? [{evidenceId:alternative.evidence[0],reason:"supports-competing-hypothesis",targetPropositionId:"proposition:primary"}] : [];
  const rejected=candidates.filter(item => !item.eligible).map(item => ({propositionId:item.id,reason:item.rejectionReason}));
  const plan={indexes,analysis,candidates,selectedPropositions:selected,rhetoricalTree,primary:{id:"proposition:primary",status:"primary",evidence:primaryEvidence.slice(0,24),counterEvidence:primaryCounter,ambiguityAxis:null},alternative,rejected};
  assertSemanticPlan(plan);
  return plan;
}

function planInterpretation(catalog,spreadCatalog,request) {
  return planInterpretationValidated(validateCatalog(catalog,spreadCatalog),request);
}

function assertSemanticPlan(plan) {
  object(plan,"plan");
  const selectedIndex=Object.create(null);
  for (let i=0;i<plan.selectedPropositions.length;i++) {
    const proposition=plan.selectedPropositions[i];
    if (selectedIndex[proposition.id]) fail("INVALID_SCHEMA","plan.selectedPropositions["+i+"]","Duplicate selected proposition");
    selectedIndex[proposition.id]=proposition;
    if (!proposition.eligible || semanticSafetyReason(proposition.claim)) fail("UNSAFE_UNRESOLVED_REQUEST","plan.selectedPropositions["+i+"]","Unsafe selected proposition");
    if (!proposition.evidence.length) fail("INVALID_REFERENCE","plan.selectedPropositions["+i+"].evidence","Selected proposition lacks evidence");
  }
  for (let i=0;i<plan.selectedPropositions.length;i++) for (let j=0;j<plan.selectedPropositions[i].conflicts.length;j++) if (selectedIndex[plan.selectedPropositions[i].conflicts[j]]) fail("NO_COVERAGE_PLAN","plan.conflicts","Conflicting propositions selected");
  let governing=0,reflection=0,estimatedPrimaryLength=0,estimatedExpandedLength=0;
  const rhetoricalRoles=Object.create(null);
  for (let i=0;i<plan.rhetoricalTree.length;i++) {
    const node=plan.rhetoricalTree[i], proposition=selectedIndex[node.propositionId];
    if (!proposition) fail("INVALID_REFERENCE","plan.rhetoricalTree["+i+"].propositionId","Unknown rhetorical proposition");
    if (rhetoricalRoles[node.role]) fail("NO_COVERAGE_PLAN","plan.rhetoricalTree["+i+"].role","Repeated rhetorical role");
    rhetoricalRoles[node.role]=true;
    if (node.role === "governing") governing++;
    if (node.role === "reflection") reflection++;
    if (node.role !== "reflection" && node.role !== "alternative") {
      const baseLength=rhetoricalPrefix(node.role).length+proposition.claim.length;
      if (estimatedPrimaryLength) estimatedPrimaryLength++;
      if (estimatedExpandedLength) estimatedExpandedLength++;
      estimatedPrimaryLength+=baseLength;
      estimatedExpandedLength+=baseLength;
      if (proposition.kind === "position") {
        if (proposition.coreClaim) estimatedExpandedLength+=proposition.coreClaim.text.length+1;
        if (proposition.omarchyClaim) estimatedExpandedLength+=proposition.omarchyClaim.text.length+1;
      }
    }
  }
  if (governing !== 1 || reflection !== 1) fail("NO_COVERAGE_PLAN","plan.rhetoricalTree","Plan requires one governing and one reflection node");
  if (estimatedPrimaryLength > 1200 || estimatedExpandedLength > 1200) fail("NO_COVERAGE_PLAN","plan.density","Reading synthesis exceeds output-density bound");
  if (plan.alternative) {
    if (!plan.alternative.ambiguityAxis || !plan.alternative.distinguishingQuestion || !plan.alternative.evidence.length || semanticSafetyReason(plan.alternative.claim)) fail("UNSAFE_UNRESOLVED_REQUEST","plan.alternative","Alternative is incomplete or unsafe");
  }
  return true;
}

function rhetoricalPrefix(role) {
  if (role === "support") return "In support, ";
  if (role === "tension") return "Across the spread, ";
  if (role === "development") return "As a doorway, ";
  return "";
}

function lowerInitial(value) {
  const source=String(value || "");
  return source ? source.charAt(0).toLowerCase()+source.slice(1) : source;
}

function renderPlan(plan,projection) {
  if (projection !== "concise" && projection !== "expanded") fail("INVALID_SCHEMA","renderer.projection","Unknown projection");
  assertSemanticPlan(plan);
  const byId=Object.create(null);
  for (let i=0;i<plan.selectedPropositions.length;i++) byId[plan.selectedPropositions[i].id]=plan.selectedPropositions[i];
  const utterances=[];
  for (let i=0;i<plan.rhetoricalTree.length;i++) {
    const node=plan.rhetoricalTree[i], proposition=byId[node.propositionId];
    if (!proposition) fail("INVALID_REFERENCE","plan.rhetoricalTree["+i+"].propositionId","Unknown rhetorical proposition");
    let rendered=proposition.claim;
    const prefix=rhetoricalPrefix(node.role);
    if (prefix) rendered=prefix+lowerInitial(rendered);
    if (semanticSafetyReason(rendered)) fail("UNSAFE_UNRESOLVED_REQUEST","renderer.utterances["+i+"]","Unsafe realized utterance");
    if (projection === "expanded" && proposition.kind === "position") {
      if (proposition.coreClaim) rendered+=" "+proposition.coreClaim.text;
      if (proposition.omarchyClaim) rendered+=" "+proposition.omarchyClaim.text;
    }
    utterances.push({id:"utterance:"+projection+":"+i,role:node.role,text:rendered,evidence:proposition.evidence.slice()});
  }
  if (plan.alternative) utterances.push({id:"utterance:"+projection+":alternative",role:"alternative",text:plan.alternative.claim,evidence:plan.alternative.evidence.slice()});
  const limit=projection === "concise" ? 8 : 16;
  if (!utterances.length || utterances.length > limit) fail("NO_COVERAGE_PLAN","renderer.utterances","Projection exceeds utterance bounds");
  for (let i=0;i<utterances.length;i++) if (utterances[i].text.length > 1200 || semanticSafetyReason(utterances[i].text)) fail("UNSAFE_UNRESOLVED_REQUEST","renderer.utterances["+i+"]","Rendered utterance is unsafe or oversized");
  const synthesis=utterances.filter(item => item.role !== "alternative" && item.role !== "reflection").map(item => item.text).join(" ");
  if (synthesis.length > 1200) fail("NO_COVERAGE_PLAN","renderer.synthesis","Rendered synthesis exceeds output-density bound");
  return utterances;
}

function interpretValidated(indexes,request) {
  const plan=planInterpretationValidated(indexes,request);
  const concise=renderPlan(plan,"concise");
  const expanded=renderPlan(plan,"expanded");
  const interpretations=[Object.assign({},plan.primary,{claim:concise.filter(item => item.role !== "alternative" && item.role !== "reflection").map(item => item.text).join(" ")})];
  if (plan.alternative) interpretations.push({id:plan.alternative.id,status:plan.alternative.status,claim:plan.alternative.claim,evidence:plan.alternative.evidence,counterEvidence:plan.alternative.counterEvidence,ambiguityAxis:plan.alternative.ambiguityAxis});
  const reflectionPromptIds=[];
  const orderedCards=plan.analysis.cards.slice().reverse();
  for (let i=0;i<orderedCards.length && reflectionPromptIds.length<2;i++) {
    const card=plan.indexes.cards[orderedCards[i].cardId];
    for (let j=0;j<card.reflectionPromptIds.length && reflectionPromptIds.length<2;j++) if (reflectionPromptIds.indexOf(card.reflectionPromptIds[j]) < 0) reflectionPromptIds.push(card.reflectionPromptIds[j]);
  }
  const reading={schemaVersion:2,methodVersion:METHOD_VERSION,id:"reading:"+stableHash([JSON.stringify({request:plan.analysis.request,cards:plan.analysis.cards,selected:plan.selectedPropositions.map(item => item.id),alternative:plan.alternative ? plan.alternative.id : null})]),createdAt:null,kind:plan.analysis.request.spreadId === "single" ? "free" : "spread",spreadId:plan.analysis.request.spreadId,originalQuestion:plan.analysis.request.originalQuestion,normalizedQuestion:plan.analysis.request.normalizedQuestion,reframeReason:plan.analysis.request.reframeReason,reversalPolicy:plan.analysis.request.reversalPolicy,cards:plan.analysis.cards.map(item => ({positionId:item.positionId,cardId:item.cardId,orientation:item.orientation,selectedHypotheses:item.selectedHypotheses.slice()})),interactions:plan.analysis.interactions.map(item => ({id:item.id,from:item.from,to:item.to,type:item.type,evidence:item.evidence.slice()})),patterns:plan.analysis.patterns.map(item => ({id:item.id,type:item.type,value:item.value,evidence:item.evidence.slice(),evidenceGroupId:item.evidenceGroupId})),interpretations,distinguishingQuestions:plan.alternative ? [plan.alternative.distinguishingQuestion] : [],reflectionPromptIds,utterances:{concise,expanded},agentAssistance:null};
  validateReading(plan.indexes,reading);
  return reading;
}

function interpret(catalog,spreadCatalog,request) {
  return interpretValidated(validateCatalog(catalog,spreadCatalog),request);
}

function createInterpreter(catalog,spreadCatalog) {
  const indexes=validateCatalog(catalog,spreadCatalog);
  return Object.freeze({analyze:function(request) { return analyzeValidated(indexes,request); },plan:function(request) { return planInterpretationValidated(indexes,request); },interpret:function(request) { return interpretValidated(indexes,request); }});
}

function validateReading(indexes, reading) {
  object(indexes,"indexes");
  object(reading,"reading");
  exactKeys(reading,["schemaVersion","methodVersion","id","createdAt","kind","spreadId","originalQuestion","normalizedQuestion","reframeReason","reversalPolicy","cards","interactions","patterns","interpretations","distinguishingQuestions","reflectionPromptIds","utterances","agentAssistance"],"reading");
  if (reading.schemaVersion !== 2) fail("INVALID_SCHEMA","reading.schemaVersion","Unsupported reading schema");
  if (reading.methodVersion !== METHOD_VERSION) fail("INVALID_SCHEMA","reading.methodVersion","Unsupported reading method");
  id(reading.id,"reading.id");
  if (reading.createdAt !== null) text(reading.createdAt,"reading.createdAt",80);
  oneOf(reading.kind,["daily","free","spread"],"reading.kind");
  const spread=indexes.spreads[reading.spreadId];
  if (!spread) fail("UNKNOWN_SPREAD","reading.spreadId","Unknown spread");
  nullableText(reading.originalQuestion,"reading.originalQuestion",1000);
  nullableText(reading.normalizedQuestion,"reading.normalizedQuestion",1000);
  nullableText(reading.reframeReason,"reading.reframeReason",120);
  oneOf(reading.reversalPolicy,ENUMS.reversalPolicy,"reading.reversalPolicy","INVALID_REVERSAL_POLICY");
  if (!Array.isArray(reading.cards) || reading.cards.length !== spread.cardCount) fail("INVALID_SPREAD_CARDINALITY","reading.cards","Reading card count does not match spread");
  const evidenceIndex=Object.create(null);
  const promptIndex=Object.create(null);
  const selectedCards=Object.create(null);
  let hasTwoModeAmbiguity=false;
  for (let i=0;i<reading.cards.length;i++) {
    const item=object(reading.cards[i],"reading.cards["+i+"]");
    exactKeys(item,["positionId","cardId","orientation","selectedHypotheses"],"reading.cards["+i+"]");
    if (item.positionId !== spread.positions[i].id) fail("INVALID_POSITION","reading.cards["+i+"].positionId","Reading position does not match spread order");
    const card=indexes.cards[item.cardId];
    if (!card) fail("UNKNOWN_CARD","reading.cards["+i+"].cardId","Unknown card");
    if (selectedCards[item.cardId]) fail("DUPLICATE_SELECTION","reading.cards["+i+"].cardId","Duplicate card selection");
    selectedCards[item.cardId]=true;
    oneOf(item.orientation,ENUMS.selectionOrientation,"reading.cards["+i+"].orientation","INVALID_ORIENTATION");
    const maxModes=reading.reversalPolicy === "none" || item.orientation === "upright" ? 0 : reading.reversalPolicy === "multi_hypothesis" ? 2 : 1;
    const minModes=maxModes === 0 ? 0 : 1;
    const modes=array(item.selectedHypotheses,"reading.cards["+i+"].selectedHypotheses",minModes,maxModes);
    const seenModes=Object.create(null);
    for (let j=0;j<modes.length;j++) {
      oneOf(modes[j],ENUMS.reversalMode,"reading.cards["+i+"].selectedHypotheses["+j+"]","UNSUPPORTED_REVERSAL_MODE");
      if (seenModes[modes[j]]) fail("UNSUPPORTED_REVERSAL_MODE","reading.cards["+i+"].selectedHypotheses["+j+"]","Duplicate reversal hypothesis");
      seenModes[modes[j]]=true;
      if (!card.reversalModes[modes[j]]) fail("UNSUPPORTED_REVERSAL_MODE","reading.cards["+i+"].selectedHypotheses["+j+"]","Card does not permit reversal hypothesis");
      if (reading.reversalPolicy === "traditional" && modes[j] !== "traditional_reversed") fail("UNSUPPORTED_REVERSAL_MODE","reading.cards["+i+"].selectedHypotheses["+j+"]","Traditional policy requires traditional_reversed");
      if (reading.reversalPolicy !== "traditional" && modes[j] === "traditional_reversed") fail("UNSUPPORTED_REVERSAL_MODE","reading.cards["+i+"].selectedHypotheses["+j+"]","Traditional mode requires traditional policy");
    }
    if (modes.length === 2) hasTwoModeAmbiguity=true;
    for (let j=0;j<card.claims.length;j++) evidenceIndex[card.claims[j].id]=true;
    for (let j=0;j<card.reflectionPrompts.length;j++) promptIndex[card.reflectionPrompts[j].id]=true;
  }
  const interactions=array(reading.interactions,"reading.interactions",0,spread.edges.length);
  uniqueRecords(interactions,"reading.interactions");
  const usedInteractionEdges=Object.create(null);
  for (let i=0;i<interactions.length;i++) {
    const item=object(interactions[i],"reading.interactions["+i+"]");
    exactKeys(item,["id","from","to","type","evidence"],"reading.interactions["+i+"]");
    id(item.id,"reading.interactions["+i+"].id");
    const edge=spread.edges.find(candidate => candidate.from === item.from && candidate.to === item.to);
    const edgeId=item.from+":"+item.to;
    if (usedInteractionEdges[edgeId]) fail("INVALID_SCHEMA","reading.interactions["+i+"]","Only one interaction may use a spread edge");
    usedInteractionEdges[edgeId]=true;
    if (!edge || edge.allowedRelations.indexOf(item.type) < 0) fail("INVALID_REFERENCE","reading.interactions["+i+"]","Interaction is not legal for spread edge");
    validateRefs(item.evidence,evidenceIndex,"reading.interactions["+i+"].evidence",1,8);
  }
  const patterns=array(reading.patterns,"reading.patterns",0,8);
  uniqueRecords(patterns,"reading.patterns");
  for (let i=0;i<patterns.length;i++) {
    const item=object(patterns[i],"reading.patterns["+i+"]");
    exactKeys(item,["id","type","value","evidence","evidenceGroupId"],"reading.patterns["+i+"]");
    id(item.id,"reading.patterns["+i+"].id");
    text(item.type,"reading.patterns["+i+"].type",48);
    if (item.value !== undefined) text(item.value,"reading.patterns["+i+"].value",48);
    if (item.evidenceGroupId !== undefined) id(item.evidenceGroupId,"reading.patterns["+i+"].evidenceGroupId");
    validateRefs(item.evidence,evidenceIndex,"reading.patterns["+i+"].evidence",1,12);
  }
  const interpretations=array(reading.interpretations,"reading.interpretations",1,2);
  const interpretationIndex=uniqueRecords(interpretations,"reading.interpretations");
  if (interpretations[0].status !== "primary") fail("INVALID_SCHEMA","reading.interpretations[0].status","First interpretation must be primary");
  for (let i=0;i<interpretations.length;i++) {
    const item=object(interpretations[i],"reading.interpretations["+i+"]");
    exactKeys(item,["id","status","claim","evidence","counterEvidence","ambiguityAxis"],"reading.interpretations["+i+"]");
    id(item.id,"reading.interpretations["+i+"].id");
    oneOf(item.status,["primary","alternative"],"reading.interpretations["+i+"].status");
    if (i === 1 && item.status !== "alternative") fail("INVALID_SCHEMA","reading.interpretations[1].status","Second interpretation must be alternative");
    text(item.claim,"reading.interpretations["+i+"].claim",1200);
    validateRefs(item.evidence,evidenceIndex,"reading.interpretations["+i+"].evidence",1,24);
    const counter=array(item.counterEvidence,"reading.interpretations["+i+"].counterEvidence",0,12);
    for (let j=0;j<counter.length;j++) {
      const ref=object(counter[j],"reading.interpretations["+i+"].counterEvidence["+j+"]");
      exactKeys(ref,["evidenceId","reason","targetPropositionId"],"reading.interpretations["+i+"].counterEvidence["+j+"]");
      if (!evidenceIndex[ref.evidenceId]) fail("INVALID_REFERENCE","reading.interpretations["+i+"].counterEvidence["+j+"].evidenceId","Unknown counterevidence");
      oneOf(ref.reason,["supports-competing-hypothesis","limits-scope","contradicts-relation","weakens-salience"],"reading.interpretations["+i+"].counterEvidence["+j+"].reason");
      id(ref.targetPropositionId,"reading.interpretations["+i+"].counterEvidence["+j+"].targetPropositionId");
      if (!interpretationIndex[ref.targetPropositionId]) fail("INVALID_REFERENCE","reading.interpretations["+i+"].counterEvidence["+j+"].targetPropositionId","Unknown target proposition");
    }
    if (item.status === "alternative") text(item.ambiguityAxis,"reading.interpretations["+i+"].ambiguityAxis",120);
    else if (item.ambiguityAxis !== null) fail("INVALID_SCHEMA","reading.interpretations["+i+"].ambiguityAxis","Primary ambiguity axis must be null");
  }
  const questions=array(reading.distinguishingQuestions,"reading.distinguishingQuestions",interpretations.length === 2 ? 1 : 0,interpretations.length === 2 ? 1 : 0);
  for (let i=0;i<questions.length;i++) text(questions[i],"reading.distinguishingQuestions["+i+"]",280);
  if (hasTwoModeAmbiguity && (interpretations.length !== 2 || questions.length !== 1 || !interpretations[1].ambiguityAxis)) fail("INVALID_SCHEMA","reading.interpretations","Two reversal hypotheses require an alternative and distinguishing question");
  validateRefs(reading.reflectionPromptIds,promptIndex,"reading.reflectionPromptIds",1,2);
  object(reading.utterances,"reading.utterances");
  exactKeys(reading.utterances,["concise","expanded"],"reading.utterances");
  for (const projection of ["concise","expanded"]) {
    const utterances=array(reading.utterances[projection],"reading.utterances."+projection,1,projection === "concise" ? 8 : 16);
    const utteranceIndex=uniqueRecords(utterances,"reading.utterances."+projection);
    for (let i=0;i<utterances.length;i++) {
      const item=utterances[i];
      exactKeys(item,["id","role","text","evidence"],"reading.utterances."+projection+"["+i+"]");
      oneOf(item.role,["governing","support","tension","development","alternative","reflection"],"reading.utterances."+projection+"["+i+"].role");
      text(item.text,"reading.utterances."+projection+"["+i+"].text",1200);
      validateRefs(item.evidence,evidenceIndex,"reading.utterances."+projection+"["+i+"].evidence",1,24);
    }
    void utteranceIndex;
  }
  if (reading.agentAssistance !== null) fail("INVALID_SCHEMA","reading.agentAssistance","Canonical pilot readings cannot contain agent assistance");
  return true;
}

function compactSelections(indexes,value,spreadId) {
  const selections=array(value,"state.selection",0,78);
  const spread=indexes.spreads[spreadId];
  if (!spread || selections.length !== spread.cardCount) fail("INVALID_SPREAD_CARDINALITY","state.selection","Selection does not match spread");
  const seen=Object.create(null),output=[];
  for (let i=0;i<selections.length;i++) {
    const item=object(selections[i],"state.selection["+i+"]");
    const cardId=id(item.cardId,"state.selection["+i+"].cardId");
    if (!indexes.cards[cardId]) fail("UNKNOWN_CARD","state.selection["+i+"].cardId","Unknown persisted card");
    if (seen[cardId]) fail("DUPLICATE_SELECTION","state.selection["+i+"].cardId","Duplicate persisted card");
    seen[cardId]=true;
    const orientation=oneOf(item.orientation,ENUMS.selectionOrientation,"state.selection["+i+"].orientation","INVALID_ORIENTATION");
    output.push({positionId:spread.positions[i].id,cardId,orientation});
  }
  return output;
}

function migrateState(catalog,spreadCatalog,state) {
  const indexes=validateCatalog(catalog,spreadCatalog);
  const normalizedState=normalizeExternal(state);
  const source=normalizedState && typeof normalizedState === "object" ? normalizedState : {};
  const preferences=source.preferences && typeof source.preferences === "object" ? JSON.parse(JSON.stringify(source.preferences)) : {reversals:true,uiScale:1,themeMode:"arcana"};
  const output={schemaVersion:STATE_SCHEMA_VERSION,dailyDate:String(source.dailyDate || ""),dailySeed:String(source.dailySeed || ""),dailySelection:[],lastReadingSelection:[],lastReading:null,lastReadingKind:["daily","free","spread"].indexOf(source.lastReadingKind) >= 0 ? source.lastReadingKind : "daily",freeCounter:Number.isFinite(Number(source.freeCounter)) ? Math.max(0,Math.floor(Number(source.freeCounter))) : 0,preferences,migration:source.schemaVersion === STATE_SCHEMA_VERSION && source.migration && typeof source.migration === "object" ? JSON.parse(JSON.stringify(source.migration)) : {fromSchemaVersion:Number(source.schemaVersion || 0),legacyReadingRecovered:false}};
  try {
    const daily=compactSelections(indexes,source.dailySelection || [],"single");
    output.dailySelection=daily.map(item => ({cardId:item.cardId,orientation:item.orientation}));
  } catch (error) {
    output.dailyDate=""; output.dailySeed=""; output.dailySelection=[];
  }
  if (source.lastReading && source.lastReading.schemaVersion === 2) {
    try {
      validateReading(indexes,source.lastReading);
      const recovered=compactSelections(indexes,source.lastReading.cards,source.lastReading.spreadId);
      output.lastReading=interpret(catalog,spreadCatalog,{spreadId:source.lastReading.spreadId,cards:recovered,originalQuestion:source.lastReading.originalQuestion,topicLens:"general",tradition:"rws",reversalPolicy:source.lastReading.reversalPolicy,elementalDignity:"disabled",narratorId:"clear-reflective-v1"});
      output.lastReadingSelection=recovered;
      return output;
    } catch (error) { output.lastReading=null; output.lastReadingSelection=[]; }
  }
  let recovered=null,spreadId=null;
  if (source.lastReading && source.lastReading.schemaVersion === 1 && source.lastReading.cards) {
    spreadId=source.lastReading.spreadId === "context-friction-doorway" ? "context-friction-doorway" : "single";
    try { recovered=compactSelections(indexes,source.lastReading.cards,spreadId); }
    catch (error) { recovered=null; }
  } else if (source.lastReadingSelection) {
    spreadId=output.lastReadingKind === "spread" ? "context-friction-doorway" : "single";
    try { recovered=compactSelections(indexes,source.lastReadingSelection,spreadId); }
    catch (error) { recovered=null; }
  }
  if (recovered) {
    try {
      output.lastReading=interpret(catalog,spreadCatalog,{spreadId,cards:recovered,originalQuestion:null,topicLens:"general",tradition:"rws",reversalPolicy:preferences.reversals === false ? "none" : "energy_state",elementalDignity:"disabled",narratorId:"clear-reflective-v1"});
      output.lastReadingSelection=recovered;
      output.migration.legacyReadingRecovered=true;
    } catch (error) { output.lastReading=null; output.lastReadingSelection=[]; }
  }
  return output;
}

function byteLength(value) {
  const source=String(value || "");
  if (typeof Buffer !== "undefined") return Buffer.byteLength(source,"utf8");
  let bytes=0;
  for (let i=0;i<source.length;i++) {
    const code=source.charCodeAt(i);
    if (code <= 0x7f) bytes+=1;
    else if (code <= 0x7ff) bytes+=2;
    else if (code >= 0xd800 && code <= 0xdbff && i+1<source.length && source.charCodeAt(i+1) >= 0xdc00 && source.charCodeAt(i+1) <= 0xdfff) { bytes+=4; i++; }
    else bytes+=3;
  }
  return bytes;
}

function cleanPlainText(value,max) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,"")
    .replace(/[`#*_<>\[\]]/g," ")
    .replace(/[ \t]+/g," ")
    .slice(0,max);
}

function requestFromReading(reading) {
  return {spreadId:reading.spreadId,cards:reading.cards.map(item => ({positionId:item.positionId,cardId:item.cardId,orientation:item.orientation})),originalQuestion:reading.originalQuestion,topicLens:"general",tradition:"rws",reversalPolicy:reading.reversalPolicy,elementalDignity:"disabled",narratorId:"clear-reflective-v1"};
}

function evidenceForPosition(card,positionId,utterances) {
  const refs=card.positionClaims[positionId] || [];
  for (let i=0;i<utterances.length;i++) if (utterances[i].evidence.some(evidenceId => refs.indexOf(evidenceId) >= 0)) return utterances[i].text;
  return "";
}

function toPanelReading(catalog,spreadCatalog,reading,runtime) {
  const indexes=validateCatalog(catalog,spreadCatalog);
  validateReading(indexes,reading);
  const spread=indexes.spreads[reading.spreadId];
  const runtimeKind=runtime && ["daily","free","spread"].indexOf(runtime.kind) >= 0 ? runtime.kind : reading.kind;
  const cards=reading.cards.map((item,index) => {
    const card=indexes.cards[item.cardId], position=spread.positions[index];
    return {instanceId:item.positionId+":"+item.cardId,cardId:item.cardId,positionId:item.positionId,positionLabel:position.label,orientation:item.orientation,selectedHypotheses:item.selectedHypotheses.slice(),orientationLabel:item.orientation === "upright" ? "Upright" : "Reversed · "+item.selectedHypotheses.join(" / "),transformed:evidenceForPosition(card,item.positionId,reading.utterances.concise),card:{id:card.id,title:card.title,systemTitle:card.omarchyTitle,image:card.image,arcana:card.arcana,suit:card.suit,rank:card.rank,element:card.element,omarchy:{domain:card.arcana === "major" ? "Archetypal System" : ({wands:"Execution",cups:"Connection",swords:"Logic",pentacles:"Material System"})[card.suit]},traditional:{uprightKeywords:card.coreThemes.slice(0,3)}}};
  });
  const primary=reading.interpretations[0], alternative=reading.interpretations.length === 2 ? reading.interpretations[1] : null;
  const relationships=reading.interactions.map(item => ({id:item.id,from:item.from,to:item.to,type:item.type,text:item.from+" → "+item.to+": "+item.type.replace(/-/g," "),evidence:item.evidence.slice()}));
  const patterns=reading.patterns.map(item => ({id:item.id,type:item.type,value:item.value,text:item.type.replace(/-/g," ")+": "+item.value,evidence:item.evidence.slice(),evidenceGroupId:item.evidenceGroupId}));
  const prompts=[];
  for (let i=0;i<reading.reflectionPromptIds.length;i++) {
    const promptId=reading.reflectionPromptIds[i];
    for (let j=0;j<reading.cards.length;j++) {
      const prompt=indexes.cards[reading.cards[j].cardId].reflectionPrompts.find(item => item.id === promptId);
      if (prompt) { prompts.push({id:prompt.id,text:prompt.text}); break; }
    }
  }
  const evidenceIds=[];
  for (const interpretation of reading.interpretations) for (const evidenceId of interpretation.evidence) if (evidenceIds.indexOf(evidenceId) < 0) evidenceIds.push(evidenceId);
  return {schemaVersion:2,readingId:reading.id,methodVersion:reading.methodVersion,deckId:catalog.deckId,deckSchemaVersion:catalog.schemaVersion,kind:runtimeKind,spreadId:reading.spreadId,spreadName:spread.title,createdAt:runtime && runtime.createdAt ? runtime.createdAt : reading.createdAt,cards,relationships,patterns,synthesis:primary.claim,primary:{id:primary.id,text:primary.claim,evidence:primary.evidence.slice()},alternative:alternative ? {id:alternative.id,text:alternative.claim,evidence:alternative.evidence.slice(),counterEvidence:alternative.counterEvidence.slice(),ambiguityAxis:alternative.ambiguityAxis} : null,distinguishingQuestions:reading.distinguishingQuestions.slice(),reflectionPrompts:prompts,reflection:prompts.map(item => item.text).join("\n"),originalQuestion:reading.originalQuestion,normalizedQuestion:reading.normalizedQuestion,reframeReason:reading.reframeReason,evidenceSummary:evidenceIds.slice(0,24),provenanceSummary:["public-domain","private-reference","original-work","structural-convention"],utterances:{concise:reading.utterances.concise.map(item => Object.assign({},item,{evidence:item.evidence.slice()})),expanded:reading.utterances.expanded.map(item => Object.assign({},item,{evidence:item.evidence.slice()}))}};
}

function reflectionPromptsForReading(indexes,reading) {
  const prompts=[];
  for (let i=0;i<reading.reflectionPromptIds.length;i++) {
    const promptId=reading.reflectionPromptIds[i];
    for (let j=0;j<reading.cards.length;j++) {
      const prompt=indexes.cards[reading.cards[j].cardId].reflectionPrompts.find(item => item.id === promptId);
      if (prompt) { prompts.push({id:prompt.id,text:prompt.text}); break; }
    }
  }
  return prompts;
}

function boundedSections(required,optional,maxBytes) {
  const omitted=[];
  function render() {
    const sections=required.concat(optional.filter(item => !item.omitted)).map(item => item.title+"\n"+item.body);
    if (omitted.length) sections.push("TRUNCATION\nOptional sections omitted: "+omitted.join(", "));
    return sections.join("\n\n");
  }
  let output=render();
  for (let i=optional.length-1;byteLength(output)>maxBytes && i>=0;i--) {
    optional[i].omitted=true;
    omitted.unshift(optional[i].title);
    output=render();
  }
  if (byteLength(output)>maxBytes) fail("OUTPUT_TOO_LARGE","projection","Required projection exceeds byte bound");
  return output;
}

function copyReading(catalog,spreadCatalog,reading,maxBytes) {
  const panel=toPanelReading(catalog,spreadCatalog,reading,null);
  const required=[{title:"ARCANA READING "+panel.readingId,body:"Method: "+panel.methodVersion+"\nSpread: "+panel.spreadName},{title:"PRIMARY "+panel.primary.id,body:cleanPlainText(panel.primary.text,2400)+"\nEvidence: "+panel.primary.evidence.join(", ")},{title:"CARDS",body:panel.cards.map(item => item.instanceId+" | "+item.orientation+" | hypotheses: "+(item.selectedHypotheses.join(", ") || "none")).join("\n")}];
  const optional=[];
  if (panel.originalQuestion !== null) optional.push({title:"QUESTION",body:"Original: "+cleanPlainText(panel.originalQuestion,1000)+"\nNormalized: "+cleanPlainText(panel.normalizedQuestion,1000)+"\nReframe: "+(panel.reframeReason || "none")});
  if (panel.alternative) optional.push({title:"ALTERNATIVE "+panel.alternative.id,body:cleanPlainText(panel.alternative.text,2400)+"\nEvidence: "+panel.alternative.evidence.join(", ")+"\nCounterevidence: "+panel.alternative.counterEvidence.map(item => item.evidenceId).join(", ")});
  if (panel.distinguishingQuestions.length) optional.push({title:"DISTINGUISHING QUESTION",body:cleanPlainText(panel.distinguishingQuestions[0],500)});
  if (panel.relationships.length) optional.push({title:"RELATIONSHIPS",body:panel.relationships.map(item => item.id+" | "+item.text+" | "+item.evidence.join(", ")).join("\n")});
  if (panel.patterns.length) optional.push({title:"PATTERNS",body:panel.patterns.map(item => item.id+" | "+item.text+" | "+item.evidence.join(", ")).join("\n")});
  optional.push({title:"REFLECTION",body:panel.reflectionPrompts.map(item => item.id+" | "+cleanPlainText(item.text,500)).join("\n")});
  return boundedSections(required,optional,maxBytes || 8000);
}

function buildHandoff(catalog,spreadCatalog,reading,maxBytes) {
  const indexes=validateCatalog(catalog,spreadCatalog);
  validateReading(indexes,reading);
  const analysis=analyzeValidated(indexes,requestFromReading(reading));
  const sourceIndex=indexes.sources;
  const cards=reading.cards.map((item,index) => {
    const card=indexes.cards[item.cardId], activated=analysis.cards[index].activatedClaimIds;
    const provenance=[];
    for (const claimId of activated) {
      const claim=claimById(card,claimId);
      for (const sourceRef of claim.sourceRefs) {
        const category=sourceIndex[sourceRef].licenseStatus;
        if (provenance.indexOf(category) < 0) provenance.push(category);
      }
    }
    return {instanceId:item.positionId+":"+item.cardId,positionId:item.positionId,cardId:item.cardId,orientation:item.orientation,selectedHypotheses:item.selectedHypotheses.slice(),activatedClaimIds:activated.slice(),provenanceCategories:provenance.sort()};
  });
  const packet={packetVersion:2,pluginId:"org.ministryoftaste.arcana",semantic:{methodVersion:reading.methodVersion,deckId:catalog.deckId,deckSchemaVersion:catalog.schemaVersion,readingId:reading.id},safetyContract:{role:"reflective-advisory",prohibitions:["prophecy","diagnosis","professional-authority","third-party-mind-reading","decision-transfer"],canonicalMutation:false},question:{original:reading.originalQuestion,normalized:reading.normalizedQuestion,reframeReason:reading.reframeReason},cards,primary:{id:reading.interpretations[0].id,claim:reading.interpretations[0].claim,evidence:reading.interpretations[0].evidence.slice(),utterances:reading.utterances.concise.filter(item => item.role !== "alternative").map(item => ({id:item.id,role:item.role,text:item.text,evidence:item.evidence.slice()}))},alternative:reading.interpretations[1] ? {id:reading.interpretations[1].id,claim:reading.interpretations[1].claim,evidence:reading.interpretations[1].evidence.slice(),counterEvidence:reading.interpretations[1].counterEvidence.slice(),ambiguityAxis:reading.interpretations[1].ambiguityAxis,distinguishingQuestion:reading.distinguishingQuestions[0]} : null,relationships:reading.interactions.map(item => Object.assign({},item,{evidence:item.evidence.slice()})),patterns:reading.patterns.map(item => Object.assign({},item,{evidence:item.evidence.slice()})),reflectionPrompts:reflectionPromptsForReading(indexes,reading),truncation:{omitted:[]}};
  const optionalKeys=["patterns","relationships"];
  let output=JSON.stringify(packet,null,2);
  for (let i=0;byteLength(output)>(maxBytes || 12000) && i<optionalKeys.length;i++) {
    const key=optionalKeys[i]; packet[key]=[]; packet.truncation.omitted.push(key); output=JSON.stringify(packet,null,2);
  }
  if (byteLength(output)>(maxBytes || 12000)) fail("OUTPUT_TOO_LARGE","handoff","Required handoff exceeds byte bound");
  return output;
}

if (typeof module !== "undefined") module.exports={METHOD_VERSION,STATE_SCHEMA_VERSION,CARD_SCHEMA_VERSION,SOURCE_SCHEMA_VERSION,SPREAD_SCHEMA_VERSION,ENUMS,THEMES,validationError,validateCatalog,validateRequest,normalizeQuestion,canonicalRequest,analyze,createInterpreter,createMatrixTestHooks,generateCandidates,planInterpretation,renderPlan,interpret,semanticSafetyReason,validateReading,toPanelReading,copyReading,buildHandoff,migrateState,byteLength};
