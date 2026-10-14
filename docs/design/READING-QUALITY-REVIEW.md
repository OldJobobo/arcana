# Arcana reading-quality review

**Recorded:** 2026-10-14  
**Status:** Reference review; recommendations are not an approved implementation plan.  
**Scope:** Current local working tree, including uncommitted changes; not solely the published alpha baseline.

## Executive conclusion

Arcana's biggest improvement opportunity is making its existing semantic depth visible in the reading, rather than adding more machinery. The project has a strong foundation, but some distinctions it carefully computes never reach the prose.

Preserve the original deck, system metaphors, keyboard-first ritual, local deterministic core, and explicit agent consent. Those are Arcana's identity. Focus improvement on:

1. Rendering the selected reversal meaning.
2. Defining the local-reading versus question-application boundary.
3. Exposing meaningful scoring ties without presenting ID order as contextual insight.
4. Moving audit boilerplate behind the reading.
5. Adding editorial tests alongside structural tests.

## Origin and evidence boundary

This review followed an Arcana reading asking **“how can arcan be improved?”** The spread was:

| Position | Card | Orientation / selected mode |
| --- | --- | --- |
| Context | Ten of Wands — Workload Saturation | Reversed / excessive |
| Friction | Three of Cups — Shared Channel | Upright |
| Doorway | The Tower — System Failure | Upright |

The tarot is a creative design lens, not evidence of actual project conditions. In particular, the spread does not establish that the project has an overloaded maintainer, a noisy contributor group, or a failed architecture.

The technical findings came from read-only inspection of source, catalog data, tests, documentation, and a saved screenshot, plus in-memory calls to the JavaScript interpreter. The review did not change files, launch the plugin, access a provider, or run the release suite. This document was subsequently saved at the user's request.

Files inspected included:

- `src/Interpretation.js`, `src/Arcana.js`, `ArcanaService.qml`, and portions of `Panel.qml`.
- `assets/semantic-v2/cards.json` and `assets/spreads.json`.
- Planner, projection, metamorphic, corpus-benchmark, and triple-matrix tests.
- `tools/run-semantic-triple-matrix.js` and `.github/workflows/validate.yml`.
- `README.md`, `CHANGELOG.md`, `docs/RELEASE-READINESS.md`, and interpretation design records.
- The existing `docs/screenshots/spread.png`; it is a historical screenshot, not a fresh verification of the changed UI.

The release-readiness document records an older validated baseline. Its results were not rerun for the working tree reviewed here. Historical v1 research records were treated as context, not as proof that their old defects still exist.

## 1. Ten of Wands: use the meaning Arcana already carries

### Verified finding: selected reversals disappear from primary prose

For the exact spread above, Arcana selects this reversed Ten of Wands claim:

> Responsibility has expanded beyond sustainable capacity and is crowding out effective action.

The primary reading prints the position claim instead:

> The work has advanced, but its many demands are now concentrated into a heavy final load.

Changing the Ten of Wands to upright in memory left the entire primary synthesis identical.

The finding extends beyond that spread:

| Read-only comparison | Observed result |
| --- | --- |
| Each of the 78 cards as an upright versus reversed single draw, using `energy_state` | Identical primary prose for all 78 |
| Reversal candidates tied on substantive scoring fields in those reversed single draws | All 78 |

These observations concern primary prose and single-draw scoring, respectively. They do not establish that every mixed-orientation spread has identical interactions, patterns, or scores.

### Cause

In `src/Interpretation.js`:

- `positionCandidate()` attaches the selected reversal claim's ID to the evidence.
- Its displayed `claim` remains the fixed position sentence.
- `renderPlan()` adds traditional and Omarchy support in expanded mode, but does not add the selected reversal's text.

Arcana knows the reversal, labels it, and cites it, but does not explain what it changes in the main interpretation. Evidence membership alone does not establish that the cited meaning has been expressed.

### Proposed improvement

Have each position interpretation express:

1. What the card means in this position.
2. How the selected orientation modifies that meaning.

For this Context card, an illustrative revision is:

> The work has advanced, but responsibility now exceeds sustainable capacity. The useful move is to reduce the load, not merely increase throughput.

