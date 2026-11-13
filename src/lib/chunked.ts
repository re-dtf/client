/**
 * Показ списка порциями по кадрам: за кадр добавляется `size` элементов, а не вся пачка сразу.
 * `run()` возвращает промис: true — показали всё, что было, false — показывать было нечего или показ прервали.
 * `stop()` прерывает показ и сразу отвечает ожидающим `false`, чтобы никто не ждал вечно.
 */
export function chunked(total: () => number, shown: () => number, show: (count: number) => void, size = 5) {
	let raf: number | undefined;
	let pending: Promise<boolean> | undefined;
	let settle: ((done: boolean) => void) | undefined;

	function stop() {
		if (raf !== undefined) cancelAnimationFrame(raf);
		raf = undefined;
		settle?.(false);
		settle = pending = undefined;
	}

	// Показывает очередную порцию; true, если список показан целиком
	const grow = () => {
		show(Math.min(total(), shown() + size));
		return shown() >= total();
	};

	function run(): Promise<boolean> {
		stop();
		if (shown() >= total()) return Promise.resolve(false);
		if (grow()) return Promise.resolve(true);
		return (pending = new Promise((resolve) => {
			settle = resolve;
			const step = () => {
				if (!grow()) {
					raf = requestAnimationFrame(step);
					return;
				}
				raf = undefined;
				settle = pending = undefined;
				resolve(true);
			};
			raf = requestAnimationFrame(step);
		}));
	}

	return {
		run,
		stop,
		/** Показ идёт: промис завершится, когда список будет показан целиком (или показ прервут) */
		get pending() {
			return pending;
		}
	};
}
