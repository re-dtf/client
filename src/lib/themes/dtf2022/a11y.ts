/**
 * keydown для div[role="button"]: Enter/Space ведут себя как клик.
 * div вместо <button> там, где так в исходной вёрстке, — у кнопки другие
 * дефолты шрифта и вертикального выравнивания, и картинка поплыла бы.
 */
export function clickOnKey(e: KeyboardEvent) {
	if (e.key === 'Enter' || e.key === ' ') {
		e.preventDefault();
		(e.currentTarget as HTMLElement).click();
	}
}
