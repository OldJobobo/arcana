# Deterministic Interpretation Engine Improvement Research

**Status:** Recorded research findings; implementation direction proposed but not yet approved or implemented.

**Research date:** 2026-09-03

**Related specification:** [`../INTERPRETATION-RESEARCH-AND-SPEC.md`](../INTERPRETATION-RESEARCH-AND-SPEC.md)

## Executive conclusion

Interactive-fiction architecture offers a strong framework for improving Arcana's deterministic interpretation engine. The most useful transfer is not command parsing alone, but the combination of:

1. Inform-style scoped rulebooks and ambiguity handling;
2. Curveship's separation of story/content from discourse/telling;
3. storylet-style eligibility and salience;
4. classical natural-language generation stages: planning, microplanning, and realization.

Together these support interpretations that vary through evidence selection, rhetorical structure, focalization, aggregation, and explicit ambiguity management while remaining local, reproducible, inspectable, and testable.

The recommended direction is an **interpretive IF engine**, not a larger template generator:

```text
reading state
→ scoped semantic activation
→ candidate interpretive propositions
→ rulebook filtering
→ deterministic salience selection
→ rhetorical/discourse tree
→ microplanning
→ surface realization
→ evidence and safety validation
```

## Current implementation findings

The current suite passes, but its assertions mostly certify stable formatting and existing templates rather than the complete interpretation contract.

### 1. Synthesis is primarily concatenation

`src/Arcana.js` builds positioned prose for each card, joins those paragraphs, and appends only the first computed relationship. Patterns and remaining relationships do not shape a new governing proposition.

Result: the output is stable but remains close to three independent card summaries rather than a composed spread-level narrative.

### 2. The alternative is not evidence-backed

Every multi-card reading receives substantially the same alternative. It does not identify an ambiguity axis, cite supporting or counterevidence, materially alter the practical implication, or supply an observable distinguishing question.

This is the clearest instance of **false generativity**: variable inputs appear to yield interpretation, but the rhetorical conclusion is invariant.

### 3. Reversal-mode selection violates the intended policy

The draw path randomly chooses one permitted reversal mode. Invalid or absent mode IDs can silently fall back to the first available or a generic reversal.

The approved research instead requires deterministic precedence:

```text
card-specific reversal support
> spread-position fit
> explicit relationship support
> repeated-theme support
> stable claim-ID tie-break
```

Malformed or unsupported orientation input should fail closed rather than produce plausible fallback prose.

### 4. Relationships are unconditional and contract-incompatible

The runtime assigns every compared pair a relationship such as `mirrors`, `amplifies`, `supports`, `tensions`, `reframes`, or `redirects`. These do not match the approved relationship vocabulary, and the engine does not constrain relations by the spread's declared edges and allowed relation types.

Elemental interaction also behaves as an always-active relationship classifier even though elemental dignities are intended to be optional, disabled by default, and salience-only.

### 5. The semantic corpus cannot support the intended composer

`assets/cards.json` remains schema version 1. It provides prose blobs, keyword arrays, generic source lists, unstructured observations, repeated reversal language, and one reflection string per card.

It lacks the schema-v2 primitives required for deterministic synthesis:

- atomic claim IDs;
- normalized themes;
- provenance kinds and claim-level sources;
- position-specific claim mappings;
- card-specific reversal mappings;
- imagery evidence IDs;
- reflection prompt IDs;
- explicit counterevidence.

Without these primitives, position fit, theme support, sentence-level grounding, and material alternatives cannot be computed reliably.

### 6. Evidence is adjacent to prose rather than attached to it

The composer returns a flat evidence list, but synthesis and alternative sentences do not identify the evidence IDs that justify them. Co-locating evidence and prose does not establish that one follows from the other.

### 7. Validation does not consistently fail closed

Unknown cards may be skipped. Invalid reversal modes may fall back. A spread with the wrong cardinality may internally use the single-card position while retaining the requested spread label.

The composer should reject malformed requests with typed errors before generating interpretation.

### 8. Required contextual inputs are missing

The composition boundary does not accept the original question, normalized question, topic lens, tradition selection, reversal policy, or elemental-dignity preference. Consequently, these cannot participate in deterministic interpretation.

### 9. Pattern extraction is incomplete and decorative

The runtime detects repeated suits, Major density, and reversal density. It does not detect repeated elements, numbers, ranks, courts, normalized themes, image-direction facts, or configurable dignity salience. Existing patterns are returned but do not influence synthesis.

