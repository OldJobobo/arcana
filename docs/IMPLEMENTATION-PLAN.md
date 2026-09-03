# Omarchy Arcana Quickshell Plugin Implementation Plan

> **For Hermes:** Use subagent-driven development to implement this plan task-by-task, with specification and code-quality review before advancing between milestones.

**Goal:** Build a standalone, marketplace-compatible Omarchy Quattro plugin that uses the completed 78-card Omarchy Arcana deck for stable daily cards, deliberate free draws, keyboard-first three-card spreads, deterministic multi-perspective interpretation, and an optional `Ask Your Agent` handoff through Omarchy's configured agent.

**Architecture:** One third-party plugin repository provides a `bar-widget` entry point and a headless QML `service`. `BarWidget.qml` internally owns and loads `Panel.qml`, following the current Quattro details-panel pattern rather than declaring the nested panel as an independent plugin kind. The service owns global daily-card state, randomness, persistence, and multi-monitor synchronization; the panel remains presentation-lazy.

**Tech stack:** Omarchy Quattro, Quickshell/QML, Qt Quick, Quickshell I/O, plain QML-compatible JavaScript, static PNG assets, generated JSON metadata, Python only for development-time asset validation, and the current Omarchy and Marketplace validators.

---

## 1. Product decision

The plugin is **Omarchy Arcana**: a quiet bar sigil that summons a focused floating card panel. It is not a standalone application, Hermes Desktop extension, fullscreen game, generic divination platform, or permanent oversized desktop widget.

The bar widget is the doorway. The floating panel is the experience. The service supplies stable shared state.

### Launch scope

Version 0.1 includes:

- one compact bar-widget instance per configured bar;
- one shared Arcana service for the shell session;
- a nested floating details panel;
- stable daily card;
- deliberate one-card free draw;
- `Context / Friction / Doorway` three-card spread;
- upright and optional reversed orientation;
- authored concise meanings and system lenses;
- source-grounded semantic records with distinct traditional and Omarchy layers;
- deterministic position, orientation, relationship, and spread-pattern synthesis;
- one primary interpretation and at most one evidence-backed alternative;
- `Ask Your Agent` preview and terminal handoff through Omarchy's configured agent;
- local current state and bounded history;
- keyboard navigation;
- reduced-motion mode;
- copy reading as plain text or Markdown;
- 78 optimized card fronts and one reversible card back;
- no direct plugin network access; any network capability of an explicitly launched external agent remains agent-owned and visibly disclosed.

### Deferred scope

Do not include in version 0.1:

- wallpaper generation or automatic wallpaper changes;
- scheduled notifications;
- custom spread builder;
- automatic replacement of canonical meanings with model-generated interpretation;
- automatic ingestion or canonization of agent terminal output;
- account or synchronization system;
- social sharing;
- analytics or personality claims based on draw history;
- full-resolution card assets in the running shell;
- a separate Quickshell process;
- executable runtime helper scripts;
- privileged actions.

---

## 2. Frozen release identity

Use these identities consistently unless the user explicitly changes them before repository creation:

| Identity | Value |
|---|---|
| Product name | `Omarchy Arcana` |
| Repository | `omarchy-arcana` |
| Manifest ID | `org.ministryoftaste.omarchy-arcana` |
| Installed directory | `~/.config/omarchy/plugins/org.ministryoftaste.omarchy-arcana` |
| Bar module name | `org.ministryoftaste.omarchy-arcana` |
| Summon target | `org.ministryoftaste.omarchy-arcana` |

Third-party IDs must not begin with `omarchy.`. The installed folder, manifest ID, module name, summon command, README, tests, and eventual marketplace listing must agree exactly.

---

## 3. Current authoritative inputs

Deck source directory:

```text
/data/.hermes/artifacts/omarchy-arcana/
```

Required source artifacts:

```text
complete-deck/full-deck-manifest.json
complete-deck/web/*.png
card-back.png
MAJOR-ARCANA-GUIDE.md
MINOR-ARCANA-GUIDE.md
VISUAL-GRAMMAR.md
INTERPRETATION-RESEARCH-AND-SPEC.md
```

