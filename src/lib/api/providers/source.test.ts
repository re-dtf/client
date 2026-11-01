import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../sources/source-fetcher', () => ({ fetchFromSource: vi.fn() }));

import { createSourceProvider } from './source';
import { fetchFromSource } from '../sources/source-fetcher';
import type { SourceState } from '../sources/types';

const makeSource = (endpoints: string[]): SourceState =>
	({
		manifestUrl: 'https://example.test/redtf-source.json',
		manifest: {
			id: 'test',
			name: 'Тестовый источник',
			endpoints: Object.fromEntries(endpoints.map((key) => [key, { method: 'GET', path: `/${key}` }]))
		},
		enabled: true,
		grantedPermissions: []
	}) as unknown as SourceState;

describe('провайдер источника', () => {
	beforeEach(() => vi.mocked(fetchFromSource).mockReset());

	it('getPosts передаёт курсор, сортировку и страницу параметрами запроса', async () => {
		vi.mocked(fetchFromSource).mockResolvedValue({ items: [] });

		await createSourceProvider(makeSource(['getPosts'])).getPosts({
			cursor: { lastId: 5, lastSortingValue: 9 },
			sorting: 'new',
			pageName: 'popular'
		});

		expect(fetchFromSource).toHaveBeenCalledWith(expect.anything(), 'getPosts', {}, {
			cursor: JSON.stringify({ lastId: 5, lastSortingValue: 9 }),
			sorting: 'new',
			page: 'popular'
		});
	});

	it('не передаёт лишнего, если параметров нет', async () => {
		vi.mocked(fetchFromSource).mockResolvedValue({ items: [] });

		await createSourceProvider(makeSource(['getPosts'])).getPosts();

		expect(fetchFromSource).toHaveBeenCalledWith(expect.anything(), 'getPosts', {}, {});
	});

	it('ответ без списка items — ошибка, а не мусор в ленте', async () => {
		vi.mocked(fetchFromSource).mockResolvedValue({ items: 'oops' });

		await expect(createSourceProvider(makeSource(['getPosts'])).getPosts()).rejects.toThrow(/неверном формате/);
		await expect(createSourceProvider(makeSource(['getComments'])).getComments(1)).rejects.toThrow(/неверном формате/);
	});

	it('getComments всегда передаёт сортировку', async () => {
		vi.mocked(fetchFromSource).mockResolvedValue({ items: [] });

		await createSourceProvider(makeSource(['getComments'])).getComments(42);

		expect(fetchFromSource).toHaveBeenCalledWith(expect.anything(), 'getComments', { postId: 42 }, { sorting: 'date' });
	});

	it('необязательные методы есть только при наличии эндпоинта', () => {
		const without = createSourceProvider(makeSource(['getPosts']));
		const withAll = createSourceProvider(makeSource(['getPosts', 'getReplacedComments', 'reactToComment']));

		expect(without.getReplacedComments).toBeUndefined();
		expect(without.reactToComment).toBeUndefined();
		expect(withAll.getReplacedComments).toBeTypeOf('function');
		expect(withAll.reactToComment).toBeTypeOf('function');
	});
});
