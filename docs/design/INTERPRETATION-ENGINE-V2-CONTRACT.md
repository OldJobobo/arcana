# Interpretation Engine v2 Contract

**Status:** Ratified implementation baseline

This document resolves the identifiers, vocabularies, cardinalities, migration behavior, and deterministic ordering required to begin the v2 pilot. The product and safety requirements in [`../INTERPRETATION-RESEARCH-AND-SPEC.md`](../INTERPRETATION-RESEARCH-AND-SPEC.md) remain authoritative.

## Versions

| Concern | v2 value | Rule |
|---|---|---|
| Deck/card schema | `2` | Independent of reading and state schemas |
| Source schema | `2` | Loaded and validated with the card catalog |
| Spread schema | `1` | Versioned separately because it is new runtime data |
| Reading schema | `2` | Never assigned to migrated v1 prose |
| Method | `arcana-composer-v2` | Identifies v2 semantic interpretation |
| Existing draw stream | `arcana-draw-v1` | Includes legacy draw-time mode RNG consumption |
| Future semantic-only draw stream | `arcana-draw-v2` | Draws only card identity and orientation |
| State schema after cutover | `2` | Migrates selections and preferences, not prose |

`dailyKey()` must depend on local date and draw version, never interpretation method version.

For the production cutover, `arcana-draw-v2` is preferred. Existing persisted daily selections retain their card IDs and orientations. The seeded v1 draw fixtures are frozen before changing the stream; v2 gets new fixtures rather than claiming seed compatibility with v1.

Production entropy failure is an error. `Date.now()` is not an entropy fallback.

## Runtime catalog boundary

The semantic kernel receives:

```text
interpret({ cards, sources }, spreads, request)
```

- `cards` is the validated deck catalog.
- `sources` is the validated provenance catalog.
- `spreads` is the validated spread catalog.
- Every source reference resolves before interpretation begins.
- Production must not load a hybrid v1/v2 card catalog.

## Stable identifiers

IDs use lowercase ASCII letters, digits, periods, colons, and hyphens and match:

```regex
^[a-z0-9][a-z0-9.:-]{0,95}$
```

Canonical forms:

```text
card:       major-09-the-hermit
claim:      major-09-the-hermit.core.discernment
imagery:    major-09-the-hermit.image.solitary-figure
prompt:     major-09-the-hermit.prompt.signal
relation:   relation:context:friction:contrasts
pattern:    pattern:theme:discernment
utterance:  utterance:primary:governing
```

IDs are semantic identity. Array position is never an implicit ID.

## Canonical ordering

Deterministic comparison uses Unicode code-unit ordering implemented with `<` and `>`, not locale collation.

Order-sensitive arrays:

- deck cards by `order`;
- spread positions and edges in authored order;
- selected cards by spread-position order;
- rhetorical utterances by planner order.

Semantically unordered arrays are canonicalized by stable ID before hashing or comparison:

- sources;
- claims;
- imagery observations;
- prompts;
- evidence and counterevidence IDs;
- rule registrations.

## Plain-text bounds

| Field | Maximum characters |
|---|---:|
| ID | 96 |
| Title or label | 120 |
| Theme | 48 |
| Claim or imagery text | 360 |
| Reflection prompt | 280 |
| Original user question | 1,000 |
| Generated utterance | 1,200 |

C0 control characters except line feed and tab are invalid in persisted semantic data. Generated fields are plain text; Markdown escaping belongs to a projection.

## Controlled vocabularies

### Arcana and structure

```text
arcana: major | minor
suit: wands | cups | swords | pentacles | null
element: fire | water | air | earth | spirit
position: single | context | friction | doorway
position agency: descriptive | diagnostic-reflective | conditional
polarity: neutral
```

### Claim dimensions

```text
lens:
  traditional-core | traditional-range | omarchy |
  position-single | position-context | position-friction | position-doorway |
  reversal | structural

orientation:
  upright | reversed | both

tradition:
  rws | golden-dawn-structural | arcana

provenanceKind:
  source-quotation | original-paraphrase | deck-observation |
  omarchy-original | structural-convention | composer-inference |
  agent-assisted
```