### 10. Much of the corpus is mechanically templated

All cards share repeated rhetorical structures for core meaning, contextual shadow, observed details, and reflection prompts. Variation is often lexical rather than structural or inferential.

### 11. Tests target formatting more than semantic grounding

Current tests check determinism, relationship counts, evidence counts, exact strings, punctuation, and data presence. They do not adequately enforce:

- sentence-level evidence;
- spread-legal relationships;
- unsupported-alternative omission;
- material alternative divergence;
- ambiguity axes and distinguishing questions;
- counterevidence;
- reversal-policy consistency;
- malformed-request rejection;
- theme, court, number, or rank patterns;
- provenance-layer integrity.

## Interactive-fiction framework

### Interpretation as an action pipeline

Inform's action-processing model separates parsing, scope, general interception, preconditions, execution, consequences, and reporting. Arcana can adapt that division:

| IF stage | Arcana equivalent |
|---|---|
| Parse | Normalize the question and requested lens |
| Scope | Limit consideration to current cards, positions, orientations, and enabled methods |
| Before / Instead | Apply safety reframing and prohibit unsupported operations |
| Check | Validate evidence, provenance, edge legality, and prerequisites |
| Carry Out | Activate claims and construct legal relationships |
| After | Detect spread-wide patterns and counterevidence |
| Report | Build and realize the discourse plan |

Every rule should have a stable ID, priority, declared inputs, result, and trace entry.

### Scoped candidate resolution

Inform resolves references within the currently available world before searching more broadly. Arcana should initially scope question references to:

- drawn card instances;
- spread positions;
- active orientations;
- established themes;
- enabled methods;
- recent interpretive focus.

Only then should it search the complete card ontology.

The engine should parse the complete request before resolving individual slots so that later context can disambiguate earlier words.

### Deterministic ambiguity handling

Inform's `Does the player mean…` rules rank possible actions but request clarification when equally plausible candidates remain. Arcana can apply the same principle to:

- blocked versus excessive reversal;
- internal versus external expression;
- court as person versus role versus approach;
- resource versus warning;
- literal question wording versus agency-preserving reframing.

Use a lexicographic precedence tuple rather than probabilities. If two candidates remain materially viable, surface both and ask what observable condition distinguishes them. Otherwise, omit the alternative.

### Semantic content versus narration

Curveship distinguishes the fixed story/content level from the variable way that content is narrated. Arcana should likewise separate:

#### Semantic reading

- card instances;
- positions and orientations;
- activated atomic claims;
- declared relationship edges;
- repeated patterns;
- primary evidence and counterevidence;
- ambiguity axes;
- reflection goals.

#### Narrator specification

- concise versus expanded rendering;
- synthesis-first versus card-first order;
- practical versus reflective emphasis;
- aggregation behavior;
- connective choice;
- referring expressions;
- hedging and rhythm.

Several narrator modes may render the same immutable semantic interpretation. Presentation changes must not change the underlying propositions.

Any seeded variation should occur only at surface realization. It must never choose semantic claims, reversal hypotheses, or relationships.

### Interpretive storylets

An interpretive storylet is an authored rhetorical unit with explicit prerequisites and coverage effects:

```json
{
  "id": "doorway-corrects-friction",
  "requires": [
    "edge:friction-doorway:corrects",
    "doorway:resource-claim"
  ],
  "rhetoricalRole": "resolution",
  "covers": ["friction", "doorway", "spread-relationship"],
  "conflictsWith": ["doorway-continues-friction"],
  "templates": ["reviewed-template-family-id"]
}
```

Candidate selection should apply:

1. hard prerequisite filtering;
2. required-position coverage;
3. specificity;
4. theme centrality;
5. relationship support;
6. non-repetition;
7. stable ID tie-break.

This supplies controlled combinatorial richness without asking a grammar to decide what the spread means.

### Rhetorical tree

The engine should assemble an explicit discourse structure rather than a paragraph list:

```text
primary interpretation
├── governing proposition
├── support
│   ├── Context evidence
│   └── repeated theme
├── tension or qualification
│   ├── Friction evidence
│   └── counterevidence
├── development or correction
│   └── Doorway evidence
└── observable reflection question
```

Connectives should be selected from the rhetorical relation. Surface variation should not be arbitrary synonym replacement.

## Transferable occult and symbolic research

These are engineering translations of symbolic systems, not endorsements of supernatural truth claims.

### Correspondence tables as typed routing matrices

Earlier occult-memory research treats correspondences as routing structures. Arcana can use a typed correspondence matrix:

