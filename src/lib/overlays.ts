import { resolve } from '$app/paths';
import { pushState } from '$app/navigation';
import { page } from '$app/state';

export function pushOverlay(type: App.OverlayState['type'], path: string, data?: Record<string, any>) {
	const overlays = page.state.overlays || [];
	pushState(resolve(path as any), {
		overlays: [
			...overlays, 
			{ id: `${type}-${Date.now()}`, type, presentation: 'modal', data }
		]
	});
}
