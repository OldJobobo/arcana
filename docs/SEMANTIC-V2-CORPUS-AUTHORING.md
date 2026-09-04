# Arcana Semantic V2 Corpus Authoring

This guide governs Milestone 4 migration from `assets/cards.json` to the candidate schema-v2 catalog. The production schema-v1 catalog remains authoritative until the final atomic cutover.

## Non-generative scaffold

Generate a working scaffold only into a repository-local scratch path:

```bash
node tools/generate-semantic-v2-scaffold.js work/semantic-v2-scaffold.json
```

The scaffold copies card identity, canonical order, title, Omarchy title, suit, element, rank, artwork path, and deterministic empty slot IDs. It intentionally leaves all themes, prose, imagery details, reversal modes, provenance references, and reflection text empty. It is not a valid schema-v2 catalog and must never be loaded by the runtime.

Do not populate empty prose fields with templates or transformations of schema-v1 sentences. Author and review each card deliberately.

## Batch sequence

Only one batch is accepted at a time:

1. `major` — 22 Major Arcana
2. `wands` — 14 cards
3. `cups` — 14 cards
4. `swords` — 14 cards
5. `pentacles` — 14 cards

Candidate batch files should live under `assets/semantic-v2/batches/` while under review. IDs are namespaced by canonical card ID, so batches cannot claim IDs belonging to another batch.

Validate a batch with:

```bash
node tools/validate-semantic-v2-batch.js assets/semantic-v2/batches/major.json major
```

Validation is fail-closed. It checks strict schema/reference integrity, exact canonical membership and order, preserved identity/artwork, required semantic lenses, card-specific reversal breadth, observed artwork references, reflection breadth, court ranges, unsafe prose, duplicate prose, and a reproducible SHA-256 digest.

## Authoring requirements

For each card:

- Preserve `id`, `order`, arcana, number/rank, title, Omarchy title, suit, element, and image path.
- Author at least two controlled core themes.
- Keep `traditional-core` and `omarchy` claims distinct in function and wording.
- Author specific Single, Context, Friction, and Doorway claims; do not reuse one sentence across slots.
- Choose at least two applicable reversal modes from the ratified vocabulary. Do not assign every generic mode to every card.
- Describe visible details in the packaged artwork. Do not infer symbols that are not shown.
- Provide at least two distinct reflection prompts.
- For courts, provide person, role, and approach ranges without fixed gender, age, appearance, or family hierarchy.
- Use public-domain, private-reference, original-work, and structural sources only as permitted by their catalog records.
- Paraphrase concisely. Do not copy modern long-form source prose.

Never assert prophecy, guaranteed timing, diagnosis, professional authority, inaccessible third-party mental states, or that the cards decide for the user.

## Editorial review

Each batch needs two separate passes:

1. **Structural pass** — run strict batch validation and inspect every reported issue.
2. **Editorial pass** — compare cards within the batch for repeated sentence architecture, interchangeable reversal prose, vague imagery, and position claims that could be moved to another card unchanged.

Representative readings must then cover:

- upright and reversed cards;
- all reversal policies;
- Single and Context–Friction–Doorway spreads;
- at least one supported relationship;
- at least one correlated pattern group;
- safe reframing of an unsafe question;
- a supported alternative and a no-alternative case.

Record the accepted batch digest only after both passes. The five accepted batches are assembled into a separate candidate production catalog. Do not modify `assets/cards.json` during batch authoring.
