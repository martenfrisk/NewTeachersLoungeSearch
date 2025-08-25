<script lang="ts">
	import { onMount } from 'svelte';
	import AudioPlayer from './components/AudioPlayer.svelte';
	import { audioTimestamp } from './stores';
	import { env } from '$env/dynamic/public';
	let rssFeed = '';
	$: audioSrc = '';
	let episodes: { title?: string | null; url?: string | null }[] = [];
	let currTime: number;
	$: currTime;
	let currEpTitle = '';
	let hidden = false;
	let errorMsg = '';

	function timestampToSeconds(time: string) {
		const [hours, minutes, seconds] = time.split(':').map(Number);
		return hours * 3600 + minutes * 60 + seconds;
	}

	audioTimestamp.subscribe((timestamp) => {
		if (timestamp?.timestamp && timestamp?.episode) {
			const index = episodes.find((ep) => ep.title === timestamp.episode);
			audioSrc = index?.url || '';
			currTime = timestampToSeconds(timestamp.timestamp);
			currEpTitle = timestamp.episode;
		}
	});

	onMount(async () => {
		const feed = window.localStorage.getItem('lounge-feed');
		if (feed) {
			rssFeed = feed;
			getFirstEp(feed);
		}
	});

	function checkUrlValidity(url: string) {
		return url.startsWith(`${env.PUBLIC_LOUNGE_URL}?auth=`);
	}

	function getUrl(authKey: string) {
		return `${env.PUBLIC_LOUNGE_URL}?auth=${authKey}`;
	}

	async function getFirstEp(authToken: string) {
		const response = await fetch(getUrl(authToken));

		const text = await response.text();
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(text, 'text/xml');

		const items = xmlDoc.querySelectorAll('item');

		episodes = Array.from(items).map((item) => {
			const titleRef = item.querySelector('title')?.textContent;
			if (!titleRef) return {};

			return {
				title: titleRef,
				url: item.querySelector('enclosure')?.getAttribute('url')
			};
		});
	}

	function handleSubmit(
		event: SubmitEvent & {
			currentTarget: EventTarget & HTMLFormElement;
		}
	) {
		const data = new FormData(event.currentTarget);
		const rss = data.get('rss');
		if (!rss || !checkUrlValidity(rss.toString())) {
			errorMsg = 'Incorrect RSS link';
			return;
		}
		rssFeed = rss.toString();
		window.localStorage.setItem('lounge-feed', rssFeed);
		getFirstEp(rssFeed);
	}

	function clearFeed() {
		window.localStorage.removeItem('lounge-feed');
		rssFeed = '';
	}
</script>

{#if !hidden}
	<div
		class="fixed bottom-0 md:w-1/2 w-5/6 mx-auto max-w-full py-2 px-1 md:px-4 bg-white border-gray-300 border"
	>
		{#if errorMsg}
			<div class="text-red-500">{errorMsg}</div>
		{:else if !rssFeed}
			<div class="text-base flex flex-col">
				<p>Add your own RSS feed to enable audio playback.</p>
				<div>
					Link should be in the format: <div class="text-sm">
						https://biggrande.memberfulcontent.com/rss/<span class="italic text-gray-400">
							123456?auth=abc123
						</span>
					</div>
				</div>
			</div>
			<form class="w-full flex justify-between" on:submit|preventDefault={handleSubmit}>
				<input
					type="text"
					name="rss"
					class="grow border border-gray-400 shadow-md p-2"
					placeholder="Paste feed here..."
				/>
				<button
					class="border border-blue-400 px-8 py-2 text-blue-800 font-semibold bg-blue-50"
					type="submit">Add</button
				>
			</form>
		{:else if !audioSrc}
			<div class="text-center text-sm text-gray-600">
				Feed loaded. Press 'Listen' on a line to start playback. Only the original TL episodes
				available right now.
				<button
					type="button"
					on:click={clearFeed}
					class="border border-red-500 rounded px-2 py-1 text-red-700">Remove feed.</button
				>
			</div>
		{:else if audioSrc && currTime}
			<AudioPlayer src={audioSrc} paused={false} {currTime} title={currEpTitle || ''} />
		{/if}
		<button
			class="absolute top-0 right-0 md:mr-3 md:mt-3 mr-1 mt-1 text-lg"
			type="button"
			on:click={() => (hidden = true)}>X</button
		>
	</div>
{/if}
