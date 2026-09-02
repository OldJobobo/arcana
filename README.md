# Omarchy Arcana

**Order surrounding mystery.**

Omarchy Arcana is a standalone Omarchy Quattro/Quickshell plugin that turns a complete 78-card original tarot deck into a keyboard-first reflective system.

## Alpha capabilities

- Complete 78-card deck with reversible back at shell resolution (`300×525`, 4:7)
- Stable local-date daily draw
- Repeatable free draws
- Three-card `Context / Friction / Doorway` spread drawn without replacement
- Optional upright and typed reversed/shadow orientations
- Deterministic constrained interpretive synthesis
- Evidence-linked traditional, deck-specific, orientation, position, relationship, and pattern layers
- XDG-local JSON persistence
- Quiet bar widget and floating keyboard-first panel
- Persistent `1×`, `1.25×`, and `1.5×` panel scaling with responsive screen fit
- Explicit **Ask Your Agent** packet preview using Omarchy’s configured default agent

Agent prose is optional and non-canonical. Arcana never treats tarot as prophecy, diagnosis, professional advice, or factual authority.

## Install from a checkout

```bash
omarchy plugin add /path/to/omarchy-arcana
omarchy plugin enable org.ministryoftaste.omarchy-arcana
omarchy-shell shell rescanPlugins
```

Add **Omarchy Arcana** to the Quattro bar from shell settings if it is not placed automatically. Summon it directly with:

```bash
omarchy-shell shell summon org.ministryoftaste.omarchy-arcana '{}'
```

## Keyboard

| Key | Action |
| --- | --- |
| `D` | Daily draw |
| `F` | Free draw |
| `S` | Context / Friction / Doorway |
| `A` | Ask Your Agent preview |
| `I` | Method and provenance |
| `1` / `2` / `3` | Set panel scale to `1×` / `1.25×` / `1.5×` |
| `R` | Confirmed daily redraw flow |
| `/` | Focus the optional agent question |
| `Esc` / `Q` | Back or close |

Middle-clicking the bar sigil performs a free draw without opening the panel; left-click opens or closes the panel.

## State and trust boundary

State is stored in `${XDG_STATE_HOME:-~/.local/state}/omarchy/omarchy-arcana.json`. The plugin stores only current daily selection, last reading, draw counter, and local preferences, including the selected panel scale. Scale persists across panel close, plugin reload, and shell restart; on smaller displays the rendered size fits within the available output without changing the saved selection. The plugin does not read arbitrary files, shell history, environment dumps, vault content, credentials, or unrelated state.

The agent handoff contains only the current reading and an optional, clearly delimited user question. It uses argument-array process launch through:

```text
omarchy default agent
omarchy agent prompt <bounded-packet>
```

The launch is never automatic. Omarchy agents may run with unattended/auto-approval behavior, so the panel previews the exact packet and requires an explicit launch action.

## Development

```bash
npm test
node tests/validate-release.js
```

Validation levels are reported separately: repository/data, deterministic helpers, Marketplace scanner, Quattro validator, live shell load, persistence, and configured-agent handoff.

## License

Plugin source and original release prose are MIT-licensed. Card artwork and authored deck guide material remain © Ministry of Taste / OldJobobo unless separately licensed. See `LICENSE` and the provenance specification.
