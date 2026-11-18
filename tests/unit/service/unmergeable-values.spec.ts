import { Logger } from '@nestjs/common';
import {
	ConfigLoaderStrategy,
	ExtendedConfigService,
	LoadingException,
} from '../../../lib';
import { MAX_CONFIG_DEPTH } from '../../../lib/util/clone.util';

const createService = (strategies: ConfigLoaderStrategy[], preload?: any[]) =>
	new ExtendedConfigService<any>(
		{ strategies },
		{ validate: jest.fn(), schedule: jest.fn() } as any,
		new Logger(),
		preload ?? null,
	);

const nested = (depth: number): Record<string, any> => {
	let value: Record<string, any> = { leaf: true };
	for (let i = 1; i < depth; i++) {
		value = { k: value };
	}
	return value;
};

const circular = () => {
	const value: Record<string, any> = { name: 'x' };
	value.self = value;
	return value;
};

describe('Unmergeable configuration values', () => {
	it('should reject circular values with a LoadingException', async () => {
		const service = createService([
			{ identifier: 'CYCLE', loader: () => ({ a: circular() }) },
		]);

		const error = await service.load().catch(err => err);
		expect(error).toBeInstanceOf(LoadingException);
		expect(error.message).toContain('circular references');
		expect(error.identifier).toBe('CYCLE');
	});

	it('should accept values up to the maximum depth and reject deeper ones', async () => {
		await expect(
			createService([
				{ loader: () => ({ a: nested(MAX_CONFIG_DEPTH) }) },
			]).load(),
		).resolves.toBeUndefined();

		await expect(
			createService([
				{ loader: () => ({ a: nested(MAX_CONFIG_DEPTH + 1) }) },
			]).load(),
		).rejects.toThrow(`nested more than ${MAX_CONFIG_DEPTH} levels deep`);
	});

	it('should keep the previous result so other strategies can still reload', async () => {
		let source: Record<string, any> = { D: 1 };
		let counter = 0;
		const service = createService([
			{ identifier: 'J', loader: () => source, reloadable: true },
			{ identifier: 'G', loader: () => ({ G: ++counter }), reloadable: true },
		]);
		await service.load();

		source = { D: nested(20_000) };
		await expect(service.reload('J')).rejects.toBeInstanceOf(LoadingException);
		expect(service.get('D')).toBe(1);
		expect(service.getStatus().strategies[0].lastError).toContain(
			'nested more than',
		);

		// Before the fix the stored value poisoned every rebuild.
		await expect(service.reload('G')).resolves.toBeUndefined();
		expect(service.get('G')).toBe(2);
		expect(service.toJSON()).toEqual({ D: 1, G: 2 });

		source = { D: 3 };
		await service.reload('J');
		expect(service.get('D')).toBe(3);
	});

	it('should reject unmergeable preloaded results with a LoadingException', () => {
		expect(() =>
			createService([{ loader: () => ({}) }], [{ a: circular() }]),
		).toThrow(LoadingException);
	});
});
