# Changelog

## Unreleased

### Changed

- **Keyboard shortcuts follow transcription-tool conventions instead of function keys.** The editor bound play/pause to `F1` and seeking to `F2`/`F3` — F1 opens browser help, and on a Mac laptop the function row needs Fn, which is the wrong place for the key pressed most often in a session. No dedicated transcription tool uses them.

  | Action               | Was                | Now                                 |
  | -------------------- | ------------------ | ----------------------------------- |
  | Play / pause         | `F1`               | `Esc` (oTranscribe, Express Scribe) |
  | Seek ±5s / ±10s      | `F2`/`F3` (+Shift) | `Ctrl+←/→`, `Ctrl+Shift+←/→`        |
  | **Assign speaker**   | `Tab` cycled       | **`1`–`9` = Nth roster entry**      |
  | Merge with next line | _unbound_          | `m`                                 |
  | Playback speed       | _none_             | `Ctrl+↑` / `Ctrl+↓`                 |

  Number keys are the throughput change: one keystroke per line instead of tabbing through a list, and because the roster lists the cast first in a fixed order, Howard/Todd/Bill/Sam sit at 1–4 in every episode. `Tab` speaker-cycling is gone entirely — it stole focus navigation, broke keyboard accessibility, and once the roster came from the transcript it cycled `spk_0 → spk_1`, which is never wanted.

  `KEYBOARD_SHORTCUTS` is now derived from `KEYBOARD_SHORTCUTS_BY_CATEGORY` rather than hand-maintained beside it. The two lists had already drifted — `w`, `c`, `r`, `Escape` and `?` were each missing from one of them, so the help panel and the real bindings disagreed.

- **Playback resumes two seconds before where it paused.** Standard in Express Scribe, oTranscribe and InqScribe, and much of why they feel quicker: you pause mid-phrase to type, and on resume you need the run-up again rather than scrubbing back by hand every time. Only applies to a genuine resume, not to starting from the top. Playback rate stepping uses `preservesPitch`, so voices stay intelligible at 0.5×.

### Added

- **Batch speaker rename.** Say once that a diarization label is Todd Padre and every one of that speaker's lines is relabelled — on s09e26 that is 205 lines from one action, before the line-by-line pass begins. The new Speakers panel lists the cast plus everyone actually in the episode with their line counts, ordered by how much they talk; clicking a row selects all their lines, and the confirm button states the scope it is about to apply (`Rename 205 lines → "Todd"`) rather than asking for confirmation in a modal. Renaming onto an existing name merges the two speakers, which is how two labels for one person get combined; the panel says so before you commit.

  Renamed lines land **modified but not reviewed**: they enter the submission and show the Modified badge, but the reviewed badge is reserved for lines a human actually confirmed. Diarization is imperfect, so a batch rename is a good first pass, not a claim that anything was checked.

  Undo is one level, stored as the exact indices touched rather than an inverse rename — reversing `spk_0 → Todd` when `Todd` already has lines would drag those along too. The indices stay valid because renaming never reorders, and they are discarded on episode change, on any mass action, and on delete, where they would go stale.

  `EditorService.renameSpeaker` returns the original array when nothing matched, so a no-op does not re-render 732 rows.

### Fixed

- **Pressing `o` on a focused line inserted two lines.** `o`, `O` and `r` were handled both by the line component and by the document-level handler, with no `stopPropagation` between them. `u` was caught in the line handler too, with an empty body and a `preventDefault` that stopped nothing — the global handler still ran, which is why the duplication was only visible on the keys that insert.

- **Editing a line's text and clicking away silently discarded it.** The `<textarea>` had `oninput` and `onkeydown` but no `onblur`, unlike the speaker and timestamp fields which both saved on blur. Committing text required Enter, Cmd+S or Cmd+Arrow — and text is the field users edit most, with "click somewhere else" the most natural way to finish. Blank input cancels rather than writing an empty line, matching what Enter already did.

