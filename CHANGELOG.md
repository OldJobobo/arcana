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

### Status

Repository completeness does not imply live Quattro certification. See the release report and screenshots produced from the dedicated test VM for the exact tested boundary.
