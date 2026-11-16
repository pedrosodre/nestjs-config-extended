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

describe('Scheduler configuration', () => {
	it('retrying a failed first load must not schedule reloads twice', async () => {
		const cron = scheduler();
		const failing = jest
			.fn()
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValue({});
		const service = createService(
			[
				{ identifier: 'A', loader: () => ({}), reloadable: true, schedule: '* * * * *' },
				{ identifier: 'B', loader: failing },
			],
			cron,
		);

		await expect(service.load()).rejects.toThrow('boom');
		await service.load();
		expect(cron.schedule).toHaveBeenCalledTimes(1);
	});
});