The plugin consumes cropped `536×786` front illustration plates plus a `600×1050` reversible-back artwork. Quickshell reconstructs each front’s 4:7 frame, rail, typography, metadata, and decorative chrome at runtime, so those UI elements remain sharp at every supported panel scale and in the `480×840` inspection view. The archival `1200×2100` composed cards remain outside the runtime package. Decoded image memory is substantially larger than the compressed PNG package; compositor mipmaps, effect render targets, cache duplication, and allocator overhead can increase live use further.

Current complete-deck verification:

- 78 unique fronts;
- one reversible back;
- canonical order: Major Arcana, Wands, Cups, Swords, Pentacles;
- all archival fronts verified at `1200×2100`;
- portable web archive integrity verified;
- complete web archive SHA-256 at the time of this plan: `c38272b17dd59cd8dfc77c73aaae10f8f6a3fd3fcc064560fe4b29cda1e2e481`.

---

## 4. Marketplace security position

The plugin is designed to receive a clear automated security-baseline disposition.

A representative scan of the proposed sensitive operations against Marketplace baseline version 3 returned:

```json
{
  "outcome": "passed",
  "disposition": "clear",
  "blocksApproval": false,
  "findings": [],
  "capabilities": []
}
```

The checked Marketplace source commit was:

```text
76343c95afef5f79156d1c47a404151af58c78c7
```

The Marketplace describes its verification as limited automated checks or maintainer capability review for one identified commit, not a complete security audit.

### Security constraints

The release must contain no:

- `curl | sh` or equivalent download-and-execute path;
- remote Git source execution;
- unpinned remote build;
- `sudo`, `pkexec`, or sudoers policy;
- package-manager installation command;
- `systemctl`, `systemd-run`, or `.service` unit;
- bundled executable binary;
- executable runtime helper script;
- predictable shared `/tmp` PID state;
- symlink anywhere in the plugin folder;
- install, setup, or uninstall hook;
- direct network request by the plugin itself;
- silent capture of window titles, clipboard, process state, or application content.

The optional agent handoff launches a separately configured Omarchy agent after explicit preview and confirmation. That agent may have command, filesystem, or network capability under Omarchy's normal unattended-mode contract; the plugin must disclose this boundary and must not claim the agent is sandboxed.

A QML `service` entry point is not a system service and does not itself trigger the Marketplace `service-management` capability.

### Approved entropy mechanism

Use a bounded Quickshell process with an argument array:

```qml
command: ["od", "-An", "-N312", "-tu4", "/dev/urandom"]
```

Parse the unsigned integers and perform Fisher–Yates shuffling in QML-compatible JavaScript. Do not invoke a shell, interpolate commands, or silently fall back to `Math.random()`.

---

## 5. Proposed repository structure

```text
omarchy-arcana/
├── manifest.json
├── BarWidget.qml
├── Panel.qml
├── ArcanaService.qml
├── components/
│   ├── CardFace.qml
│   ├── CardReveal.qml
│   ├── SpreadView.qml
│   ├── MeaningPanel.qml
│   ├── InterpretationSummary.qml
│   ├── AgentHandoff.qml
│   ├── HistoryView.qml
│   └── KeyHints.qml
├── js/
│   ├── Deck.js
│   ├── Interpretation.js
│   ├── Handoff.js
│   ├── Shuffle.js
│   └── StateSchema.js
├── assets/
│   ├── card-back.png
│   ├── deck.json
│   ├── sources.json
│   ├── spreads.json
│   └── cards/
│       └── 78 optimized PNG fronts
├── tools/
│   └── build_deck.py
├── tests/
│   ├── test_manifest.py
│   ├── test_assets.py
│   ├── test_deck.py
│   ├── test_repository_contract.py
│   └── js/
│       ├── shuffle.test.js
│       ├── interpretation.test.js
│       ├── handoff.test.js
│       └── state-schema.test.js
├── .github/workflows/validate.yml
├── README.md
├── LICENSE
├── SHA256SUMS
└── .hermes/plans/
    └── omarchy-arcana.md
```

