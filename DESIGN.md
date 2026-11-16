# v-play Design Direction

- **Product**: `v-play` is an English picture-word playspace for children aged 1 to 5 and the parent beside them.
- **Character**: Playful, warm, storybook-toybox (inspired by Sago Mini's calm-yet-cheerful toddler aesthetic).
- **World**: Soft mint-cream nursery playmat with crisp rounded toybox cards accented in light green, cyan, and pink.
- **Moments**: Tactile picture cards with paired warm voice clips, joyful 4-note ascending chime, and pictorial icons across every menu and topic so pre-readers can navigate by sight.
- **Signature**: Extra-rounded toybox cards (`22px-26px`) with a `2px` crisp border and a `4px-5px` bottom tactile lip that presses gently on tap, plus compact mobile focus mode to minimize vertical scrolling.

## Design Read & Dials

Reading this as: Toddler English picture-word and mini-game web app for children aged 1 to 5 and parents, in a Sago Mini-inspired soft toybox pastel style, dial ENERGY 3 / RHYTHM 2 / MOTION 2.

## Purpose Decisions

- **Soft Toybox Surface (`#F8FBF6` page, `#FFFFFF` card, `#ECF4F1` tray)**: Removes glare for young eyes while letting studio JPG illustrations blend smoothly on light surfaces.
- **Tri-Tone Pastel System (Cyan `#007C91`/`#34C5D9`/`#D9F6FA`, Light Green `#86DC62`/`#E4F7D9`, Pink `#F472B0`/`#FFE6F2`)**: Each color plays one clear role (Cyan for listen/primary actions, Light Green for success & "Lanjut" progression, Pink for active topic filter & highlights), all checked against `#1B282C` / white for WCAG AA contrast.
- **Nunito Typography (weights 400, 500, 600)**: Self-hosted local `.woff2` chosen for open single-story `a` and rounded letterforms matching early-reading picture books, without external render-blocking requests.
- **Six Visual Modes + Mobile Focus Chrome**: Arranged in a `3x2` icon grid below `Main & belajar bahasa Inggris` (`2x3` on phones), collapsing cleanly into a single header bar during active games on phones alongside a sticky bottom `Lanjut` bar and single-row horizontal image topic strip.

