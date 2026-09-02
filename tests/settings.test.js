"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Settings = require("../src/Settings.js");

test("panel scale accepts only the three supported values", () => {
  assert.deepEqual(Settings.SUPPORTED_SCALES, [1, 1.25, 1.5]);
  assert.equal(Settings.normalizeScale(1), 1);
  assert.equal(Settings.normalizeScale("1.25"), 1.25);
  assert.equal(Settings.normalizeScale(1.5), 1.5);
});

test("panel scale fails closed to 1x", () => {
  for (const value of [null, undefined, "", 0, 1.1, 2, "large", NaN])
    assert.equal(Settings.normalizeScale(value), 1);
});