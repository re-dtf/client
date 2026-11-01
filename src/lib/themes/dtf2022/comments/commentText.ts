/*
 * Текст комментария DTF — это plain text: переносы \r\n, цитаты строками с «>»,
 * упоминания <mention id="1" nickname="">Имя</mention> и голые ссылки.
 * Разбираем в структуру и рендерим текстовыми узлами — без {@html}.
 */

export type Inline =
	| { type: 'text'; text: string }
	| { type: 'mention'; id: number; name: string }
	| { type: 'link'; url: string };

export interface Paragraph {
	quote: boolean;
	lines: Inline[][];
}

const INLINE_RE = /<mention id="(\d+)"[^>]*>([\s\S]*?)<\/mention>|(https?:\/\/[^\s<]+)/g;

function parseInline(line: string): Inline[] {
	const result: Inline[] = [];
	let last = 0;
	for (const match of line.matchAll(INLINE_RE)) {
		if (match.index > last) result.push({ type: 'text', text: line.slice(last, match.index) });
		if (match[1]) {
			result.push({ type: 'mention', id: Number(match[1]), name: match[2] });
		} else {
			// Точка или скобка в конце обычно относится к предложению, а не к ссылке
			const url = match[3].replace(/[.,!?)]+$/, '');
			result.push({ type: 'link', url });
			if (url.length < match[3].length) result.push({ type: 'text', text: match[3].slice(url.length) });
		}
		last = match.index + match[0].length;
	}
	if (last < line.length) result.push({ type: 'text', text: line.slice(last) });
	return result;
}

export function parseCommentText(raw: string): Paragraph[] {
	const paragraphs: Paragraph[] = [];
	let current: Paragraph | null = null;

	for (const rawLine of raw.split(/\r?\n/)) {
		const line = rawLine.trimEnd();
		if (!line.trim()) {
			current = null;
			continue;
		}
		const quote = line.startsWith('>');
		const text = quote ? line.slice(1).trimStart() : line;
		if (!current || current.quote !== quote) {
			current = { quote, lines: [] };
			paragraphs.push(current);
		}
		current.lines.push(parseInline(text));
	}

	return paragraphs;
}