- **A line's own speaker was not selectable in the speaker editor.** The control was a `<select>` populated from the roster, so any speaker the roster did not contain rendered as a blank field with no way back. It is now an `<input list>` against a single `<datalist>` rendered once by `TranscriptView` — the roster stays as suggestions while any string is accepted, which the data requires: the corpus contains one-off names like `Klaus`, `Fake Manager` and `Harriet Splooge`. The datalist shows `Unknown Speaker #2` while storing `spk_0`.

- **The four-state line model is gone.** `editState: 'unedited' | 'unsaved' | 'saved' | 'edited'` conflated three independent things: whether a line differs from what was loaded (derivable), whether a human vouched for it (`edited`, which is persisted and read by the SQL that applies a submission), and an 'unsaved'/'saved' distinction that did nothing — every store mutation already writes to localStorage, so the `w` key only recoloured a badge. Status is now derived from `hasLineChanged(line)` and `line.edited`, which are independent, so a line can be both modified and reviewed.

  Storing the derivable part is what let `updateLineText` and `updateLineSpeaker` downgrade a reviewed line to 'unedited' — dropping it from the submission while it kept painting the reviewed badge. That path is gone by construction. So is `massAction`'s `set-unedited`/`set-unsaved`/`set-saved`, which ran through `changeLineStates` and assigned `edited: newState === 'edited'`, silently revoking review badges — precisely what `resolveEditedFlag`'s comment says must only ever happen through an explicit `reset-edited`. Mass actions drop from nine to four (`commit`, `reset-edited`, `delete`, `revert-to-original`) and `MassActions.svelte` from 436 lines to about 160.

  Removed along with it: `saveLine`, `saveAllChanges`, `changeLineStates`, `getLinesByState`, the `w` shortcut and the "Save All Changes" card. The safety of the swap was established before it was made — see the equivalence analysis in `EditorService.changeDetection.test.ts`.

- **Episodes opened claiming hundreds of unsaved changes.** Seven episodes carry `edited = true` on every row from the pre-migration apply function; s04e02 has 629 of 629. Because the change predicate counted `edited`, opening one reported 629 pending edits and offered a Submit button before the user touched anything — and submitting them would have been a no-op. Lines now record `originalEdited` as loaded, so "reviewed during this session" counts as a change and "arrived already reviewed" does not. s04e02 now opens with 629 Reviewed badges and nothing pending.

- **The status badges hid information.** They were a mutually-exclusive `{:else if}` chain, so a reviewed line stopped showing that it also had unsubmitted content changes. Now two independent indicators. The raw `{editState} | edited: {false}` debug span that rendered on every line has been deleted — it was visible to users.

- **Every speaker in an unedited episode rendered as one indistinguishable "Unknown Speaker".** The editor seeded its roster from a hardcoded six-name cast constant and never looked at the loaded transcript, while unedited episodes label speakers with diarization output (`spk_0`, `Speaker 3`, `7`). Nothing matched, so the lookup in `EditableTranscriptLine` fell through to the roster's "Unknown" entry for every line — all 732 of s09e26, across six actually-distinct speakers. The speaker `<select>` was populated from the same roster, so a line's real value was not even selectable.

  The roster is now derived from the episode: the recurring cast merged with the speakers actually present, ordered cast-first then by descending line count, matched case-insensitively so a transcript saying `howard` folds into the cast `Howard` rather than duplicating it. s09e26 now shows six speakers with counts 205/155/138/125/103/6. Guests the user adds are held separately from the roster so rebuilding it does not drop them.

  Two details worth recording. Diarization indices are **sparse** — s09e26 has `spk_0,1,2,3,5,6` with no `spk_4` — so the roster is built from observed values rather than a range, which would invent a speaker with no lines. And `Guest` was removed from the cast: it appears on zero lines corpus-wide and was only ever occupying a slot in the list Tab cycles through.

