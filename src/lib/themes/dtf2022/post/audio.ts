/** 215.5 → «3:35», 3725 → «1:02:05» */
export function formatDuration(seconds: number): string {
	const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = String(total % 60).padStart(2, '0');
	return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

let playing: HTMLAudioElement | undefined;

/** Играет одна дорожка на странице: новая ставит предыдущую на паузу */
export function claimPlayback(audio: HTMLAudioElement) {
	if (playing && playing !== audio) playing.pause();
	playing = audio;
}
