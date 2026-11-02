<script lang="ts">
	/* Переключатель как в Adwaita: дорожка и круглый бегунок */
	let { checked, onchange, label }: { checked: boolean; onchange: (checked: boolean) => void; label?: string } = $props();
</script>

<input class="switch" type="checkbox" role="switch" aria-label={label} {checked} onchange={(e) => onchange(e.currentTarget.checked)} />

<style>
	.switch {
		position: relative;
		flex: none;
		width: 46px;
		height: 26px;
		border-radius: 13px;
		background: var(--st-track);
		cursor: pointer;
		transition: background-color var(--duration-base);
	}

	.switch::before {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
		transition: transform var(--duration-base);
	}

	.switch:checked {
		background: var(--st-accent);
	}

	.switch:checked::before {
		transform: translateX(20px);
	}

	.switch:focus-visible {
		outline: 2px solid var(--st-accent);
		outline-offset: 2px;
	}
</style>
