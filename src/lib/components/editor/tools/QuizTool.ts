export default class QuizTool {
	static get toolbox() {
		return {
			title: 'Опрос',
			icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
				   </svg>`
		};
	}

	private data: { hash: string; title: string; items: Record<string, string> };
	private wrapper: HTMLElement;
	private itemsContainer: HTMLElement;

	constructor({ data }: { data: any }) {
		this.data = data && data.hash ? data : { 
			hash: this.generateHash(), 
			title: '', 
			items: { ['o' + Date.now()]: '', ['o' + (Date.now() + 1)]: '' } 
		};
		this.wrapper = document.createElement('div');
		this.itemsContainer = document.createElement('div');
	}

	generateHash() {
		return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
	}

	render() {
		this.wrapper.classList.add('dtf-quiz-tool');

		const header = document.createElement('div');
		header.textContent = 'Опрос';
		header.classList.add('dtf-quiz-tool-header');
		this.wrapper.appendChild(header);

		const titleInput = document.createElement('input');
		titleInput.type = 'text';
		titleInput.classList.add('dtf-quiz-tool-title');
		titleInput.placeholder = 'Вопрос...';
		titleInput.value = this.data.title;
		titleInput.addEventListener('input', (e) => {
			this.data.title = (e.target as HTMLInputElement).value;
		});
		this.wrapper.appendChild(titleInput);

		this.itemsContainer.classList.add('dtf-quiz-tool-options');
		this.wrapper.appendChild(this.itemsContainer);

		this.renderItems();

		const addButton = document.createElement('button');
		addButton.classList.add('dtf-quiz-tool-add-btn');
		addButton.textContent = '+ Добавить вариант';
		addButton.addEventListener('click', () => {
			this.data.items['o' + Date.now()] = '';
			this.renderItems();
		});
		this.wrapper.appendChild(addButton);

		return this.wrapper;
	}

	renderItems() {
		this.itemsContainer.innerHTML = '';
		Object.keys(this.data.items).forEach(key => {
			const itemRow = document.createElement('div');
			itemRow.classList.add('dtf-quiz-tool-option');

			const input = document.createElement('input');
			input.type = 'text';
			input.classList.add('dtf-quiz-tool-option-input');
			input.placeholder = 'Вариант ответа';
			input.value = this.data.items[key];
			input.addEventListener('input', (e) => {
				this.data.items[key] = (e.target as HTMLInputElement).value;
			});

			const delBtn = document.createElement('button');
			delBtn.classList.add('dtf-quiz-tool-option-remove');
			delBtn.textContent = '×';
			delBtn.addEventListener('click', () => {
				delete this.data.items[key];
				this.renderItems();
			});

			itemRow.appendChild(input);
			itemRow.appendChild(delBtn);
			this.itemsContainer.appendChild(itemRow);
		});
	}

	save() {
		// filter empty items
		const filteredItems: Record<string, string> = {};
		for (const key in this.data.items) {
			if (this.data.items[key].trim()) {
				filteredItems[key] = this.data.items[key];
			}
		}
		return {
			hash: this.data.hash,
			title: this.data.title,
			items: filteredItems
		};
	}
}
