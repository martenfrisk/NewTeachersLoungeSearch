<script lang="ts">
	import Icon from './Icon.svelte';
	import Tooltip from '../Tooltip.svelte';

	type BadgeType = 'audio' | 'edited' | 'partial-edit' | 'unedited' | 'featured' | 'special';

	interface Props {
		type: BadgeType;
		/** Additional info like percentage for partial-edit */
		info?: string | number;
		/** Custom tooltip text */
		tooltip?: string;
		/** Show label text next to icon */
		showLabel?: boolean;
		/** Size variant */
		size?: 'sm' | 'md';
	}

	let { type, info, tooltip, showLabel = false, size = 'md' }: Props = $props();

	const badgeConfig = {
		audio: {
			icon: 'audio' as const,
			label: 'Audio',
			defaultTooltip: 'Audio available',
			classes: 'text-green-600 bg-green-50 border-green-200'
		},
		edited: {
			icon: 'check-badge' as const,
			label: 'Edited',
			defaultTooltip: 'Fully edited transcript',
			classes: 'text-blue-600 bg-blue-50 border-blue-200'
		},
		'partial-edit': {
			icon: 'document' as const, // Using document since 'edit' isn't in our IconName type
			label: 'Partial',
			defaultTooltip: info
				? `Partially edited transcript (${info}% edited)`
				: 'Partially edited transcript',
			classes: 'text-orange-600 bg-orange-50 border-orange-200'
		},
		unedited: {
			icon: 'document' as const,
			label: 'Unedited',
			defaultTooltip: 'Unedited transcript',
			classes: 'text-gray-400 bg-gray-50 border-gray-200'
		},
		featured: {
			icon: 'star' as const,
			label: 'Featured',
			defaultTooltip: 'Featured episode',
			classes: 'text-blue-600 bg-blue-100 border-blue-300'
		},
		special: {
			icon: 'star' as const,
			label: 'Special',
			defaultTooltip: 'Special episode',
			classes: 'text-purple-600 bg-purple-100 border-purple-300'
		}
	};

	const config = badgeConfig[type];
	const finalTooltip = tooltip || config.defaultTooltip;
	const iconSize = size === 'sm' ? 12 : 16;
	const badgeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs';
</script>

<Tooltip>
	{#snippet tooltip()}
		{finalTooltip}
	{/snippet}
	{#snippet content()}
		<span
			class="inline-flex items-center gap-1 rounded-md border font-medium {config.classes} {badgeClasses}"
			role="img"
			aria-label={finalTooltip}
		>
			<Icon name={config.icon} size={iconSize} />
			{#if showLabel}
				<span>{config.label}</span>
			{/if}
		</span>
	{/snippet}
</Tooltip>
