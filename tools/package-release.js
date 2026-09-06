"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {execFileSync} = require("node:child_process");
const root = fs.realpathSync(path.resolve(__dirname, ".."));
const entries = [
  "manifest.json", "ArcanaService.qml", "Panel.qml", "BarWidget.qml", "src", "components",
  "assets/card-art", "assets/card-art-masks", "assets/semantic-v2/cards.json",
  "assets/sources.json", "assets/spreads.json", "LICENSE", "LICENSES", "README.md", "CHANGELOG.md",
  "INTERPRETATION-RESEARCH-AND-SPEC.md", "docs/MAJOR-ARCANA-GUIDE.md", "docs/MINOR-ARCANA-GUIDE.md", "docs/RELEASE-READINESS.md", "docs/screenshots"
];
function releaseFiles() {
  const files = [];
  function visit(relative) {
    const full = path.join(root, relative);
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) throw new Error("Release paths must not be symlinks: " + relative);
    if (stat.isDirectory()) for (const child of fs.readdirSync(full).sort()) visit(relative + "/" + child);
    else if (stat.isFile()) files.push(relative);
    else throw new Error("Release path is not a regular file: " + relative);
  }
  entries.forEach(visit);
  return files.sort();
}
function ownedDirectory(name) {
  const target = path.join(root, name);
  if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw new Error("Output directory is a symlink: " + name);
  fs.mkdirSync(target, {recursive: true});
  if (fs.realpathSync(target) !== target) throw new Error("Output escaped repository");
  return target;
}
function build() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  if (!/^[a-z0-9.-]+$/.test(manifest.id) || !/^[0-9][a-z0-9.-]*$/.test(manifest.version)) throw new Error("Unsafe release identity");
  const dist = ownedDirectory("dist");
  const scratch = fs.mkdtempSync(path.join(ownedDirectory(".release-local"), "package-"));
  const artifact = path.join(dist, "arcana-" + manifest.version + ".tar.gz");
  for (const target of [artifact, artifact + ".sha256"]) {
    if (fs.existsSync(target) && !fs.lstatSync(target).isFile()) throw new Error("Output is not a regular file: " + target);
    if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw new Error("Output is a symlink: " + target);
  }
  try {
    const files = releaseFiles();
    for (const file of files) {
      const target = path.join(scratch, manifest.id, file);
      fs.mkdirSync(path.dirname(target), {recursive: true});
      fs.copyFileSync(path.join(root, file), target);
      fs.chmodSync(target, 0o644);
    }
    // GNU tar provides normalized metadata and stable file order; gzip reads stdin.
    const temporary = path.join(scratch, "release.tar.gz");
    execFileSync("tar", ["--sort=name", "--mtime=@0", "--owner=0", "--group=0", "--numeric-owner",
      "--mode=u+rwX,go+rX,go-w", "-czf", temporary, "-C", scratch, manifest.id]);
    fs.renameSync(temporary, artifact);
    const sha256 = crypto.createHash("sha256").update(fs.readFileSync(artifact)).digest("hex");
    fs.writeFileSync(artifact + ".sha256", sha256 + "  " + path.basename(artifact) + "\n", {flag: fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_NOFOLLOW});
    return {artifact: path.relative(root, artifact), sha256, files: files.length};
  } finally { fs.rmSync(scratch, {recursive: true, force: true}); }
}
if (require.main === module) console.log(JSON.stringify(build(), null, 2));
module.exports = {releaseFiles, build};
