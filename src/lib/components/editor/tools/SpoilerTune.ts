export default class SpoilerTune {
	static get isTune() {
		return true;
	}

	private api: any;
	private data: { hidden: boolean };

	constructor({ api, data }: { api: any; data: any }) {
		this.api = api;
		this.data = data || { hidden: false };
	}

	render() {
		const wrapper = document.createElement('div');
		wrapper.classList.add('dtf-spoiler-tune-btn');

		if (this.data.hidden) {
			wrapper.classList.add('dtf-spoiler-tune-btn--active');
		}

		// Eye icon (spoiler)
		wrapper.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/></svg><span>Спойлер</span>`;
		
		wrapper.addEventListener('click', () => {
			this.data.hidden = !this.data.hidden;
			wrapper.classList.toggle('dtf-spoiler-tune-btn--active', this.data.hidden);
			
			// Optional visual update
			const blockIndex = this.api.blocks.getCurrentBlockIndex();
			const block = this.api.blocks.getBlockByIndex(blockIndex);
			if (block && block.holder) {
				block.holder.classList.toggle('editor-block-is-spoiler', this.data.hidden);
			}
		});

		return wrapper;
	}

	save() {
		return {
			hidden: this.data.hidden
		};
	}

	wrap(blockContent: HTMLElement) {
		setTimeout(() => {
			const blockIndex = this.api.blocks.getCurrentBlockIndex();
			const block = this.api.blocks.getBlockByIndex(blockIndex);
			if (block && block.holder && this.data.hidden) {
				block.holder.classList.add('editor-block-is-spoiler');
			}
		}, 0);
		return blockContent;
	}
}
