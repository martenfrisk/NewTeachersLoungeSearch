# Changelog

## 2026-07-21

### Fixed

- **Long transcripts silently truncated at 1000 lines**: `SupabaseEditorRepository.fetchEpisodeTranscript` fetched transcript lines in a single unpaginated query. PostgREST caps a response at 1000 rows and reports no error when it truncates, so every episode over that length lost its tail — `/ep/s12e02` rendered 1000 of 1203 lines, dropping the last ~12 minutes of dialogue. Added a `fetchAllPages` helper that walks the result set with successive `.range()` bounds, and applied it to `fetchArchivedTranscriptLines` as well, which had the identical bug (an archived version of a long episode would restore or diff with its tail missing). 16 episodes exceed 1000 lines. Verified `/ep/s12e02` now renders all 1203 lines ending at 1:17:57, with no duplicated or skipped rows.

### Known issues

- **Transcript lines sharing a timestamp order non-deterministically**: `transcript_lines` has no column recording a line's position within its episode — `timestamp_str` has only second granularity and `created_at` is identical for every row (bulk insert). In `s12e02`, 182 of 1203 lines share a timestamp with another line, and repeated identical queries returned them in different orders. Paging requires a total order, so `fetchEpisodeTranscript` now breaks ties on `id`; this makes the order stable across requests but still not faithful to the original transcript, so a sentence split across two same-second lines can render reversed. Fixing this properly needs an ordinal column plus a backfill.

## 2026-07-19

### Fixed

- **Vercel ISR write blowup**: Searching updated the URL with `goto()`, which re-ran the homepage server `load` on every debounced keystroke. Each unique `?s=` value was a distinct cache key and therefore a guaranteed miss + write, so typing one word cost ~12 ISR writes (and a redundant second Supabase query, since the client had already fetched results). Switched to `replaceState()` shallow routing: the URL stays shareable, but no server round-trip occurs. Verified typing now issues zero `/__data.json` requests.
- **Episode page ISR cache keys**: `/ep/[id]` omitted `allowQuery`, so adapter-vercel cached every unique query string separately and tracking params (`?utm_source=`, `?fbclid=`) each forced a fresh write. Set `allowQuery: []` (nothing in the route reads query params) and raised `expiration` to 24h.

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
