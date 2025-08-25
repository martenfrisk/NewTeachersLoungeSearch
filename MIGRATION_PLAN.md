# Seekers' Lounge: MeiliSearch to Supabase Migration Plan

This document outlines the complete migration strategy from MeiliSearch to Supabase with user authentication and edit functionality.

## Migration Overview

**Current State**: SvelteKit app using MeiliSearch on AWS (~$10/month) for searching podcast transcripts
**Target State**: Supabase-based solution with PostgreSQL + pg_trgm for fuzzy search, user auth, and collaborative editing
**Users**: ~20 users/week, fan project without profit motive

## Database Schema

### Core Tables

#### `transcript_lines`

```sql
CREATE TABLE transcript_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id),
  season TEXT NOT NULL,
  time TEXT NOT NULL, -- Format: "0:23:45"
  speaker TEXT NOT NULL,
  line TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable pg_trgm for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_transcript_lines_line_trgm ON transcript_lines USING GIN (line gin_trgm_ops);
CREATE INDEX idx_transcript_lines_season ON transcript_lines(season);
CREATE INDEX idx_transcript_lines_episode_id ON transcript_lines(episode_id);
```

#### `episodes`

```sql
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ep TEXT UNIQUE NOT NULL, -- "mini-01", "exit42-5", etc.
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE,
  url TEXT,
  feed_title TEXT,
  has_audio BOOLEAN DEFAULT FALSE,
  season TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `line_edits` (Versioned Edit System)

```sql
CREATE TABLE line_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_line_id UUID NOT NULL REFERENCES transcript_lines(id),
  version_number INTEGER NOT NULL,
  line_text TEXT,
  timestamp TEXT,
  speaker TEXT,
  change_type TEXT[] NOT NULL, -- ['text'], ['timestamp'], ['text', 'timestamp'], ['speaker']
  edited_by UUID NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'deleted')),
  delete_reason TEXT, -- For soft deletes
  confidence_score DECIMAL(3,2) DEFAULT 1.0, -- 0.0-1.0 for auto-flagging low confidence edits
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(original_line_id, version_number)
);

CREATE INDEX idx_line_edits_original_line ON line_edits(original_line_id);
CREATE INDEX idx_line_edits_status ON line_edits(status);
CREATE INDEX idx_line_edits_edited_by ON line_edits(edited_by);
```

## Search Implementation

### PostgreSQL + pg_trgm Fuzzy Search

Replace MeiliSearch queries with PostgreSQL trigram similarity:

```sql
-- Fuzzy search with similarity scoring
SELECT
  tl.*,
  e.title as episode_title,
  e.ep as episode_code,
  similarity(tl.line, $1) as similarity_score
FROM transcript_lines tl
JOIN episodes e ON tl.episode_id = e.id
WHERE tl.line % $1 -- trigram similarity operator
ORDER BY similarity(tl.line, $1) DESC
LIMIT $2 OFFSET $3;

-- Combined with filters
SELECT
  tl.*,
  e.title as episode_title,
  similarity(tl.line, $1) as similarity_score
FROM transcript_lines tl
JOIN episodes e ON tl.episode_id = e.id
WHERE tl.line % $1
  AND ($4::text[] IS NULL OR tl.season = ANY($4))
  AND ($5::text[] IS NULL OR e.ep = ANY($5))
ORDER BY similarity(tl.line, $1) DESC
LIMIT $2 OFFSET $3;
```

### Search Service Updates

```typescript
// src/lib/services/SupabaseSearchService.ts
export class SupabaseSearchService {
	async search(query: string, options: SearchOptions) {
		const { data, error } = await supabase.rpc('fuzzy_search_transcripts', {
			search_query: query,
			season_filter: options.seasons,
			episode_filter: options.episodes,
			limit_count: options.limit,
			offset_count: options.offset
		});

		return this.transformResults(data);
	}
}
```

## Data Migration Strategy

### Phase 1: Transcript Data Migration

```javascript
// Migration script: migrate-transcripts.js
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

async function migrateTranscripts() {
	const transcriptFiles = fs.readdirSync('./src/assets/transcripts/');

	for (const file of transcriptFiles) {
		const transcriptData = JSON.parse(fs.readFileSync(`./src/assets/transcripts/${file}`, 'utf-8'));

		const episodeCode = file.replace('.json', '');

		// Insert episode if not exists
		const { data: episode } = await supabase
			.from('episodes')
			.upsert({
				ep: episodeCode,
				season: extractSeason(episodeCode)
				// ... other episode data from episodes6.json
			})
			.select()
			.single();

		// Insert transcript lines
		const lines = transcriptData.map((line) => ({
			episode_id: episode.id,
			season: line.season,
			time: line.time,
			speaker: line.speaker,
			line: line.line
		}));

		await supabase.from('transcript_lines').insert(lines);
	}
}
```

### Phase 2: Episodes Metadata Migration

```javascript
// Migrate episodes6.json to episodes table
import episodes from './src/assets/episodes6.json';

