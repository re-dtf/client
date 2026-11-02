// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}

		/**
		 * Оверлей поверх ленты. Что открыть и с какими данными. Новый тип оверлея описывается здесь,
		 * в src/lib/navigation.ts (адрес и способ показа) и в src/routes/+layout.svelte (компонент).
		 */
		type OverlayData =
			| { type: 'post'; data: { postId: number; sourceId: string } }
			| { type: 'profile'; data: { profileId: number } }
			| { type: 'settings' }
			| { type: 'login' }
			| { type: 'editor'; data?: { postId?: number | null; repostId?: number } };

		/** Оверлей в стеке: то, что открыли, плюс служебные поля */
		type OverlayState = OverlayData & {
			id: string;
			/** page — вместо страницы, лента под ним скрыта; modal — окно поверх */
			presentation: 'page' | 'modal';
		};

		interface PageState {
			overlays?: OverlayState[];
		}
		// interface Platform {}
	}
}

export {};
