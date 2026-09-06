"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {execFileSync} = require("node:child_process");
const {releaseFiles, build} = require("../tools/package-release");
const root = path.resolve(__dirname, "..");
test("publishable Git source has only the root Marketplace plugin manifest", t => {
  let gitRoot;
  try { gitRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {cwd:root, encoding:"utf8", stdio:["ignore", "pipe", "ignore"]}).trim(); }
  catch { t.skip("source-inventory check requires a Git checkout"); return; }
  if (fs.realpathSync(gitRoot) !== fs.realpathSync(root)) { t.skip("not the owning Git checkout"); return; }
  const paths = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {cwd:root, encoding:"utf8"})
    .split("\0").filter(f => f && fs.existsSync(path.join(root, f)));
  assert.deepEqual(paths.filter(f => /^(?:[^/]+\/)?manifest\.json$/i.test(f)).sort(), ["manifest.json"],
    "Marketplace rejects extra one-level manifests, including generated Graphify manifests");
  assert.ok(paths.every(f => !f.startsWith("graphify-out/")), "generated graph must stay out of publication");
});
test("runtime package is explicit and excludes development/private output", () => {
  const files = releaseFiles();
  for (const name of ["ArcanaService.qml", "Panel.qml", "BarWidget.qml", "assets/semantic-v2/cards.json", "LICENSES/CC-BY-NC-ND-4.0.txt"]) assert.ok(files.includes(name), name);
  assert.equal(files.filter(f => f.startsWith("assets/card-art/") && f.endsWith(".png")).length, 79);
  assert.equal(files.filter(f => f.startsWith("assets/card-art-masks/") && f.endsWith(".png")).length, 237);
  assert.ok(files.every(f => !/^(?:\.git|\.release-local|graphify-out|tests|tools|dist)\//.test(f)));
  assert.ok(!files.includes("assets/cards.json"));
  assert.ok(files.every(f => !f.startsWith("assets/semantic-v2/batches/")));
});
test("archive is reproducible and contains every allowed runtime file", () => {
  const first = build(), second = build();
  assert.equal(first.sha256, second.sha256);
  const listing = execFileSync("tar", ["-tzf", path.join(root, first.artifact)], {encoding: "utf8"}).trim().split("\n").filter(f => !f.endsWith("/"));
  const id = require("../manifest.json").id;
  assert.deepEqual(listing.map(f => f.slice(id.length + 1)).sort(), releaseFiles());
  assert.ok(fs.readFileSync(path.join(root, first.artifact + ".sha256"), "utf8").startsWith(first.sha256));
});
