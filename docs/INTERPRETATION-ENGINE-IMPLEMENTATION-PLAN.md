# Deterministic Interpretation Engine Implementation Plan

**Status:** Active. Milestones 0–6 are complete. The deterministic engine and reviewed 78-card schema-v2 catalog drive the production service through migration-gated state restoration, semantic panel projections, bounded copy and handoff projections, and live QuickShell boundary tests. The digest-pinned 35-reading benchmark remains the accepted corpus gate, supplemented by exhaustive activation and pair matrices, metamorphic invariants, and a blocking digest-verified 456,456-reading ordered-triple release suite.

**Plan date:** 2026-09-03

**Inputs:**

- [`../INTERPRETATION-RESEARCH-AND-SPEC.md`](../INTERPRETATION-RESEARCH-AND-SPEC.md) — authoritative product and safety contract
- [`INTERPRETATION-ENGINE-IMPROVEMENT-RESEARCH.md`](INTERPRETATION-ENGINE-IMPROVEMENT-RESEARCH.md) — implementation research and architectural refinements
- [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md) — broader plugin plan; already substantially implemented

## Goal

Replace the current schema-v1 template composer with a deterministic, evidence-bearing interpretation pipeline that:

- validates requests and fails closed;
- separates draw randomness from semantic interpretation;
- activates atomic claims through position and orientation rules;
- admits only spread-declared relationships;
- detects bounded spread-wide patterns without double-counting correlated evidence;
- selects a coverage-complete primary interpretation;
- emits an alternative only for a genuine supported ambiguity;
- builds prose from a rhetorical plan rather than concatenated card summaries;
- preserves sentence-level evidence, counterevidence, and generation traceability;
- renders concise, expanded, copied, and agent-handoff views from one immutable reading;
- preserves existing card identity, artwork, draw behavior, keyboard interaction, and safe argv launch.

The target is an **interpretive IF architecture**, not a generic IF runtime or unconstrained prose generator.

## Scope

### In scope

- semantic schema version 2;
- versioned spread definitions;
- typed interpretation request and result records;
- a pure deterministic semantic kernel;
- ordered rule tables and a bounded content planner;
- one concise narrator and one expanded projection;
- sentence-to-evidence mappings;
- deterministic reversal-mode selection;
- legal relationship and pattern extraction;
- optional evidence-backed alternative and distinguishing question;
- state migration and compatibility projection;
- complete editorial migration of all 78 cards;
- semantic, exhaustive, metamorphic, QML-boundary, and release tests;
- updated panel, handoff, documentation, and method metadata.

### Explicit non-goals for this plan

- a reusable general-purpose rule-engine framework;
- a full natural-language or IF command parser;
- a cross-deck ontology;
- several narrator personalities;
- semantic randomness or probability scores;
- automatic Fool's Journey, Yijing, geomancy, Llull, or elemental-dignity readings;
- runtime computer vision;
- model-generated canonical meanings;
- automatic ingestion of agent prose;
- persisted full generation traces by default;
- plugin architecture, artwork, theme renderer, or agent-launch redesign.

## Fixed seams

The migration must preserve these already-working boundaries:

- Card IDs, order, titles, system titles, and image paths.
- Card selection and orientation remain entropy-backed in production; any draw-stream change is explicitly versioned and migration-tested rather than described as byte-identical compatibility.
- No duplicate cards within a spread.
- Daily, free, and spread state separation.
- QML array-like normalization at the pure-JS boundary.
- `ArcanaService.qml` as the single production composition and persistence boundary.
- Panel card/reveal/inspection behavior.
- `buildHandoff()` output as one bounded argv element.
- Agent output as optional and non-canonical.

Deck schema, reading schema, state schema, draw version, and interpretation method version must be treated as separate concerns.

## Recommended decisions

These recommendations are ratified in [`INTERPRETATION-ENGINE-V2-CONTRACT.md`](INTERPRETATION-ENGINE-V2-CONTRACT.md):

