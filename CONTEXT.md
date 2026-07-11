# Seekers' Lounge

A search engine and collaborative editor for transcripts of the Teachers' Lounge podcast: full-text search over transcript lines, audio-synced playback, and community-contributed transcript corrections moderated before publication.

## Language

**Episode**:
A single podcast episode's catalog metadata — identifier (`ep`, e.g. `s03e06`), title, description, date, and audio availability. Used in listings and season data.
_Avoid_: EpisodeInfo (see below) when only catalog metadata is meant.

**EpisodeInfo**:
An Episode plus its transcript-completion rollup (edited line count, edited percentage, fully/mostly-edited flags). Used wherever edit progress is displayed — the editor and episode detail page.
_Avoid_: Episode, when completion stats are actually needed.

**TranscriptLine**:
The canonical unit of a transcript: a speaker, a timestamp, the line text, and whether it has been edited. The record of what was actually said.
_Avoid_: Line, utterance.

**Speaker**:
A named participant whose lines appear in transcripts, resolved from a fixed roster (host names, "Guest", "Unknown") to a display name and color for the UI. Distinct from `User` (see below) — a Speaker is a transcript role, not an account.

**Line Edit State**:
The in-progress, session-local state of a single TranscriptLine while a contributor is editing it: `unedited → unsaved → saved → edited`. Lives entirely on the client during one editing session and resets when the session ends.
_Avoid_: status, edit status — reserve those for Moderation Status (see below), which is a different state machine.

**Episode Version**:
A saved, restorable snapshot of an entire episode's transcript at a point in time — a restore point, not an edit record. Answers "what did this transcript look like at version N." Created from the original import, from an approved Submission, or manually.
_Avoid_: History, revision — those describe individual line-edit events, not whole-transcript snapshots.

**Archived Transcript Line**:
A TranscriptLine's content as captured inside a specific Episode Version snapshot. Exists only as part of a Version; not independently editable.

**Submission**:
A contributor's proposed transcript change — a full replacement or a partial edit — awaiting moderation review. Carries the proposed TranscriptLines plus optional contributor identity and notes.
_Avoid_: Correction (legacy per-line concept, superseded by Submission), Contribution (see below — that's the user-facing view of a Submission's outcome).

**Contribution**:
The profile-facing summary of a Submission's moderation outcome: how many lines changed, current status, and reviewer notes. What a contributor sees about their own Submissions.
_Avoid_: Submission, when the reviewer-facing shape is meant instead of the summary.

**Moderation Status**:
The approval state of a Submission or an individual line-edit record: `pending → approved | rejected`, plus `deleted` for line-edit records. Distinct from Line Edit State — this is post-submission, reviewer-driven, and persisted; Line Edit State is pre-submission, session-local, and ephemeral.
_Avoid_: status alone — always qualify as Moderation Status or Line Edit State, they are not interchangeable.

**Line Edit History**:
The per-line audit trail: an ordered record of edit events made to a single TranscriptLine across Submissions, each carrying its own Moderation Status. Answers "who changed this line, when, and was it approved." Distinct from Episode Version — a history entry is one edit event, a Version is a whole-transcript snapshot.
_Avoid_: Version, revision.

**Search Hit**:
A TranscriptLine returned by search, decorated with highlighted match text and its owning episode/season. The result-list unit.
_Avoid_: Result (too generic — a SearchResult is the page of Hits plus pagination/facet metadata, not a single Hit).

**Random Query**:
One of a fixed, curated set of queries (in-jokes like "guinness", "bronco") that the "surprise me" control picks from at random. Pre-warmed into the static cache tier ahead of time since the set is small and known. Not any query a user happens to type.
_Avoid_: defining this as a heuristic over arbitrary query text — it is a closed, curated list, not a pattern match.
