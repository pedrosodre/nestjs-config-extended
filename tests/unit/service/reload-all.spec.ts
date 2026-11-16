import { Logger } from '@nestjs/common';
import { ConfigLoaderStrategy, ExtendedConfigService } from '../../../lib';

const scheduler = () => ({
	validate: jest.fn().mockReturnValue(true),
	schedule: jest.fn().mockReturnValue({ destroy: jest.fn() }),
});

const createService = (
	strategies: ConfigLoaderStrategy[],
	cron = scheduler(),
	extra: Record<string, any> = {},
) =>
	new ExtendedConfigService<any>(
		{ strategies, ...extra },
		cron as any,
		new Logger(),
	);

describe('reload() of all strategies', () => {
	it('reload() of all strategies should report the failing strategy and still reload the others', async () => {
		const onReloadError = jest.fn();
		const a = jest
			.fn()
			.mockResolvedValueOnce({ A: '1' })
			.mockRejectedValueOnce(new Error('a down'));
		const b = jest
			.fn()
			.mockResolvedValueOnce({ B: '1' })
			.mockResolvedValueOnce({ B: '2' });
		const service = createService(
			[
				{ identifier: 'A', loader: a, reloadable: true },
				{ identifier: 'B', loader: b, reloadable: true },
			],
			scheduler(),
			{ onReloadError },
		);

		await service.load();
		await expect(service.reload()).rejects.toThrow('a down');
		expect(onReloadError).toHaveBeenCalledWith(expect.any(Error), 'A');
		expect(service.get('B')).toBe('2');
	});
});
