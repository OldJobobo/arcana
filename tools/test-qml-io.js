"use strict";

// All temporary state, cache and subprocess fixtures stay inside this checkout.
const fs = require("node:fs");
const path = require("node:path");
const {spawnSync} = require("node:child_process");
const root = path.resolve(__dirname, "..");
const base = path.join(root, ".release-local");
fs.mkdirSync(base, {recursive: true});
const scratch = fs.mkdtempSync(path.join(base, "qml-io-"));
const qs = spawnSync("which", ["quickshell"], {encoding: "utf8"}).stdout.trim();
if (!qs) throw new Error("quickshell is required");
function run(scenario, state, extra = {}) {
  const result = spawnSync(qs, ["-p", path.join(root, "tests-qml-io.qml"), "--no-duplicate"], {
    cwd: root, encoding: "utf8", timeout: 18000,
    env: {...process.env, XDG_STATE_HOME: state, XDG_CACHE_HOME: path.join(scratch, "cache"),
      QT_QPA_PLATFORM: "offscreen", QML_XHR_ALLOW_FILE_READ: "1", ARCANA_IO_SCENARIO: scenario, ...extra}
  });
  const output = result.stdout + result.stderr;
  if (!output.includes("ARCANA_IO_PASS=" + scenario) || output.includes("ARCANA_IO_FAIL=") || result.error) {
    throw new Error(scenario + " failed:\n" + output + "\n" + (result.error || ""));
  }
  console.log("PASS " + scenario);
}
try {
  const state = path.join(scratch, "fresh-state");
  run("write", state);
  const file = path.join(state, "omarchy", "arcana.json");
  const saved = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!saved.lastReading || saved.lastReading.originalQuestion !== "What can I learn?") throw new Error("disk question missing");
  if (saved.preferences.fullscreen !== true) throw new Error("fullscreen not persisted");
  run("restore", state);
  const restoredPreferences = JSON.parse(fs.readFileSync(file, "utf8")).preferences;
  if (restoredPreferences.uiScale !== 1.5) throw new Error("save after no-op stalled");
  if (restoredPreferences.fullscreen !== true) throw new Error("scale change lost persisted fullscreen");
  for (const invalid of ["{broken", "[]", '{"schemaVersion":99}', ""]) {
    fs.writeFileSync(file, invalid);
    run("invalid", state);
    if (fs.readFileSync(file, "utf8") !== invalid) throw new Error("invalid state overwritten");
  }
  run("recovery", state);
  const blocked = path.join(scratch, "blocked");
  fs.mkdirSync(path.join(blocked, "omarchy"), {recursive: true});
  fs.chmodSync(path.join(blocked, "omarchy"), 0o500);
  try {
    run("unwritable", blocked);
    if (!JSON.parse(fs.readFileSync(path.join(blocked, "omarchy", "arcana.json"), "utf8")).lastReading) throw new Error("retry did not save reading");
  }
  finally { fs.chmodSync(path.join(blocked, "omarchy"), 0o700); }
  const bin = path.join(scratch, "bin");
  fs.mkdirSync(bin);
  fs.symlinkSync("/usr/bin/mkdir", path.join(bin, "mkdir"));
  run("missing-commands", path.join(scratch, "no-commands"), {PATH: bin});
  const record = path.join(scratch, "handoff.json");
  const mock = '#!' + process.execPath + '\n' +
    'const fs=require("node:fs"); const argv=process.argv.slice(2);\n' +
    'if(argv[0]==="default"&&argv[1]==="agent") console.log("release-test");\n' +
    'else if(argv[0]==="agent"&&argv[1]==="prompt"&&argv.length===3) fs.writeFileSync(process.env.ARCANA_HANDOFF_RECORD, JSON.stringify({argv,cwd:process.cwd()}));\n' +
    'else process.exit(1);\n';
  fs.writeFileSync(path.join(bin, "omarchy"), mock, {mode: 0o700});
  const agentState = path.join(scratch, "agent-state");
  run("agent-handoff", agentState, {PATH: bin + path.delimiter + process.env.PATH, ARCANA_HANDOFF_RECORD: record});
  const captured = JSON.parse(fs.readFileSync(record, "utf8"));
  const semantic = JSON.parse(fs.readFileSync(path.join(agentState, "omarchy", "arcana.json"), "utf8")).lastReading;
  if (captured.argv.length !== 3 || JSON.parse(captured.argv[2]).semantic.readingId !== semantic.id) throw new Error("process packet identity mismatch");
  if (captured.cwd !== path.join(agentState, "omarchy", "arcana-agent-context")) throw new Error("agent process escaped isolated context");
} finally {
  fs.rmSync(scratch, {recursive: true, force: true});
}
