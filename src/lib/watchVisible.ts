/**
 * Зовёт `load`, пока узел (низ списка) виден с запасом в 1000px. Если `load` вернул промис,
 * следующий вызов ждёт его завершения, а при `true` сразу проверяет снова: список мог не дотянуться до края.
 * Возвращает снятие наблюдателя.
 */
export function watchVisible(node: Element, load: () => unknown): () => void {
	let visible = false;
	let busy = false;
	const check = () => {
		if (!visible || busy) return;
		const res = load();
		if (!(res instanceof Promise)) return;
		busy = true;
		const done = (added: unknown) =>
			requestAnimationFrame(() => {
				busy = false;
				if (visible && added) check();
			});
		res.then(done, () => done(false));
	};
	const observer = new IntersectionObserver(
		(entries) => {
			visible = entries[0].isIntersecting;
			if (visible) check();
		},
		{ rootMargin: '1000px' }
	);
	observer.observe(node);
	return () => {
		visible = false;
		observer.disconnect();
	};
}
