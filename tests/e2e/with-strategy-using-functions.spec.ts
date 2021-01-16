import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ExtendedConfigService } from '../../lib';
import { AppModule } from '../src/app.module';

describe('With strategy using functions', () => {
	let app: INestApplication;
	const variables: Record<string, any> = { test: 'strategy-functions' };

	it(`should load, validate and transform variables from strategy using functions`, async () => {
		const loader = jest.fn();
		const transformer = jest.fn();
		const validator = jest.fn();

		const moduleRef = await Test.createTestingModule({
			imports: [
				AppModule.withStrategy([
					{
						identifier: 'LOADER_FUNCTION',
						loader: loader.mockResolvedValue(variables),
						validator: validator.mockResolvedValue(true),
						transformer: transformer.mockResolvedValue(variables),
					},
				]),
			],
		}).compile();

		app = moduleRef.createNestApplication();
		await app.init();

		expect(loader).toHaveBeenCalledTimes(1);
		expect(transformer).toHaveBeenCalledTimes(1);
		expect(validator).toHaveBeenCalledTimes(1);

		const service = app.get<ExtendedConfigService>(ExtendedConfigService);
		for (const key of Object.keys(variables)) {
			expect(service.get(key)).toBe(variables[key]);
			expect(process.env[key]).not.toBe(variables[key]);
		}
	});

	it(`should load, validate and transform variables from strategy using functions with registerAs`, async () => {
		const loader = jest.fn();
		const transformer = jest.fn();
		const validator = jest.fn();

		const moduleRef = await Test.createTestingModule({
			imports: [
				AppModule.withStrategy([
					{
						registerAs: 'key',
						identifier: 'LOADER_FUNCTION',
						loader: loader.mockResolvedValue(variables),
						validator: validator.mockResolvedValue(true),
						transformer: transformer.mockResolvedValue(variables),
					},
				]),
			],
		}).compile();

		app = moduleRef.createNestApplication();
		await app.init();

		expect(loader).toHaveBeenCalledTimes(1);
		expect(transformer).toHaveBeenCalledTimes(1);
		expect(validator).toHaveBeenCalledTimes(1);

		const service = app.get<ExtendedConfigService>(ExtendedConfigService);
		expect(service.get('key')).toBe(variables);
	});

	it(`should load, validate and transform variables from strategy using functions without identifier`, async () => {
		const loader = jest.fn();
		const transformer = jest.fn();
		const validator = jest.fn();

		const moduleRef = await Test.createTestingModule({
			imports: [
				AppModule.withStrategy([
					{
						loader: loader.mockResolvedValue(variables),
						validator: validator.mockResolvedValue(true),
						transformer: transformer.mockResolvedValue(variables),
					},
				]),
			],
		}).compile();

		app = moduleRef.createNestApplication();
		await app.init();

		expect(loader).toHaveBeenCalledTimes(1);
		expect(transformer).toHaveBeenCalledTimes(1);
		expect(validator).toHaveBeenCalledTimes(1);

		const service = app.get<ExtendedConfigService>(ExtendedConfigService);
		for (const key of Object.keys(variables)) {
			expect(service.get(key)).toBe(variables[key]);
			expect(process.env[key]).not.toBe(variables[key]);
		}
	});

	it(`should not load from strategy using functions due strategy disabled`, async () => {
		const loader = jest.fn();

		const moduleRef = await Test.createTestingModule({
			imports: [
				AppModule.withStrategy([
					{
						disable: true,
						loader: loader.mockResolvedValue(variables),
					},
				]),
			],
		}).compile();

		app = moduleRef.createNestApplication();
		await app.init();

		expect(loader).not.toHaveBeenCalled();

		const service = app.get<ExtendedConfigService>(ExtendedConfigService);
		for (const key of Object.keys(variables)) {
			expect(service.get(key)).not.toBe(variables[key]);
		}
	});

	it(`should load from strategy only one time when call load() method multiple times due loading in progress`, async () => {
		const loader = jest.fn();

		const moduleRef = await Test.createTestingModule({
			imports: [
				AppModule.withStrategy([
					{
						loader: loader.mockImplementation(async () => {
							await new Promise(r => setTimeout(r, 2000));
							return variables;
						}),
					},
				]),
			],
		}).compile();

		app = moduleRef.createNestApplication();
		const service = app.get<ExtendedConfigService>(ExtendedConfigService);

		service.load(); // Do the real load

		await service.load(); // Should not be called since another loading is in progress

		await app.init(); // Should not be called from onModuleInit since it already was loaded

		expect(loader).toHaveBeenCalledTimes(1);
	});

	it(`should load from strategy only one time when call load() method multiple times due already loaded`, async () => {
		const loader = jest.fn();

		const moduleRef = await Test.createTestingModule({
			imports: [
				AppModule.withStrategy([
					{
						loader: loader.mockImplementation(async () => {
							await new Promise(r => setTimeout(r, 2000));
							return variables;
						}),
					},
				]),
			],
		}).compile();

		app = moduleRef.createNestApplication();
		const service = app.get<ExtendedConfigService>(ExtendedConfigService);
		await service.load(); // Do the real load

		await app.init(); // Should not be called from onModuleInit since it already was loaded

		await service.load(); // Should not be called since it already was loaded

		expect(loader).toHaveBeenCalledTimes(1);
	});

	it(`should load variables again after reload() from strategy using functions`, async () => {
		const loader = jest.fn();

		const moduleRef = await Test.createTestingModule({
			imports: [
				AppModule.withStrategy([
					{
						reloadable: true,
						identifier: 'LOADER_FUNCTION',
						loader: loader.mockResolvedValue(variables),
					},
				]),
			],
		}).compile();

		app = moduleRef.createNestApplication();
		await app.init();

		const service = app.get<ExtendedConfigService>(ExtendedConfigService);
		await service.reload('LOADER_FUNCTION');

		expect(loader).toHaveBeenCalledTimes(2);

		for (const key of Object.keys(variables)) {
			expect(service.get(key)).toBe(variables[key]);
		}
	});

	it(`should load variables only one time by calling reload() with wrong identifier`, async () => {
		const loader = jest.fn();

		const moduleRef = await Test.createTestingModule({
			imports: [
				AppModule.withStrategy([
					{
						reloadable: true,
						identifier: 'LOADER_FUNCTION',
						loader: loader.mockResolvedValue(variables),
					},
				]),
			],
		}).compile();

		app = moduleRef.createNestApplication();
		await app.init();

		const service = app.get<ExtendedConfigService>(ExtendedConfigService);
		await service.reload('WRONG_LOADER_FUNCTION');

		expect(loader).toHaveBeenCalledTimes(1);

		for (const key of Object.keys(variables)) {
			expect(service.get(key)).toBe(variables[key]);
		}
	});

	it(`should load variables again after reload() from strategy using functions without identifier`, async () => {
		const loader = jest.fn();

		const moduleRef = await Test.createTestingModule({
			imports: [
				AppModule.withStrategy([
					{
						reloadable: true,
						loader: loader.mockResolvedValue(variables),
					},
				]),
			],
		}).compile();

		app = moduleRef.createNestApplication();
		await app.init();

		const service = app.get<ExtendedConfigService>(ExtendedConfigService);
		await service.reload();

		expect(loader).toHaveBeenCalledTimes(2);

		for (const key of Object.keys(variables)) {
			expect(service.get(key)).toBe(variables[key]);
		}
	});

	it(`should throw an exception while trying to load due missing loader`, async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [
				AppModule.withStrategy([
					{
						identifier: 'LOADER_FUNCTION',
					} as any,
				]),
			],
		}).compile();

		app = moduleRef.createNestApplication();
		expect(app.init()).rejects.toThrow();
	});

	it(`should throw an exception while trying to load due invalid loader`, async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [
				AppModule.withStrategy([
					{
						identifier: 'LOADER_FUNCTION',
						loader: false as any,
					},
				]),
			],
		}).compile();

		app = moduleRef.createNestApplication();
		expect(app.init()).rejects.toThrow();
	});

	it(`should throw an exception while trying to load due exception thrown on loader`, async () => {
		const loader = jest.fn();

		const moduleRef = await Test.createTestingModule({
			imports: [
				AppModule.withStrategy([
					{
						identifier: 'LOADER_FUNCTION',
						loader: loader.mockRejectedValue(new Error()),
					},
				]),
			],
		}).compile();

		app = moduleRef.createNestApplication();
		expect(app.init()).rejects.toThrow();
	});

	it(`should throw an exception while trying to validate due invalid validator`, async () => {
		const loader = jest.fn();

		const moduleRef = await Test.createTestingModule({
			imports: [
				AppModule.withStrategy([
					{
						identifier: 'LOADER_FUNCTION',
						loader: loader.mockResolvedValue(variables),
						validator: 'invalid' as any,
					},
				]),
			],
		}).compile();

		app = moduleRef.createNestApplication();
		expect(app.init()).rejects.toThrow();
	});

	it(`should throw an exception while trying to validate due exception thrown on validator`, async () => {
		const loader = jest.fn();
		const validator = jest.fn();

		const moduleRef = await Test.createTestingModule({
			imports: [
				AppModule.withStrategy([
					{
						identifier: 'LOADER_FUNCTION',
						loader: loader.mockResolvedValue(variables),
						validator: validator.mockRejectedValue(new Error()),
					},
				]),
			],
		}).compile();

		app = moduleRef.createNestApplication();
		expect(app.init()).rejects.toThrow();
	});

	it(`should throw an exception while trying to validate due invalid variables`, async () => {
		const loader = jest.fn();
		const validator = jest.fn();

		const moduleRef = await Test.createTestingModule({
			imports: [
				AppModule.withStrategy([
					{
						identifier: 'LOADER_FUNCTION',
						loader: loader.mockResolvedValue(variables),
						validator: validator.mockResolvedValue(false),
					},
				]),
			],
		}).compile();

		app = moduleRef.createNestApplication();
		expect(app.init()).rejects.toThrow();
	});

	it(`should throw an exception while trying to transform due invalid transformer`, async () => {
		const loader = jest.fn();

		const moduleRef = await Test.createTestingModule({
			imports: [
				AppModule.withStrategy([
					{
						identifier: 'LOADER_FUNCTION',
						loader: loader.mockResolvedValue(variables),
						transformer: 'invalid' as any,
					},
				]),
			],
		}).compile();

		app = moduleRef.createNestApplication();
		expect(app.init()).rejects.toThrow();
	});

	it(`should throw an exception while trying to transform due exception thrown on transformer`, async () => {
		const loader = jest.fn();
		const transformer = jest.fn();

		const moduleRef = await Test.createTestingModule({
			imports: [
				AppModule.withStrategy([
					{
						identifier: 'LOADER_FUNCTION',
						loader: loader.mockResolvedValue(variables),
						transformer: transformer.mockRejectedValue(new Error()),
					},
				]),
			],
		}).compile();

		app = moduleRef.createNestApplication();
		expect(app.init()).rejects.toThrow();
	});

	afterEach(async () => {
		await app.close();
	});
});