- **26,732 transcript lines showed a raw `Speaker 0` label on the public episode pages.** `isUnknownSpeaker` matched `spk_N` and bare digits but not the `Speaker N` form, which is what `scripts/transform-script.js` emits. `/ep/s12e02` rendered 1,133 lines as `Speaker 0`…`Speaker 8`; they now read "Unknown Speaker #1–#9" like every other episode. The pattern stays anchored to the `speaker`/`spk` prefix rather than something like `/^\w+ \d+$/`, because the corpus contains named characters ending in digits — `Customer 1`, `Waiter 2`, `Demon Voice 1`, `Delivery Man 1` — which a looser rule would swallow.

- **Shift+Tab threw on any speaker missing from the roster.** `getPreviousSpeaker` computed `currentIndex === 0 ? length - 1 : currentIndex - 1`, so a `findIndex` miss of `-1` produced `speakers[-2]` and `undefined.name`. Before the roster was derived this was the _normal_ case, not an edge one. Both cycling helpers now return `null` on an empty roster and treat an unrecognised speaker as the start of the cycle, and match case-insensitively — previously `s.name === currentSpeaker` counted `howard` against `Howard` as a miss, which is what fed `-1` in.

- **Removing "Unknown" from the roster unmounted the transcript.** The speaker lookup ended in `speakers.find((s) => s.id === 'unknown')!`, and `SpeakerManager` allowed removing any entry. The fallback is now the line's own speaker value, so an unmatched line renders its actual label rather than throwing — or, previously, silently claiming to be someone else.

- **Speaker colours came from three different systems.** A hardcoded literal per cast member, an index-based palette in `addCustomSpeaker` (`speakers.length % colors.length`, so removing one speaker reshuffled the colour of everyone after them), and the hash-based `getSpeakerColor` used by the public pages. All three collapse into `getSpeakerColor(name)`, so a speaker keeps one colour for the life of the episode and the editor and `/ep/*` finally agree.

- **Anonymous transcript submissions were silently discarded.** `ContributorForm` POSTed to a `?/submitContribution` server action that validated the payload and returned `{ success: true, editIds: [] }` without writing anything — the handler's own comment read "For now, we'll simulate success". Contributors got a success toast and lost their work. Two things made it worse: the form was only reachable when signed out (authenticated users took a different, working path, so the bug was invisible to anyone testing while logged in), and from `/editor/[id]` the action did not exist at all, so the POST 405'd and the modal sat there with no feedback. Separately, the payload it sent was `getChangedLines(...)` — only the modified lines — while the submission is recorded as a `full_replacement`, so any naive implementation of that action would have truncated the episode down to the edited lines.

  The form-action path is gone rather than implemented: there is no server-side Supabase client to route it through (`hooks.server.ts` is empty, `@supabase/ssr` is not a dependency, and no service-role client exists), and `episode_submissions` RLS already permits this insert from the anon key. Both anonymous and authenticated submissions now run the same `EditorService.submitEpisodeTranscript` call with the full transcript. Removed the `useFormActions` and `transcriptData` props, the `enhance` plumbing, and the dual-mode branch from `ContributorForm`; deleted the action from `src/routes/editor/+page.server.ts`. Regression-tested in `ContributorForm.svelte.test.ts`, which asserts `onSubmit` fires and the form carries no `action` attribute.

- **The submission toast overstated what had happened.** It read "Successfully submitted episode transcript for review!"; approval is a separate moderator step and the live transcript is unchanged until then, so it now says "Submitted for review — a moderator will look at your changes."

- **`massAction('delete')` sorted the caller's index array in place.** `editorStore.performMassAction` passes `this.#state.selectedLineIndices` straight through to `EditorService.massAction`, which did `lineIndices.sort((a, b) => b - a)` to walk deletions back-to-front — reordering the store's reactive selection state as a side effect. Now sorts a copy.

### Changed

