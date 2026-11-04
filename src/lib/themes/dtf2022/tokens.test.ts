import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCss } from 'svelte/compiler';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dtfDir = __dirname;
const themeCssPath = path.join(dtfDir, 'theme.css');
const baselinePath = path.resolve(dtfDir, '../../../../baseline_style_snapshot.json');

function parseThemeCssVars(themeCssContent: string) {
	const vars: Record<string, string> = {};
	const varRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
	let match;
	while ((match = varRegex.exec(themeCssContent)) !== null) {
		vars[match[1]] = match[2].trim();
	}
	return vars;
}

function normalizeCssValue(val: string, vars: Record<string, string> = {}) {
	let res = String(val);
	let changed = true;
	let iterations = 0;
	while (changed && iterations < 10) {
		changed = false;
		iterations++;
		res = res.replace(/var\(\s*(--[a-zA-Z0-9_-]+)(?:\s*,\s*([^)]+))?\s*\)/g, (match, varName, fallback) => {
			changed = true;
			if (vars[varName] !== undefined) return vars[varName];
			if (fallback !== undefined) return fallback;
			return match;
		});
	}

	res = res.replace(/\s+/g, ' ').trim();
	res = res.replace(/#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])(?![0-9a-fA-F])/g, '#$1$1$2$2$3$3');
	res = res.replace(/#[0-9a-fA-F]{6,8}\b/g, (m) => m.toLowerCase());
	res = res.replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/g, (m, r, g, b, a) => {
		if (a !== undefined) return `rgba(${r}, ${g}, ${b}, ${Number(a)})`;
		return `rgb(${r}, ${g}, ${b})`;
	});
	return res;
}

function getSelectorString(prelude: any) {
	if (!prelude) return '';
	return prelude.children
		.map((c: any) =>
			c.children
				.map((r: any) => (r.combinator ? r.combinator.name + ' ' : '') + r.selectors.map((s: any) => s.name || s.type).join(''))
				.join(' ')
		)
		.join(', ');
}

function extractStyleRules(content: string) {
	const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);
	if (!styleMatch) return [];
	const ast = parseCss(styleMatch[1]);
	const rules: Array<{ selector: string; property: string; value: string }> = [];

	function traverse(node: any, stack: string[]) {
		if (node.type === 'Rule') {
			const sel = getSelectorString(node.prelude);
			const current = stack.concat(sel);
			if (node.block?.children) {
				node.block.children.forEach((c: any) => traverse(c, current));
			}
		} else if (node.type === 'Atrule') {
			const atName = '@' + node.name + (node.prelude ? ' ' + node.prelude : '');
			const current = stack.concat(atName);
			if (node.block?.children) {
				node.block.children.forEach((c: any) => traverse(c, current));
			}
		} else if (node.type === 'Declaration') {
			const colorProps = [
				'color', 'background', 'background-color', 'border', 'border-color',
				'border-top', 'border-right', 'border-bottom', 'border-left',
				'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
				'outline', 'outline-color', 'box-shadow', 'fill', 'stroke',
				'accent-color', 'caret-color'
			];
			const isCustom = node.property.startsWith('--');
			const hasColor = /(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\))/.test(node.value);

			if (colorProps.includes(node.property) || isCustom || hasColor) {
				rules.push({
					selector: stack.join(' > '),
					property: node.property,
					value: node.value.trim()
				});
			}
		}
	}

	if (ast?.children) {
		ast.children.forEach((c: any) => traverse(c, []));
	}
	return rules;
}

describe('dtf2022 color tokens parity', () => {
	it('соответствует базовому слепку стилей и не содержит непереведённых цветов', () => {
		if (!fs.existsSync(baselinePath)) {
			// Если слепка нет, пропускаем тест
			return;
		}

		const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
		const themeCss = fs.readFileSync(themeCssPath, 'utf8');
		const themeVars = parseThemeCssVars(themeCss);

		const mismatches: any[] = [];
		const unreplacedRawColors: any[] = [];
		const missingVars = new Set<string>();

		const localPrefixes = [
			'--post-', '--comment-', '--size-', '--offset-', '--gap', '--media-',
			'--btn-', '--touch-zone-', '--border-width', '--color-text',
			'--color-background', '--fill', '--text-active', '--bg-hover'
		];

		for (const [fileRel, baseRules] of Object.entries(baseline) as [string, any[]][]) {
			const fullPath = path.join(dtfDir, fileRel);
			if (!fs.existsSync(fullPath)) {
				mismatches.push(`File missing: ${fileRel}`);
				continue;
			}

			const currentContent = fs.readFileSync(fullPath, 'utf8');
			const currentRules = extractStyleRules(currentContent);

			for (const rule of currentRules) {
				const varMatches = rule.value.match(/var\((--[a-zA-Z0-9_-]+)/g);
				if (varMatches) {
					for (const vm of varMatches) {
						const varName = vm.replace('var(', '');
						if (!themeVars[varName] && !localPrefixes.some((p) => varName.startsWith(p))) {
							missingVars.add(varName);
						}
					}
				}

				const withoutVarFallbacks = rule.value.replace(/var\(--[a-zA-Z0-9_-]+,\s*[^)]+\)/g, '');
				const rawColorMatch = withoutVarFallbacks.match(/(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\))/g);
				if (rawColorMatch) {
					unreplacedRawColors.push({
						file: fileRel,
						selector: rule.selector,
						property: rule.property,
						raw: rawColorMatch.join(', ')
					});
				}
			}

			for (let i = 0; i < baseRules.length; i++) {
				const baseRule = baseRules[i];
				const curRule = currentRules[i];
				if (!curRule) {
					mismatches.push(`Missing rule in ${fileRel}: [${i}] ${baseRule.selector} -> ${baseRule.property}`);
					continue;
				}

				const normalizedBase = normalizeCssValue(baseRule.value, themeVars);
				const normalizedCur = normalizeCssValue(curRule.value, themeVars);

				if (normalizedBase !== normalizedCur) {
					mismatches.push({
						file: fileRel,
						selector: baseRule.selector,
						property: baseRule.property,
						expected: normalizedBase,
						got: normalizedCur
					});
				}
			}
		}

		expect(missingVars.size, `Отсутствуют переменные в theme.css: ${[...missingVars].join(', ')}`).toBe(0);
		expect(unreplacedRawColors, `Остались захардкоженные цвета: ${JSON.stringify(unreplacedRawColors.slice(0, 5))}`).toHaveLength(0);
		expect(mismatches, `Несовпадения с эталоном: ${JSON.stringify(mismatches.slice(0, 5))}`).toHaveLength(0);
	});
});
