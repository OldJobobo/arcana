"use strict";

var SUPPORTED_SCALES = [1, 1.25, 1.5];

function normalizeScale(value) {
  var numeric = Number(value);
  for (var i = 0; i < SUPPORTED_SCALES.length; i++) {
    if (numeric === SUPPORTED_SCALES[i]) return SUPPORTED_SCALES[i];
  }
  return 1;
}

function normalizeThemeMode(value) {
  return value === "system" ? "system" : "arcana";
}

function normalizeFullscreen(value) {
  return value === true;
}

function panelLayout(width, height, scale, fullscreen) {
  var w = Math.max(1, Number(width) || 1);
  var h = Math.max(1, Number(height) || 1);
  // Fullscreen expands the canvas, not the UI. Keep exactly the same
  // responsive render scale used by the framed view on this output.
  var renderScale = Math.min(normalizeScale(scale), Math.max(0.5, (w - 48) / 1080), Math.max(0.5, (h - 48) / 680));
  if (normalizeFullscreen(fullscreen)) {
    return {scale: renderScale, width: w / renderScale, height: h / renderScale};
  }
  return {
    scale: renderScale,
    width: 1080,
    height: 680
  };
}

function workspaceLayout(width, height, fullscreen) {
  var gutter = fullscreen ? Math.min(48, Math.max(24, width * 0.025)) : 24;
  return {width: width - gutter * 2, height: height - (fullscreen ? 64 : 48)};
}

function readingTextLayout(width, fullscreen) {
  var split = fullscreen && width >= 1000;
  var main = split ? Math.min(760, (width - 32) * 0.6) : Math.min(width, fullscreen ? 760 : width);
  return {split: split, mainWidth: main, detailsWidth: split ? Math.min(560, width - main - 32) : main};
}

function readingLayout(width, fullscreen, spread) {
  var bodyWidth = width;
  var gap = fullscreen ? 32 : 20;
  var minimumCards = spread ? 558 : 330;
  var cardsWidth = fullscreen ? Math.max(minimumCards, bodyWidth * (spread ? 0.4 : 0.34)) : minimumCards;
  var cardGap = spread ? (fullscreen ? Math.max(12, (Math.min(cardsWidth - 48, 900) - 534) / 2) : 12) : 0;
  return {width: bodyWidth, gap: gap, cardGap: cardGap, cardsWidth: cardsWidth, textWidth: bodyWidth - cardsWidth - gap * 2 - 1};
}

var api = {
  SUPPORTED_SCALES: SUPPORTED_SCALES,
  normalizeScale: normalizeScale,
  normalizeThemeMode: normalizeThemeMode,
  normalizeFullscreen: normalizeFullscreen,
  panelLayout: panelLayout,
  workspaceLayout: workspaceLayout,
  readingLayout: readingLayout,
  readingTextLayout: readingTextLayout
};

if (typeof module !== "undefined" && module.exports) module.exports = api;
