<script lang="ts">
	export let ep: string, title: string, desc: string, date: string;
</script>

<div class="w-full px-6 py-4 flex mb-4 rounded-md border border-blue-300 shadow-lg flex-wrap">
	<div class="w-full md:w-2/3 items-center md:items-end flex">
		<span class=" font-semibold ">
			{ep}
		</span>
		<span class="text-xl pl-4">
			{title}
		</span>
	</div>
	<div class="flex flex-row mt-2 md:mt-0 items-end md:flex-col w-full md:w-1/3">
		<span class="text-sm mr-3 md:mr-0 text-gray-700"> Released </span>
		<span class="text-sm md:text-base">
			{new Date(date).toLocaleDateString()}
		</span>
	</div>
	<div class="my-4 w-full">{desc}</div>
</div>