async function migrateEpisodes() {
	const episodeData = episodes.map((ep) => ({
		ep: ep.ep,
		title: ep.title,
		description: ep.desc,
		date: new Date(ep.date),
		url: ep.url,
		feed_title: ep.feedTitle,
		has_audio: ep.hasAudio,
		season: extractSeason(ep.ep)
	}));

	await supabase.from('episodes').upsert(episodeData);
}
```

## Authentication System

### Supabase Auth Setup

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_ANON_KEY } from '$env/static/private';

export const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY, {
	auth: {
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: true
	}
});
```

### OAuth Providers Configuration

Enable in Supabase dashboard:

- Google OAuth
- GitHub OAuth
- Discord OAuth (popular with comedy podcast fans)

### Auth Components

```svelte
<!-- src/lib/components/auth/AuthModal.svelte -->
<script lang="ts">
	import { supabase } from '$lib/supabase';

	async function signInWithProvider(provider: 'google' | 'github' | 'discord') {
		await supabase.auth.signInWithOAuth({
			provider,
			options: {
				redirectTo: `${window.location.origin}/auth/callback`
			}
		});
	}
</script>

<div class="auth-modal">
	<h2>Sign in to edit transcripts</h2>
	<button onclick={() => signInWithProvider('google')}> Continue with Google </button>
	<button onclick={() => signInWithProvider('github')}> Continue with GitHub </button>
	<button onclick={() => signInWithProvider('discord')}> Continue with Discord </button>
</div>
```

## Edit System Implementation

### Edit Interface Components

```svelte
<!-- Enhanced SearchHit.svelte with edit functionality -->
<script lang="ts">
	import { user } from '$lib/stores/auth';
	import EditLineModal from './EditLineModal.svelte';

	let showEditModal = false;

	function handleEdit() {
		if ($user) {
			showEditModal = true;
		} else {
			// Show login modal
		}
	}
</script>

<article class="search-hit">
	<!-- existing content -->

	{#if $user}
		<button class="edit-btn" onclick={handleEdit} title="Edit this line"> ✏️ Edit </button>
	{/if}
</article>

{#if showEditModal}
	<EditLineModal {hit} onClose={() => (showEditModal = false)} onSave={handleEditSave} />
{/if}
```

```svelte
<!-- src/lib/components/EditLineModal.svelte -->
<script lang="ts">
	import type { SearchHitType } from '$lib/types/search';
	import { submitEdit } from '$lib/services/EditService';

	interface Props {
		hit: SearchHitType;
		onClose: () => void;
		onSave: (edit: any) => void;
	}

	let { hit, onClose, onSave }: Props = $props();

	let editedLine = $state(hit.line);
	let editedTime = $state(hit.time);
	let editedSpeaker = $state(hit.speaker);
	let editReason = $state('');

	async function handleSave() {
		const changes = [];
		if (editedLine !== hit.line) changes.push('text');
		if (editedTime !== hit.time) changes.push('timestamp');
		if (editedSpeaker !== hit.speaker) changes.push('speaker');

		if (changes.length === 0) return;

		const edit = {
			original_line_id: hit.id,
			line_text: editedLine,
			timestamp: editedTime,
			speaker: editedSpeaker,
			change_type: changes,
			edit_reason: editReason,
			confidence_score: calculateConfidenceScore(hit, {
				line: editedLine,
				time: editedTime,
				speaker: editedSpeaker
			})
		};

		await submitEdit(edit);
		onSave(edit);
		onClose();
	}
</script>

<div class="modal-backdrop" onclick={onClose}>
	<div class="modal" onclick|stopPropagation>
		<h3>Edit Transcript Line</h3>

		<div class="field">
			<label>Line Text:</label>
			<textarea bind:value={editedLine}></textarea>
		</div>

		<div class="field">
			<label>Timestamp:</label>
			<input type="text" bind:value={editedTime} placeholder="0:23:45" />
		</div>

		<div class="field">
			<label>Speaker:</label>
			<input type="text" bind:value={editedSpeaker} />
		</div>

		<div class="field">
			<label>Reason for edit (optional):</label>
			<input type="text" bind:value={editReason} placeholder="Fix typo, correct speaker, etc." />
		</div>

		<div class="actions">
			<button onclick={onClose}>Cancel</button>
			<button onclick={handleSave}>Submit Edit</button>
		</div>
	</div>
</div>
```

### Edit Service

```typescript
// src/lib/services/EditService.ts
import { supabase } from '$lib/supabase';
import type { LineEdit } from '$lib/types/edit';

export class EditService {
	async submitEdit(edit: Partial<LineEdit>) {
		// Get next version number for this line
		const { data: versions } = await supabase
			.from('line_edits')
			.select('version_number')
			.eq('original_line_id', edit.original_line_id)
			.order('version_number', { ascending: false })
			.limit(1);

		const nextVersion = (versions?.[0]?.version_number ?? 0) + 1;

		const { data, error } = await supabase
			.from('line_edits')
			.insert({
				...edit,
				version_number: nextVersion,
				status: edit.confidence_score! < 0.7 ? 'pending' : 'approved'
			})
			.select()
			.single();

		if (error) throw error;
		return data;
	}

	async getEditHistory(lineId: string) {
		const { data, error } = await supabase
			.from('line_edits')
			.select(
				`
        *,
        edited_by:users!edited_by(username),
        reviewed_by:users!reviewed_by(username)
      `
			)
			.eq('original_line_id', lineId)
			.order('version_number', { ascending: false });

		if (error) throw error;
		return data;
	}
}
```