This is proposed copy assembled from existing authored meanings, not current runtime output. It does not require an LLM, a new ontology, or hundreds of additional claims.

**Acceptance criterion:** when an authored reversal materially differs from upright, the reader can identify that difference from the interpretation, not just the orientation badge.

**Source anchors:** `positionCandidate()`, `selectedReversalClaim()`, and `renderPlan()` in `src/Interpretation.js`.

## 2. Three of Cups: distinguish voices instead of blending them

### Verified finding: the layers are valuable, but their transformation is implicit

Arcana has three distinct interpretive voices:

- Traditional tarot meaning.
- The original system metaphor.
- Position-specific application.

The Three of Cups in this reading illustrates their value:

| Layer | Authored meaning |
| --- | --- |
| Traditional | Companionship and support within a trusted circle |
| System | Distinct contributions routed through a shared channel |
| Friction | Belonging becoming noisy enough to obscure boundaries or purpose |

Those layers are not redundant. Together they explain why a generally supportive card can occupy Friction. But the concise reading presents the friction conclusion without explaining that transformation. A reader may reasonably ask why an upright celebration card became a warning about group dysfunction.

### Proposed improvement

Keep the concise surface small, but add an interpretive bridge. Illustrative copy:

> Shared support is available; the friction is whether participation has become noisy enough to obscure boundaries or purpose.

Inspection or expansion can explain:

- The card's core meaning.
- What its position changes.
- What its orientation changes.
- What the system metaphor adds.

The current panel already labels position sentences, and readable versus evidence copy are already separated. These are good recent improvements, not missing features. The remaining opportunity is explanatory hierarchy, rather than more controls or labels.

The wording should also distinguish a reflective possibility from an established fact. “Group belonging is becoming noisy” does not prove that Arcana actually has a noisy contributor group.

**Acceptance criterion:** a reader can explain why this card takes a different emphasis in Friction without needing to infer the author's logic from disconnected layers.

**Source anchors:** Three of Cups claims in `assets/semantic-v2/cards.json`; `toPanelReadingValidated()` and copy projections in `src/Interpretation.js`; narrative rendering in `Panel.qml`.

## 3. The Tower: examine what “interpretation” currently means

### Premise to test

> Does selecting evidence-linked sentences amount to composing a meaningfully contextual reading?

Arcana's v2 architecture genuinely improves on its earlier design: validation, candidate selection, planning, rendering, and projections are separate. However, the current corpus substantially limits the choices available to that architecture.

### Verified catalog observations

- 78 cards and 750 claims.
- Every current claim has only the `general` topic lens.
- Every card has exactly one claim per supported position.
- The service always requests `topicLens: "general"`.

Consequently, position planning mostly selects the one authored sentence available, rather than choosing among contextually distinct position interpretations.

### Verified question comparison

With the same cards and settings, comparing:

> how can arcan be improved?

against:

> How can I improve a friendship?

produced identical primary prose.

The question is normalized, persisted, included in reading identity, and sent to the agent. The local composer does not use its substance to shape these position interpretations.

### Proposed product decision

Choose and clearly describe one of these boundaries:

**A. Question-independent local reflection**

- Local Arcana produces a card-and-position reflection.
- The optional agent applies that reflection to the user's question.
- The UI makes that division explicit.

**B. Question-sensitive local interpretation**

- Local Arcana uses controlled contextual input to alter eligible claims or emphasis.
- A small explicit topic selector is a more bounded starting point than unrestricted question parsing.
- Authored topic distinctions must actually exist in the corpus before the selector promises them.

Neither boundary is inherently wrong. Settle the boundary before expanding the corpus, so more claims do not become more maintenance without improving the reading.

**Acceptance criterion:** the product states what the question affects, and tests verify that stated behavior. Question sensitivity should not be implied merely because the question changes a reading ID.

**Source anchors:** `composeSemantic()` in `ArcanaService.qml`; `canonicalRequest()`, `eligibleClaim()`, and `positionCandidate()` in `src/Interpretation.js`; `assets/semantic-v2/cards.json`.

## 4. Reversal ambiguity needs honesty, not arbitrary confidence

### Verified finding: substantive ties fall through to stable IDs

The reversal scoring contract has sensible precedence:

> Card-specific support → position fit → adjacent relationship → repeated theme → stable claim ID.

In the 78 reversed single-draw comparisons, the meaningful score components tied between available energy-state hypotheses. Stable claim ID therefore decided the selected mode.

The Ten of Wands illustrates the practical difference:

- **Excessive:** overload still expanding.
- **Released:** a burden becoming available to set down.

Alphabetical ordering makes output reproducible. It does not establish which condition fits the user. The tie-break is permitted by the deterministic contract; the improvement concerns how much contextual authority its result is given.

### Proposed improvement

When substantive scores tie, distinguish a deterministic default from a context-supported selection. Illustrative copy:

> Arcana's default emphasis is overload. Another available expression is releasing the burden. Which is more observable: accumulating responsibility, or actively setting it down?

The engine already supports materially different alternatives and distinguishing questions under `multi_hypothesis`. The normal service path uses `energy_state` or `none`, so that capability is not part of the ordinary reading flow.

Do not add endless alternatives. Surface one only when it genuinely changes the practical interpretation and meets the existing support requirements.

**Acceptance criterion:** a stable-ID tie-break is not presented as evidence that one hypothesis better fits the user's circumstances. A genuinely supported alternative remains bounded and supplies an observable distinction.

**Source anchors:** `candidateScore()`, `compareCandidates()`, `resolveHypotheses()`, and alternative planning in `src/Interpretation.js`; `composeSemantic()` in `ArcanaService.qml`.

## 5. Keep the audit rigor; stop making the reading recite it

### Verified finding: methodological language occupies the concise narrative

The handoff includes:

> Treat that link as connected support rather than independent confirmation.

This is a useful safeguard against treating repeated themes as multiple independent pieces of evidence. But it occupies valuable space inside the concise synthesis. Relationships and patterns also appear in supporting sections.

The reading can feel interrupted by its own audit report.

### Proposed improvement

Separate the human relationship sentence from its methodological explanation. For this spread, illustrative copy is:

> The overloaded Context and the Tower's Doorway meet around release: reducing what you carry and questioning what you keep standing.

Keep the correlation explanation in Method or evidence detail. Preserve its substance in the audit representation rather than dropping the safeguard.

### Constraint to preserve

The current relationship engine detects shared themes, ranks, and numbers. Directional relations such as `corrects` and `transforms` lack authored directional rules and are rejected. This is appropriately conservative.

Do not replace conservative relationships with fluent but unsupported connections. Better prose should express the actual relationship more clearly, not invent a stronger one.

**Acceptance criterion:** concise prose contains the interpretive connection; evidence detail explains its support and correlation limits. Supporting sections add information instead of unnecessarily repeating the narrative.

**Source anchors:** `buildInteractions()`, `interactionCandidate()`, and `patternClaim()` in `src/Interpretation.js`; relationship and pattern sections in `Panel.qml`.

## 6. Test whether meaning reaches the reader

### Existing strength

The exhaustive upright triple matrix covers **456,456 ordered spreads**. Its checks establish deterministic output, legal relationships, and evidence scope. The wider test suite adds validation, safety, alternatives, persistence, and projection coverage.

These are valuable engineering guarantees. They do not, by themselves, establish that:

- A selected reversal meaning appears in prose.
- The question changes the interpretation.
- A cited claim is actually expressed by its sentence.
- A reader understands why a positive card becomes Friction.
- Supporting sections add information rather than repeat it.

The reversal-rendering gap illustrates the difference between structural correctness and interpretive usefulness.

### Proposed editorial benchmark

Start with a small, carefully reviewed set:

| Case | What to assess |
| --- | --- |
| Orientation contrast | Ten of Wands upright versus reversed visibly changes the applicable meaning |
| Position contrast | Three of Cups as Context versus Friction has an understandable interpretive transformation |
| Genuine ambiguity | Overload versus release is distinguished without arbitrary confidence |
| Question boundary | Deliberate topic-sensitive change, or explicitly question-independent output, matches the product contract |
| Evidence realization | The selected reversal's meaning reaches the relevant interpretation, rather than appearing only as an ID |
| Reader usefulness | After reading, a person can name one concrete observation or experiment |