`tools/build_deck.py` is development-time source code, not an installer or runtime helper. It must not modify the user environment, download anything, or execute external content.

---

## 6. Plugin contract

The intended manifest shape is:

```json
{
  "schemaVersion": 1,
  "id": "org.ministryoftaste.omarchy-arcana",
  "name": "Omarchy Arcana",
  "version": "0.1.0",
  "author": "Ministry of Taste",
  "description": "A keyboard-first tarot draw and reflection panel for Omarchy.",
  "kinds": ["bar-widget", "service"],
  "entryPoints": {
    "barWidget": "BarWidget.qml",
    "service": "ArcanaService.qml"
  },
  "barWidget": {
    "defaultSection": "right",
    "allowMultiple": false
  }
}
```

This is a proposed contract until Stage 0 verifies the exact installed Quattro schema. `Panel.qml` is loaded internally by `BarWidget.qml`; it is not declared as a separate `panel` kind in version 0.1.

---

## 7. User experience

### Bar states

- Dim cursor-sigil: today’s card has not been revealed.
- Cyan command node: a daily card is available.
- Brass registration node: today’s card has been revealed.
- Three small nodes: a saved spread is active.

### Pointer actions

- Left click: open or close the panel.
- Middle click: open the daily-card view.
- Right click: Quick Draw, Daily Card, History, Settings.
- Scroll: unassigned to prevent accidental redraws.

### Keyboard map

| Key | Action |
|---|---|
| `Space` / `Enter` | Reveal selected card |
| `1` | Single free draw |
| `3` | Context / Friction / Doorway spread |
| `D` | Daily card |
| `R` | Redraw free draw |
| `Shift+R` | Confirm daily redraw |
| `H` | History |
| `M` | Toggle concise/full meaning |
| `C` | Copy reading as Markdown |
| `A` | Preview `Ask Your Agent` handoff |
| `Left` / `Right` | Select card in spread |
| `?` | Keyboard help |
| `Esc` | Close panel |

### Daily-card invariant

The daily card is selected once for the local date and persisted. Panel reopen, plugin reload, and shell restart must preserve the card and orientation. A daily redraw requires an explicit confirmation and is recorded in history.

### Free-draw invariant

Free draws never replace the daily card. A spread cannot contain duplicate cards. Repeats across separate readings are allowed.

---

## 8. Runtime semantic and interpretation schema

`INTERPRETATION-RESEARCH-AND-SPEC.md` is the authority for semantic records, source precedence, reversal policy, compositional rules, safety language, and agent handoff. Generate `assets/deck.json`, `assets/sources.json`, and `assets/spreads.json` before release. Do not parse guidebook or research Markdown inside QML.

The runtime schema is version 2. Each card must separate:

- identity and asset path;
- observed deck imagery;
- source-grounded traditional claims;
- original Omarchy claims;
- permitted orientation/reversal modes;
- Context, Friction, and Doorway transformations;
- reflection prompts;
- source and provenance references.

Each atomic claim must contain a unique ID, plain-text claim, lens, provenance kind, source references where applicable, and normalized themes. Modern source prose is research material, not redistributable runtime copy. Public card prose must be original and pass editorial review.

The deterministic composer must:

1. preserve the original optional question and show any neutral reframing;
2. apply one explicit reversal policy consistently;
3. transform every card through its position;
4. add only layout-defined or structurally evidenced relationships;
5. extract repeated suit, element, number, rank, Major/Minor, court, orientation, and theme patterns;
6. produce one primary synthesis;
7. produce at most one materially different evidence-backed alternative;
8. provide a distinguishing question;
9. store evidence IDs for every contextual claim;
10. use no model or network call.

Validation requirements:

- exactly 78 records;
- unique card, claim, prompt, source, and image IDs;
- all front illustration files exist at `536×786`, the back artwork remains `600×1050`, and QML supplies the 4:7 card chrome;
- one valid card back;
- traditional and Omarchy layers exist for every card;
- every card supports all three default positions;
- reversal modes are bounded and card-specific;
- court records avoid mandatory gender, age, or appearance assumptions;
- all dynamic text is non-empty, bounded plain text;
- no absolute paths, HTML, or rich-text interpretation;
- no forbidden predictive, diagnostic, guaranteed-timing, or third-party mind-reading language;
- deterministic composer output for identical inputs;
- no pseudo-probability or confidence percentage.

