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

describe('Rebuild isolation', () => {
	it('rebuild must not mutate stored strategy results (registerAs + dotted key)', async () => {
		const b = jest
			.fn()
			.mockResolvedValueOnce({ 'db.port': 1 })
			.mockResolvedValueOnce({});
		const service = createService([
			{ identifier: 'A', loader: () => ({ host: 'h' }), registerAs: 'db' },
			{ identifier: 'B', loader: b, reloadable: true },
		]);

		await service.load();
		expect(service.get('db')).toEqual({ host: 'h', port: 1 });

		await service.reload('B');
		expect(service.get('db')).toEqual({ host: 'h' });
	});

	it('changes must be detected when a nested value is added by another strategy', async () => {
		const b = jest
			.fn()
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ 'db.port': 1 });
		const service = createService([
			{ identifier: 'A', loader: () => ({ db: { host: 'h' } }) },
			{ identifier: 'B', loader: b, reloadable: true },
		]);
		const events: string[][] = [];
		service.changes().subscribe(e => events.push(e.changedKeys));

		await service.load();
		await service.reload('B');
		expect(events).toEqual([['db'], ['db']]);
	});
});
