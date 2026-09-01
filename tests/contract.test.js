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

test("repository contains release documentation and no executable helper", () => {
  for (const file of ["README.md", "LICENSE", "CHANGELOG.md", "INTERPRETATION-RESEARCH-AND-SPEC.md"])
    assert.equal(fs.existsSync(path.join(root, file)), true, file);
  const forbidden = [];
  for (const dir of ["scripts", "bin"]) if (fs.existsSync(path.join(root, dir))) forbidden.push(dir);
  assert.deepEqual(forbidden, []);
});