---

## 9. State model

Use XDG state storage rather than writing into the plugin checkout.

Conceptual location:

```text
$XDG_STATE_HOME/omarchy-arcana/
├── current.json
└── history.json
```

If `XDG_STATE_HOME` is unset, use the normal user-state fallback. Resolve the path through current Quickshell/Qt facilities confirmed during Stage 0; do not hardcode `/home/<user>`.

### `current.json`

```json
{
  "schemaVersion": 1,
  "daily": {
    "date": "2026-09-01",
    "cardId": "major-09-hermit",
    "reversed": false,
    "revealed": true
  },
  "activeReadingId": "reading-id",
  "preferences": {
    "reversals": true,
    "reversalPolicy": "energy_state",
    "elementalDignities": false,
    "reducedMotion": false,
    "meaningDetail": "concise",
    "historyLimit": 100
  }
}
```

### History record

```json
{
  "schemaVersion": 1,
  "id": "reading-id",
  "createdAt": "2026-09-01T09:00:00-07:00",
  "kind": "spread",
  "spreadId": "context-friction-doorway",
  "methodVersion": "arcana-composer-v1",
  "originalQuestion": null,
  "normalizedQuestion": null,
  "reversalPolicy": "energy_state",
  "cards": [
    {"positionId": "context", "cardId": "major-09-hermit", "orientation": "upright"}
  ],
  "interactions": [],
  "patterns": [],
  "interpretations": [],
  "agentAssistance": null
}
```

Write atomically after committed actions, not during animations. Bound history by count and reject malformed state fail-closed. Preferences remain selected until the user explicitly changes or resets them. Agent terminal output is not automatically ingested or persisted in version 0.1; `agentAssistance` records only an explicit launch event and method version, not the external conversation.

---

## 10. Rendering and performance policy

- Decode the card back, visible card, and at most adjacent spread cards.
- Do not preload all 78 textures at shell startup.
- Keep the panel presentation-lazy.
- Stop timers, transitions, and image work while hidden.
- Use a service singleton for global state, not one draw engine per monitor.
- Do not retain stale screen or panel references after destruction.
- Use shared `qs.Ui` and `qs.Commons` components and semantic color/style tokens.
- Preserve each canonical illustration crop and semantic-mask registration exactly; construct the surrounding deterministic frame and metadata chrome in QML.
- Use plain text for all dynamic interpretation strings.
- Provide a reduced-motion path using opacity or immediate reveal.
- Avoid shaders, particles, full-screen blur, or continuous animation.

Default reveal sequence:

1. Card back rises a few pixels.
2. A narrow cyan focus line crosses the card.
3. Back/front crossfade or short Y-axis rotation completes.
4. Meaning panel fades in.

---

## 11. Implementation tasks

### Task 1: Inspect the current Quattro contract

**Objective:** Replace proposed API assumptions with facts from the designated Omarchy testbed.

**Inspect:**

- installed Omarchy version;
- built-in clock `bar-widget` and nested panel;
- one built-in `service` plugin;
- manifest schema;
- `Panel`, `KeyboardPanel`, `PanelKeyCatcher`, `FileView`, `Process`, and shared-state APIs;
- plugin validator behavior;
- plugin rescan and summon lifecycle;
- plugin-local asset URL behavior.

**Commands:**

```bash
omarchy version
omarchy plugin --help
omarchy plugin list --json
omarchy plugin validate --help
```

Run the Quickshell shell-inspection script read-only against the relevant checkout if available.

**Gate:** Record exact source paths, installed version, imports, property names, and lifecycle methods in the repository plan before scaffolding.

### Task 2: Create the repository and contract tests

**Files:**

- Create: `manifest.json`
- Create: `tests/test_manifest.py`
- Create: `tests/test_repository_contract.py`
- Create: `LICENSE`
- Create: `.gitignore`

