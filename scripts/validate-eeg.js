"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const files = ["athena", "bluetooth", "calibration-v4", "calibration-quality", "signal-quality"].map(name => `tests/${name}.test.js`);
const run = spawnSync(process.execPath, ["--test", "--test-reporter=tap", ...files], {
  cwd: root, encoding: "utf8", env: { ...process.env, DEBUG: "" }, windowsHide: true,
});
const output = run.stdout || "";
const total = Number(output.match(/^# tests (\d+)/m)?.[1] || 0);
const passed = Number(output.match(/^# pass (\d+)/m)?.[1] || 0);
const commit = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8", windowsHide: true });
const changes = spawnSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: root, encoding: "utf8", windowsHide: true });
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(),
  commit: /^[a-f0-9]+$/.test(commit.stdout?.trim()) ? commit.stdout.trim() : null,
  workingTreeDirty: changes.status === 0 ? changes.stdout.trim().length > 0 : null,
  scope: "Synthetic packet, DSP, quality and baseline regression only",
  softwareChecksPassed: run.status === 0 && total > 0 && total === passed,
  tests: total, passed, files, hardwareVerified: false, clinicalAccuracyValidated: false,
  nextStep: "Run docs/EEG_VALIDATION.md with actual hardware and independently labelled reference data.",
};
const target = path.join(root, ".tools", "eeg-validation-report.json");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(report, null, 2));
console.info(`EEG software checks: ${passed}/${total}. Report: .tools/eeg-validation-report.json`);
console.info("Hardware compatibility and fatigue accuracy remain unverified by these synthetic tests.");
if (!report.softwareChecksPassed) {
  process.stdout.write(output); process.stderr.write(run.stderr || ""); process.exitCode = 1;
}
