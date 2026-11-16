import { Logger } from '@nestjs/common';
import { ExtendedConfigService, LoadingException } from '../../../lib';
import { retrieveVariablesByStrategy } from '../../../lib/util/loader.util';

describe('symbol identifiers', () => {
	it('should build exception messages instead of throwing TypeError', async () => {
		const promise = retrieveVariablesByStrategy({
			identifier: Symbol('REMOTE'),
			loader: () => {
				throw new Error('down');
			},
		});

		await expect(promise).rejects.toThrow(LoadingException);
		await expect(promise).rejects.toThrow('Symbol(REMOTE) strategy');
	});

	it('should write debug logs for symbol identifiers', async () => {
		const logger = new Logger();
		const debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => {});
		const service = new ExtendedConfigService<any>(
			{
				debug: true,
				strategies: [
					{ identifier: Symbol('LOCAL'), loader: () => ({ A: '1' }) },
				],
			},
			{ validate: jest.fn(), schedule: jest.fn() } as any,
			logger,
		);

		await service.load();
		expect(
			debugSpy.mock.calls.some(call =>
				String(call[0]).includes('Symbol(LOCAL)'),
			),
		).toBe(true);
	});
});