**Tests first:**

- exact manifest ID;
- schema version;
- accepted kinds;
- entry-point files exist;
- no `omarchy.*` identity;
- no symlinks;
- no executable binary or runtime helper;
- no forbidden obsolete IDs;
- repository path and README commands agree.

**Verify:**

```bash
python3 -m unittest discover -s tests -v
omarchy plugin validate .
```

### Task 3: Build and validate the runtime deck

**Files:**

- Create: `tools/build_deck.py`
- Create: `assets/deck.json`
- Create: `assets/card-art/card-back.png`
- Create: `assets/card-art/*.png`
- Create: `assets/card-art-masks/{primary,secondary,fault}/*.png`
- Create: `components/ArcanaCard.qml`
- Create: `tests/test_deck.py`

**Tests first:** Assert exact count, dimensions, path safety, required fields, unique IDs, unique front hashes, back presence, no symlinks, valid provenance, distinct traditional/Omarchy layers, all default position transforms, bounded reversal modes, and forbidden-language checks.

**Implementation:** Copy or transform the already-verified web assets deterministically. Author the semantic corpus using the interpretation specification and the inspected source hierarchy. Do not download assets or copy modern full-prose references into runtime data.

**Verify:**

```bash
python3 -m unittest tests.test_assets tests.test_deck -v
python3 tools/build_deck.py --check
```

### Task 4: Implement pure deck and shuffle logic

**Files:**

- Create: `js/Deck.js`
- Create: `js/Shuffle.js`
- Create: `tests/js/shuffle.test.js`

**Tests first:**

- exact card lookup;
- Fisher–Yates determinism for supplied entropy values;
- no duplicate card in a spread;
- unbiased modulo rejection or equivalent bounded selection;
- reversed-orientation toggle;
- malformed entropy rejection;
- no silent `Math.random()` fallback.

**Runtime:** `Process.command` invokes `od` directly with bounded byte count and output collection.

### Task 5: Implement versioned state normalization

**Files:**

- Create: `js/StateSchema.js`
- Create: `tests/js/state-schema.test.js`

**Tests first:**

- valid default state;
- malformed JSON fail-closed;
- unknown card ID rejection;
- invalid local date rejection;
- bounded history;
- preserved explicit preferences;
- daily-card survival across reopen and restart;
- migration behavior for future schema versions.

### Task 6: Implement the shared service

**Files:**

- Create: `ArcanaService.qml`
- Modify: `manifest.json`

**Behavior:**

- load deck metadata lazily enough to avoid image decoding;
- own daily card and active reading;
- request entropy;
- persist state atomically;
- expose signals/properties for bar and panel;
- own one global state across monitors;
- expose explicit draw methods with immutable request snapshots.

**Verify:** QML syntax, service load, two-monitor state agreement, state persistence after shell restart, and no shell-log errors.

### Task 7: Implement the bar widget and nested panel lifecycle

**Files:**

- Create: `BarWidget.qml`
- Create: `Panel.qml`
- Create: `components/KeyHints.qml`

**Behavior:**

- bar renders the cursor-sigil with redundant shape/state differences;
- nested panel uses the current Quattro anchored-panel pattern;
- `open()`, `close()`, and `opened` follow the installed contract;
- Escape releases focus and closes safely;
- outside click dismisses correctly;
- panel loader unloads only after bindings unwind;
- one plugin ID handles click and summon commands.

**Verify:** click, Escape, shell summon, shell hide, disable, enable, restart, removal, and multi-monitor open placement.

### Task 8: Implement card reveal and daily draw

**Files:**

- Create: `components/CardFace.qml`
- Create: `components/CardReveal.qml`
- Create: `components/MeaningPanel.qml`
- Modify: `Panel.qml`

**Tests/acceptance:**

- first daily open selects and persists one card;
- same local date returns the same card and orientation;
- reveal state survives close/reopen;
- next local date selects a new daily record;
- daily redraw requires confirmation;
- missing asset displays an honest error;
- reduced motion bypasses rotation;
- hidden panel settles to idle.