- **Test configuration.** `test:unit:server` pointed at `vitest.config.server.ts`, which does not exist in the repo; it now points at `vite.config.ts`, where the node `test` block already lives.
- **The browser test config had not run since the vitest 4 upgrade.** `vitest.config.client.ts` used `browser.provider: 'playwright'` and `browser.name: 'chromium'`; vitest 4 replaced the first with a factory from `@vitest/browser-playwright` (which was not installed) and the second with `browser.instances`. `bun run test:unit:client` threw a startup `TypeError` rather than running anything, which is why the dead include/exclude patterns below went unnoticed. Added the missing devDependency, updated the config, and aligned `vitest` to `4.1.10` to match `@vitest/browser`.
- **Browser tests are identified by suffix, not directory.** `vitest.config.client.ts` declared `include: ['src/**/*.svelte.test.ts', 'src/lib/components/**/*.test.ts']` alongside `exclude: ['src/lib/**/*.test.ts', ...]`. Exclude wins and `src/lib/**` is a superset of `src/lib/components/**`, so the second include pattern matched nothing and component `.test.ts` files never ran in a browser — `SubmitControls.test.ts` was running in the node config the whole time (harmlessly, since it never mounts the component). Dropped the dead include/exclude pair. The convention is now explicit: `*.svelte.test.ts` runs in chromium, everything else in node.

### Security

- **Anonymous visitors can read every transcript submission.** An unauthenticated request with the publishable key returns all rows of `episode_submissions`, including `contributor_display_name`, `contributor_session_id`, `contributor_contact_hash`, `notes`, `reviewer_notes` and the full `transcript_data`. Currently 2 rows, both anonymous, so the blast radius is small — but the anonymous submit path was silently discarding contributions until this release, so the table is about to start filling with real contributor data.

  The cause is a policy present in no migration in this repository:

  ```
  SELECT | PERMISSIVE | roles={public}
  USING ((submitted_by = auth.uid()) OR (submitted_by IS NULL))
  name "Users can view their own submissions"
  ```

  `roles={public}` covers every role including `anon`, and `submitted_by IS NULL` is true of every anonymous submission — so a clause meant to express "you can see your own" reads in practice as "anyone can see every anonymous submission". When the submitter is anonymous there is no identity to compare against, and the NULL fallback matches everybody. Both existing rows are anonymous, hence 2 of 2 visible.

  Production turns out to carry a whole parallel set of policies under different names from the checked-in SQL (`"Anyone can submit episode transcripts"` rather than `"Anyone can create episode submissions"`; `"Moderators can update submissions"` rather than `"Moderators and admins can update episode submissions"`), so four permissive SELECT policies were OR-ing together — two from `fix-episode-submissions-rls.sql` and two untracked. Postgres OR's permissive policies, so the widest one wins.

  Worth recording why the existing guard never helped: `fix-episode-submissions-rls.sql` adds a `TO anon USING (false)` policy described as "more explicit than relying on the authenticated-only policy above". A permissive policy returning `false` cannot remove access — `false OR x` is `x`. It is confirmed applied and contributed nothing.

  `sql/migrations/06-episode-submissions-rls-lockdown.sql` drops policies by enumerating `pg_policies` rather than naming them, precisely because a named `DROP POLICY` would have missed the untracked culprit; then recreates one SELECT policy and one UPDATE policy, and adds an `AS RESTRICTIVE` anon denial, which unlike a permissive one genuinely subtracts. It deliberately does not `FORCE` RLS, since `apply_episode_submission()` and `restore_episode_version()` are `SECURITY DEFINER` and would otherwise be subject to these policies, breaking approvals.

  Applied and verified: `scripts/verify-submission-privacy.sh` reports anon sees 0 of 2 submissions with `episodes`, `transcript_lines` and `episode_transcript_versions` still readable, and both authenticated read paths — the `/moderate` queue including approve, and a contributor's own list on `/profile` — were confirmed working afterwards.

- **The moderator UPDATE policy in production already has `WITH CHECK`** — the gap implied by the checked-in SQL is not real. It is scoped `roles={public}` rather than `{authenticated}`, which is harmless since its predicate requires `auth.uid()` to resolve to a moderator, but the deployed name differs from the checked-in one, so the migration collapses the UPDATE policies to a single canonical definition rather than adding a second.

  Left open deliberately, each needing its own decision: the INSERT policy's `WITH CHECK (true)` permits an arbitrary `submitted_by`, and there is no DELETE policy at all, so nobody — moderators included — can delete a submission through the API.

