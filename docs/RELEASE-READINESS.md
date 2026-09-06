# Arcana 0.1.0-alpha release readiness

**Local alpha candidate: validated on 2026-09-06 UTC.** No remote publication, release tag, or Marketplace approval is implied. The package checksum is generated alongside the archive in `dist/`, not embedded in this document.

## Automated results

| Gate | Result |
| --- | --- |
| `npm test` | 136 passed, zero failures (including fullscreen geometry/defaults/layout and Marketplace source-inventory regression) |
| `npm run test:qml` | 4 QtTest passes, including setup/cleanup; zero failures |
| `npm run test:qml-service` | Passed: projections, optional empty questions, stale-packet rejection, entropy failure, exact preview/argv contract |
| `npm run test:qml-io` | Passed: 10 real QML I/O scenarios |
| `npm run test:triples` | All 456,456 ordered upright triples; pinned digest matched; 81,980 ms / 409 MB, within 120,000 ms / 1,024 MB budget |
| `node tests/validate-release.js` | Passed: 78 cards, 79 artwork images, 237 disjoint masks; 9 active fault masks |
| `npm run package` / packaging tests | Reproducible runtime-only archive; exact allowlist inventory; SHA-256 sidecar |
| Independent read-only code review | Release baseline, before fullscreen follow-ups: no concrete release blocker identified |

The full local gate is `npm run validate`; it was rerun successfully after the final full-canvas layout revision. The release baseline's Node (129 tests), QML, service, real I/O, and asset checks were also run successfully **inside the VM**. The fullscreen follow-ups add six host-side geometry/default/layout tests and extend the real I/O tests to verify fullscreen persistence across scale changes; a subsequent Marketplace source-inventory regression test also passes; its live VM checks are recorded below. The exhaustive triple performance measurement above is from the host, not the VM or a hosted CI runner.

### Real I/O boundary

`npm run test:qml-io` uses disposable state under the checkout's `.release-local/`, never the user's normal Arcana state. It tests:

- First-run directory creation and queued writes of reading, question, and preferences
- Restart restoration and same-date daily selection reuse
- Unchanged/no-op saves followed by changed saves, without a stuck saving state
- Malformed JSON, empty files, array roots, and unsupported schema preservation
- Repaired-file retry and unwritable-directory recovery, verified on disk
- Missing randomness, clipboard, and default-agent executables with bounded failure
- Explicit real subprocess handoff to a **local command recorder**, checking argument cardinality, reading identity, and the isolated working directory

The command recorder is not an external AI provider. It sends nothing over the network.

## VM acceptance

Target: **Omarchy 4.0.2-1, Quickshell 0.3.1, Qt 6.11.2, Hyprland 0.56.2**, one virtual Wayland output. Tested at **2560×1440**, **1886×1018**, and **1280×720**, output scale 1.

| Check | Observed result |
| --- | --- |
| Extracted archive / `omarchy plugin validate` | Passed |
| Fresh local installation, discovery, enable, summon | Panel and bar widget loaded |
| Bar interaction | Middle-click increments free-draw counter without opening panel; left-click opens panel |
| Keyboard reading flow | Daily/free/spread, sequential Enter reveals, inspection open/Escape dismissal, expand/compact and copy worked |
| Question input | Typed question + Enter updates preview and persists it; Escape releases input focus rather than swallowing navigation |
| Daily redraw | First R preserves selection; second R confirms replacement |
| Clipboard | Real `wl-copy`/`wl-paste` yielded the current reading ID |
| Scaling | 1×, 1.25× and 1.5× selected/persisted; 1280×720 fit retained saved 1.5× preference |
| Fullscreen follow-up | Full button and F11 fill the output at 1886×1018 and 1280×720; Escape returns to framed view without closing; numbered scale selection preserves fullscreen; shell restart restores fullscreen and retains saved scale |
| Independent fullscreen and layout | All three scale keys preserve fullscreen at 2560×1440; both controls stay highlighted. Full-canvas layout, responsive card spacing, and supporting-detail column reflow checked at 1×, 1.25×, 1.5× and 1280×720; framed layout also checked after exiting fullscreen. Workspace geometry tests cover five output sizes, both reading kinds, and every scale. |
| Fullscreen scale correction | VM before/after screenshots at 1886×1018 confirm unchanged card, text, and control sizes at 1.25× while the canvas expands; geometry tests assert identical framed/fullscreen render scale at every supported scale across five output sizes; Node suite rerun with 132 passes |
| Theme response | Arcana/system toggle and live Tokyo Night → Catppuccin Latte change preserved reading identity; text and input contrast hardened |
| Restart | Saved reading and preferences restored; state compared before/after |
| Corrupt state | Visible recovery message; original file preserved; restored backup + Retry loading recovered readiness |
| Date refresh | Simulated a saved prior-date daily record; next daily request generated a fresh seed for the current local date, without changing the VM clock |
| Agent preview, no default agent | Packet visible with explicit no-agent status and chooser; no automatic launch |
| Removal / local reinstall | Removal preserved state and backed up the plugin; validated archive reinstallation supported |

