<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		isOpen = false,
		top = '0px',
		left = '0px',
		width,
		align = 'right',
		onclose,
		children,
		class: className = ''
	} = $props<{
		isOpen?: boolean;
		top?: string | number;
		left?: string | number;
		width?: string | number;
		align?: 'left' | 'right';
		onclose?: () => void;
		children?: Snippet;
		class?: string;
	}>();

	let topPx = $derived(typeof top === 'number' ? `${top}px` : top);
	let leftPx = $derived(typeof left === 'number' ? `${left}px` : left);
	let widthPx = $derived(width ? (typeof width === 'number' ? `${width}px` : width) : undefined);

	$effect(() => {
		if (isOpen) {
			const handleOutsideClick = (e: MouseEvent) => {
				const target = e.target as HTMLElement;
				if (!target.closest('.popover-container')) {
					onclose?.();
				}
			};
			window.addEventListener('click', handleOutsideClick);
			return () => window.removeEventListener('click', handleOutsideClick);
		}
	});
</script>

{#if isOpen}
	<div class="popover-container">
		<div
			class={['popover', align === 'right' ? 'popover--right' : '', className]}
			style:--top={topPx}
			style:--left={leftPx}
			style:width={widthPx}
		>
			<div class="popover__main">
				<div class="popover__scrollable">
					<div class="popover__content">
						{#if children}
							{@render children()}
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
