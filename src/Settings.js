"use strict";

var SUPPORTED_SCALES = [1, 1.25, 1.5];

function normalizeScale(value) {
  var numeric = Number(value);
  for (var i = 0; i < SUPPORTED_SCALES.length; i++) {
    if (numeric === SUPPORTED_SCALES[i]) return SUPPORTED_SCALES[i];
  }
  return 1;
}

var api = {
  SUPPORTED_SCALES: SUPPORTED_SCALES,
  normalizeScale: normalizeScale
};

if (typeof module !== "undefined" && module.exports) module.exports = api;