1. Treat the improvement research as a bounded refinement of the approved base specification, not a replacement for its source hierarchy or safety rules.
2. Use `schemaVersion: 2` for semantic card and reading records.
3. Assign the new method a distinct identifier, recommended `arcana-composer-v2`, so it cannot be confused with the existing `composer-v1` implementation.
4. Introduce a separate draw-algorithm version and decouple `dailyKey()` from the interpretation method. Freeze seeded v1 fixtures before changing RNG consumption. Because removing draw-time `modeId` consumption changes later seeded values, either preserve that consumption as an explicitly ignored compatibility draw or bump the draw version and test the new stream; do not claim both behaviors are identical. Production entropy failure must fail closed rather than fall back to `Date.now()`.
5. Preserve existing persisted daily card identity and orientation during state migration regardless of the chosen future draw stream; discard `modeId` as semantic authority and recompute its reversal hypothesis under v2.
6. Recompute restorable v1 readings from their preserved selection under v2. Never present stored v1 prose or send it to an agent as v2 canonical interpretation.
7. Preserve UI preferences. If a v1 selection cannot be recovered safely, clear only the last reading and report the migration honestly.
8. Keep the current public `cards.json` in production until all 78 schema-v2 records pass editorial and referential validation. Develop against a separate pilot fixture first.
9. Use plain ordered rule data and a small planner before introducing a storylet DSL.
10. Keep elemental dignities disabled by default and prevent them from changing valence or admitting otherwise unsupported propositions.

## Target architecture

```text
cards-v2 + spreads + interpretation request
              │
              ▼
       request validation
              │
              ▼
 eligible upright/reversal candidates
              │
              ▼
 mode-independent position, adjacency, and pattern facts
              │
              ▼
 reversal-policy resolution (zero, one, or two modes)
              │
              ▼
 finalized claims + legal interactions/patterns
              │
              ▼
 candidate propositions + counterevidence
              │
              ▼
 coverage/salience content planner
              │
              ▼
       rhetorical tree / utterances
              │
       ┌──────┴─────────┐
       ▼                ▼
 concise/expanded   agent/copy projection
```

Semantic planning and surface realization must be independently testable.

## Proposed repository changes

```text
assets/
├── cards.json                         # replaced atomically at production cutover
├── sources.json                       # versioned source catalog migrated with cards
├── spreads.json                       # versioned spread grammar
└── editorial-benchmark.json           # semantic constraints, no private prose

src/
├── Arcana.js                          # draw, compatibility façade, handoff utilities
└── Interpretation.js                  # self-contained pure semantic kernel and renderer

tests/
├── fixtures/
│   └── semantic-v2-pilot.json         # representative hand-authored pilot corpus
├── interpretation-schema.test.js
├── interpretation-rules.test.js
├── interpretation-matrix.test.js
├── interpretation-renderer.test.js
├── interpretation-state.test.js
├── core.test.js                       # retained draw and public-boundary tests
└── data.test.js                       # upgraded to strict schema-v2 validation at cutover
```

`Interpretation.js` should remain self-contained and QML-compatible. Do not introduce a build/bundle system merely to split functions. `Arcana.js` remains the stable façade for draw and handoff behavior while `ArcanaService.qml` imports the new engine explicitly.

# Milestones

## Milestone 0 — Ratify contracts and migration policy

### Task 0.1: Record the decision contract

Create a short architecture decision record or add a ratified-decisions section to this plan covering:

- method, deck, reading, state, and draw version identifiers;
- exact schema-v2 field cardinalities;
- controlled theme vocabulary and synonym rules;
- position-claim representation;
- reversal vocabulary and mapping from legacy `deficient`, `resisted`, `releasing`, and `contextually-shadowed` modes;
- relationship eligibility and evidence thresholds;
- counterevidence representation;
- request defaults for tradition, topic lens, reversal policy, dignity policy, and narrator;
- canonical ordering rules and stable ID comparison;
- v1 persisted-state migration behavior;
- editorial originality and acceptance rubric.

### Task 0.2: Freeze a compatibility inventory

Document every current consumer of:

- `reading.cards` and embedded `card` records;
- `synthesis`, `alternative`, and `reflection`;
- `relationships` and `patterns`;
- `orientation`, `orientationLabel`, and `modeId`;
- handoff serialization;
- persisted `lastReading` and `dailySelection`.

### Gate 0

