<script lang="ts">
	import { notify } from '../ui/notify.svelte';
	import Button from '../ui/Button.svelte';
	import { DONATION_MARKS, DONATION_MAX, DONATION_MIN, formatDonation, nearestMarkIndex, parseDonation } from './donation';

	/** Кнопка ₽ в панели редактора и форма суммы над ней — как donate-attacher у DTF */
	let {
		attached = false,
		onattach
	}: {
		/** Донат уже прикреплён: кнопка гаснет */
		attached?: boolean;
		onattach: (amount: number) => void;
	} = $props();

	let open = $state(false);
	let text = $state(formatDonation(250));
	let markIndex = $state(nearestMarkIndex(250));
	let root = $state<HTMLElement>();

	let amount = $derived(parseDonation(text));
	let valid = $derived(amount >= DONATION_MIN && amount <= DONATION_MAX);

	function onInput(e: Event & { currentTarget: HTMLInputElement }) {
		const input = e.currentTarget;
		text = formatDonation(parseDonation(input.value));
		input.value = text;
		// Курсор не должен залезать на « ₽»
		const end = Math.max(0, text.length - 2);
		if (text) input.setSelectionRange(end, end);
		markIndex = nearestMarkIndex(amount);
	}

	// Проверка суммы — при уходе из поля, ошибка плашкой (как у DTF)
	function onBlur() {
		if (valid) return;
		notify.error(`Введите сумму от ${formatDonation(DONATION_MIN, false)} до ${formatDonation(DONATION_MAX, false)} рублей`);
	}

	function onRange(e: Event & { currentTarget: HTMLInputElement }) {
		markIndex = Number(e.currentTarget.value);
		text = formatDonation(DONATION_MARKS[markIndex]);
	}

	function attach() {
		if (!valid) return;
		onattach(amount);
		open = false;
	}

	function closeOnOutsideClick(e: MouseEvent) {
		if (open && !root?.contains(e.target as Node)) open = false;
	}

	const focusInput = (node: HTMLInputElement) => node.focus();
</script>

<svelte:window onclick={closeOnOutsideClick} />

<div class={['attacher', { 'attacher--active': open && !attached, 'attacher--disabled': attached }]} bind:this={root}>
	<button type="button" class="attacher__button" aria-label="Прикрепить донат" aria-expanded={open} onclick={() => (open = !open)}>
		<svg class="icon" width="20" height="20" aria-hidden="true">
			<use href="/icons.svg#v_rouble"></use>
		</svg>
	</button>

	{#if open && !attached}
		<div class="attacher__form">
			<input
				class="attacher__input"
				type="text"
				inputmode="numeric"
				placeholder="0 ₽"
				aria-label="Сумма доната"
				value={text}
				oninput={onInput}
				onblur={onBlur}
				onkeydown={(e) => e.key === 'Enter' && attach()}
				{@attach focusInput}
			/>
			<input
				class="attacher__range"
				type="range"
				min="0"
				max={DONATION_MARKS.length - 1}
				step="1"
				aria-label="Сумма доната"
				value={markIndex}
				style:--fill="{(markIndex / (DONATION_MARKS.length - 1)) * 100}%"
				oninput={onRange}
			/>
			<div class="attacher__button-wrap">
				<Button variant="blue" label="Прикрепить" disabled={!valid} onclick={attach} />
			</div>
		</div>
	{/if}
</div>

<style>
	.attacher {
		position: relative;
	}

	.attacher--disabled {
		pointer-events: none;
		opacity: 0.5;
	}

	.attacher__button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		margin-right: 6px;
		border-radius: 32px;
		color: #447;
		cursor: pointer;
	}

	.attacher--active .attacher__button {
		background-color: #f2f2f2;
	}

	@media (hover: hover) {
		.attacher__button:hover {
			background-color: #f2f2f2;
		}
	}

	.attacher__form {
		position: absolute;
		bottom: 100%;
		left: -7px;
		z-index: 10;
		width: 210px;
		margin-bottom: 12px;
		padding: 12px 16px;
		border: 1px solid rgba(0, 0, 0, 0.07);
		border-radius: 4px;
		background-color: #fff;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06), inset 0 -1px 0 #fff;
	}

	/* Стрелка к кнопке */
	.attacher__form::before {
		content: '';
		position: absolute;
		bottom: -6px;
		left: 17px;
		width: 10px;
		height: 10px;
		border: solid rgba(0, 0, 0, 0.07);
		border-width: 0 1px 1px 0;
		background-color: #fff;
		transform: rotate(45deg);
		pointer-events: none;
	}

	.attacher__input {
		width: 100%;
		height: 48px;
		box-sizing: border-box;
		margin-bottom: 10px;
		padding: 0 11px;
		border: 1px solid rgba(0, 0, 0, 0.03);
		border-radius: 8px;
		background-color: #f5f5f5;
		font: inherit;
		font-size: 24px;
		text-align: center;
		transition: background-color 0.1s linear, border-color 0.1s linear, box-shadow 0.1s linear;
	}

	.attacher__input:focus {
		border-color: var(--color-blue);
		background-color: #fff;
		outline: 0;
		box-shadow: 0 0 0 3px rgba(70, 131, 217, 0.12);
	}

	/* Слайдер: дорожка 4px, закрашенная часть синяя, ползунок 20px */
	.attacher__range {
		display: block;
		width: 100%;
		height: 20px;
		margin: 0 0 10px;
		background: transparent;
		appearance: none;
		cursor: pointer;
	}

	.attacher__range::-webkit-slider-runnable-track {
		height: 4px;
		border-radius: 2px;
		background: linear-gradient(to right, #4683d9 var(--fill), #f5f5f5 var(--fill));
		box-shadow: inset 0 0.5px 1.5px rgba(0, 0, 0, 0.25);
	}

	.attacher__range::-moz-range-track {
		height: 4px;
		border-radius: 2px;
		background: linear-gradient(to right, #4683d9 var(--fill), #f5f5f5 var(--fill));
		box-shadow: inset 0 0.5px 1.5px rgba(0, 0, 0, 0.25);
	}

	.attacher__range::-webkit-slider-thumb {
		width: 20px;
		height: 20px;
		margin-top: -8px;
		border: 0;
		border-radius: 50%;
		background-color: #fff;
		box-shadow: 0 2px 1px rgba(0, 0, 0, 0.02), 0 2.5px 0.5px rgba(0, 0, 0, 0.02), 0 2px 0.5px rgba(27, 27, 28, 0.03), 0 1px 0.5px rgba(28, 26, 26, 0.03),
			0 0.5px 1px rgba(28, 26, 26, 0.04), 0 3px 8px rgba(22, 18, 18, 0.15);
		appearance: none;
	}

	.attacher__range::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border: 0;
		border-radius: 50%;
		background-color: #fff;
		box-shadow: 0 2px 1px rgba(0, 0, 0, 0.02), 0 2.5px 0.5px rgba(0, 0, 0, 0.02), 0 2px 0.5px rgba(27, 27, 28, 0.03), 0 1px 0.5px rgba(28, 26, 26, 0.03),
			0 0.5px 1px rgba(28, 26, 26, 0.04), 0 3px 8px rgba(22, 18, 18, 0.15);
	}

	.attacher__button-wrap {
		--btn-height: 32px;
		--btn-font-size: 14px;
		--btn-offset: 12px;
	}

	.attacher__button-wrap :global(.btn) {
		width: 100%;
	}
</style>
