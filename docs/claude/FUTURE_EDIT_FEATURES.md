# Future Edit Features Documentation

This document outlines the collaborative transcript editing system that will be implemented after the initial MeiliSearch to Supabase migration is complete.

## Phase 6: Collaborative Editing System

### Overview

Enable authenticated users to collaboratively edit podcast transcripts with version control, moderation, and quality assurance systems.

### Edit Interface Components

#### Enhanced SearchHit with Edit Functionality

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

#### Edit Line Modal Component

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

### Edit Service Implementation

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

### Version Control & Timeline Integrity

#### Database View for Current Transcript State

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

### Moderation Tools (Admin/Moderator Only)

#### Edit Approval Interface

```svelte
<!-- src/lib/components/admin/EditModeration.svelte -->
<script lang="ts">
	import { user } from '$lib/stores/auth';
	import { EditService } from '$lib/services/EditService';

	const editService = new EditService();
	let pendingEdits = $state([]);
	let loading = $state(false);

	$effect(async () => {
		if ($user?.role === 'admin' || $user?.role === 'moderator') {
			pendingEdits = await editService.getPendingEdits();
		}
	});

	async function approveEdit(editId: string) {
		await editService.approveEdit(editId, $user.id);
		// Refresh pending edits
		pendingEdits = await editService.getPendingEdits();
	}

	async function rejectEdit(editId: string, reason: string) {
		await editService.rejectEdit(editId, $user.id, reason);
		pendingEdits = await editService.getPendingEdits();
	}
</script>

{#if $user?.role === 'admin' || $user?.role === 'moderator'}
	<div class="edit-moderation">
		<h3>Pending Edit Approvals ({pendingEdits.length})</h3>

		{#each pendingEdits as edit}
			<div class="edit-review-card">
				<div class="edit-info">
					<span class="user">By: {edit.edited_by.username}</span>
					<span class="confidence">Confidence: {edit.confidence_score}</span>
					<span class="changes">Changes: {edit.change_type.join(', ')}</span>
				</div>

				<div class="original-content">
					<h4>Original:</h4>
					<p>{edit.original_line.line}</p>
				</div>

				<div class="proposed-content">
					<h4>Proposed:</h4>
					<p>{edit.line_text}</p>
				</div>

				<div class="actions">
					<button onclick={() => approveEdit(edit.id)} class="approve"> Approve </button>
					<button onclick={() => rejectEdit(edit.id, 'Reason here')} class="reject">
						Reject
					</button>
				</div>
			</div>
		{/each}
	</div>
{/if}
```

### Community Features (Future Enhancements)

#### User Rankings & Gamification

- Track edit acceptance rates per user
- Contributor leaderboards
- Quality badges for reliable contributors
- Reputation system based on successful edits

#### Advanced Quality Control

- Automatic confidence scoring based on:
  - Edit size/scope
  - User's historical accuracy
  - Time since original transcript
  - Complexity of changes
- Machine learning models for detecting spam/vandalism
- Community voting on disputed edits

#### Bulk Edit Tools

- Pattern-based corrections across multiple episodes
- Speaker name standardization tools
- Timestamp adjustment utilities
- Mass deletion of spam content

### Data Export & API

- Export corrected transcripts in various formats (JSON, SRT, VTT)
- Public API for researchers and developers
- Version history exports for transparency
- Integration with podcast hosting platforms

### Mobile Optimization

- Touch-friendly edit interface
- Swipe gestures for quick approvals (moderators)
- Mobile-optimized transcript viewing
- Offline edit queue with sync when online

## Implementation Priority

1. **Core Edit System**: Basic edit submission and approval workflow
2. **Version Control**: Edit history and rollback capabilities
3. **Moderation Tools**: Admin interface for managing edits
4. **Quality Control**: Confidence scoring and automatic flagging
5. **Community Features**: User rankings and gamification
6. **Advanced Tools**: Bulk edits and pattern matching
7. **Mobile & Export**: Mobile optimization and data export features

This system will transform the podcast transcript search into a collaborative, community-driven platform while maintaining quality and preventing abuse.