- No unresolved field or ID semantics.
- State migration behavior is explicitly approved.
- Representative schema records are understandable without prose outside the schema.
- No production card editing begins before this gate.

## Milestone 1 — Build strict schemas and a representative pilot

### Task 1.1: Add versioned spread data

Create `assets/spreads.json` containing the single-card and Context/Friction/Doorway spreads, including:

- ordered positions;
- semantic role and agency metadata;
- declared directed edges;
- allowed relation types per edge;
- centrality and causal-policy metadata.

Causality must remain unavailable unless a future spread explicitly enables it.

### Task 1.2: Add a schema-v2 pilot fixture

Create a 12-card hand-authored fixture covering:

- at least three Major Arcana, including a difficult and a restorative card;
- one Ace and several numbered Minor Arcana;
- Page, Knight, Queen, and King;
- repeated suit, element, rank, number, and theme cases;
- each supported reversal family;
- court person/role/approach ambiguity;
- a reading with a valid alternative;
- a reading where an alternative must be omitted.

Recommended anchors include The Fool, The Hermit, and The Tower, but final selection should maximize rule coverage.

### Task 1.3: Implement strict validation

Add pure validation for:

- exact card, source, spread, and reading schema versions;
- card, claim, imagery, prompt, source, rule, and template ID uniqueness;
- reference integrity and expected reference types;
- allowed provenance, orientation, relation, position, and narrator enums;
- required traditional and Omarchy claim layers;
- complete position mappings;
- card-specific reversal mappings;
- bounded plain text and control-character rejection;
- court-mode requirements without demographic essentialism;
- packaged relative image paths;
- spread edge and relation validity;
- cross-file integrity among the card, source, and spread catalogs.

Treat the catalog boundary as `{ cards, sources }`, with spreads passed separately. Migrate `assets/sources.json` to an explicit compatible version in the same candidate-data track as cards; every `sourceRef` must resolve against that loaded source catalog.

Define typed failures such as:

```text
UNKNOWN_CARD
UNKNOWN_SPREAD
INVALID_SPREAD_CARDINALITY
DUPLICATE_SELECTION
INVALID_ORIENTATION
UNSUPPORTED_REVERSAL_MODE
INVALID_REFERENCE
INVALID_SCHEMA
```

Validation failure must return no partial reading.

### Gate 1

- The pilot and spreads pass strict referential validation.
- Unsupported IDs and malformed cardinalities fail closed.
- Reordering semantically unordered data does not alter validated identity.
- Editorial review confirms the schema is practical and not forcing repetitive prose.

## Milestone 2 — Implement the pure semantic kernel

### Task 2.1: Define and normalize the request boundary

Implement a request-oriented API conceptually equivalent to:

```text
interpret({ cards, sources }, spreads, request) -> semantic reading | typed error
```

The caller supplies:

- spread ID;
- compact card selections;
- original optional question;
- optional topic lens;
- tradition;
- reversal policy;
- elemental-dignity setting;
- narrator ID.

The kernel, not the caller, derives and validates `normalizedQuestion`. It preserves the original text, deterministically reframes third-party mind-reading, fate/guarantee, diagnosis, and decision-transferring requests toward the user's observations and choices, and records a safety-reframe reason. Topic lenses may filter explicitly tagged lens claims and adjust a documented late salience component; they may not invent claims, override provenance, or change safety rules. Unknown lenses fail closed.

Metadata such as `createdAt` and reading kind is injected outside the canonical deterministic projection.

### Task 2.2: Separate draw from semantic orientation

Change the target semantic selection contract so it contains only:

- `cardId`;
- `orientation: upright | reversed`.

It must not treat a draw-time reversal meaning as semantic authority. Before changing production draw code, freeze v1 seeded fixtures and implement the Milestone 0 choice: preserve the legacy compatibility RNG consumption or adopt a named new draw stream. In both cases decouple daily persistence identity from `METHOD_VERSION` and fail closed on production entropy failure.

Do not change production persistence until Milestone 5; prove this contract in pilot tests first.

### Task 2.3: Activate candidates and resolve reversal policy in two phases

For every selected card:

