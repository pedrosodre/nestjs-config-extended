import { Logger } from '@nestjs/common';
import { ConfigLoaderStrategy, ExtendedConfigService } from '../../../lib';

const createService = (strategies: ConfigLoaderStrategy[], cache = true) =>
	new ExtendedConfigService(
		{ strategies, cache },
		{ validate: jest.fn(), schedule: jest.fn() } as any,
		new Logger(),
	);

describe('ExtendedConfigService.reload()', () => {
	it('should drop keys a reloaded strategy no longer returns', async () => {
		const loader = jest
			.fn()
			.mockResolvedValueOnce({ KEEP: '1', REMOVED: '2' })
			.mockResolvedValueOnce({ KEEP: '3' });
		const service = createService([
			{ identifier: 'A', loader, reloadable: true },
		]);

		await service.load();
		expect(service.get('REMOVED')).toBe('2');

		await service.reload('A');
		expect(service.get('KEEP')).toBe('3');
		expect(service.has('REMOVED')).toBe(false);
	});

	it('should keep strategy precedence when only an earlier strategy reloads', async () => {
		const first = jest
			.fn()
			.mockResolvedValueOnce({ SHARED: 'first-v1' })
			.mockResolvedValueOnce({ SHARED: 'first-v2' });
		const second = jest.fn().mockResolvedValue({ SHARED: 'second' });
		const service = createService([
			{ identifier: 'FIRST', loader: first, reloadable: true },
			{ identifier: 'SECOND', loader: second },
		]);

		await service.load();
		expect(service.get('SHARED')).toBe('second');

		await service.reload('FIRST');
		expect(service.get('SHARED')).toBe('second');
	});

	it('should keep the last good values when a reload fails', async () => {
		const loader = jest
			.fn()
			.mockResolvedValueOnce({ KEY: 'good' })
			.mockRejectedValueOnce(new Error('boom'));
		const service = createService([
			{ identifier: 'A', loader, reloadable: true },
		]);

		await service.load();
		await expect(service.reload('A')).rejects.toThrow('boom');
		expect(service.get('KEY')).toBe('good');
	});

	it('should remove keys from process.env when cache is disabled', async () => {
		const loader = jest
			.fn()
			.mockResolvedValueOnce({ RELOAD_SPEC_KEEP: '1', RELOAD_SPEC_GONE: '2' })
			.mockResolvedValueOnce({ RELOAD_SPEC_KEEP: '3' });
		const service = createService(
			[{ identifier: 'A', loader, reloadable: true }],
			false,
		);

		await service.load();
		expect(process.env.RELOAD_SPEC_GONE).toBe('2');

		await service.reload('A');
		expect(process.env.RELOAD_SPEC_KEEP).toBe('3');
		expect('RELOAD_SPEC_GONE' in process.env).toBe(false);
		delete process.env.RELOAD_SPEC_KEEP;
	});
});