Code hot-reload during file-by-file copying produced transient loader messages in the host shell. The documented installation stages the complete folder before moving it into the plugin directory and waits for asynchronous discovery before enabling it; local upgrades should restart the shell to discard cached QML components.

### Screenshots

Cropped from the VM to show Arcana rather than the surrounding desktop:

- [Daily reading](screenshots/daily.png)
- [Three-card spread](screenshots/spread.png)
- [Reversed card inspection](screenshots/inspection.png)
- [Agent preview at 1280×720](screenshots/agent-small.png)
- [Corrupt-state recovery](screenshots/state-recovery.png)
- [Light system theme](screenshots/light-theme.png)
- [Full-canvas fullscreen at 1.25× with supporting details beside the narrative](screenshots/fullscreen.png)
- [Fullscreen at 1.5× with supporting details below the narrative](screenshots/fullscreen-1.5x.png)

## Marketplace security boundary

Current upstream `omacom/omarchy-plugin-marketplace` revision **af7831e82d571e1369377083718672e65031a951** was checked locally using its unchanged `inspectSubmission`, `assertSubmissionIsUnlisted`, and `runSecurityBaseline` paths. Policy version **3**, selective enforcement.

| Candidate | Inventory | Scanner-selected files / text bytes | Compatibility | Security outcome |
| --- | --- | --- | --- | --- |
| Publishable working-tree source | 398 files | 21 / 276,674 | Passed | `passed`: zero findings, zero capabilities |
| Extracted release archive | 348 files | 12 / 213,791 | Passed | `passed`: zero findings, zero capabilities |

The first source compatibility run **failed** because the tracked generated file `graphify-out/manifest.json` was interpreted as a second plugin manifest. Generated Graphify output was preserved locally outside the publishable tree, removed from the candidate, and added to `.gitignore`. A Git-source inventory test prevents reintroducing this blocker. **Those pending deletions must be included in the release commit**; `.gitignore` alone cannot exclude already tracked files.

These checks use a network-disabled, in-memory GitHub transport fixture serving the exact local candidate bytes. Repository metadata and SHA identities are synthetic transport inputs, **not proof of a public repository or an actual commit**. Upstream scope selection, forced entry points, size limits, file reads, binary handling, manifest/docs validation, and deterministic analysis run unchanged. The plugin ID has no collision in the fetched catalog/retired-ID list; actual repository-URL availability remains unchecked. No root listing preview is present; that is optional, not a failure.

This is a local preflight, not official GitHub snapshot verification, submission, or approval. After publication, the real workflow must check the exact public commit and receive explicit maintainer approval. No scan record from this fixture should be submitted as official evidence. Raw local results and the transport helper remain in ignored `.release-local/marketplace-preflight.json` and `.release-local/marketplace-preflight.mjs`.

The scanner is not a sandbox: Arcana runs inside the shell and intentionally uses local state, entropy, clipboard, agent-discovery, and explicitly requested agent-launch processes.

## Remaining limits

- **No external configured-agent launch was performed:** the VM had no default agent. The no-agent UI and real-process command-recorder handoff passed; provider/terminal integration still needs an opt-in check on a configured system.
- **Hosted CI has not run yet.** The workflow is prepared for Node 22/24, asset/package validation, and exhaustive triple digest verification. QML and live-shell acceptance remain local release gates.
- The exhaustive triple test covers upright cards with reversal policy `none`, not every mixed-orientation combination. Reversals and alternative hypotheses have separate benchmark/matrix coverage.
- Midnight/timezone transitions were not observed in real time; prior-date persistence was tested as described above.
- No multi-monitor, HiDPI output-scale, or older-Omarchy compatibility claim is made.

## Licensing and privacy

Original artwork, masks, authored deck data, and the Major/Minor guides use **CC BY-NC-ND 4.0**; source code uses **MIT**. The archive contains both notices. Questions persist in plaintext with the last reading before agent launch; README and preview disclose this and document recovery/clearing. Clipboard-history retention is separate from Arcana state.