1. resolve the card and position;
2. filter claims by tradition, topic lens, and policy;
3. activate upright or eligible reversed hypothesis candidates without selecting among them;
4. compute position facts, provisional adjacent relations, and spread-wide pattern facts using only card identity, position, shared base themes, structure, and authored imagery—never the candidate hypothesis's claims;
5. resolve the reading's policy explicitly:
   - `none`: activate upright semantics and no reversal hypothesis;
   - `traditional`: use only the allowed `traditional_reversed` mode for reversed cards, or fail if the record cannot support it;
   - `energy_state`: choose one supported mode by direct card-specific reversal claim, position fit, mode-independent adjacent relation, repeated theme, then stable claim ID;
   - `multi_hypothesis`: retain at most two materially distinct supported modes and require an ambiguity axis plus distinguishing question;
6. finalize claims and apply position mappings;
7. retain source and provenance types;
8. record unused but relevant claims as possible counterevidence.

A reversal candidate may not create or amplify the evidence used to select itself. Candidate-derived themes enter final relationship and pattern extraction only after policy resolution. The provisional adjacency pass supplies only mode-independent evidence and is replaced by the final legal-interaction pass.

### Task 2.4: Construct only legal interactions

For each declared spread edge:

- enumerate only permitted relation candidates;
- require explicit theme, rank, sequence, imagery, or enabled dignity support;
- omit unsupported relations;
- record rejected candidates and reasons in the optional trace;
- keep dignity influence in salience metadata only.

### Task 2.5: Extract bounded patterns

Detect:

- repeated suit and element;
- repeated number and rank;
- normalized theme recurrence;
- Major/Minor balance;
- court concentration;
- orientation concentration;
- manually authored imagery-direction relations;
- optional dignity salience.

Introduce an `evidenceGroupId` or equivalent mechanism so suit, element, and theme representations of one underlying fact are not counted independently without disclosure.

### Gate 2

- Identical requests produce byte-stable canonical semantic projections.
- Results are independent of draw RNG, wall clock, locale collation, and source registration order.
- Every admitted interaction is spread-legal and evidence-bearing.
- Every rejected interaction has a trace reason when tracing is enabled.
- A reversal hypothesis cannot supply its own selection evidence.
- `none`, `traditional`, `energy_state`, and `multi_hypothesis` each satisfy their explicit cardinality and evidence contract.
- `multi_hypothesis` never surfaces more than two modes and always carries a distinguishing question.
- Unsafe or agency-transferring questions are deterministically reframed before activation, with original text and reason retained.
- Topic-lens effects are traceable and cannot invent evidence.
- Dignities are disabled by default and cannot change valence.
- All malformed inputs fail closed.

## Milestone 3 — Add the planner, rhetorical tree, and renderer

### Task 3.1: Generate candidate propositions

Candidates must contain:

- stable proposition ID;
- rhetorical role;
- claim text or semantic frame;
- evidence and counterevidence IDs;
- ambiguity axis where applicable;
- coverage contributions;
- conflicts;
- deterministic salience tuple;
- eligibility and rejection reasons.

### Task 3.2: Apply semantic safety eligibility before ranking

Before proposition ranking, mark as ineligible any candidate that asserts unsupported certainty, guaranteed prediction or timing, diagnosis, inaccessible third-party mental state, or transfers the user's decision to the cards. Record the rejected candidate and reason in the trace. If this removes required coverage, deterministically replan from eligible candidates or return a typed failure; never emit a partial reading.

After the rhetorical plan is complete, run a separate safety assertion over its semantic frames before realization. This assertion may trigger deterministic replanning or typed failure, but it must not silently delete an utterance or alter evidence.

### Task 3.3: Implement a bounded content planner

Use hard constraints before ranking:

1. cover each required spread position;
2. include at least one spread-level connection for multi-card readings;
3. prevent contradictory proposition selection unless explicitly framed as tension;
4. respect output-density limits;
5. avoid repeated evidence and rhetorical roles;
6. prefer specific support over generic structural conventions;
7. use stable ID as the final tie-break.

Do not use probability or a generic search planner. Plain ordered rule data is sufficient for the first implementation.

### Task 3.4: Gate alternatives

An alternative is legal only when it:

