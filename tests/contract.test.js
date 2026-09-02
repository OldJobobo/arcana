"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
}

test("manifest freezes the alpha identity and all three Quattro kinds", () => {
  const manifest = readJson("manifest.json");
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.id, "org.ministryoftaste.omarchy-arcana");
  assert.equal(manifest.version, "0.1.0-alpha");
  assert.deepEqual(manifest.kinds, ["service", "panel", "bar-widget"]);
  assert.deepEqual(manifest.entryPoints, {
    service: "ArcanaService.qml",
    panel: "Panel.qml",
    barWidget: "BarWidget.qml"
  });
  assert.equal(manifest.keepLoaded, true);
});

test("every declared entry point exists and QML uses the singleton contract", () => {
  const manifest = readJson("manifest.json");
  for (const file of Object.values(manifest.entryPoints)) {
    assert.equal(fs.existsSync(path.join(root, file)), true, file);
  }
  const panel = fs.readFileSync(path.join(root, "Panel.qml"), "utf8");
  const widget = fs.readFileSync(path.join(root, "BarWidget.qml"), "utf8");
  assert.match(panel, /property var service/);
  assert.match(widget, /serviceFor\(root\.moduleName\)/);
});

test("dynamic agent prompts use a Process argv array and never bar.run interpolation", () => {
  const qml = fs.readFileSync(path.join(root, "ArcanaService.qml"), "utf8");
  assert.match(qml, /\["omarchy", "agent", "prompt", root\.agentPacket\]/);
  assert.match(qml, /\["omarchy", "default", "agent"\]/);
  assert.doesNotMatch(qml, /bar\.run\([^\n]*agentPacket/);
  assert.doesNotMatch(qml, /bash\s+-lc/);
});

test("Quattro file and adapter graphs are normalized before entering pure JS", () => {
  const qml = fs.readFileSync(path.join(root, "ArcanaService.qml"), "utf8");
  assert.match(qml, /JSON\.parse\(deckStore\.text\(\) \|\| "\{\}"\)/);
  assert.match(qml, /JSON\.parse\(JSON\.stringify\(root\.cards \|\| \[\]\)\)/);
  assert.match(qml, /var normalizedDeck = deckSnapshot\(\)/);
  assert.match(qml, /Arcana\.draw\(normalizedDeck,/);
  assert.match(qml, /Arcana\.compose\(deckSnapshot\(\), selectionSnapshot\(selection\)/);
});

test("repository contains release documentation and no executable helper", () => {
  for (const file of ["README.md", "LICENSE", "CHANGELOG.md", "INTERPRETATION-RESEARCH-AND-SPEC.md"])
    assert.equal(fs.existsSync(path.join(root, file)), true, file);
  const forbidden = [];
  for (const dir of ["scripts", "bin"]) if (fs.existsSync(path.join(root, dir))) forbidden.push(dir);
  assert.deepEqual(forbidden, []);
});

test("panel scale is persisted, constrained, and keyboard accessible", () => {
  const service = fs.readFileSync(path.join(root, "ArcanaService.qml"), "utf8");
  const panel = fs.readFileSync(path.join(root, "Panel.qml"), "utf8");
  assert.match(service, /property real uiScale/);
  assert.match(service, /function setUiScale\(value\)/);
  assert.match(service, /preferences.*uiScale/s);
  assert.match(service, /stateStore\.writeAdapter\(\)/);
  assert.match(panel, /effectiveScale/);
  assert.match(panel, /frameBounds/);
  assert.match(panel, /Qt\.Key_1/);
  assert.match(panel, /Qt\.Key_2/);
  assert.match(panel, /Qt\.Key_3/);
  for (const label of ["1×", "1.25×", "1.5×"])
    assert.match(panel, new RegExp(label.replace(".", "\\.")));
});

test("theme colors toggle between Arcana identity and live system roles", () => {
  const service = fs.readFileSync(path.join(root, "ArcanaService.qml"), "utf8");
  const panel = fs.readFileSync(path.join(root, "Panel.qml"), "utf8");
  assert.match(service, /property string themeMode/);
  assert.match(service, /function toggleThemeMode\(\)/);
  assert.match(service, /preferences\.themeMode/);
  assert.match(panel, /Color\.popups\.background/);
  assert.match(panel, /Color\.popups\.text/);
  assert.match(panel, /Color\.accent/);
  assert.match(panel, /Qt\.Key_T/);
  assert.match(panel, /COLORS.*ARCANA/s);
  assert.match(panel, /COLORS.*SYSTEM/s);
});

test("panel edge uses a single border and restrained inner keyline", () => {
  const panel = fs.readFileSync(path.join(root, "Panel.qml"), "utf8");
  assert.doesNotMatch(panel, /anchors\.margins:\s*-8/);
  assert.doesNotMatch(panel, /#60000000/i);
  assert.match(panel, /id:\s*innerKeyline/);
});

test("motion is perceptible, bounded, state-driven, and never loops", () => {
  const panel = fs.readFileSync(path.join(root, "Panel.qml"), "utf8");
  const button = fs.readFileSync(path.join(root, "components/ArcanaButton.qml"), "utf8");
  assert.match(panel, /id:\s*panelReveal/);
  assert.match(panel, /id:\s*revealStart/);
  assert.match(panel, /interval:\s*(?:2[4-9]|3\d|4[0-8])/);
  assert.match(panel, /id:\s*contentRevealStart/);
  assert.match(panel, /interval:\s*160/);
  assert.match(panel, /id:\s*contentReveal/);
  assert.match(panel, /property real contentOffset:\s*12/);
  assert.match(panel, /id:\s*readingFade/);
  assert.match(panel, /Behavior on renderScale/);
  assert.match(panel, /ColorAnimation/);
  assert.match(panel, /Behavior on width/);
  assert.doesNotMatch(panel + button, /loops:\s*Animation\.Infinite|running:\s*true[\s\S]{0,120}loops/i);
  const durations = [...(panel + button).matchAll(/duration:\s*(\d+)/g)].map(match => Number(match[1]));
  assert.ok(durations.length >= 6);
  assert.ok(durations.some(duration => duration >= 400), durations.join(","));
  assert.ok(durations.every(duration => duration <= 450), durations.join(","));
});

test("new cards are keyboard-accessible physical reveals", () => {
  const panel = fs.readFileSync(path.join(root, "Panel.qml"), "utf8");
  const card = fs.readFileSync(path.join(root, "components/CardFace.qml"), "utf8");
  assert.match(panel, /property bool veilNextReading/);
  assert.match(panel, /property var revealedCards/);
  assert.match(panel, /function allCardsRevealed/);
  assert.match(panel, /function revealCard/);
  assert.match(panel, /id:\s*readingRevealDelay/);
  assert.match(panel, /interval:\s*420/);
  assert.match(panel, /REVEAL ALL|REVEAL THE CARD/);
  assert.match(card, /signal revealRequested/);
  assert.match(card, /activeFocusOnTab:\s*true/);
  assert.match(card, /card-back\.png/);
  assert.match(card, /property real flipAngle/);
  assert.match(card, /axis\.y:\s*1/);
  assert.match(card, /Behavior on scale/);
  assert.match(card, /Keys\.on(?:Return|Enter|Space)Pressed/);
  assert.match(card, /hoverEnabled:\s*true/);
  assert.doesNotMatch(card, /loops:\s*Animation\.Infinite/);
});

test("revealed cards open a bounded keyboard-accessible inspection view", () => {
  const panel = fs.readFileSync(path.join(root, "Panel.qml"), "utf8");
  const card = fs.readFileSync(path.join(root, "components/CardFace.qml"), "utf8");
  assert.match(card, /signal inspectRequested/);
  assert.match(card, /if \(!revealed\) revealRequested\(\)[\s\S]{0,100}else inspectRequested\(\)/);
  assert.match(panel, /property bool inspectionOpen/);
  assert.match(panel, /function openInspection/);
  assert.match(panel, /function closeInspection/);
  assert.match(panel, /id:\s*inspectionLayer/);
  assert.match(panel, /root\.inspectionOpen \? 0 : frameBounds\.x/);
  assert.match(panel, /Math\.min\(480/);
  assert.match(panel, /CLICK \/ ENTER \/ ESC TO RETURN/);
  assert.match(panel, /event\.accepted = true/);
  assert.doesNotMatch(panel, /inspection.*Animation\.Infinite/i);
});
