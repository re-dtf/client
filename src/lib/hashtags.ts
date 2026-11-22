/*
 * Теги в тексте записей. DTF отдаёт `#тег` обычным текстом, а ссылкой на страницу тега его делает сайт.
 * Тег — буквы, цифры и подчёркивание; перед ним начало текста, пробел или открывающая скобка/кавычка.
 */
const HASHTAG = /(^|[\s(«"])#([\p{L}\p{N}_]{1,64})(?![\p{L}\p{N}_])/gu;

/** Теги внутри ссылок и кода остаются как есть */
const SKIPPED = ['a', 'code', 'pre'];

/** Обходит токены HTML, помечая открытый текст вне тегов из `SKIPPED` */
function walkHtmlText(html: string, visit: (token: string, isPlain: boolean) => void) {
	if (!html.includes('#')) {
		visit(html, false);
		return;
	}
	let skipDepth = 0;
	for (const token of html.split(/(<[^>]*>)/)) {
		if (token.startsWith('<')) {
			const match = /^<(\/?)([a-z0-9]+)/i.exec(token);
			if (match && SKIPPED.includes(match[2].toLowerCase()) && !token.endsWith('/>')) skipDepth += match[1] ? -1 : 1;
			visit(token, false);
		} else {
			visit(token, skipDepth === 0);
		}
	}
}

/** Превращает `#теги` в ссылки на страницу тега. Принимает уже очищенный HTML: вставляет только свои безопасные ссылки */
export function linkifyHashtags(html: string): string {
	if (!html.includes('#')) return html;
	let out = '';
	walkHtmlText(html, (token, isPlain) => {
		out += isPlain
			? token.replace(HASHTAG, (_, before: string, name: string) => `${before}<a href="https://dtf.ru/tag/${encodeURIComponent(name)}">#${name}</a>`)
			: token;
	});
	return out;
}

/** Уникальные `#теги` записи (из текстовых блоков, списков и плашки), в нижнем регистре без `#` */
export function postHashtags(post: { blocks?: { type: string; data?: any }[]; warning?: { text: string } }): string[] {
	const tags = new Set<string>();
	const collect = (html: unknown) => {
		if (typeof html !== 'string' || !html.includes('#')) return;
		walkHtmlText(html, (token, isPlain) => {
			if (!isPlain) return;
			for (const m of token.matchAll(HASHTAG)) tags.add(m[2].toLowerCase());
		});
	};
	collect(post.warning?.text);
	for (const block of post.blocks ?? []) {
		if (block.type === 'text') collect(block.data?.text);
		else if (block.type === 'list') for (const item of block.data?.items ?? []) collect(item);
	}
	return [...tags];
}