### Task 9: Implement free draw and three-card spread

**Files:**

- Create: `components/SpreadView.qml`
- Modify: `Panel.qml`
- Modify: `ArcanaService.qml`

**Acceptance:**

- `1` draws one free card without replacing daily state;
- `3` draws three unique cards;
- positions are Context, Friction, Doorway;
- arrows select one spread card;
- redraw changes only the free reading;
- orientation setting is honored;
- card images load current plus adjacent only.

### Task 9A: Implement deterministic interpretation

**Files:**

- Create: `js/Interpretation.js`
- Create: `components/InterpretationSummary.qml`
- Create: `tests/js/interpretation.test.js`
- Modify: `ArcanaService.qml`
- Modify: `Panel.qml`

**Tests first:**

- identical input produces byte-stable semantic output;
- card claims remain separated by provenance layer;
- each card is transformed through its position;
- reversal policy is consistent across one reading;
- only declared layout edges create card relationships;
- repeated suits, elements, numbers, ranks, courts, orientations, and themes are detected deterministically;
- primary synthesis contains position and spread-level evidence;
- alternative is materially different and evidence-backed or omitted;
- distinguishing question names observable alternatives;
- elemental dignities are disabled by default and affect salience only;
- no network/model call, prophecy, diagnosis, guaranteed timing, third-party mind-reading, or pseudo-probability.

**Acceptance:** Concise mode presents a composed reading rather than independent card dumps. Expanded mode visibly separates traditional, Omarchy, orientation, position, relationship, synthesis, alternative, reflection, and source/method layers.

### Task 9B: Implement `Ask Your Agent`

**Files:**

- Create: `js/Handoff.js`
- Create: `components/AgentHandoff.qml`
- Create: `tests/js/handoff.test.js`
- Modify: `Panel.qml`
- Modify: `ArcanaService.qml`

**Verified launch contract:**

```text
getter: ["omarchy", "default", "agent"]
prompted launch: ["omarchy", "agent", "prompt", handoffText]
picker-only: ["omarchy-menu", "summon", "setup.default.agent"]
```

There is no default-agent environment variable. Do not own a provider table or terminal preference. Preserve the handoff as one argv element through `Util.execArgv` or an equivalent non-shell QML API. Set the process working directory to a private existing Arcana state/context directory.

**Tests first:**

- empty getter opens the official picker path;
- configured getter changes the visible action to `Ask <agent> about this reading`;
- exact preview equals the exact sent payload;
- quotes, backticks, `$()`, newlines, leading dashes, and control characters cannot trigger shell interpretation;
- packet is bounded and contains only the current reading;
- no credentials, unrelated history, environment data, clipboard, or window/process context;
- handoff distinguishes canonical, Omarchy, composer, and agent layers;
- power disclosure states that Omarchy's prompted agents may auto-run commands or change files;
- launch requires explicit keyboard-accessible confirmation;
- terminal output is not automatically ingested or canonized.

**Live gate:** On the designated Omarchy VM, launch one harmless advisory packet and verify configured agent, preferred terminal, app ID, visible copy/orientation, working directory, and no shell expansion. This is the first point at which the feature may be described as integrated.

### Task 10: Implement local history and copy actions

**Files:**

- Create: `components/HistoryView.qml`
- Modify: `ArcanaService.qml`
- Modify: `Panel.qml`

**Acceptance:**

- committed readings append once;
- history is bounded;
- selecting a reading restores it exactly;
- dynamic text uses `Text.PlainText` or HTML-escaped shared controls;
- copied Markdown contains only the current reading, provenance-labeled deterministic interpretation, alternatives, and prompts;
- no clipboard monitoring occurs;
- clear-history action requires confirmation.

### Task 11: Accessibility and performance pass

**Verify:**

- every operation has a keyboard path;
- active card has shape/focus redundancy, not color alone;
- text contrast follows active shell tokens;
- reduced-motion preference persists;
- panel works at mixed output scale;
- monitor hotplug does not leave stale panel references;
- hidden plugin performs no timer loop or image churn;
- idle CPU/GPU settles after reveal;
- long-run RSS remains stable;
- image decode remains bounded.

