/** Как реакция влияет на рейтинг: плюсует, минусует или не влияет */
export type ReactionKind = 'positive' | 'neutral' | 'negative';

export interface ReactionConfig {
	url: string; // путь к картинке ("/reactions/1.webp")
	/** Название для экрана настроек */
	name: string;
	/** Значения по умолчанию: пользователь меняет их в настройках (storage/reactions.svelte.ts) */
	kind: ReactionKind;
	/** Сколько очков рейтинга даёт одна реакция (по модулю; у нейтральной не учитывается) */
	weight: number;
}

// Все известные реакции. Новые реакции DTF появляются здесь; без записи реакция нейтральная и без картинки.
export const REACTIONS: Record<number, ReactionConfig> = {
	1: { url: '/reactions/1.png', name: 'Сердце', kind: 'positive', weight: 1 },
	2: { url: '/reactions/2.png', name: 'Огонь', kind: 'positive', weight: 1 },
	3: { url: '/reactions/3.png', name: 'Грусть', kind: 'neutral', weight: 1 },
	4: { url: '/reactions/4.png', name: 'Смех', kind: 'positive', weight: 1 },
	5: { url: '/reactions/5.png', name: 'Злость', kind: 'negative', weight: 1 },
	6: { url: '/reactions/6.png', name: 'Удивление', kind: 'neutral', weight: 1 },
	8: { url: '/reactions/8.webp', name: 'Алмаз', kind: 'positive', weight: 1 },
	9: { url: '/reactions/9.png', name: 'Попкорн', kind: 'neutral', weight: 1 },
	10: { url: '/reactions/10.png', name: 'Кубок', kind: 'positive', weight: 1 },
	18: { url: '/reactions/18.png', name: 'Гигачад', kind: 'positive', weight: 1 },
	22: { url: '/reactions/22.png', name: 'Круто', kind: 'positive', weight: 1 },
	23: { url: '/reactions/23.png', name: 'Покерфейс', kind: 'negative', weight: 1 },
	24: { url: '/reactions/24.png', name: 'Глаза', kind: 'neutral', weight: 1 },
	25: { url: '/reactions/25.webp', name: 'Клоун', kind: 'negative', weight: 1 },
	36: { url: '/reactions/36.webp', name: 'Аплодисменты', kind: 'positive', weight: 1 },
	39: { url: '/reactions/39.webp', name: 'Какашка', kind: 'negative', weight: 1 },
	45: { url: '/reactions/45.webp', name: 'Кот', kind: 'positive', weight: 1 },
	46: { url: '/reactions/46.webp', name: 'Серый кот', kind: 'neutral', weight: 1 },
	47: { url: '/reactions/47.webp', name: 'Бэйтман', kind: 'neutral', weight: 1 },
	50: { url: '/reactions/50.webp', name: 'Макмэхон', kind: 'neutral', weight: 1 },
	52: { url: '/reactions/52.webp', name: 'Бежевый кролик', kind: 'neutral', weight: 1 },
	53: { url: '/reactions/53.webp', name: 'Моргающий парень', kind: 'neutral', weight: 1 }
};
