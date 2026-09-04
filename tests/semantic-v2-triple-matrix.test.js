"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const report=require("./fixtures/semantic-v2-triple-matrix.json");
const benchmark=require("./fixtures/semantic-v2-corpus-benchmark.json");
const runner=require("../tools/run-semantic-triple-matrix");

test("latest complete ordered-triple run is pinned to the release candidate", () => {
  assert.equal(report.suiteVersion,1);
  assert.equal(report.outcome,"passed");
  assert.equal(report.candidateDigest,benchmark.candidateDigest);
  assert.equal(report.cases,runner.EXPECTED_CASES);
  assert.equal(report.cases,78*77*76);
  assert.equal(report.complete,true);
  assert.equal(report.shards,78);
  assert.match(report.semanticDigest,/^[a-f0-9]{64}$/);
});

test("ordered-triple suite met the ratified blocking release budget", () => {
  assert.deepEqual(report.blockingBudget,{elapsedMs:120000,peakRssMb:1024,met:true});
  assert.ok(report.observed.elapsedMs > 0 && report.observed.elapsedMs <= report.blockingBudget.elapsedMs);
  assert.ok(report.observed.peakRssMb > 0 && report.observed.peakRssMb <= report.blockingBudget.peakRssMb);
});
