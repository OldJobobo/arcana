# Changelog

## 0.2.0 — 2026-10-14

### Added

- Small manifest-driven version readout beside the panel title
- Reading history: the last 20 draws (cards and orientations only, never questions), with an `H` view that reopens any of them
- `V` toggles reversed cards for new draws (also in About)
- Readable copy (`C`) for notes and journals; `Shift+C` keeps the evidence-ID copy
- Keyboard scrolling (`↑` `↓` `PgUp` `PgDn` `Home` `End`) for the reading, agent packet, and history
- IPC commands: `reading [text|evidence|json]`, `handoff [question]`, `history`, `reversals <true|false>`; `status` reports `dailyIsStale`, `reversals`, and `historyLength`
- Bar tooltip lists every card in the current reading

### Changed

- The agent handoff opens with plain-language instructions telling the agent to give the reading in its first reply (answer the question, interpret each card in its position, suggest next steps) instead of asking what to explore, plus ground rules, the quoted question, card names, and the labeled reading, followed by the structured packet (now `packetVersion` 3 with card titles and claim text)
- Reading prose follows the spread order (Context, Friction, connection, Doorway), and the panel labels each sentence with its position and card
- Pattern and relationship text is written in plain language instead of internal values such as `major-0-minor-3` or `context → friction`
- Arcana balance is now the last-resort spread connection, behind shared themes and suits
- The panel opens on the focused monitor, and clicking outside the framed panel closes it
- Dividers and the packet box follow `SYSTEM` colors
- The bar icon is now a standard bar glyph (fanned cards) drawn through Omarchy's `BarIconButton`, so it matches the size, centering, and color of the other bar icons instead of a custom two-color sigil
- The service validates the deck once at load and reuses it, instead of deep-copying and re-validating the 600 KB catalog on every action

### Fixed

- Opening the panel on a new day showed the previous day's card as the daily draw; it now draws today's card
- Ordinary questions such as "Work feels draining" or "Why does Monday feel heavy" were rewritten as questions about another person
- Questions containing "secret", "predict", or "fate" were rejected outright; fortune-telling wording is now reframed instead
- The reflection prompt and alternative reading appeared twice in the panel
- Copy passed the reading through `wl-copy`'s arguments, where it stayed visible in the process list; it now goes through stdin
- Pressing `D` to revisit today's card discarded the saved agent question
- An armed daily redraw (`R`) never expired; it now disarms after four seconds
- An agent session that ran longer than a second and then closed with a non-zero status was reported as a failed launch
- **Launch** failed in terminals that cap launch arguments, such as Splinterm (4 KiB): the agent packet is now written to an owner-only `handoff.md` and the agent gets a short prompt pointing to it, which also keeps the reading and question out of the process list
- IPC `status`, `daily`, `free`, `spread`, `retryStorage`, and `history` failed unless given an unused argument

## 0.1.0-alpha — 2026-09-01

First complete alpha candidate.

### Added

- Complete 78-card runtime deck and reversible back
- Provenance-aware semantic records for every card
- Deterministic constrained interpretation engine
- Daily, free, and Context / Friction / Doorway draws
- Upright and typed shadow/reversal orientations
- XDG-local persistence
- Quattro service, panel, and bar-widget entry points
- Keyboard-first navigation and explicit daily redraw confirmation
- Persistent `1×`, `1.25×`, and `1.5×` responsive panel scaling
- Persistent Arcana/system theme-color toggle using Quattro semantic roles
- Layered card renderer with fixed structural black/ivory and theme-responsive primary, secondary, and fault spot-color masks
- Perceptible one-shot transitions for post-map reveal, scale, theme colors, reading changes, and mode registration
- Face-down new draws with independent click/keyboard card flips, hover/focus lift, and interpretation reveal after the final card
- Large bounded card-inspection lightbox with responsive `4:7` sizing, reversed orientation support, and mouse/keyboard dismissal
- Ask Your Agent preview with footer-safe responsive actions, no-agent path, and argument-array launch route
- Contract, data, deterministic-engine, and release-tree validation

### Changed

- Rebuilt card presentation around a reusable Quickshell `ArcanaCard` component: QML now renders the frame, rail, rank, domain, coordinate, keywords, title, system title, and responsive decorative chrome
- Replaced rasterized full-card fronts with cropped `536×786` illustration-only plates and identically cropped semantic masks; compact cards omit nonessential microtext while inspection cards expose the complete live metadata
- Preserved the reversible back as a `600×1050` themed artwork while front illustrations and masks use the cropped `536×786` runtime contract
- Made runtime semantic masks pixel-disjoint and added release validation that rejects overlapping color roles
- Hardened release validation with exact mask inventories and bounded, CRC-checked, fail-closed PNG decoding

### Release hardening

- Passed current Marketplace security/compatibility preflight for source and archive; removed generated Graphify output from publication to satisfy the one-root-manifest rule and added a regression test

- Added persistent fullscreen as an independent toggle alongside panel scales, with F11 toggle and Escape exit; fullscreen expands the canvas without changing the existing render scale, and changing scale preserves fullscreen
- Added a full-canvas fullscreen layout with edge-aligned controls, responsive card spacing, and supporting-detail columns that reflow at smaller widths; bounded text measure without centering the entire interface; fixed divider-gap overflow in framed layouts

- Serialized/coalesced state writes so rapid changes save the latest reading, question, and preferences
- Preserved malformed and unsupported state with explicit retry/recovery guidance; gated preference writes until state is ready
- Added visible storage/draw/copy/question errors, subprocess timeouts, and stale agent-packet invalidation
- Disclosed local question persistence before launch in the preview and README
- Licensed original artwork, masks, authored deck data, and guides under CC BY-NC-ND 4.0; retained MIT for source
- Added real QML I/O/restart/failure tests, runtime-only reproducible packaging, checksum generation, and Node CI
- Corrected archive installation instructions for the Git-only `omarchy plugin add` route
- Fixed optional empty-question previews and question-field Escape/Enter focus release
- Kept muted status text and question input readable on both dark and light system themes

### Status

See [Release readiness](docs/RELEASE-READINESS.md) for automated and VM evidence, screenshots, and the exact tested boundary. Local validation is not Marketplace approval.
