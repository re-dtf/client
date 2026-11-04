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
	3: { url: '/reactions/3.png', name: 'Грусть', kind: 'positive', weight: 1 },
	4: { url: '/reactions/4.png', name: 'Смех', kind: 'neutral', weight: 1 },
	5: { url: '/reactions/5.png', name: 'Злость', kind: 'negative', weight: 1 },
	6: { url: '/reactions/6.png', name: 'Удивление', kind: 'positive', weight: 1 },
	7: { url: '/reactions/7.png', name: 'Грустный Пепе', kind: 'neutral', weight: 1 },
	8: { url: '/reactions/8.webp', name: 'Алмаз', kind: 'positive', weight: 2 },
	9: { url: '/reactions/9.png', name: 'Попкорн', kind: 'neutral', weight: 1 },
	10: { url: '/reactions/10.png', name: 'Кубок', kind: 'positive', weight: 1 },
	11: { url: '/reactions/11.png', name: 'Награда', kind: 'positive', weight: 1 },
	12: { url: '/reactions/12.png', name: 'Платина', kind: 'positive', weight: 1 },
	13: { url: '/reactions/13.png', name: 'Гейб', kind: 'positive', weight: 1 },
	14: { url: '/reactions/14.png', name: 'Нахтигалка', kind: 'neutral', weight: 1 },
	15: { url: '/reactions/15.png', name: 'Волт-Бой', kind: 'positive', weight: 1 },
	16: { url: '/reactions/16.png', name: 'Биг Босс', kind: 'positive', weight: 1 },
	17: { url: '/reactions/17.png', name: 'Тодд Говард', kind: 'neutral', weight: 1 },
	18: { url: '/reactions/18.png', name: 'Гигачад', kind: 'positive', weight: 1 },
	19: { url: '/reactions/19.png', name: 'Майкл Скотт', kind: 'negative', weight: 1 },
	20: { url: '/reactions/20.png', name: 'ЪУЪ', kind: 'neutral', weight: 1 },
	21: { url: '/reactions/21.png', name: 'Сосиска', kind: 'neutral', weight: 1 },
	22: { url: '/reactions/22.png', name: 'Круто', kind: 'positive', weight: 1 },
	23: { url: '/reactions/23.png', name: 'Покерфейс', kind: 'negative', weight: 1 },
	24: { url: '/reactions/24.png', name: 'Глаза', kind: 'positive', weight: 1 },
	25: { url: '/reactions/25.webp', name: 'Клоун', kind: 'negative', weight: 2 },
	26: { url: '/reactions/26.png', name: 'Нож', kind: 'negative', weight: 1 },
	28: { url: '/reactions/28.png', name: 'Дизлайк', kind: 'negative', weight: 1 },
	29: { url: '/reactions/29.png', name: 'Губы', kind: 'neutral', weight: 1 },
	31: { url: '/reactions/31.png', name: 'Баклажан', kind: 'neutral', weight: 1 },
	33: { url: '/reactions/33.png', name: 'Дуров', kind: 'positive', weight: 1 },
	34: { url: '/reactions/34.webp', name: 'Звезда', kind: 'positive', weight: 1 },
	35: { url: '/reactions/35.webp', name: 'Медаль', kind: 'positive', weight: 1 },
	36: { url: '/reactions/36.webp', name: 'Аплодисменты', kind: 'positive', weight: 1 },
	37: { url: '/reactions/37.webp', name: 'Золотой кубок', kind: 'positive', weight: 1 },
	38: { url: '/reactions/38.png', name: 'Ядерка', kind: 'neutral', weight: 1 },
	39: { url: '/reactions/39.webp', name: 'Какашка', kind: 'negative', weight: 1 },
	40: { url: '/reactions/40.webp', name: 'Пепе фейспалмит', kind: 'negative', weight: 1 },
	41: { url: '/reactions/41.webp', name: 'Пилюля', kind: 'negative', weight: 1 },
	42: { url: '/reactions/42.webp', name: 'Кот танцует', kind: 'positive', weight: 1 },
	43: { url: '/reactions/43.webp', name: 'Кот под лгбт', kind: 'positive', weight: 1 },
	44: { url: '/reactions/44.webp', name: 'Кот целует', kind: 'positive', weight: 1 },
	45: { url: '/reactions/45.webp', name: 'Кот', kind: 'positive', weight: 1 },
	46: { url: '/reactions/46.webp', name: 'Серый кот', kind: 'neutral', weight: 1 },
	47: { url: '/reactions/47.webp', name: 'Бэйтман', kind: 'neutral', weight: 1 },
	48: { url: '/reactions/48.webp', name: 'Хлоя', kind: 'neutral', weight: 1 },
	49: { url: '/reactions/49.webp', name: 'Скала', kind: 'positive', weight: 1 },
	50: { url: '/reactions/50.webp', name: 'Макмэхон', kind: 'neutral', weight: 1 },
	51: { url: '/reactions/51.webp', name: 'Шрек', kind: 'positive', weight: 1 },
	52: { url: '/reactions/52.webp', name: 'Бежевый кролик', kind: 'positive', weight: 1 },
	53: { url: '/reactions/53.webp', name: 'Моргающий парень', kind: 'neutral', weight: 1 }
};
