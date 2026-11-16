import { Logger } from '@nestjs/common';
import {
	ConfigLoaderStrategy,
	ExtendedConfigService,
	ProcessEnvAssignmentException,
} from '../../../lib';

const createService = (strategies: ConfigLoaderStrategy[]) =>
	new ExtendedConfigService(
		{ strategies, cache: false },
		{ validate: jest.fn(), schedule: jest.fn() } as any,
		new Logger(),
	);

describe('ExtendedConfigService with cache disabled', () => {
	afterEach(() => {
		for (const key of Object.keys(process.env)) {
			if (key.startsWith('PE_SPEC')) {
				delete process.env[key];
			}
		}
	});

	it('should store primitive values as strings under their literal key', async () => {
		const service = createService([
			{
				identifier: 'A',
				loader: () => ({
					PE_SPEC_STR: 'a',
					PE_SPEC_NUM: 1,
					PE_SPEC_BOOL: true,
					'PE_SPEC.DOTTED': 'x',
					PE_SPEC_NULL: null,
				}),
			},
		]);

		await service.load();

		expect(process.env.PE_SPEC_STR).toBe('a');
		expect(process.env.PE_SPEC_NUM).toBe('1');
		expect(process.env.PE_SPEC_BOOL).toBe('true');
		expect(process.env['PE_SPEC.DOTTED']).toBe('x');
		expect(service.get('PE_SPEC.DOTTED')).toBe('x');
		expect('PE_SPEC_NULL' in process.env).toBe(false);
	});

	it('should reject object values instead of storing "[object Object]"', async () => {
		const service = createService([
			{ identifier: 'A', loader: () => ({ PE_SPEC_OBJ: { host: 'h' } }) },
		]);

		await expect(service.load()).rejects.toThrow(ProcessEnvAssignmentException);
		expect('PE_SPEC_OBJ' in process.env).toBe(false);
	});

	it('should keep previous values when a reload returns an object value', async () => {
		const loader = jest
			.fn()
			.mockResolvedValueOnce({ PE_SPEC_KEY: 'good' })
			.mockResolvedValueOnce({ PE_SPEC_KEY: { bad: true } });
		const other = jest.fn().mockResolvedValue({ PE_SPEC_OTHER: 'o' });
		const service = createService([
			{ identifier: 'A', loader, reloadable: true },
			{ identifier: 'B', loader: other, reloadable: true },
		]);

		await service.load();
		await expect(service.reload('A')).rejects.toThrow(
			ProcessEnvAssignmentException,
		);
		await service.reload('B');

		expect(process.env.PE_SPEC_KEY).toBe('good');
		expect(process.env.PE_SPEC_OTHER).toBe('o');
	});

	it('should reject registerAs at construction time', () => {
		expect(() =>
			createService([
				{ identifier: 'A', loader: () => ({}), registerAs: 'PE_SPEC_NS' },
			]),
		).toThrow(ProcessEnvAssignmentException);
	});
});
