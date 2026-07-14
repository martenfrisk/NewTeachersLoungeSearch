# Changelog

## 2026-07-14

### Changed

- **"Clear Skies" redesign**: Replaced the navy "Blue Book" palette with a bright sky-blue theme — vivid blue header (`board-600`), pale blue page wash, white cards with soft blue-tinted shadows (`shadow-card` tokens), and larger corner radii. All blue token values are WCAG AA contrast-checked (documented in `app.css`). Headings switched to Nunito; the Zilla Slab wordmark is preserved via a dedicated `--font-wordmark` token.
- **About moved to its own page**: The header info dropdown is gone; `/about` is now a real page (in the nav and sitemap) with rewritten "Want to help out?" instructions describing the current account → transcript editor → moderation flow instead of the old GitHub pull-request workflow.
- Search-match highlights render as a hand-swiped highlighter stroke (gradient + uneven corners); jumped-to transcript lines use a marker-yellow wash; the random-search die animates on hover.
- Special-season chips in the episode guide use a light blue fill instead of the walnut accent (coffee is reserved for listen/audio affordances).

### Removed

- `HeaderMobileMenu`/`HeaderMobileNavigation` (dead code) and `HeaderInfoDropdown` (replaced by `/about`), plus their prop types.

## 2025-01-15

### Documentation

- **Comprehensive CLAUDE.md update**: Enhanced project documentation with detailed architecture overview, complete tech stack information, development command reference, and migration context. Added descriptions of Svelte 5 runes state management, service layer patterns, database schema, and component architecture to help future Claude Code instances work more effectively in this codebase.

## 2025-01-14

### Fixed

- **Query highlighting for statically cached searches**: Fixed missing query highlighting on search results from static cache. The issue was that cached results didn't have the `highlightedLine` field populated, causing search terms to not be highlighted in the UI. Added highlighting application in `loadStaticCache()` function in `cache.ts` to apply highlighting before returning cached results.

### Code Quality

- Fixed Svelte reactivity warnings in `DiffViewer.svelte` by properly using `$state()` for reactive variables
- Removed unused parameter `episodeTitle` from `AudioService.loadAudio()` method
- Fixed type checking and linting issues across the codebase
- Cleaned up structured data implementation (temporarily removed due to template literal parsing conflicts with Prettier)

### Technical Details

- Modified `src/lib/utils/cache.ts` to import `highlightSearchTerms` utility and apply highlighting to cached hits
- Applied highlighting to cached results in `loadStaticCache()` function before returning results
- This ensures that both live database searches and static cache searches show proper query highlighting