### Task 12: Security, packaging, and exact-tree review

**Create:**

- `SHA256SUMS`
- `.github/workflows/validate.yml`
- production `README.md`

**Run:**

```bash
python3 -m unittest discover -s tests -v
omarchy plugin validate .
qmllint -I "$OMARCHY_PATH/shell" BarWidget.qml Panel.qml ArcanaService.qml components/*.qml
```

Also run the current Marketplace security baseline against the exact candidate commit, including the actual agent getter, picker, and prompted argv launch. Expected disposition:

```text
outcome: passed
disposition: clear
blocksApproval: false
findings: []
capabilities: []
```

Freeze the reviewed tree by commit SHA. Any later edit invalidates the review and requires all gates to rerun.

### Task 13: Live test on the designated Omarchy VM

Development restarts, exclusive focus, synthetic input, and screenshots belong on the dedicated Omarchy testbed VM, not the user’s personal workstation. Do not perform interactive workstation QA without explicit authorization.

**Install candidate:**

```bash
omarchy plugin add <repository-url> --enable
```

**Exercise:**

- bar appearance on all test outputs;
- click/open/close;
- keyboard interaction;
- daily persistence;
- free draw and spread;
- deterministic primary and alternative interpretations;
- `Ask Your Agent` preview, disclosure, confirmation, and configured-agent detection;
- a harmless advisory terminal handoff with exact visible packet verification;
- shell restart;
- plugin disable/re-enable;
- plugin remove/reinstall;
- recent shell logs;
- idle CPU, GPU, and RSS.

Capture only the plugin surface when screenshots could expose unrelated private content.

### Task 14: Publish and verify the artifact

- Push the frozen candidate commit.
- Confirm local and remote default-branch SHA match.
- Confirm clean worktree.
- Clone the public URL into a fresh temporary directory.
- Rerun contract, asset, deck, QML, Omarchy, and security checks.
- Verify hosted CI.
- Submit the exact commit to the Marketplace.
- Report automated verification separately from live Omarchy validation.

---

## 12. Acceptance criteria

Version 0.1 is complete only when:

1. The public repository installs through the normal Omarchy plugin command without hooks or manual dependencies.
2. `omarchy plugin validate` passes on the clean clone.
3. Marketplace baseline returns `passed / clear` for the submitted commit.
4. The real bar widget renders visibly on the designated Quattro testbed.
5. The nested panel opens by click and shell summon, then closes by Escape and shell hide.
6. All 78 fronts and the back are reachable from validated relative paths.
7. Daily card remains stable through panel close, plugin reload, and shell restart.
8. Three-card spreads contain no duplicates.
9. Explicit preferences persist until changed by the user.
10. No network, privilege, package-management, or service-management capability exists.
11. No symlink or executable binary exists in the release tree.
12. Reduced-motion and keyboard-only workflows are complete.
13. Hidden-state CPU/GPU activity settles and memory remains bounded.
14. Independent review covers the exact commit that is published and submitted.
15. All 78 cards have original, editorially reviewed semantic records with distinct traditional and Omarchy provenance.
16. The deterministic composer produces evidence-backed primary readings and omits unsupported alternatives.
17. `Ask Your Agent` uses Omarchy's configured agent and terminal without a plugin-owned provider or terminal setting.
18. The handoff is previewed, bounded, one argv element, power-disclosed, and excludes unrelated context and secrets.
19. Agent-assisted content remains optional, visibly non-canonical, and cannot mutate canonical meanings.