- names one supported ambiguity axis;
- has evidence independent of simple synonym substitution;
- changes the practical emphasis or question;
- carries counterevidence where present;
- produces an observable distinguishing question.

Otherwise store `alternative: null` and no distinguishing question for it.

### Task 3.5: Build a rhetorical tree

Use one initial structure:

```text
governing proposition
├── support
├── tension or qualification
├── development, correction, or release
└── reflection
```

Each realized utterance must retain its role and evidence IDs.

### Task 3.6: Implement one narrator

The first narrator supports:

- concise and expanded projections;
- curated connective families;
- aggregation of related evidence;
- controlled references to cards and positions;
- approved reflective hedging;
- plain text only.

Surface variants, if later added, must be deterministic and must not alter proposition IDs or evidence.

### Gate 3

- Pilot spreads read as spread-level propositions rather than card dumps.
- Every utterance has valid in-scope evidence.
- Unsupported alternatives are absent.
- Changing concise/expanded projection preserves the semantic proposition set.
- Editorial review accepts the pilot benchmark, including contradiction and unsafe-question cases.

## Milestone 4 — Migrate and editorially review all 78 cards

Do not bulk-author production data until Gates 0–3 pass.

### Task 4.1: Generate empty scaffolding only

A development tool may generate stable IDs and empty structural slots from existing card identity data. It must not manufacture:

- claim prose;
- imagery observations;
- reversal applicability;
- position transformations;
- alternatives;
- reflection prompts.

### Task 4.2: Migrate in five reviewable batches

1. 22 Major Arcana;
2. 14 Wands;
3. 14 Cups;
4. 14 Swords;
5. 14 Pentacles.

Only one batch should be actively authored in a worktree at a time unless writers are intentionally isolated and their ID namespaces cannot collide.

### Per-card acceptance

- Stable identity and artwork path are preserved.
- Traditional and Omarchy claims remain distinct.
- Claims use original concise wording with provenance.
- Normalized themes are meaningful and controlled.
- Context, Friction, and Doorway mappings are supported.
- Reversal modes are genuinely card-specific.
- Imagery observations describe the actual packaged artwork.
- At least two useful reflection prompts exist.
- Courts support person, role, and approach without mandatory gender, age, appearance, or family hierarchy.
- No prophecy, diagnosis, guaranteed timing, third-party mind-reading, or copied modern long-form prose appears.

### Per-batch gate

- Strict schema and reference validation passes.
- Editorial originality review passes.
- Representative pilot readings demonstrate meaningful differences rather than shared templates.
- No new uncontrolled theme, reversal, relation, or provenance vocabulary is introduced silently.

### Final corpus gate

- Exactly 78 accepted records.
- No v1/v2 hybrid fields in the candidate production catalog.
- All reference IDs resolve.
- A 30–50 reading editorial benchmark covers the required method matrix.
- The candidate catalog has an accepted digest tied to the benchmark review.

## Milestone 5 — Integrate service, state, panel, and handoff

### Task 5.1: Add a presentation projection

Create `toPanelReading()` or equivalent so QML receives a stable, compact display record. During cutover it should provide:

- card identity and display metadata;
- a card-instance-keyed `selectedHypotheses` array containing zero, one, or two reversal modes according to policy;
- positioned concise text;
- primary synthesis;
- optional alternative;
- distinguishing question;
- relationship and pattern summaries;
- reflection;
- method and provenance summaries;
- original question, normalized question, and safety-reframe reason when present.

Arrays consumed by QML must always exist even when empty.

### Task 5.2: Integrate `ArcanaService.qml`

- Load and validate schema-v2 cards and spreads.
- Build a complete interpretation request.
- Add `recomposeWithQuestion(question)` or equivalent: when the existing agent-question field is submitted, reinterpret the current compact selection with that question and replace `currentReading` with a new immutable reading before previewing or launching the agent. Do not append a question to an already composed questionless reading.
- Preserve both original and normalized question plus any safety-reframe reason in the visible reading record.
- Keep runtime timestamps and reading kind outside canonical semantic hashing.
- Persist compact selections and validated semantic output rather than embedded full deck records where practical.
- Do not fall back to plausible interpretation on schema or request failure.

### Task 5.3: Migrate state

