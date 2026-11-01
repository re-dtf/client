import { describe, expect, it } from 'vitest';
import { parseRefreshToken } from './auth';

describe('parseRefreshToken', () => {
	it('берёт токен из строки и из JSON auth-refresh-token', () => {
		const token = 'e1af4e9cee4f0f32e0c399eb036b5c4c33353a75754bc51733ded10c60cd7ba3';

		expect(parseRefreshToken(` ${token}\n`)).toBe(token);
		expect(parseRefreshToken(JSON.stringify({ token, expTimestamp: 1 }))).toBe(token);
	});
});