---

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Quattro API drift | Inspect installed first-party examples and record version before implementation. |
| Multi-monitor duplicate daily draws | One global service owns draw state; widgets only present it. |
| Shell memory growth from 79 images | Decode visible and adjacent images only; never preload full deck. |
| Weak randomness | Use `/dev/urandom` through bounded argument-array `Process`; reject failure. |
| Corrupt state after interruption | Validate schema, write atomically, retain safe defaults. |
| Marketplace capability escalation | No helpers, installers, packages, privilege, remote build, systemd, or executable binaries. |
| Modern-source copyright leakage | Use sources for research and attribution; publish original concise prose and run an editorial originality review. |
| Unlimited interpretive vagueness | Require atomic evidence IDs, layout-defined edges, one primary reading, and at most one materially different alternative. |
| Agent prompt shell injection | Preserve the bounded previewed packet as one argv element; never use a shell or concatenated command string. |
| Agent auto-approval side effects | Disclose Omarchy's unattended-mode behavior, require confirmation, request advisory-only startup, and launch from a private neutral context directory. |
| Provider or terminal drift | Use `omarchy default agent`, `omarchy agent prompt`, and Omarchy's terminal launcher; never duplicate provider or terminal tables. |
| Card text too small in narrow panel | Use selected-card focus layout with adjacent-card shoulders and a separate meaning panel. |
| Accidental daily redraw | Separate daily/free state and require confirmation for daily redraw. |
| Plugin identity drift | Contract tests compare manifest, folder, module, summon command, and README. |
| Personal desktop disruption | Perform interactive QA only in the designated Omarchy VM unless explicitly authorized. |

---

## 14. Source references

- Omarchy Plugin Marketplace: <https://plugins.omarchy.org/>
- Marketplace development guide: <https://plugins.omarchy.org/develop/>
- Marketplace publishing guide: <https://plugins.omarchy.org/publish/>
- Official Omarchy Quattro branch: <https://github.com/basecamp/omarchy/tree/quattro>
- Marketplace source: <https://github.com/omacom/omarchy-plugin-marketplace>
- Security baseline policy at inspected commit: <https://github.com/omacom/omarchy-plugin-marketplace/blob/76343c95afef5f79156d1c47a404151af58c78c7/scripts/security-baseline-policy.mjs>
- Security analysis at inspected commit: <https://github.com/omacom/omarchy-plugin-marketplace/blob/76343c95afef5f79156d1c47a404151af58c78c7/scripts/security-baseline-analysis.mjs>
- Security scan scope at inspected commit: <https://github.com/omacom/omarchy-plugin-marketplace/blob/76343c95afef5f79156d1c47a404151af58c78c7/scripts/security-baseline-scope.mjs>
- Interpretation research and contract: `INTERPRETATION-RESEARCH-AND-SPEC.md`
- A. E. Waite, *The Pictorial Key to the Tarot*: <https://sacred-texts.com/tarot/pkt/index.htm>
- Joan Bunning, card interpretation: <https://learntarot.com/less11.htm>
- Joan Bunning, position pairs: <https://learntarot.com/less16.htm>
- Joan Bunning, reversals: <https://learntarot.com/less17.htm>
- Joan Bunning, creating the story: <https://learntarot.com/less18.htm>
- Mary K. Greer, elemental dignities: <https://marykgreer.com/2008/02/05/24/>
- Omarchy AI manual: <https://github.com/basecamp/omarchy/blob/quattro/manual/17-ai.md>
- Omarchy configured-agent getter/setter: <https://github.com/basecamp/omarchy/blob/quattro/bin/omarchy-default-agent>
- Omarchy agent launcher: <https://github.com/basecamp/omarchy/blob/quattro/bin/omarchy-agent>
- Omarchy prompted-agent wrapper: <https://github.com/basecamp/omarchy/blob/quattro/bin/omarchy-agent-prompt>
- Omarchy terminal launcher: <https://github.com/basecamp/omarchy/blob/quattro/bin/omarchy-launch-tui>
- Omarchy argv helper: <https://github.com/basecamp/omarchy/blob/quattro/shell/Commons/Util.qml>

---

## 15. Final implementation instruction

Begin with Task 1 on the designated Omarchy testbed. Do not scaffold from memory and do not modify packaged Omarchy source. Freeze the exact installed contract first, then implement the smallest vertical slice: visible bar sigil → nested panel → real card back → one entropy-backed free draw → safe close/reopen. Expand only after that slice passes live Quattro validation. Build and test the canonical semantic corpus and deterministic composer before enabling `Ask Your Agent`; the agent feature must receive a completed reading packet rather than substitute for missing local interpretation.