Implement and test an explicit state migration:

- preserve daily card ID and orientation;
- preserve free counter and UI preferences;
- remove legacy semantic `modeId` authority;
- recover compact selections from valid v1 readings;
- recompute recovered readings under v2;
- clear only unrecoverable last-reading data;
- never label or hand off v1 prose as v2 canonical interpretation.

The state container and reading schemas advance independently.

### Task 5.4: Update `Panel.qml`

- Render the alternative heading and body only when an alternative exists.
- Render distinguishing questions conditionally.
- Ensure concise and expanded views derive from the same immutable record.
- Keep card reveal, selection, inspection, keyboard, reduced-motion, and theme behavior unchanged.
- Add a bounded provenance/evidence explanation in expanded mode without dumping the full trace.
- Show the original question and, when changed, the agency-preserving reframing and reason.

### Task 5.5: Add deterministic copied output

Implement a bounded plain-text or Markdown copy projection from the same validated reading. Add an explicit QML clipboard action and tests proving:

- copied primary, alternative, question, and evidence sections preserve semantic IDs;
- absent alternatives produce no empty heading;
- no control characters or accidental markup injection enter the clipboard;
- truncation removes optional sections structurally and declares truncation.

### Task 5.6: Update handoff serialization

Include:

- semantic method and deck versions;
- original question, normalized question, and safety-reframe reason;
- compact card/position/orientation identity;
- activated claim IDs and provenance categories;
- card-instance-keyed selected reversal hypothesis arrays, preserving zero, one, or two modes;
- legal relationships and patterns;
- primary utterances with evidence IDs;
- optional alternative, counterevidence, and distinguishing question;
- reflection prompts and safety contract.

Truncate optional sections structurally. Never remove arbitrary byte suffixes that can leave a partial semantic section. Preserve the exact-preview-equals-exact-argv contract.

### Task 5.7: Update cutover-blocking tests atomically

In the same cutover commit, replace incompatible v1 assertions in `tests/core.test.js`, `tests/data.test.js`, and `tests/validate-release.js`. Remove assumptions that production cards expose `orientationModes`, that readings use schema 1 or `composer-v1`, and that exact legacy prose is canonical. Retain draw, QML-boundary, package, and argv-safety coverage. Milestone 6 adds deeper matrices; it must not be the first point at which the cutover test suite becomes green.

### Gate 5

- Existing daily identity and preferences survive migration.
- A recoverable v1 selection is recomposed as v2 with optional legacy-origin metadata; unrecoverable last-reading data is rejected. Stored v1 prose is never displayed or handed off after cutover.
- State migration is installed atomically before the v2 service can restore persisted data.
- Card visuals and reveal interactions remain unchanged.
- No-alternative fixtures omit the section in semantic output, panel, copied output, and handoff.
- Copy and handoff are bounded projections of the same validated semantics.
- Submitting an agent question first creates a new immutable question-aware reading from the existing selection; panel, copy, preview, and argv all expose the same original/reframed question state.
- An end-to-end QML-boundary test protects that recomposition order.
- A `multi_hypothesis` fixture proves both modes and its distinguishing question survive panel, copy, preview, and the exact one-element argv packet.
- The agent packet is generated only from validated v2 semantics.
- The complete cutover test suite is green.
- Node and live QML produce equivalent canonical semantic projections.

**Completion:** Gate 5 passed after independent review. Runtime assets cut over atomically to schema v2; recoverable persisted selections are recomposed rather than trusted, entropy and migration failures remain closed, concise/expanded panel views share one immutable reading, and Qt6 plus live QuickShell service-boundary tests verify question recomposition, copy, preview, and exact one-element argv handoff.

## Milestone 6 — Upgrade tests and release gates

### Task 6.1: Complete invariant-focused coverage

The incompatible v1 assertions are replaced in Milestone 5. Here, add broader invariant coverage while keeping exact wording checks only for deliberate editorial regressions. Prefer assertions over:

- selected proposition IDs;
- required and forbidden evidence IDs;
- coverage;
- legal relation sets;
- ambiguity axes;
- alternative presence;
- trace reconstruction;
- renderer hygiene.

### Task 6.2: Add exhaustive cheap matrices