`source-quotation` and `agent-assisted` claims are ineligible for canonical runtime prose in v2. They may exist only when explicitly excluded from canonical eligibility.

### Reversal policy and hypotheses

```text
reversalPolicy:
  none | traditional | energy_state | multi_hypothesis

hypothesis:
  reduced | blocked | internalized | private | unavailable | delayed |
  developing | excessive | distorted | misdirected | turning_away |
  reconsidered | released | recovering | traditional_reversed
```

Policy behavior:

- `none`: use upright semantics and select zero hypotheses.
- `traditional`: select `traditional_reversed` for reversed cards; fail if unsupported.
- `energy_state`: select exactly one supported hypothesis for each reversed card.
- `multi_hypothesis`: select one or two materially distinct supported hypotheses for each reversed card. Two modes require an ambiguity axis and a distinguishing question.

Energy-state precedence is:

1. direct card-specific reversal claim;
2. position fit;
3. mode-independent adjacent relationship;
4. spread-wide repeated theme;
5. stable claim ID.

A hypothesis cannot generate or amplify the evidence used to select itself.

Legacy v1 reversal IDs migrate only as non-authoritative hints:

```text
deficient -> reduced | unavailable | delayed
resisted -> blocked | turning_away | reconsidered
releasing -> released | recovering
contextually-shadowed -> no direct mapping; recompute from v2 evidence
excessive -> excessive
```

The engine never copies a v1 mapping directly into `selectedHypotheses`; it selects only modes permitted by the v2 card.

### Relations

```text
reinforces | contrasts | qualifies | continues | corrects | transforms |
releases | returns | reverses | matures | departs | sequence |
cause_effect | figure_direction | elemental_dignity
```

Only a relation listed on the corresponding spread edge is eligible. Spread schema 1 forbids `cause_effect` and `causality: true`; a later schema must explicitly introduce causality. `elemental_dignity` is disabled by default and may alter only documented salience metadata.

A relationship requires at least one explicit evidence channel shared by its endpoints: a normalized theme, equal rank or number, authored sequence membership, compatible observed figure direction, or enabled elemental-dignity rule. Relation-specific minimums are:

```text
reinforces/continues/returns/matures: one shared positive channel
contrasts/qualifies/corrects/transforms/releases/reverses/departs: one shared channel plus authored directional rule
sequence: adjacent authored sequence members
figure_direction: compatible observed direction records on both cards
elemental_dignity: enabled policy plus one declared element rule
```

If no allowed relation meets its minimum, the edge produces no interaction.

### Themes

The pilot vocabulary is intentionally bounded:

```text
agency, ambiguity, attention, beginning, boundary, burden, change,
clarity, collaboration, conflict, connection, courage, discernment,
discipline, exchange, focus, grief, guidance, initiative, integration,
intuition, leadership, momentum, opportunity, perspective, recovery,
release, resilience, rest, risk, skill, solitude, stability, truth
```

Themes use these canonical singular forms. Adding a theme requires a reviewed contract change and fixtures proving it is not a synonym of an existing term.

### Topic lenses

```text
general | work | relationship | creative-practice | wellbeing
```

A topic lens may admit explicitly tagged claims and modify only the documented late salience component. It cannot manufacture evidence, alter provenance, bypass safety rules, or change card identity.

### Narrators

```text
clear-reflective-v1
```

Concise and expanded output are projections of the same semantic reading, not separate narrators.

## Source schema

```json
{
  "schemaVersion": 2,
  "sources": [
    {
      "id": "waite-pkt",
      "author": "A. E. Waite",
      "title": "The Pictorial Key to the Tarot",
      "url": "https://sacred-texts.com/tarot/pkt/index.htm",
      "tradition": "rws",
      "publicationYear": 1911,
      "licenseStatus": "public-domain",
      "use": ["historical-description", "upright", "reversed"]
    }
  ]
}
```

