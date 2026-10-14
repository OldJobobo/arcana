"use strict";

// Card selection for runtime draws. Interpretation lives in Interpretation.js.

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

// mulberry32 seeded from an FNV-1a hash of the seed text.
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
  if (Array.isArray(value)) {
    if (value.length > 10000) throw new Error("Array exceeds resource bound");
    return value;
  }
  if (!value || !Number.isSafeInteger(Number(value.length)) || Number(value.length) < 0) throw new Error("Invalid array-like length");
  if (Number(value.length) > 10000) throw new Error("Array-like value exceeds resource bound");
  const output=[];
  const length=Number(value.length);
  for (let index=0;index<length;index++) output.push(value[index]);
  return output;
}

// Draws without replacement. Each reversed card consumes one extra RNG value,
// kept so existing seeds keep producing the same selections.
function drawV2(deck, options) {
  options = options || {};
  const cards = toArray(deck);
  if (!cards.length) return [];
  const next = rng(options.seed || "arcana");
  const pool=[];
  for (let index=0;index<cards.length;index++) pool.push(index);
  const count = boundedCount(options.count, pool.length);
  const output=[];
  for (let i=0;i<count;i++) {
    const pick=Math.floor(next()*pool.length);
    const card=cards[pool.splice(pick,1)[0]];
    const reversed=options.reversals === true && next() < 0.34;
    if (reversed) next();
    output.push({cardId:card.id,orientation:reversed ? "reversed" : "upright"});
  }
  return output;
}

function dailyKeyV2(localDate) {
  return "daily:" + boundedText(localDate, 10) + ":arcana-composer-v2";
}

if (typeof module !== "undefined") module.exports={hashSeed,rng,drawV2,dailyKeyV2};