## Change Tracking & Timeline Integrity

### Versioned Lines with Soft Delete

```sql
-- View for current transcript state (latest approved version or original)
CREATE VIEW current_transcript_lines AS
SELECT
  tl.id,
  tl.episode_id,
  tl.season,
  COALESCE(le.timestamp, tl.time) as time,
  COALESCE(le.speaker, tl.speaker) as speaker,
  COALESCE(le.line_text, tl.line) as line,
  CASE WHEN le.status = 'deleted' THEN true ELSE false END as is_deleted,
  le.version_number,
  le.edited_by,
  le.created_at as last_edited
FROM transcript_lines tl
LEFT JOIN LATERAL (
  SELECT *
  FROM line_edits
  WHERE original_line_id = tl.id
    AND status IN ('approved', 'deleted')
  ORDER BY version_number DESC
  LIMIT 1
) le ON true;
```

### Edit History Interface

```svelte
<!-- src/lib/components/EditHistory.svelte -->
<script lang="ts">
	import { EditService } from '$lib/services/EditService';

	interface Props {
		lineId: string;
	}

	let { lineId }: Props = $props();

	const editService = new EditService();
	let history = $state([]);

	$effect(async () => {
		history = await editService.getEditHistory(lineId);
	});
</script>

<div class="edit-history">
	<h4>Edit History</h4>

	{#each history as edit}
		<div class="edit-entry" class:deleted={edit.status === 'deleted'}>
			<div class="edit-header">
				<span class="version">v{edit.version_number}</span>
				<span class="user">{edit.edited_by.username}</span>
				<span class="date">{edit.created_at}</span>
				<span class="status {edit.status}">{edit.status}</span>
			</div>

			<div class="changes">
				{#if edit.change_type.includes('text')}
					<div class="change">
						<strong>Text:</strong>
						{edit.line_text}
					</div>
				{/if}

				{#if edit.change_type.includes('timestamp')}
					<div class="change">
						<strong>Time:</strong>
						{edit.timestamp}
					</div>
				{/if}

				{#if edit.change_type.includes('speaker')}
					<div class="change">
						<strong>Speaker:</strong>
						{edit.speaker}
					</div>
				{/if}
			</div>

			{#if edit.status === 'deleted'}
				<div class="delete-reason">
					<strong>Reason:</strong>
					{edit.delete_reason}
				</div>
			{/if}
		</div>
	{/each}
</div>
```

## Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE transcript_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read all transcript lines
CREATE POLICY "Anyone can read transcript lines"
ON transcript_lines FOR SELECT
USING (true);

-- Users can read their own user data
CREATE POLICY "Users can read own data"
ON users FOR SELECT
USING (auth.uid() = id);

-- Users can insert their own edits
CREATE POLICY "Users can create edits"
ON line_edits FOR INSERT
WITH CHECK (auth.uid() = edited_by);

-- Users can read all edits (for transparency)
CREATE POLICY "Anyone can read edits"
ON line_edits FOR SELECT
USING (true);

-- Only moderators/admins can update edit status
CREATE POLICY "Moderators can approve edits"
ON line_edits FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM users
    WHERE role IN ('moderator', 'admin')
  )
);
```

## Environment Configuration

```bash
# .env.local
PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Implementation Timeline

1. **Week 1**: Set up Supabase project, create database schema, enable pg_trgm
2. **Week 2**: Migrate transcript data and episodes metadata
3. **Week 3**: Implement new search service with PostgreSQL queries
4. **Week 4**: Set up authentication system and user management
5. **Week 5**: Build edit interface and submission system
6. **Week 6**: Implement edit history and moderation tools
7. **Week 7**: Testing, performance optimization, and deployment
8. **Week 8**: Remove MeiliSearch dependencies and AWS infrastructure

## Cost Analysis

- **Current**: ~$120/year (MeiliSearch on AWS)
- **New**: $0/year (Supabase free tier: 500MB DB, 2GB bandwidth/month)
- **Buffer**: Supabase Pro ($25/month) if you exceed free tier limits

The free tier should easily handle 20 users/week with occasional edits.

## Additional Features to Consider

### Phase 2 Enhancements

- **Confidence Scoring**: Automatically flag low-confidence edits for review
- **Bulk Edit Tools**: Allow power users to fix systematic issues
- **Community Features**: User rankings based on accepted edits
- **Advanced Search**: Semantic search with embeddings for related quotes
- **Export Tools**: Download corrected transcripts in various formats
- **API Access**: Public API for developers and researchers
- **Mobile Optimization**: Touch-friendly editing interface

This migration plan provides a complete roadmap from the current MeiliSearch setup to a full-featured Supabase-based system with collaborative editing capabilities.
