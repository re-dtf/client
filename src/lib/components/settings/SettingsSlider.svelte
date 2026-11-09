<script lang="ts">
	/*
	 * Ползунок с делениями в стиле Adwaita: бегунок прыгает по меткам, выбранное значение подписано справа.
	 * Значения не обязаны идти равномерно — ползунок двигается по номерам меток.
	 */
	let { steps, value, unit = '', label, onchange }: {
		steps: number[];
		value: number;
		unit?: string;
		label: string;
		onchange: (value: number) => void;
	} = $props();

	let index = $derived(Math.max(0, steps.indexOf(value)));
	let last = $derived(steps.length - 1);

	function preview(input: HTMLInputElement, active: boolean) {
		input.closest('.window, .welcome')?.toggleAttribute('data-slider-drag', active);
	}
</script>

<div class="slider">
	<div class="slider__field" style:--ratio={index / last}>
		<input
			class="slider__input"
			type="range"
			min="0"
			max={last}
			step="1"
			value={index}
			aria-label={label}
			aria-valuetext="{value}{unit}"
			oninput={(e) => onchange(steps[+e.currentTarget.value])}
			onpointerdown={(e) => {
				// Контейнер гасит окружение; захват гарантирует завершение предпросмотра при отпускании и отмене
				e.currentTarget.setPointerCapture(e.pointerId);
				preview(e.currentTarget, true);
			}}
			onlostpointercapture={(e) => preview(e.currentTarget, false)}
			onkeydown={(e) => {
				if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) preview(e.currentTarget, true);
			}}
			onkeyup={(e) => preview(e.currentTarget, false)}
			onblur={(e) => preview(e.currentTarget, false)}
		/>
		<div class="slider__marks" aria-hidden="true">
			{#each steps as step, i (step)}
				<span class="slider__mark" class:slider__mark--passed={i <= index}></span>
			{/each}
		</div>
	</div>
	<output class="slider__value">{value}{unit}</output>
</div>

<style>
	.slider {
		display: flex;
		flex: 1 1 220px;
		align-items: center;
		gap: 14px;
		max-width: 360px;
	}

	.slider__field {
		position: relative;
		flex: 1;
		height: 26px;
		/* Половина бегунка: метки и дорожка начинаются от его центра */
		--thumb: 20px;
	}

	.slider__input {
		position: relative;
		z-index: 1;
		width: 100%;
		height: 100%;
		margin: 0;
		background: transparent;
		cursor: pointer;
		-webkit-appearance: none;
		appearance: none;
	}

	.slider__input::-webkit-slider-runnable-track {
		height: 26px;
		background: transparent;
	}

	.slider__input::-moz-range-track {
		height: 26px;
		background: transparent;
	}

	.slider__input::-webkit-slider-thumb {
		width: var(--thumb);
		height: var(--thumb);
		margin-top: 3px;
		border: 0;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
		-webkit-appearance: none;
		appearance: none;
		transition: transform var(--duration-base);
	}

	.slider__input::-moz-range-thumb {
		width: var(--thumb);
		height: var(--thumb);
		border: 0;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
		transition: transform var(--duration-base);
	}

	.slider__input:active::-webkit-slider-thumb {
		transform: scale(1.1);
	}

	.slider__input:active::-moz-range-thumb {
		transform: scale(1.1);
	}

	/* Дорожка рисуется под бегунком: серая, а до выбранного значения — акцентная */
	.slider__field::before,
	.slider__field::after {
		content: '';
		position: absolute;
		top: 11px;
		left: calc(var(--thumb) / 2);
		height: 4px;
		border-radius: 2px;
	}

	.slider__field::before {
		right: calc(var(--thumb) / 2);
		background: var(--st-track);
	}

	.slider__field::after {
		width: calc((100% - var(--thumb)) * var(--ratio));
		background: var(--st-accent);
	}

	.slider__marks {
		position: absolute;
		inset: 0 calc(var(--thumb) / 2);
		display: flex;
		justify-content: space-between;
		align-items: center;
		pointer-events: none;
	}

	.slider__mark {
		width: 2px;
		height: 10px;
		border-radius: 1px;
		background: var(--st-muted);
		opacity: 0.35;
	}

	.slider__mark--passed {
		background: var(--st-accent);
		opacity: 0.7;
	}

	.slider__input:focus-visible::-webkit-slider-thumb {
		outline: 2px solid var(--st-accent);
		outline-offset: 2px;
	}

	.slider__input:focus-visible::-moz-range-thumb {
		outline: 2px solid var(--st-accent);
		outline-offset: 2px;
	}

	.slider__value {
		flex: none;
		min-width: 52px;
		padding: 6px 10px;
		border-radius: 19px;
		background: var(--st-button);
		font-size: 14px;
		font-variant-numeric: tabular-nums;
		text-align: center;
	}
</style>
