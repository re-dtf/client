export interface ReactionConfig {
	url: string; // путь к картинке ("/reactions/1.webp")
}

// Удобное место для редактирования всех реакций.
export const REACTIONS: Record<number, ReactionConfig> = {
	1: { url: '/reactions/1.png' }, // ❤️
	2: { url: '/reactions/2.png' }, // 🔥
	3: { url: '/reactions/3.png' }, // 😢
	4: { url: '/reactions/4.png' }, // 😂
	5: { url: '/reactions/5.png' },
	6: { url: '/reactions/6.png' }, // 😮
	8: { url: '/reactions/8.webp' },
	9: { url: '/reactions/9.png' }, // 🍿
	10: { url: '/reactions/10.png' },
	18: { url: '/reactions/18.png' },
	22: { url: '/reactions/22.png' }, // 😎
	23: { url: '/reactions/23.png' }, // 😐
	24: { url: '/reactions/24.png' }, // 👀
	25: { url: '/reactions/25.webp' }, // 🤡
	36: { url: '/reactions/36.webp' }, // 👏
	39: { url: '/reactions/39.webp' },
	45: { url: '/reactions/45.webp' }, // 🐈
	46: { url: '/reactions/46.webp' },
	47: { url: '/reactions/47.webp' },
	50: { url: '/reactions/50.webp' },
	52: { url: '/reactions/52.webp' },
	53: { url: '/reactions/53.webp' }
};