### Added

- **`scripts/verify-submission-privacy.sh`** — checks anonymous read access against the live database and exits non-zero if submissions are exposed. Includes a control probe (`users` must also be invisible) so a broken harness cannot masquerade as a pass, and asserts the genuinely public tables are still readable so the fix cannot over-tighten unnoticed.
- **`sql/queries/diagnose-episode-submissions-rls.sql`** — read-only; reports `relrowsecurity`, every policy with its roles and permissive/restrictive kind, the relevant grants, and the row count visible under `SET LOCAL ROLE anon`.
- **`src/lib/components/editor/ContributorForm.svelte.test.ts`** — the repo's first component test to actually execute, covering the anonymous submission path that was dropping contributions.
- **Change-detection baseline** (`src/lib/services/EditorService.changeDetection.test.ts`). `getChangedLines()` decides what gets submitted for moderation, and had no direct coverage. Pins its behaviour across the full 16-row (`hasLineChanged` × `edited` × `editState`) cross product, and proves the planned replacement predicate — `hasLineChanged(line) || line.edited` — diverges on exactly four shapes: three narrowings reachable only through `massAction('set-unsaved'|'set-saved', forceExactState: true)`, and one broadening that fixes a line being dropped from the submission while still painting the reviewed badge. Also the first coverage of `massAction` (`commit`, `reset-edited`, `delete` index shifting, `revert-to-original`) and `getLinesBySpeaker`.
- **`line_edits` does not exist in production.** PostgREST returns `PGRST205` ("Could not find the table 'public.line_edits' in the schema cache"). `sql/schema/supabase-schema.sql` still creates it with indexes and three RLS policies, and `current_transcript_lines` is defined as a view over it, so a database rebuilt from `sql/` would carry a table and view the deployed one does not have. Nothing in `src/` reads or writes it — `episode-submissions.sql` opens by declaring it replaced — so this is dead schema to be removed rather than a missing migration. Recorded here rather than fixed, since dropping it is a schema decision rather than a reconciliation.
- **`sql/migrations/05-episode-submissions-contributor-privacy.sql`.** The checked-in schema had drifted from production in the opposite direction to what it looked like: `episode_submissions` in `sql/` declares plaintext `contributor_name` / `contributor_email`, neither of which exists in the deployed database, while the six hashed/session columns `EditorRepository.submitEpisodeTranscript` has been writing appear in no checked-in SQL. The client matched production; the SQL did not, so a database rebuilt from `sql/` would reject every submission. Verified the deployed 21-column set against production and reconciled.

### Fixed

