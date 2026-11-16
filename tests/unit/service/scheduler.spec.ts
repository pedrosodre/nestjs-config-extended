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
});
