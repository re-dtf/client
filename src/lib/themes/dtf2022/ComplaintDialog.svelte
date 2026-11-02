<script lang="ts">
	import { COMPLAINT_REASONS } from '$lib/config/complaintReasons';
	import Button from './ui/Button.svelte';
	import Popup from './ui/Popup.svelte';
	import Select from './ui/Select.svelte';
	import { notify } from './ui/notify.svelte';

	let {
		onsubmit,
		onclose
	}: {
		onsubmit: (reasonId: number) => Promise<void>;
		onclose: () => void;
	} = $props();

	const options = COMPLAINT_REASONS.map(({ id, label }) => ({ value: id, label }));

	let reasonId = $state<number>();
	let sending = $state(false);

	async function submit() {
		if (!reasonId) return;
		sending = true;
		try {
			await onsubmit(reasonId);
			notify.success('Ваша жалоба отправлена модератору');
			onclose();
		} catch (e) {
			notify.error(`Не удалось отправить жалобу (${(e as Error).message})`);
		} finally {
			sending = false;
		}
	}
</script>

<Popup title="Пожаловаться" {onclose}>
	<Select bind:value={reasonId} {options} placeholder="Выберите причину" />

	{#snippet footer()}
		<Button variant="blue" label="Отправить" disabled={!reasonId || sending} onclick={submit} />
	{/snippet}
</Popup>
