/*
 * Теги в тексте записей. DTF отдаёт `#тег` обычным текстом, а ссылкой на страницу тега его делает сайт.
 * Тег — буквы, цифры и подчёркивание; перед ним начало текста, пробел или открывающая скобка/кавычка.
 */
const HASHTAG = /(^|[\s(«"])#([\p{L}\p{N}_]{1,64})(?![\p{L}\p{N}_])/gu;

/** Теги внутри ссылок и кода остаются как есть */
const SKIPPED = ['a', 'code', 'pre'];

/** Превращает `#теги` в ссылки на страницу тега. Принимает уже очищенный HTML: вставляет только свои безопасные ссылки */
export function linkifyHashtags(html: string): string {
	if (!html.includes('#')) return html;

	let skipDepth = 0;
	return html
		.split(/(<[^>]*>)/)
		.map((token) => {
			if (token.startsWith('<')) {
				const match = /^<(\/?)([a-z0-9]+)/i.exec(token);
				if (match && SKIPPED.includes(match[2].toLowerCase()) && !token.endsWith('/>')) skipDepth += match[1] ? -1 : 1;
				return token;
			}
			if (skipDepth > 0) return token;
			return token.replace(HASHTAG, (_, before: string, name: string) => `${before}<a href="https://dtf.ru/tag/${encodeURIComponent(name)}">#${name}</a>`);
		})
		.join('');
}
