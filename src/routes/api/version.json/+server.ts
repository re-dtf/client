import { json } from '@sveltejs/kit';
import { version } from '$app/env';

export const prerender = true;

export function GET() {
	return json({ version });
}
