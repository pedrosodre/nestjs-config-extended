import { Logger } from '@nestjs/common';
import { ExtendedConfigService } from '../../../lib';

const createScheduler = () => {
	const task = { destroy: jest.fn(), stop: jest.fn() };
	return {
		task,
		scheduler: {
			validate: jest.fn().mockReturnValue(true),
			schedule: jest.fn().mockReturnValue(task),
		},
	};
};

describe('ExtendedConfigService scheduler', () => {
	it('should destroy scheduled reload tasks on module destroy', async () => {
		const { task, scheduler } = createScheduler();
		const service = new ExtendedConfigService(
			{
				strategies: [
					{
						identifier: 'TEST',
						loader: () => ({ KEY: 'value' }),
						reloadable: true,
						schedule: '* * * * *',
					},
				],
			},
			scheduler as any,
			new Logger(),
		);

		await service.load();
		expect(scheduler.schedule).toHaveBeenCalledTimes(1);

		service.onModuleDestroy();
		expect(task.destroy).toHaveBeenCalledTimes(1);

		service.onModuleDestroy();
		expect(task.destroy).toHaveBeenCalledTimes(1);
	});

	it('should log scheduled reload failures and keep previous values', async () => {
		const { scheduler } = createScheduler();
		const logger = new Logger();
		const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
		const loader = jest
			.fn()
			.mockResolvedValueOnce({ KEY: 'value' })
			.mockRejectedValueOnce(new Error('remote down'));

		const service = new ExtendedConfigService(
			{
				strategies: [
					{
						identifier: 'TEST',
						loader,
						reloadable: true,
						schedule: '* * * * *',
					},
				],
			},
			scheduler as any,
			logger,
		);

		await service.load();
		const scheduledTask = scheduler.schedule.mock.calls[0][1];

		await expect(scheduledTask()).resolves.toBeUndefined();
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining('TEST'),
			expect.stringContaining('remote down'),
		);
		expect(service.get('KEY')).toBe('value');
	});
});
