<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>About | Seekers' Lounge</title>
	<meta
		name="description"
		content="What Seekers' Lounge is, where the transcripts come from, and how to help improve them."
	/>
	<link rel="canonical" href="https://seekerslounge.pcast.site/about" />
</svelte:head>

<div class="mx-auto mt-6 mb-16 max-w-3xl space-y-5 px-4">
	<h1 class="text-3xl font-bold text-ink">About Seekers' Lounge</h1>

	<section class="rounded-2xl bg-surface p-6 shadow-card">
		<p class="leading-relaxed text-ink">
			Seekers' Lounge is an unofficial fan website where you can search through the transcripts of
			every episode of The Teachers' Lounge to find your favorite bit.
		</p>
		<p class="mt-3 leading-relaxed text-ink">
			Listen to the free episodes wherever you get your podcasts, or buy them from
			<a
				class="font-medium text-blue-700 underline transition-colors hover:text-blue-800"
				href="https://biggrandewebsite.com/"
			>
				biggrandewebsite.com</a
			>.
		</p>
	</section>

	<section class="rounded-2xl bg-surface p-6 shadow-card">
		<h2 class="text-xl font-bold text-ink">About the transcripts</h2>
		<p class="mt-3 leading-relaxed text-ink">
			Transcripts start out auto-transcribed, so they contain errors and unidentified speakers.
			Episodes marked
			<span class="font-semibold text-green-700">Reviewed</span> have been fully corrected and partially
			edited episodes show how much has been reviewed so far.
		</p>
	</section>

	<section class="rounded-2xl bg-surface p-6 shadow-card">
		<h2 class="text-xl font-bold text-ink">Want to help out?</h2>
		<p class="mt-3 leading-relaxed text-ink">
			You can contribute directly on the site by editing the generated transcripts. Here's how:
		</p>
		<ol class="mt-3 list-decimal space-y-2 pl-5 leading-relaxed text-ink">
			<li>Create an account (the account icon in the top right) and sign in.</li>
			<li>
				Open the <a
					class="font-medium text-blue-700 underline transition-colors hover:text-blue-800"
					href={resolve('/editor')}>transcript editor</a
				> from your account menu, pick an episode, correct lines or identify speakers.
			</li>
			<li>Submit your edits. A moderator reviews them before they go live.</li>
			<li>
				Track the status of your submissions on your
				<a
					class="font-medium text-blue-700 underline transition-colors hover:text-blue-800"
					href={resolve('/profile')}>profile page</a
				>.
			</li>
		</ol>
	</section>

	<section class="rounded-2xl bg-surface p-6 shadow-card">
		<h2 class="text-xl font-bold text-ink">Support the site</h2>
		<p class="mt-3 leading-relaxed text-ink">
			Seekers' Lounge is free with no ads. If you find it useful you can
			<a
				class="font-medium text-blue-700 underline transition-colors hover:text-blue-800"
				href="https://www.buymeacoffee.com/seekerslounge"
			>
				buy me a cup</a
			> of courthouse coffee.
		</p>
	</section>

	<section class="rounded-2xl bg-surface p-6 shadow-card">
		<h2 class="text-xl font-bold text-ink">Copyright</h2>
		<p class="mt-3 leading-relaxed text-ink-muted">
			No copyright infringement intended. All rights belong to their respective rights holders
			(probably Big Grande and Earwolf). Want to contact me? I'll see your ass in court (or message
			me on reddit, u/martanor).
		</p>
		<p class="mt-3 text-sm text-ink-muted">
			Built with SvelteKit, powered by Supabase, styled with Tailwind CSS.
		</p>
	</section>
</div>
