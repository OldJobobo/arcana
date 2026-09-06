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

test("fullscreen is opt-in and legacy preferences stay framed", () => {
  assert.equal(Settings.normalizeFullscreen(true), true);
  for (const value of [false, undefined, null, "true", "false", 1, 0, {}])
    assert.equal(Settings.normalizeFullscreen(value), false);
});

test("fullscreen fills every output without changing the framed render scale", () => {
  for (const [width, height] of [[2560,1440], [3840,1080], [1080,1920], [1280,720], [800,600]]) {
    for (const savedScale of Settings.SUPPORTED_SCALES) {
      const layout = Settings.panelLayout(width, height, savedScale, true);
      const framed = Settings.panelLayout(width, height, savedScale, false);
      assert.equal(layout.scale, framed.scale, "fullscreen must not zoom the UI");
      assert.ok(Math.abs(layout.width * layout.scale - width) < 0.001);
      assert.ok(Math.abs(layout.height * layout.scale - height) < 0.001);
      assert.ok(layout.width >= 1080 - 0.001 && layout.height >= 680 - 0.001);
      assert.ok(layout.scale > 0);
    }
  }
});

test("framed mode keeps the saved scale and responsive margins", () => {
  assert.deepEqual(Settings.panelLayout(2560, 1440, 1.25, false), {scale:1.25,width:1080,height:680});
  assert.deepEqual(Settings.panelLayout(2560, 1440, 1.25, true), {scale:1.25,width:2048,height:1152});
  const small = Settings.panelLayout(1280, 720, 1.5, false);
  assert.ok(small.width * small.scale <= 1280 - 48);
  assert.ok(small.height * small.scale <= 720 - 48);
});

test("fullscreen uses the canvas while keeping card and text geometry readable",  () => {
  for (const [width, height] of [[2560,1440], [3840,1080], [1080,1920], [1280,720], [800,600]]) {
    for (const scale of Settings.SUPPORTED_SCALES) {
      const panel = Settings.panelLayout(width, height, scale, true);
      const workspace = Settings.workspaceLayout(panel.width, panel.height, true);
      assert.ok(workspace.width >= panel.width * 0.9);
      assert.equal(workspace.height, panel.height - 64);
      for (const spread of [false, true]) {
        const body = Settings.readingLayout(workspace.width, true, spread);
        assert.equal(body.width, workspace.width);
        assert.ok(body.cardsWidth >= (spread ? 558 : 330));
        assert.ok(body.textWidth >= 400);
        if (spread) assert.ok(534 + body.cardGap * 2 <= body.cardsWidth);
        const text = Settings.readingTextLayout(body.textWidth - 14, true);
        assert.ok(text.mainWidth <= 760);
        assert.ok(text.split ? text.mainWidth + text.detailsWidth + 32 <= body.textWidth - 14 : text.mainWidth <= body.textWidth - 14);
        assert.ok(Math.abs(body.cardsWidth + body.textWidth + body.gap * 2 + 1 - body.width) < 0.001);
      }
    }
  }
});

test("supporting details become a separate column only when there is room", () => {
  assert.equal(Settings.readingTextLayout(999, true).split, false);
  assert.equal(Settings.readingTextLayout(1000, true).split, true);
  assert.equal(Settings.readingTextLayout(1400, false).split, false);
  assert.equal(Settings.readingTextLayout(2400, true).detailsWidth, 560);
});

test("framed reading columns include both divider gaps without overflow", () => {
  const workspace = Settings.workspaceLayout(1080, 680, false);
  assert.deepEqual(workspace, {width:1032,height:632});
  const reading = Settings.readingLayout(workspace.width, false, true);
  assert.equal(reading.cardsWidth + reading.textWidth + reading.gap * 2 + 1, workspace.width);
});

test("theme mode accepts arcana and system only", () => {
  assert.equal(Settings.normalizeThemeMode("arcana"), "arcana");
  assert.equal(Settings.normalizeThemeMode("system"), "system");
  for (const value of [null, undefined, "", "dark", "SYSTEM", 1])
    assert.equal(Settings.normalizeThemeMode(value), "arcana");
});