```text
card claim × position × orientation × spread relation
→ eligible proposition types
→ rhetorical role
→ verification requirement
```

This is safer and more expressive than allowing every keyword to combine with every other keyword.

### Ritual boundaries as lifecycle protocol

The researched circle/operation/closure pattern maps to:

```text
declare scope
→ activate permitted symbolic material
→ compose
→ verify
→ close with a question or experiment
```

An `InterpretationContext` should explicitly declare the enabled tradition, spread, reversal policy, question frame, prohibited operations, and required closure behavior.

### Memory-palace zoning as provenance authority

The prior `Sanctum / Library / Workshop / Crypt` memory model suggests runtime authority zones:

- observed artwork: direct deck evidence;
- historical library: attributed RWS or Golden Dawn material;
- authored workshop: Omarchy translations and selected conventions;
- composer inference: reading-local hypothesis;
- agent output: untrusted non-canonical projection;
- crypt/quarantine: deprecated, contradicted, disputed, or unsafe claims.

These should be runtime types with promotion rules, not documentation labels alone.

### Sigilization as named policy bundles

Compact mode names can expand into inspectable, versioned behavior:

```text
ENERGY_STATE
AGENCY_PRESERVING
NO_PREDICTION
DIGNITIES_DISABLED
PRACTICAL_REFLECTION
```

This supplies symbolic compression without hidden behavior.

### Resolution ladders as invariant multi-view rendering

The memetic research's resolution-ladder concept applies directly to:

- bar summary;
- concise panel;
- expanded explanation;
- copied Markdown;
- bounded agent handoff.

All views should render from one semantic record rather than independently regenerate meaning.

### Symbolic agency as actionable reflection

Interpretation should culminate in an observable question, boundary, small experiment, or comparison between current conditions. Symbolism becomes a tool for thought and action rather than a factual verdict.

### Anti-sycophancy as a mandatory semantic check

Before realization, rules should reject claims that:

- imply supernatural certainty;
- confirm paranoia, grandiosity, or secret knowledge;
- claim another person's private mental state;
- transfer decisions to the cards;
- make weak evidence sound authoritative through polished prose.

Counterevidence and distinguishing questions should be structural requirements, not optional cautionary wording.

### The Fool's Journey as an opt-in sequence grammar

The Fool's Journey can provide emergence, threshold, crisis, recovery, and integration relations only when a spread or method explicitly enables ordered Major-Arcana interpretation. It should not be applied automatically to arbitrary draws.

### Additional comparative inspirations

These external comparisons are design analogies rather than established Arcana rules:

- **Yijing:** distinguish the present configuration from its transformation. A reversal can be represented as `base capacity → current transformed expression` instead of a negative adjective.
- **Geomantic shield charts:** derived figures culminate in a Judge while preserving their derivation path. Arcana can derive a spread-level proposition while retaining a complete audit trail.
- **Ramon Llull's combinatorial method:** finite typed categories and permitted combinations reinforce the value of explicit relation tables over free keyword mixing.

## Proposed runtime model

### Interpretation request

```json
{
  "spreadId": "context-friction-doorway",
  "cards": [],
  "originalQuestion": null,
  "normalizedQuestion": null,
  "topicLens": null,
  "tradition": "arcana-default",
  "reversalPolicy": "energy_state",
  "elementalDignities": false,
  "narratorId": "concise-reflective"
}
```

### Candidate proposition

```json
{
  "id": "candidate-id",
  "claim": "A possible spread-level proposition.",
  "rhetoricalRole": "governing|support|contrast|qualification|resolution|reflection",
  "evidence": ["claim-id", "position:id", "edge:id"],
  "counterEvidence": [],
  "ambiguityAxis": null,
  "covers": ["position:context"],
  "salienceTuple": [0, 0, 0, 0],
  "eligible": true,
  "rejectionReasons": []
}
```

### Generation trace

The result should optionally expose:

- normalized request;
- candidates considered;
- scope decisions;
- rules applied;
- rejection reasons;
- selected propositions;
- rhetorical tree;
- templates and variants used;
- sentence-to-evidence mapping;
- final safety checks.

The trace is an explanation and testing surface, not user-facing interpretive prose by default.

## Recommended implementation order

