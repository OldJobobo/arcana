# Changelog

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