Run in normal CI when measured cost remains acceptable:

- every card × every default position × upright and each supported reversal mode;
- every declared spread edge × every ordered pair of distinct cards in upright/upright form: `3 × 78 × 77 = 18,018` base pair cases;
- reversal interaction through a test hook that supplies each card's allowed hypothesis on both left and right sides against representative partners for every relation family; this is exhaustive over hypothesis/rule-family coverage, not the Cartesian product of all orientation-mode pairs;
- every supported claim/template family through text hygiene and forbidden-language checks;
- every malformed enum and missing-reference category.

### Task 6.3: Add deterministic metamorphic tests

Verify that:

- repeated and fresh-process runs match byte-for-byte on the canonical semantic projection;
- reordering unordered cards, claims, sources, or rules does not alter results;
- ordered spread positions remain order-sensitive;
- narrator changes preserve semantic propositions and evidence;
- adding ineligible claims or disabled-method data cannot change output;
- removing alternative-only support removes only the alternative;
- enabling dignity changes only documented salience fields;
- every selected proposition can be reconstructed from the trace;
- no evidence comes from undrawn cards.

Use a test-local deterministic generator independent from production RNG.

### Task 6.4: Add a bounded scheduled semantic suite

The full ordered upright triple matrix is `78 × 77 × 76 = 456,456` readings. Make it a non-blocking scheduled suite unless measurement shows it completes within an approved release budget recorded at Gate 6 (recommended starting threshold: 120 seconds wall time and 1 GiB peak RSS on the reference CI runner). If it exceeds that budget, retain deterministic shards and require one complete scheduled pass against every release candidate before exact-tree publication, without blocking ordinary commits.

Do not multiply the complete triple matrix by every reversal combination. Cover every reversal hypothesis and rule family at activation and through the explicit pair test hook, then use deterministic covering cases for multi-card reversal interactions.

### Task 6.5: Upgrade release validation

Replace relationship-count smoke checks with:

- strict schema and method checks;
- one curated legal-relation reading;
- one verified no-alternative reading;
- canonical semantic determinism digest;
- benchmark/deck digest agreement;
- fail-closed malformed request;
- retained package, asset, security, and capability checks.

### Gate 6

- `npm test` passes schema, rules, matrix, metamorphic, renderer, state, and benchmark tests.
- `npm run validate` passes packaging and semantic release checks.
- No semantic use of legacy blobs or fallback prose remains.
- Every utterance has evidence and every relation is spread-legal.
- Base pair, reversal-rule-family, and metamorphic suites pass within an observed CI resource budget.
- The most recent complete scheduled triple-matrix run passes against the release candidate; it becomes a blocking release command only if it meets the ratified time/memory budget.
- Human editorial review signs off originality, ambiguity handling, counterevidence, safety, and practical usefulness.

**Completion:** Gate 6 passed after independent review. Normal tests now cover all card/position/reversal activations, all 18,018 ordered spread-edge pairs, explicit accepted/shadowed/rejected relation families, malformed request enums, deterministic metamorphic properties, trace reconstruction, cached-interpreter parity, and projection invariants. The complete 456,456-reading ordered upright triple matrix runs in deterministic card-major shards, verifies its fresh semantic digest against the pinned release report, and met the ratified 120-second/1-GiB blocking budget. Release validation adds curated legal-relation and no-alternative readings, canonical semantic digest checks, malformed-request failure, and legacy-runtime exclusion. The previously accepted editorial corpus remains unchanged.

## Milestone 7 — Live verification and exact-tree release review

On the designated Omarchy VM:

1. Install or link the exact candidate tree.
2. Verify fresh-state and migrated-state startup.
3. Exercise daily, free, and Context/Friction/Doorway readings.
4. Confirm deterministic recomposition across panel close and shell restart.
5. Confirm alternative sections appear only when justified.
6. Compare concise, expanded, copied, and handoff views for semantic identity.
7. Verify the exact handoff preview reaches the configured agent as one argv element.
8. Confirm no QML errors, stale references, state corruption, or new idle activity.
9. Run the current Marketplace validator against the exact candidate commit.

### Gate 7