1. **Schema-v2 semantic corpus** — atomic claims, themes, provenance, position mappings, reversal mappings, imagery evidence, and reflection goals.
2. **Interpretive intermediate representation** — positioned claims, candidate propositions, legal relationships, patterns, counterevidence, and coverage state.
3. **Rulebook engine** — ordered, traceable, and fail-closed.
4. **Alternative gate** — named ambiguity axis, independent support, changed practical implication, and distinguishing question, or omission.
5. **Storylet/content planner** — deterministic selection of a coverage-complete, non-repetitive proposition set.
6. **Rhetorical tree and microplanner** — ordering, aggregation, references, connectives, and hedging.
7. **Surface renderer** — curated phrase families with deterministic local variation.
8. **Contract-focused tests and editorial benchmark**.

## Testing recommendations

Add invariant tests for:

- byte-stable semantic output for identical inputs;
- every generated sentence carrying valid evidence IDs;
- every relationship being legal for the selected spread edge;
- semantic choices never depending on randomness;
- unsupported alternatives being omitted;
- alternatives differing in ambiguity axis and practical implication;
- distinguishing questions naming observable conditions;
- elemental dignity affecting salience only;
- malformed IDs and spread cardinalities failing closed;
- changing narrator mode preserving semantic propositions;
- reordering source JSON not changing interpretation;
- repeated evidence not being double-counted through correlated suit, element, and theme features;
- prohibited predictive and anti-sycophancy language never appearing.

Maintain a curated benchmark of approximately 30–50 editorially reviewed readings covering:

- upright and each supported reversal family;
- all default positions;
- repeated suits, elements, ranks, numbers, and themes;
- court ambiguity modes;
- supportive, contradictory, and neutral relationships;
- cases where no alternative is justified;
- unsafe or agency-transferring user questions.

Editorially reviewed semantic fixtures are more valuable here than large collections of exact prose snapshots.

## Risks

- A discourse planner can make weak associations sound convincing; semantic validation must precede realization.
- More rules increase nonlocal interactions; every rule needs an ID, priority, and trace.
- Stable tie-breaking guarantees repeatability, not quality.
- Correlated suit, element, and theme features can double-count one underlying signal.
- Mechanical schema-v2 migration would preserve the current templating problem unless the 78-card corpus receives genuine editorial authorship.
- Curveship, storylets, Inform, Yijing, geomancy, and Llull provide architectural analogies; none empirically validates tarot interpretation quality.

## Sources

### Project sources

- [`../INTERPRETATION-RESEARCH-AND-SPEC.md`](../INTERPRETATION-RESEARCH-AND-SPEC.md)
- [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md)
- [`../src/Arcana.js`](../src/Arcana.js)
- [`../assets/cards.json`](../assets/cards.json)
- [`../tests/core.test.js`](../tests/core.test.js)
- [`../tests/data.test.js`](../tests/data.test.js)

### Interactive fiction and language generation

- Inform action processing: <https://inform-7-handbook.readthedocs.io/en/latest/chapter_4_actions/action_processing__summary/>
- Inform ambiguity ranking: <https://ganelson.github.io/inform-website/book/WI_17_19.html>
- Curveship concepts: <https://nickm.com/curveship/js/doc/concepts.html>
- Curveship technical reference: <https://nickm.com/curveship/js/doc/reference.html>
- Emily Short, procedural text generation in IF: <https://emshort.blog/2014/11/18/procedural-text-generation-in-if/>
- Emily Short, quality- and salience-based narrative: <https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/>
- SimpleNLG: <https://aclanthology.org/W09-0613.pdf>
- IPOCL narrative planning: <https://jair.org/index.php/jair/article/view/10669>

### Tarot, symbolic systems, and combinatorial methods

- Mary K. Greer, elemental dignities: <https://marykgreer.com/2008/02/05/24/>
- A. E. Waite, *The Pictorial Key to the Tarot*: <https://www.sacred-texts.com/tarot/pkt/index.htm>
- Stanford Encyclopedia of Philosophy, Chinese philosophy of change: <https://plato.stanford.edu/entries/chinese-change/>
- Stanford Encyclopedia of Philosophy, Ramon Llull: <https://plato.stanford.edu/entries/llull/>

### Prior local research consulted read-only

- `Tarot Reading Method.md`
- `Tarot Deck Structure.md`
- `The Fool's Journey.md`
- `Symbolic Agency.md`
- `LLMs as Symbolic Infrastructure.md`
- `Agent Knowledge Routing.md`
- `Anti-Sycophancy Safeguards.md`
- `AI Memory, Occult Memory, and Memetics.md`
- `The Archetype of the Modern Memetic Magician.md`

These vault notes remain research inputs and do not grant publication rights for copied modern prose.