Required source fields are `id`, `title`, `tradition`, `licenseStatus`, and non-empty `use`. `author`, `url`, and `publicationYear` are nullable. Allowed license statuses are:

```text
public-domain | private-reference | original-work | structural-convention
```

Private references support research provenance but their prose is not packaged or copied into runtime claims.

## Card schema

A v2 card requires:

```text
schemaVersion = 2
id, order, arcana, number, rank, title, omarchyTitle
suit, element, image
coreThemes[1..8]
imagery[1..8]
claims[8..32]
reversalModes
positionClaims.single/context/friction/doorway
reflectionPrompts[2..6]
reflectionPromptIds[1..2]
```

Claim record:

```json
{
  "id": "major-09-the-hermit.core.discernment",
  "text": "Protected distance can make a quieter signal easier to discern.",
  "lens": "traditional-core",
  "orientation": "upright",
  "tradition": "rws",
  "provenanceKind": "original-paraphrase",
  "sourceRefs": ["waite-pkt"],
  "themes": ["solitude", "discernment"],
  "topicLenses": ["general"]
}
```

Imagery record:

```json
{
  "id": "major-09-the-hermit.image.solitary-figure",
  "detail": "A solitary figure occupies the card's central field.",
  "kind": "observed",
  "deckSpecific": true,
  "sourceRefs": ["arcana-artwork"]
}
```

Prompt record:

```json
{
  "id": "major-09-the-hermit.prompt.signal",
  "text": "What becomes easier to distinguish when competing demands are reduced?",
  "themes": ["attention", "discernment"]
}
```

Every ID in `reversalModes`, `positionClaims`, and `reflectionPromptIds` resolves within the same card and to the expected record type. Position claims use the matching position lens. Reversal-mode claims use `lens: reversal`, `orientation: reversed`, and at least one theme shared with the card or a position claim.

Court cards additionally require:

```json
{
  "courtModes": {
    "person": ["claim-id"],
    "role": ["claim-id"],
    "approach": ["claim-id"]
  }
}
```

All three modes must be supported. Claims must not require gender, age, appearance, or family hierarchy.

## Spread schema

The catalog has `schemaVersion: 1` and unique spreads. A spread requires:

- `id`, `title`, and `cardCount`;
- exactly `cardCount` ordered positions;
- unique position IDs;
- declared directed edges referencing those positions;
- non-empty allowed relations per multi-card edge;
- optional `centrality` as ordered position IDs.

The single spread has no edges. Context/Friction/Doorway has exactly the three approved edges. No edge enables causality in v1.

## Request contract

Caller-provided fields:

```text
spreadId
cards[{positionId, cardId, orientation}]
originalQuestion? 
topicLens = general
tradition = rws
reversalPolicy = energy_state
elementalDignity = disabled
narratorId = clear-reflective-v1
```

`normalizedQuestion` is engine-owned and caller input with that name is rejected.

The engine preserves the original question and deterministically reframes:

- prediction and guaranteed-outcome requests;
- decision transfer (`Should I ...?`);
- diagnosis;
- inaccessible third-party mental states.

The visible reading stores original text, normalized text, and a reframe reason. Unknown options, duplicate cards, position mismatch, and spread-cardinality mismatch fail closed.

## Reading cardinalities

```text
cards: exactly spread.cardCount
interactions: 0..spread.edges.length
patterns: 0..8
interpretations: exactly 1 primary, plus 0..1 alternative
primary evidence: 1..24
counterEvidence: 0..12 per interpretation
distinguishingQuestions: 0..1
reflectionPromptIds: 1..2
utterances.concise: 1..8
utterances.expanded: 1..16
selectedHypotheses per card: 0..2 according to policy
```

Each utterance is `{ id, role, text, evidence }`, where `role` is `governing`, `support`, `tension`, `development`, `alternative`, or `reflection`. Every utterance records one or more evidence IDs. Each interaction is `{ id, from, to, type, evidence }` and references a declared edge and allowed relation. Each pattern is `{ id, type, evidence }` with non-empty in-reading evidence. An alternative must use a supported ambiguity axis, materially change practical emphasis, and provide one distinguishing question; otherwise it is absent.

