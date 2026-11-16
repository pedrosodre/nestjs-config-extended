import { join } from 'path';
import { jsonFileLoader, yamlFileLoader } from '../../../lib';
import { retrieveVariablesByStrategy } from '../../../lib/util/loader.util';

const fixture = (name: string) => join(__dirname, 'fixtures', name);

describe('[Strategy] JSON file', () => {
	it('should load nested values from a JSON file', () => {
		expect(jsonFileLoader({ path: fixture('config.json') })).toEqual({
			PORT: 3000,
			database: { host: 'localhost', ssl: true },
		});
	});

	it('should resolve relative paths from process.cwd()', () => {
		const relative = join('tests', 'unit', 'strategies', 'fixtures', 'config.json');
		expect(jsonFileLoader({ path: relative }).PORT).toBe(3000);
	});

	it('should return an empty object for missing optional files', () => {
		expect(jsonFileLoader({ path: fixture('nope.json'), optional: true })).toEqual({});
	});

	it('should throw for missing required files, missing path and non-object content', () => {
		expect(() => jsonFileLoader({ path: fixture('nope.json') })).toThrow(
			'JSON file not found',
		);
		expect(() => jsonFileLoader()).toThrow('requires the "path" option');
		expect(() => jsonFileLoader({ path: fixture('array.json') })).toThrow(
			'must contain an object at the top level',
		);
	});

	it('should work as a strategy loader with options', async () => {
		const variables = await retrieveVariablesByStrategy({
			loader: jsonFileLoader,
			options: { path: fixture('config.json') },
		});
		expect(variables.database.host).toBe('localhost');
	});
});

describe('[Strategy] YAML file', () => {
	it('should load nested values and arrays from a YAML file', () => {
		expect(yamlFileLoader({ path: fixture('config.yaml') })).toEqual({
			PORT: 3000,
			database: { host: 'localhost', ssl: true },
			features: ['a', 'b'],
		});
	});

	it('should return an empty object for an empty file', () => {
		expect(yamlFileLoader({ path: fixture('empty.yaml') })).toEqual({});
	});

	it('should explain how to install yaml when it is missing', () => {
		jest.isolateModules(() => {
			jest.doMock('yaml', () => {
				throw new Error("Cannot find module 'yaml'");
			});
			const {
				yamlFileLoader: isolatedLoader,
			} = require('../../../lib/strategies/file/yaml-file.strategy');

			expect(() => isolatedLoader({ path: fixture('config.yaml') })).toThrow(
				'yamlFileLoader requires the "yaml" package',
			);
		});
		jest.dontMock('yaml');
	});
});
