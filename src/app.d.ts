// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface OverlayState {
			id: string;
			type: 'post' | 'settings' | 'login' | 'editor';
			presentation?: 'page' | 'modal';
			data?: any;
		}

		interface PageState {
			overlays?: OverlayState[];
		}
		// interface Platform {}
	}
}

declare module 'svelte/elements' {
	export interface WindowAttributes {
		onrefreshFeed?: (event: CustomEvent | Event) => void;
	}
}

export {};
