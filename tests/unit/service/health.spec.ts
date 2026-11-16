import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
	ConfigLoaderStrategy,
	ExtendedConfigHealthIndicator,
	ExtendedConfigModule,
	ExtendedConfigService,
} from '../../../lib';

const createService = (strategies: ConfigLoaderStrategy[]) => {
	const logger = new Logger();
	jest.spyOn(logger, 'error').mockImplementation(() => {});
	return new ExtendedConfigService<any>(
		{ strategies },
		{ validate: jest.fn(), schedule: jest.fn() } as any,
		logger,
	);
};

describe('getStatus()', () => {
	it('should track successes and failures per strategy', async () => {
		const loader = jest
			.fn()
			.mockResolvedValueOnce({ KEY: '1' })
			.mockRejectedValueOnce(new Error('connect postgres://u:secret@db failed'))
			.mockResolvedValueOnce({ KEY: '2' });
		const service = createService([
			{ identifier: 'A', loader, reloadable: true },
			{ identifier: Symbol('B'), loader: () => ({}), disable: true },
		]);

		expect(service.getStatus().loaded).toBe(false);
		await service.load();

		const [first, b] = service.getStatus().strategies;
		let a = first;
		expect(service.getStatus().loaded).toBe(true);
		expect(a).toMatchObject({
			identifier: 'A',
			loaded: true,
			consecutiveFailures: 0,
		});
		expect(a.lastSuccessAt).toBeInstanceOf(Date);
		expect(b).toMatchObject({
			identifier: 'Symbol(B)',
			disabled: true,
			loaded: false,
		});

		await expect(service.reload('A')).rejects.toThrow();
		[a] = service.getStatus().strategies;
		expect(a.consecutiveFailures).toBe(1);
		expect(a.lastError).toContain('postgres://u:[REDACTED]@db');
		expect(a.lastError).not.toContain('secret');

		await service.reload('A');
		[a] = service.getStatus().strategies;
		expect(a.consecutiveFailures).toBe(0);
	});
});

describe('ExtendedConfigHealthIndicator', () => {
	it('should report up, then down after a failed reload, with details', async () => {
		const loader = jest
			.fn()
			.mockResolvedValueOnce({ KEY: '1' })
			.mockRejectedValue(new Error('down'));
		const service = createService([
			{ identifier: 'A', loader, reloadable: true },
		]);
		const indicator = new ExtendedConfigHealthIndicator(service);

		expect(indicator.isHealthy().config.status).toBe('down'); // not loaded yet
		await service.load();
		expect(indicator.isHealthy('settings')).toEqual({
			settings: {
				status: 'up',
				loaded: true,
				strategies: [
					expect.objectContaining({
						identifier: 'A',
						loaded: true,
						consecutiveFailures: 0,
					}),
				],
			},
		});

		await expect(service.reload('A')).rejects.toThrow();
		expect(indicator.isHealthy().config.status).toBe('down');
		expect(
			indicator.isHealthy('config', { maxConsecutiveFailures: 2 }).config
				.status,
		).toBe('up');
	});

	it('should be injectable next to a global root module', async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [
				ExtendedConfigModule.forRoot({
					isGlobal: true,
					strategies: [{ loader: () => ({ KEY: 'v' }) }],
				}),
			],
			providers: [ExtendedConfigHealthIndicator],
		}).compile();
		const app = moduleRef.createNestApplication();
		await app.init();

		expect(
			app.get(ExtendedConfigHealthIndicator).isHealthy().config.status,
		).toBe('up');
		await app.close();
	});
});