Counterevidence uses typed references rather than prose blobs:

```json
{
  "evidenceId": "major-09-the-hermit.reversal.excessive",
  "reason": "supports-competing-hypothesis",
  "targetPropositionId": "proposition:primary"
}
```

Allowed reasons are `supports-competing-hypothesis`, `limits-scope`, `contradicts-relation`, and `weakens-salience`. Every reference must resolve within the current reading.

## Safety eligibility

Before ranking, candidates are ineligible when they assert:

- guaranteed outcomes or timing;
- diagnosis or professional authority;
- inaccessible third-party mental states;
- that the cards should make the user's decision;
- unsupported certainty;
- demographic court-card essentialism.

If safety filtering removes required spread coverage, the planner deterministically replans or returns a typed failure. A final pre-realization assertion checks the complete semantic plan but cannot silently delete propositions.

## Typed errors

```text
UNKNOWN_CARD
UNKNOWN_SOURCE
UNKNOWN_SPREAD
INVALID_SPREAD_CARDINALITY
INVALID_POSITION
DUPLICATE_SELECTION
INVALID_ORIENTATION
INVALID_REVERSAL_POLICY
UNSUPPORTED_REVERSAL_MODE
INVALID_TRADITION
INVALID_TOPIC_LENS
INVALID_NARRATOR
INVALID_REFERENCE
INVALID_SCHEMA
INVALID_TEXT
UNSAFE_UNRESOLVED_REQUEST
NO_COVERAGE_PLAN
```

No typed error includes a partial reading.

## State migration

The v2 state migrator:

1. preserves preferences and counters;
2. preserves persisted daily card IDs and orientations;
3. extracts compact selection from a structurally valid v1 reading;
4. discards v1 `modeId` as semantic authority;
5. recomposes the selection under v2;
6. may attach `legacyOrigin: { readingSchemaVersion: 1 }` to the new v2 record;
7. clears only an unrecoverable last reading;
8. never displays, copies, or hands off stored v1 prose after cutover.

The migration must be installed atomically before schema-v2 state restoration is enabled.

## Compatibility consumer inventory

Current migration consumers are frozen as follows:

| Consumer | Legacy fields | v2 action |
|---|---|---|
| `ArcanaService.qml` composition | `compose(deck, selections, spreadId)` | Build a typed request and call `interpret` |
| `ArcanaService.qml` restoration | reading schema 1, embedded cards | Migrate selection, then recompose v2 |
| `Panel.qml` card layout | `cards[].card`, position and orientation labels | Supply display metadata in `toPanelReading()` |
| `Panel.qml` prose | `synthesis`, `alternative`, `reflection` | Project primary, optional alternative, and prompts |
| `Panel.qml` structure | `relationships[]`, `patterns[]` | Project v2 interactions and patterns as always-present arrays |
| `CardFace.qml` | orientation and orientation label | Preserve visual orientation; derive hypothesis labels separately |
| `buildHandoff()` | embedded cards and legacy prose | Serialize validated v2 semantics and evidence |
| tests/release validator | schema 1, `modeId`, exact prose | Replace atomically at runtime cutover |

## Compatibility projection

During cutover, QML receives arrays even when empty and obtains display metadata without dereferencing the semantic catalog directly. The projection includes:

- compact card instances and display metadata;
- card-instance-keyed `selectedHypotheses` arrays;
- primary synthesis and optional alternative;
- interactions and patterns;
- original and normalized question plus reframe reason;
- distinguishing question and reflection prompts;
- method and provenance summary.

Panel, copied Markdown, preview, and one-element argv handoff are projections of the same immutable reading.

## Editorial acceptance

Each card and batch must pass:

- original wording and source-provenance review;
- traditional/Omarchy layer separation;
- position and reversal specificity;
- packaged-art imagery verification;
- theme-vocabulary discipline;
- court-card anti-essentialism where applicable;
- safety and agency review;
- representative-reading review for usefulness and non-repetition.
