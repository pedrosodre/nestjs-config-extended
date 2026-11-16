import { Logger } from '@nestjs/common';
import {
	ExtendedConfigService,
	InferConfig,
	SchemaValidationException,
	StandardSchemaV1,
} from '../../../lib';
import { retrieveVariablesByStrategy } from '../../../lib/util/loader.util';

interface AppConfig {
	PORT: number;
	HOST: string;
}

// Minimal Standard Schema implementation, shaped like Zod/Valibot output.
const appSchema = (
	async = false,
): StandardSchemaV1<Record<string, unknown>, AppConfig> => ({
	'~standard': {
		version: 1,
		vendor: 'test',
		validate: (value: unknown) => {
			const input = value as Record<string, unknown>;
			const port = Number(input.PORT);
			const result: StandardSchemaV1.Result<AppConfig> = Number.isInteger(port)
				? { value: { PORT: port, HOST: String(input.HOST ?? 'localhost') } }
				: {
						issues: [{ message: 'Expected integer', path: [{ key: 'PORT' }] }],
					};
			return async ? Promise.resolve(result) : result;
		},
	},
});

describe('Strategy schema', () => {
	it('should replace variables with the parsed schema output', async () => {
		const variables = await retrieveVariablesByStrategy({
			loader: () => ({ PORT: '3000', EXTRA: 'dropped' }),
			schema: appSchema(),
		});

		expect(variables).toEqual({ PORT: 3000, HOST: 'localhost' });
	});

	it('should support async schemas', async () => {
		const variables = await retrieveVariablesByStrategy({
			loader: () => ({ PORT: '1', HOST: 'h' }),
			schema: appSchema(true),
		});

		expect(variables).toEqual({ PORT: 1, HOST: 'h' });
	});

	it('should throw SchemaValidationException with issues', async () => {
		const promise = retrieveVariablesByStrategy({
			identifier: 'APP',
			loader: () => ({ PORT: 'abc' }),
			schema: appSchema(),
		});

		await expect(promise).rejects.toThrow(SchemaValidationException);
		await expect(promise).rejects.toThrow(
			"APP strategy's variables do not match the schema: PORT: Expected integer",
		);
		await promise.catch((err: SchemaValidationException) => {
			expect(err.issues).toHaveLength(1);
		});
	});

	it('should run the schema after the transformer', async () => {
		const variables = await retrieveVariablesByStrategy({
			loader: () => ({ port: '8080' }),
			transformer: vars => ({ PORT: vars.port }),
			schema: appSchema(),
		});

		expect(variables.PORT).toBe(8080);
	});

	it('should expose parsed schema output through the service', async () => {
		const schema = appSchema();
		const service = new ExtendedConfigService<InferConfig<typeof schema>>(
			{ strategies: [{ loader: () => ({ PORT: '80' }), schema }] },
			{ validate: jest.fn(), schedule: jest.fn() } as any,
			new Logger(),
		);
		await service.load();

		expect(service.get('PORT')).toBe(80);
		expect(service.get('HOST')).toBe('localhost');
	});
});