- Live QML behavior matches Node semantic results.
- State migration is observed, not merely unit-tested.
- Agent handoff remains bounded, disclosed, and non-canonical.
- Exact-tree validation and all release gates pass on the commit intended for publication.

# Verification ladder

Use the cheapest decisive check first:

1. schema and referential integrity;
2. isolated rule tests;
3. semantic kernel and trace tests;
4. card/position/reversal activation matrix;
5. ordered-pair relation matrix;
6. metamorphic and fresh-process determinism;
7. 30–50 reading editorial benchmark;
8. panel/state/handoff integration;
9. release-scale ordered triples;
10. live Quattro and exact-tree Marketplace validation.

Structural tests can prove grounding and consistency. They cannot prove that a reading is insightful; the editorial benchmark remains a required gate.

# Editorial benchmark contract

Store public semantic constraints rather than copied private-source prose:

```json
{
  "request": {},
  "requiredPositionClaimIds": [],
  "requiredEvidenceIds": [],
  "forbiddenEvidenceIds": [],
  "allowedPrimaryPropositionIds": [],
  "expectedAmbiguityAxis": null,
  "alternative": "required|forbidden|optional",
  "requiredCoverage": ["context", "friction", "doorway"],
  "safetyReframe": "required|forbidden",
  "approval": {
    "methodVersion": "arcana-composer-v2",
    "deckDigest": "...",
    "reviewed": true
  }
}
```

Cover:

- every default position;
- every reversal family;
- repeated suit, element, number, rank, court, and theme patterns;
- each legal relationship class;
- supportive, contradictory, and neutral arrangements;
- court ambiguity modes;
- valid and invalid alternatives;
- counterevidence;
- agency-transferring and unsafe questions.

# Delivery strategy

Use serial, independently reviewable milestones:

1. contract decision;
2. pilot schema and validator;
3. semantic kernel;
4. planner and renderer;
5. five editorial corpus batches;
6. one atomic runtime cutover;
7. release hardening and live verification.

Keep one writer in the active worktree. Parallelize read-only schema review, editorial review, semantic verification, and QML validation. Do not run multiple corpus writers against one shared `cards.json`.

Recommended commits should be milestone-shaped and leave `npm test` green. Do not commit a partially migrated production catalog that the live plugin can load.

# Risks and mitigations

| Risk | Mitigation |
|---|---|
| Schema authored before its usefulness is proven | Use a 12-card pilot before touching all 78 records |
| Deterministically weak output | Require a reviewed benchmark, not only repeatability |
| Rule interactions become opaque | Stable rule IDs, explicit priority, optional trace, rejection reasons |
| Correlated signals inflate salience | Group related suit/element/theme evidence |
| Bulk prose remains templated | Editorial batch gates and diversity review |
| Copyright leakage from modern references | Original wording, provenance, private-source attestation only |
| Better prose creates false authority | Semantic safety checks before realization and preserved counterevidence |
| Schema-v2 breaks QML | Presentation projection and Node/QML boundary tests |
| Persisted v1 prose is mistaken for v2 | Recompute from selection; never promote legacy prose |
| Method change rerolls daily identity | Separate draw version from interpretation method |
| Alternative omission breaks UI | Add null/empty integration fixture before cutover |
| Handoff truncation corrupts sections | Structural optional-field truncation with exact preview testing |
| Full combinatorial CI becomes expensive | Layered matrices, measured budget, sharded release suite |
| Plan expands into a generic IF framework | One spread, one narrator, plain rule tables first |

# Completion criteria

The findings are considered applied only when:

1. all 78 cards use accepted schema-v2 semantic records;
2. semantic selection is deterministic and independent of draw randomness;
3. malformed requests fail closed;
4. every realized utterance carries valid evidence;
5. every interaction is legal for its declared spread edge;
6. patterns influence selection without hidden double-counting;
7. primary interpretation is a composed spread-level proposition;
8. unsupported alternatives are absent;
9. supported alternatives name an ambiguity axis and distinguishing question;
10. concise, expanded, copied, and handoff outputs preserve one semantic interpretation;
11. state migration preserves selections and preferences without canonizing v1 prose;
12. automated, editorial, live QML, agent-handoff, and exact-tree release gates pass.