- **Transcript lines reordered on save, and whole episodes flagged as edited**: both came out of `apply_episode_submission`, which deletes every line for an episode and re-inserts it from the submission JSON.
  - Re-inserted rows got fresh `gen_random_uuid()`s, and the read path tiebroke on `id`. That made the order among lines sharing a timestamp a coin flip on every approval — resolving the "Known issues" entry from 2026-07-21, which called for exactly this ordinal column plus a backfill. `EditorService.addNewLineBefore()` and `splitLine()` both hand the new line its neighbour's exact timestamp, so they produced the affected pairs routinely. Added `line_number` to `transcript_lines` and `transcript_lines_archive`, assigned from the submission array's position via `jsonb_array_elements ... WITH ORDINALITY` (dense 1..N, reassigned on every apply, never sent by the client — so adding, deleting, splitting and merging lines in the editor stay ordinary array splices with no ordinal bookkeeping). Read paths order `(timestamp_str, line_number)`, keeping the timestamp authoritative so retiming a line still moves it. Backfilled with `row_number() OVER (PARTITION BY episode_id ORDER BY timestamp_str, id)`, reproducing the order the app was already reading, and added a unique constraint on `(episode_id, line_number)`. `archive_current_transcript_lines` and `restore_episode_version` carry the ordinal through, so restoring a version no longer reorders the transcript it is meant to reproduce.
  - The same INSERT hardcoded `edited = true` per line. `edited` is the human-reviewed badge set only by `EditorService.commitLine()`, so editing a few lines of s03e06 came back with all of them flagged. Now reads `COALESCE((transcript_line->>'edited')::BOOLEAN, false)` from the submission.
  - Fixing the SQL exposed a client bug it had been masking: `updateLineText`, `updateLineSpeaker`, `saveLine`, `saveAllChanges` and the bulk `save` action all contained `edited: hasActualChanges ? false : false`, unconditionally clearing the badge. Harmless while the database overwrote it, but it would now un-review lines on approval. All five route through `EditorService.resolveEditedFlag()`, which preserves the flag; only `commitLine()` grants it and `reset-edited` revokes it. Clearing on content change was rejected because `hasActualChanges` compares against the line as _loaded_, not as reviewed, so a line edited and then committed stays `true` for the session and a later bulk save would silently revoke a real review.
  - `ContextService.loadTranscript` ordered by `timestamp_str` with no tiebreak at all, making the before/after context lines in search results arbitrary wherever timestamps collided. Now tiebreaks on `line_number` too.

  Migration split across `sql/migrations/01..04-transcript-line-ordering-*.sql`, applied in numeric order — columns, backfill, functions, then constraints. The function swap deliberately precedes the `NOT NULL` enforcement so that writes are already populating `line_number` before it becomes mandatory. Read-only checks in `sql/queries/verify-transcript-line-ordering.sql`, including one proving the backfill leaves every currently-displayed transcript byte-identical.

  Verified against a scratch Postgres instance reproducing this schema: on the pre-migration functions, 32 of 40 approvals read back in the wrong order (75% expected from two independent duplicate-timestamp pairs) and every line came back flagged; post-migration, 0 of 40 and flags exactly as submitted. A submission that simultaneously adds a line into a duplicate-timestamp group, deletes another and splits a third (6→7 lines) reads back correctly with dense ordinals, and restoring the prior version reproduces its original order.

  **Correction (2026-08-01, later):** this entry originally closed "Not yet applied to production." That was wrong — the migration is live. Verified against the production database: `transcript_lines.line_number` exists, `?order=line_number.asc` returns 200 rather than the 400 PostgREST gives for an unknown column, and `?line_number=is.null` counts zero rows, so the backfill completed. The client at `EditorRepository.fetchEpisodeTranscript` has been ordering on `line_number` throughout, which could not have worked otherwise.

## 2026-07-21

### Fixed

- **ISR writes billed on every revalidation** (13,000 write units/day against a 200,000/month budget). Vercel only charges when a revalidation produces content that _differs_ from the cached copy, so unchanged pages are free to re-serve — but `/ep/[id]` was rendering differently every time, for two independent reasons:
  - The edit-count badge rendered a **relative** time (`"3h ago"`) via `new Date()` during SSR, so the cached HTML changed at every hour boundary and rebilled the whole ~868 KB page. History stats now load after hydration instead (`browser`-guarded `$derived` in `ep/[id]/+page.svelte`); they were never really streamed anyway, since the adapter builds this route with `experimentalResponseStreaming` disabled. Also removes a Supabase round-trip from every cold render.
  - `fetchEpisodeTranscript` sorted by `timestamp_str` with **no tiebreaker**. 5,443 lines across the corpus share a timestamp (s12e02: 1,203 lines, 1,021 distinct timestamps), and Postgres guarantees no stable order among equal keys, so lines could reshuffle between queries. Added `.order('id')`.

  Verified: three consecutive production renders of `s12e02` are byte-identical (1,779,301 bytes each), as are repeat renders of `s01e02` — an episode _with_ edits, whose badge now appears in the browser but leaves no trace in the cached HTML. (Re-measured after the pagination fix below, which grew the page from 1,482,633 bytes by restoring the 203 lines that were being dropped.)

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
