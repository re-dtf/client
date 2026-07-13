export default class AnchorTune {
	static get isTune() {
		return true;
	}

	private api: any;
	private data: { id: string };

	constructor({ api, data }: { api: any; data: any }) {
		this.api = api;
		this.data = data || { id: '' };
	}

	render() {
		const wrapper = document.createElement('div');
		wrapper.classList.add('ce-settings', 'dtf-anchor-tune');

		const label = document.createElement('label');
		label.textContent = 'Якорь (anchor):';
		label.classList.add('dtf-anchor-tune-label');

		const input = document.createElement('input');
		input.type = 'text';
		input.placeholder = 'my-anchor';
		input.value = this.data.id || '';
		input.classList.add('dtf-anchor-tune-input');

		input.addEventListener('input', (e: Event) => {
			this.data.id = (e.target as HTMLInputElement).value;
		});

		wrapper.appendChild(label);
		wrapper.appendChild(input);

		return wrapper;
	}

	save() {
		return {
			id: this.data.id
		};
	}
}
