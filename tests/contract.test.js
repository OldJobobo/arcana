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
  assert.equal(manifest.id, "org.ministryoftaste.arcana");
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

test("Quattro service cuts over atomically to validated semantic-v2 assets", () => {
  const qml = fs.readFileSync(path.join(root,"ArcanaService.qml"),"utf8");
  assert.match(qml,/assets\/semantic-v2\/cards\.json/);
  assert.match(qml,/assets\/spreads\.json/);
  assert.match(qml,/Interpretation\.validateCatalog\(deckSnapshot\(\), spreadSnapshot\(\)\)/);
  assert.match(qml,/Interpretation\.migrateState/);
  assert.match(qml,/Arcana\.drawV2/);
  assert.match(qml,/Interpretation\.interpret/);
  assert.match(qml,/Interpretation\.toPanelReading/);
  assert.match(qml,/Interpretation\.buildHandoff/);
  assert.doesNotMatch(qml,/Arcana\.compose|Arcana\.buildHandoff|Arcana\.draw\(/);
});

test("copy and agent handoff use bounded semantic projections without shell interpolation", () => {
  const qml=fs.readFileSync(path.join(root,"ArcanaService.qml"),"utf8");
  const panel=fs.readFileSync(path.join(root,"Panel.qml"),"utf8");
  assert.match(qml,/Interpretation\.copyReading/);
  assert.match(qml,/lastCopyArgv = \["wl-copy", text\]/);
  assert.match(qml,/copyProcess\.command = lastCopyArgv/);
  assert.match(qml,/\["omarchy", "agent", "prompt", root\.agentPacket\]/);
  assert.match(panel,/Qt\.Key_C/);
  assert.match(panel,/C  Copy/);
  assert.doesNotMatch(qml,/bash\s+-lc|sh\s+-c/);
});

test("question submission recomposes before producing the exact preview and argv packet", () => {
  const qml=fs.readFileSync(path.join(root,"ArcanaService.qml"),"utf8");
  const recompose=qml.indexOf("function recomposeWithQuestion(question)");
  const prepare=qml.indexOf("function prepareAgent(question)");
  const guard=qml.indexOf("!recomposeWithQuestion(question)",prepare);
  const serialize=qml.indexOf("Interpretation.buildHandoff",prepare);
  assert.ok(recompose >= 0 && prepare > recompose);
  assert.ok(guard > prepare && serialize > guard);
  assert.match(qml,/currentSemanticReading\.cards\.map/);
  assert.match(qml,/currentReading = Interpretation\.toPanelReading/);
  assert.match(qml,/stateAdapter\.lastReading = reading/);
  assert.match(qml,/agentPacket = Interpretation\.buildHandoff/);
  assert.match(qml,/lastAgentArgv = \["omarchy", "agent", "prompt", root\.agentPacket\]/);
  assert.match(qml,/agentLaunch\.command = lastAgentArgv/);
});

test("state migration precedes restoration and gates every draw", () => {
  const qml=fs.readFileSync(path.join(root,"ArcanaService.qml"),"utf8");
  const migration=qml.indexOf("Interpretation.migrateState");
  const restore=qml.indexOf("currentSemanticReading = migrated.lastReading");
  assert.ok(migration >= 0 && restore > migration);
  assert.match(qml,/readonly property bool ready: semanticReady && cards\.length === 78 && stateMigrationApplied/);
  assert.match(qml,/property int schemaVersion: 2/);
  assert.match(qml,/property var lastReadingSelection: \[\]/);
  assert.doesNotMatch(qml,/lastReading\.schemaVersion === 1/);
});

test("entropy failure cannot fall back to wall-clock or persist a draw", () => {
  const qml=fs.readFileSync(path.join(root,"ArcanaService.qml"),"utf8");
  assert.match(qml,/function failPendingDraw\(\)/);
  assert.match(qml,/if \(entropy === ""\) \{ failPendingDraw\(\); return \}/);
  assert.match(qml,/if \(exitCode === 0\) root\.finishEntropy\(root\.pendingEntropy\)/);
  assert.match(qml,/else root\.failPendingDraw\(\)/);
  assert.doesNotMatch(qml,/Date\.now\(\)/);
});

test("panel concise and expanded views share one reading without developer metadata", () => {
  const panel=fs.readFileSync(path.join(root,"Panel.qml"),"utf8");
  assert.match(panel,/property bool expandedReading/);
  assert.match(panel,/reading\.utterances\.expanded/);
  assert.match(panel,/reading\.utterances\.concise/);
  assert.match(panel,/Qt\.Key_E/);
  assert.match(panel,/E  Compact/);
  assert.doesNotMatch(panel,/evidenceText|methodVersion|evidenceSummary|provenanceSummary/);
  assert.doesNotMatch(panel,/reading\.synthesis \+ "\\n\\n"/);
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
  assert.match(panel, /Colors.*Arcana/s);
  assert.match(panel, /Colors.*System/s);
});

test("system artwork colors use deterministic card-scale contrast fallbacks", () => {
  const panel = fs.readFileSync(path.join(root, "Panel.qml"), "utf8");
  assert.match(panel, /function relativeLuminance\(color\)/);
  assert.match(panel, /function contrastRatio\(first, second\)/);
  assert.match(panel, /function contrastGuard\(candidate, fallback, minimum\)/);
  assert.match(panel, /property color artContrastSurface:\s*"#10151a"/i);
  assert.match(panel, /contrastGuard\(rawArtPrimary, "#469bff", 3\)/);
  assert.match(panel, /contrastGuard\(rawArtSecondary, "#71d4e6", 3\)/);
  assert.match(panel, /contrastGuard\(rawArtFault, "#f15b4a", 3\)/);
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

test("agent preview keeps its action row inside the panel", () => {
  const panel = fs.readFileSync(path.join(root, "Panel.qml"), "utf8");
  assert.match(panel, /id:\s*agentActions/);
  assert.match(panel, /height:\s*Math\.max\(120,\s*parent\.height\s*-\s*y\s*-\s*agentActions\.height\s*-\s*parent\.spacing\s*-\s*18\)/);
  assert.match(panel, /id:\s*agentActions\s*\n\s*height:\s*38/);
  assert.doesNotMatch(panel, /height:\s*parent\.height\s*-\s*172/);
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
  assert.match(panel, /Reveal all three cards|Reveal the card/);
  assert.match(card, /signal revealRequested/);
  assert.match(card, /activeFocusOnTab:\s*true/);
  assert.match(card, /showBack:\s*root\.flipAngle\s*<\s*90/);
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
  assert.match(panel, /Click, Enter, or Esc to return/);
  assert.match(panel, /event\.accepted = true/);
  assert.doesNotMatch(panel, /inspection.*Animation\.Infinite/i);
});

test("card artwork uses reusable theme-aware spot-color masks in reading and inspection views", () => {
  const panel = fs.readFileSync(path.join(root, "Panel.qml"), "utf8");
  const card = fs.readFileSync(path.join(root, "components/CardFace.qml"), "utf8");
  const themed = fs.readFileSync(path.join(root, "components/ThemeCardImage.qml"), "utf8");
  assert.match(themed, /Qt5Compat\.GraphicalEffects/);
  assert.match(themed, /ColorOverlay/);
  for (const role of ["primary", "secondary", "fault"])
    assert.match(themed, new RegExp(`property color ${role}Color`));
  assert.match(card, /ArcanaCard\s*\{/);
  assert.match(panel, /ArcanaCard\s*\{/);
  assert.match(panel, /artPrimary/);
  assert.match(panel, /Color\.accent/);
  assert.match(panel, /Color\.urgent/);
});

test("card structural chrome remains fixed while only semantic masks follow system colors", () => {
  const panel = fs.readFileSync(path.join(root, "Panel.qml"), "utf8");
  const inspection = panel.match(/id:\s*inspectionCard[\s\S]*?ArcanaCard\s*\{([\s\S]*?)\n\s*\}/);
  assert.ok(inspection, "inspection ArcanaCard block");
  const block = inspection[1];
  for (const contract of [
    /backgroundColor:\s*"#07090b"/,
    /frameColor:\s*"#273139"/,
    /artFrameColor:\s*"#36434b"/,
    /inkColor:\s*"#e4e0d6"/,
    /mutedColor:\s*"#899a9c"/,
    /primaryColor:\s*root\.artPrimary/,
    /secondaryColor:\s*root\.artSecondary/,
    /faultColor:\s*root\.artFault/
  ]) assert.match(block, contract);
});

test("release validation deeply checks artwork PNG integrity before accepting it", () => {
  const validator = fs.readFileSync(path.join(root, "tests/validate-release.js"), "utf8");
  assert.match(validator, /function validatePng\(file,expectedWidth,expectedHeight,allowedColorTypes\)/);
  assert.match(validator, /validatePng\(path\.join\(root,file\),expectedWidth,expectedHeight,new Set\(\[2,6\]\)\)/);
  assert.match(validator, /maxOutputLength:expectedLength/);
  assert.doesNotMatch(validator, /const size=pngSize\(path\.join\(root,file\)\),back=/);
});

test("cards construct responsive chrome in QML around illustration-only assets", () => {
  const panel = fs.readFileSync(path.join(root, "Panel.qml"), "utf8");
  const cardFace = fs.readFileSync(path.join(root, "components/CardFace.qml"), "utf8");
  const card = fs.readFileSync(path.join(root, "components/ArcanaCard.qml"), "utf8");
  const validator = fs.readFileSync(path.join(root, "tests/validate-release.js"), "utf8");

  assert.match(card, /property var cardData/);
  assert.match(card, /readonly property bool compact/);
  assert.match(card, /assets\/card-art/);
  assert.match(card, /ThemeCardImage\s*\{/);
  for (const field of ["rankLabel", "domainLabel", "coordinateLabel", "keywordLabel"])
    assert.match(card, new RegExp(`readonly property string ${field}`));
  assert.match(card, /cardData\.title/);
  assert.match(card, /cardData\.systemTitle/);
  assert.match(card, /visible:\s*!root\.compact/);
  assert.match(cardFace, /ArcanaCard\s*\{/);
  assert.match(panel, /ArcanaCard\s*\{/);
  assert.doesNotMatch(panel, /ThemeCardImage\s*\{/);
  assert.match(validator, /expectedWidth=back\?600:536,expectedHeight=back\?1050:786/);
  assert.match(validator, /assets\/card-art/);
});

test("card typography preserves readable secondary hierarchy at compact and inspection sizes", () => {
  const card = fs.readFileSync(path.join(root, "components/ArcanaCard.qml"), "utf8");

  assert.match(card, /readonly property int detailPixelSize:\s*root\.compact \? 9 : Math\.max\(12,/);
  assert.match(card, /readonly property int systemPixelSize:\s*root\.compact \? 10 : Math\.max\(13,/);
  assert.match(card, /readonly property string displayDomainLabel/);
  assert.match(card, /return card\.arcana === "major" \? "Major arcana" : root\.domainLabel/);
  assert.match(card, /minimumPixelSize:\s*root\.compact \? 11 : 16/);
  assert.doesNotMatch(card, /font\.pixelSize:\s*root\.compact \? [78]\b/);
});
