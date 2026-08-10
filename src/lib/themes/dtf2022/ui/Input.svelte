<script lang="ts">
	let {
		value = $bindable(''),
		type = 'text',
		placeholder = '',
		id,
		name,
		autocomplete,
		disabled = false,
		oninput,
		onchange,
		class: className = '',
		...rest
	} = $props<{
		value?: string;
		type?: string;
		placeholder?: string;
		id?: string;
		name?: string;
		autocomplete?: string;
		disabled?: boolean;
		oninput?: (e: Event) => void;
		onchange?: (e: Event) => void;
		class?: string;
		[key: string]: any;
	}>();
</script>

<div class={['field', className]}>
	<div class="field__wrapper">
		<label class="input-field">
			<input
				{type}
				bind:value
				{placeholder}
				{id}
				{name}
				{autocomplete}
				{disabled}
				{oninput}
				{onchange}
				{...rest}
			/>
		</label>
	</div>
</div>
