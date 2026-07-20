import type { SourcePermission } from '$lib/api/sources/types';

export const FIXED_PERMISSIONS: Record<string, (target?: string) => string> = {
	'write:comments': () => 'Отправка комментариев на этот источник',
	'write:comments:shadow': (t) => `Отправка комментариев на источник с отображением под постами ${t ? `источника "${t}"` : 'неизвестного источника'}`,
	'write:posts': () => 'Публикация постов на этот источник',
	'write:reactions': () => 'Отправка реакций/лайков через этот источник',
	'mutate:comments:replace': (t) => `ВНИМАНИЕ: Подмена существующих комментариев для ${t ? `источника "${t}"` : 'неизвестного источника'}. Источник сможет визуально изменять контент.`,
	'mutate:comments:append': (t) => `Виртуальное добавление комментариев в дерево постов ${t ? `источника "${t}"` : 'неизвестного источника'}`,
	'mutate:posts:enrich': (t) => `Обогащение постов ${t ? `источника "${t}"` : 'неизвестного источника'} дополнительными данными`,
	'auth:bio_write': () => 'ВНИМАНИЕ: Временная запись проверочного кода в описание вашего профиля DTF для авторизации'
};

export function getPermissionDescription(perm: SourcePermission): string {
	if (FIXED_PERMISSIONS[perm.id]) {
		return FIXED_PERMISSIONS[perm.id](perm.target);
	}
	if (perm.id.startsWith('write:') || perm.id.startsWith('mutate:') || perm.id.startsWith('auth:')) {
		return `ВНИМАНИЕ: Неизвестное критическое разрешение (${perm.id}). ${perm.description}`;
	}
	return perm.description;
}
