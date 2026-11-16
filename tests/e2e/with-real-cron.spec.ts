import { Test } from '@nestjs/testing';
import { ExtendedConfigModule, ExtendedConfigService } from '../../lib';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('With the real node-cron scheduler', () => {
	it('should reload on schedule and stop when the app closes', async () => {
		let counter = 0;
		const loader = jest.fn(() => ({ COUNTER: ++counter }));

		const moduleRef = await Test.createTestingModule({
			imports: [
				ExtendedConfigModule.forRoot({
					strategies: [
						{
							identifier: 'EVERY_SECOND',
							loader,
							reloadable: true,
							schedule: '* * * * * *',
							scheduleTimezone: 'America/Sao_Paulo',
						},
					],
				}),
			],
		}).compile();
		const app = moduleRef.createNestApplication();
		await app.init();
		const config = app.get(ExtendedConfigService);

		await wait(2300);
		expect(loader.mock.calls.length).toBeGreaterThanOrEqual(2);
		expect(config.get('COUNTER')).toBe(counter);

		await app.close();
		const callsAfterClose = loader.mock.calls.length;
		await wait(1500);
		expect(loader.mock.calls.length).toBe(callsAfterClose);
	}, 10000);
});
