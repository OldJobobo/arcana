# Graph Report - .  (2026-09-02)

## Corpus Check
- Large corpus: 336 files · ~1,428,339 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 210 nodes · 272 edges · 12 communities
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Interpretation Method|Interpretation Method]]
- [[_COMMUNITY_Release Validation|Release Validation]]
- [[_COMMUNITY_Major Arcana System|Major Arcana System]]
- [[_COMMUNITY_Plugin Architecture|Plugin Architecture]]
- [[_COMMUNITY_Composer Runtime|Composer Runtime]]
- [[_COMMUNITY_Plugin Manifest|Plugin Manifest]]
- [[_COMMUNITY_Minor Arcana Visuals|Minor Arcana Visuals]]
- [[_COMMUNITY_Package Scripts|Package Scripts]]
- [[_COMMUNITY_Settings Logic|Settings Logic]]
- [[_COMMUNITY_Contract Tests|Contract Tests]]
- [[_COMMUNITY_Semantic Data Tests|Semantic Data Tests]]
- [[_COMMUNITY_Composer Tests|Composer Tests]]

## God Nodes (most connected - your core abstractions)
1. `Arcana Interpretation Research and Specification` - 29 edges
2. `Major Arcana Guide` - 27 edges
3. `Arcana Quickshell Plugin Implementation Plan` - 13 edges
4. `Arcana README` - 10 edges
5. `compose()` - 9 edges
6. `Arcana Visual Grammar` - 9 edges
7. `barWidget` - 6 edges
8. `positionText()` - 6 edges
9. `Minor Arcana Guide` - 6 edges
10. `lowerStart()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Keyboard-first reflective system` --semantically_similar_to--> `Reading as structured symbolic hypothesis`  [INFERRED] [semantically similar]
  README.md → INTERPRETATION-RESEARCH-AND-SPEC.md
- `Stable daily-card invariant` --semantically_similar_to--> `Daily, free, and Context / Friction / Doorway draws`  [INFERRED] [semantically similar]
  docs/IMPLEMENTATION-PLAN.md → README.md
- `XDG-local bounded state` --semantically_similar_to--> `Versioned XDG state model`  [INFERRED] [semantically similar]
  README.md → docs/IMPLEMENTATION-PLAN.md
- `Arcana trust boundary` --semantically_similar_to--> `Non-canonical agent result boundary`  [INFERRED] [semantically similar]
  README.md → INTERPRETATION-RESEARCH-AND-SPEC.md
- `Exact-tree release review` --semantically_similar_to--> `Live Quattro certification boundary`  [INFERRED] [semantically similar]
  docs/IMPLEMENTATION-PLAN.md → CHANGELOG.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Evidence-bound interpretation stack** — interpretation_research_and_spec_atomic_semantic_model, interpretation_research_and_spec_position_semantics, interpretation_research_and_spec_reversal_policy, interpretation_research_and_spec_deterministic_composer, interpretation_research_and_spec_primary_and_alternative, interpretation_research_and_spec_language_safety [EXTRACTED 1.00]
- **Arcana runtime architecture** — docs_implementation_plan_quattro_plugin_architecture, docs_implementation_plan_service_singleton, docs_implementation_plan_state_model, docs_implementation_plan_entropy, docs_implementation_plan_lazy_rendering, readme_draw_modes [INFERRED 0.95]
- **Layered Arcana card system** — docs_visual_grammar_locked_card_format, docs_visual_grammar_cursor_sigil, docs_visual_grammar_typographic_hierarchy, docs_visual_grammar_canonical_palette, docs_visual_grammar_illustration_language, readme_theme_responsive_renderer [INFERRED 0.85]

## Communities (12 total, 0 thin omitted)

### Community 0 - "Interpretation Method"
Cohesion: 0.09
Nodes (32): Traditional archetype plus system lens, Cross-suit rank progression, A. E. Waite — The Pictorial Key to the Tarot, Bounded agent handoff contract, Agent power disclosure, Atomic provenance-aware semantic model, Golden Dawn Book T, Constrained interpretive synthesis (+24 more)

### Community 1 - "Release Validation"
Cohesion: 0.07
Nodes (30): Arcana, baseNames, deck, expectedFaultMasks, fail(), failures, faultContract, files (+22 more)

### Community 2 - "Major Arcana System"
Cohesion: 0.09
Nodes (27): The Chariot / Keyboard Momentum, Death / Terminate–Restart, The Devil / Dependency Loop, Major Arcana Guide, The Emperor / Window Rules, The Empress / Generative System, Failure and Recovery spread, The Fool / First Boot (+19 more)

### Community 3 - "Plugin Architecture"
Cohesion: 0.10
Nodes (25): Arcana 0.1.0-alpha, Live Quattro certification boundary, Stable daily-card invariant, Designated Omarchy testbed VM, Arcana Quickshell Plugin Implementation Plan, Bounded /dev/urandom entropy, Exact-tree release review, Free-draw isolation and no replacement (+17 more)

### Community 4 - "Composer Runtime"
Cohesion: 0.19
Nodes (22): boundedCount(), boundedText(), BufferByteLength(), buildHandoff(), cleanFragment(), compose(), dailyKey(), draw() (+14 more)

### Community 5 - "Plugin Manifest"
Cohesion: 0.10
Nodes (19): author, barWidget, allowMultiple, category, defaultSection, description, displayName, description (+11 more)

### Community 6 - "Minor Arcana Visuals"
Cohesion: 0.14
Nodes (16): Sovereign Desktop, Cups / Connection / Water, Minor Arcana Guide, Pentacles / Material System / Earth, Minor Arcana as Sovereign Desktop activity, Swords / Logic / Air, Wands / Execution / Fire, Canonical Arcana palette (+8 more)

### Community 7 - "Package Scripts"
Cohesion: 0.25
Nodes (7): name, private, scripts, test, validate, type, version

### Community 8 - "Settings Logic"
Cohesion: 0.29
Nodes (3): assert, Settings, test

### Community 9 - "Contract Tests"
Cohesion: 0.29
Nodes (5): assert, fs, path, root, test

### Community 10 - "Semantic Data Tests"
Cohesion: 0.29
Nodes (6): assert, deck, fs, path, root, test

### Community 11 - "Composer Tests"
Cohesion: 0.40
Nodes (4): Arcana, assert, deck, test

## Knowledge Gaps
- **98 isolated node(s):** `schemaVersion`, `id`, `name`, `version`, `author` (+93 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Arcana Interpretation Research and Specification` connect `Interpretation Method` to `Plugin Architecture`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Why does `Major Arcana Guide` connect `Major Arcana System` to `Interpretation Method`, `Plugin Architecture`, `Minor Arcana Visuals`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `Context / Friction / Doorway spread` connect `Plugin Architecture` to `Interpretation Method`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `schemaVersion`, `id`, `name` to the rest of the system?**
  _98 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Interpretation Method` be split into smaller, more focused modules?**
  _Cohesion score 0.08870967741935484 - nodes in this community are weakly interconnected._
- **Should `Release Validation` be split into smaller, more focused modules?**
  _Cohesion score 0.06854838709677419 - nodes in this community are weakly interconnected._
- **Should `Major Arcana System` be split into smaller, more focused modules?**
  _Cohesion score 0.09401709401709402 - nodes in this community are weakly interconnected._