Keep the large structural matrix. Add a small set that asks whether the semantic work survives into the user experience. Human review should complement mechanical tests; exact string snapshots alone are not a sufficient usefulness measure.

**Source anchors:** `tests/interpretation-planner.test.js`, `tests/interpretation-projections.test.js`, `tests/interpretation-metamorphic.test.js`, `tests/semantic-v2-corpus-benchmark.test.js`, and `tools/run-semantic-triple-matrix.js`.

## Suggested sequence, not an approved roadmap

1. Render the selected reversal meaning using the existing corpus.
2. Decide and document the local-reading versus question-application boundary.
3. Make substantive hypothesis ties visible where they matter.
4. Move methodological boilerplate behind the concise reading.
5. Add editorial acceptance cases alongside existing invariants.

Do not start by adding more spreads, narrators, unrestricted question parsing, or a larger ontology. First verify that the current semantic distinctions are delivered clearly.

## Reproducing the central observations

The following command reads repository files and performs in-memory computation. It does not draw through the running service, persist readings, or write fixtures. Run from the Arcana repository root.

```bash
node <<'NODE'
const fs = require('node:fs');
const I = require('./src/Interpretation');
const catalog = JSON.parse(fs.readFileSync('assets/semantic-v2/cards.json', 'utf8'));
const spreads = JSON.parse(fs.readFileSync('assets/spreads.json', 'utf8'));
const engine = I.createInterpreter(catalog, spreads);
const cards = [
  { positionId: 'context', cardId: 'wands-10-ten', orientation: 'reversed' },
  { positionId: 'friction', cardId: 'cups-03-three', orientation: 'upright' },
  { positionId: 'doorway', cardId: 'major-16-the-tower', orientation: 'upright' }
];
const request = {
  spreadId: 'context-friction-doorway', cards,
  originalQuestion: 'how can arcan be improved?', reversalPolicy: 'energy_state'
};
const primary = value => engine.interpret(value).interpretations[0].claim;
const original = primary(request);
let identicalSingleProse = 0;
let tiedSingleScores = 0;
const scoreFields = ['direct', 'positionFit', 'adjacentFit', 'patternFit'];
for (const card of catalog.cards) {
  const single = {
    spreadId: 'single',
    cards: [{ positionId: 'single', cardId: card.id, orientation: 'reversed' }],
    originalQuestion: null, reversalPolicy: 'energy_state'
  };
  const upright = {
    ...single, cards: [{ ...single.cards[0], orientation: 'upright' }]
  };
  if (primary(single) === primary(upright)) identicalSingleProse++;
  const candidates = engine.plan(single).analysis.trace.reversalCandidates[0].candidates;
  const top = candidates[0];
  if (candidates.filter(candidate => scoreFields.every(
    field => candidate.score[field] === top.score[field]
  )).length > 1) tiedSingleScores++;
}
console.log(JSON.stringify({
  catalogCards: catalog.cards.length,
  catalogClaims: catalog.cards.reduce((sum, card) => sum + card.claims.length, 0),
  topicLenses: [...new Set(catalog.cards.flatMap(card =>
    card.claims.flatMap(claim => claim.topicLenses)))],
  positionsWithMultipleClaims: catalog.cards.reduce((sum, card) =>
    sum + Object.values(card.positionClaims).filter(refs => refs.length > 1).length, 0),
  sameSpreadProseAfterOrientationChange: original === primary({
    ...request, cards: cards.map(card => ({ ...card, orientation: 'upright' }))
  }),
  sameSpreadProseAfterQuestionChange: original === primary({
    ...request, originalQuestion: 'How can I improve a friendship?'
  }),
  identicalUprightReversedSinglePrimary: identicalSingleProse,
  tiedSingleSubstantiveScores: tiedSingleScores
}, null, 2));
NODE
```

Recorded results: 78 cards; 750 claims; only `general` topic lenses; zero positions with multiple claims; both spread comparisons `true`; 78 identical single-card primary comparisons; 78 substantive-score ties.

## Closing design lens

The spread's grounded message is not “tear Arcana down.” It is: release the burden of unused semantic machinery, clarify which voice does what, and test the assumption that traceable output is necessarily an effective reading.
