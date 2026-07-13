import { api } from '$lib/api/index.svelte';
import { getLeonardoUrl } from '$lib/api/utils';

export default class PersonTool {
	static get toolbox() {
		return {
			title: 'Персона',
			icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/>
					<path d="M6 20C6 16.6863 8.68629 14 12 14C15.3137 14 18 16.6863 18 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
				   </svg>`
		};
	}

	private data: { title: string; description: string; image: any };
	private wrapper: HTMLElement;
	private imagePreview: HTMLImageElement;

	constructor({ data }: { data: any }) {
		this.data = data || { title: '', description: '', image: null };
		this.wrapper = document.createElement('div');
		this.imagePreview = document.createElement('img');
	}

	render() {
		this.wrapper.classList.add('dtf-person-tool');

		const avatarContainer = document.createElement('div');
		avatarContainer.classList.add('dtf-person-tool-avatar-container');

		this.imagePreview.classList.add('dtf-person-tool-avatar-img');
		this.imagePreview.style.display = this.data.image && this.data.image.url ? 'block' : 'none';
		if (this.data.image && this.data.image.url) {
			this.imagePreview.src = this.data.image.url;
		}
		avatarContainer.appendChild(this.imagePreview);

		const placeholder = document.createElement('span');
		placeholder.classList.add('dtf-person-tool-avatar-placeholder');
		placeholder.textContent = '+ Фото';
		placeholder.style.display = this.data.image ? 'none' : 'block';
		avatarContainer.appendChild(placeholder);

		const fileInput = document.createElement('input');
		fileInput.type = 'file';
		fileInput.accept = 'image/*';
		fileInput.style.display = 'none';
		
		fileInput.addEventListener('change', async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (file) {
				placeholder.textContent = '...';
				placeholder.style.display = 'block';
				this.imagePreview.style.display = 'none';
				try {
					const result = await api.uploadMedia(file);
					this.data.image = {
						uuid: result.uuid,
						url: getLeonardoUrl(result.uuid),
						width: result.width,
						height: result.height,
						type: result.type,
						size: result.size,
						color: result.color
					};
					this.imagePreview.src = this.data.image.url;
					this.imagePreview.style.display = 'block';
					placeholder.style.display = 'none';
				} catch (err) {
					console.error("Failed to upload person image", err);
					placeholder.textContent = '+ Фото';
					placeholder.style.color = 'red';
				}
			}
		});

		avatarContainer.addEventListener('click', () => {
			fileInput.click();
		});

		avatarContainer.appendChild(fileInput);
		this.wrapper.appendChild(avatarContainer);

		const textContainer = document.createElement('div');
		textContainer.classList.add('dtf-person-tool-text-container');

		const titleInput = document.createElement('input');
		titleInput.type = 'text';
		titleInput.classList.add('dtf-person-tool-input', 'dtf-person-tool-input--title');
		titleInput.placeholder = 'Имя персоны';
		titleInput.value = this.data.title;
		titleInput.addEventListener('input', (e) => {
			this.data.title = (e.target as HTMLInputElement).value;
		});

		const descInput = document.createElement('input');
		descInput.type = 'text';
		descInput.classList.add('dtf-person-tool-input');
		descInput.placeholder = 'Должность / Описание';
		descInput.value = this.data.description;
		descInput.addEventListener('input', (e) => {
			this.data.description = (e.target as HTMLInputElement).value;
		});

		textContainer.appendChild(titleInput);
		textContainer.appendChild(descInput);
		this.wrapper.appendChild(textContainer);

		return this.wrapper;
	}

	save() {
		return {
			title: this.data.title,
			description: this.data.description,
			image: this.data.image
		};
	}
}
