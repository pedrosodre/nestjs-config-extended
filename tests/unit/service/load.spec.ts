import { Logger } from '@nestjs/common';
import { ExtendedConfigService } from '../../../lib';

const createService = (loader: jest.Mock) =>
	new ExtendedConfigService(
		{ strategies: [{ identifier: 'TEST', loader }] },
		{ validate: jest.fn(), schedule: jest.fn() } as any,
		new Logger(),
	);

describe('ExtendedConfigService.load()', () => {
	it('should reject concurrent waiters instead of hanging when loading fails', async () => {
		const loader = jest.fn().mockRejectedValue(new Error('boom'));
		const service = createService(loader);

		const first = service.load();
		const waiter = service.load(true);

		await expect(first).rejects.toThrow('boom');
		await expect(waiter).rejects.toThrow('boom');
	});

	it('should allow retrying after a failed load', async () => {
		const loader = jest
			.fn()
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValueOnce({ KEY: 'value' });
		const service = createService(loader);

		await expect(service.load()).rejects.toThrow('boom');
		await service.load();

		expect(service.get('KEY')).toBe('value');
		expect(loader).toHaveBeenCalledTimes(2);
	});

	it('should load only once for concurrent callers', async () => {
		const loader = jest.fn().mockResolvedValue({ KEY: 'value' });
		const service = createService(loader);

		await Promise.all([service.load(), service.load(true), service.load(true)]);

		expect(loader).toHaveBeenCalledTimes(1);
		expect(service.get('KEY')).toBe('value');
	});
});
