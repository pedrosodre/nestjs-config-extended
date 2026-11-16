import {
	ExtendedConfigException,
	InvalidLoaderException,
	InvalidReloadIntervalException,
	InvalidScheduleException,
	InvalidTransformerException,
	InvalidValidatorException,
	LoadingException,
	MissingConfigException,
	ProcessEnvAssignmentException,
	SchemaValidationException,
	TransformationException,
	ValidationException,
} from '../../../lib';
import { retrieveVariablesByStrategy } from '../../../lib/util/loader.util';

describe('exceptions', () => {
	const cases: [string, Error][] = [
		['InvalidLoaderException', new InvalidLoaderException('A')],
		[
			'InvalidReloadIntervalException',
			new InvalidReloadIntervalException('x', 'A'),
		],
		['InvalidScheduleException', new InvalidScheduleException('A')],
		['InvalidTransformerException', new InvalidTransformerException('A')],
		['InvalidValidatorException', new InvalidValidatorException('A')],
		['LoadingException', new LoadingException('x', 'A')],
		['MissingConfigException', new MissingConfigException('a.b')],
		[
			'ProcessEnvAssignmentException',
			new ProcessEnvAssignmentException('x', 'A'),
		],
		[
			'SchemaValidationException',
			new SchemaValidationException([{ message: 'x' }], 'A'),
		],
		['TransformationException', new TransformationException('x', 'A')],
		['ValidationException', new ValidationException('x', 'A')],
	];

	it.each(cases)(
		'%s has its own name and extends ExtendedConfigException',
		(name, error) => {
			expect(error.name).toBe(name);
			expect(error).toBeInstanceOf(ExtendedConfigException);
			expect(error).toBeInstanceOf(Error);
			expect(String(error)).toMatch(new RegExp(`^${name}: `));
		},
	);

	it('should keep the original error as cause and the strategy identifier', async () => {
		const original = new Error('connection refused');
		const promise = retrieveVariablesByStrategy({
			identifier: Symbol('REMOTE'),
			loader: () => {
				throw original;
			},
		});

		const error = (await promise.catch(e => e)) as LoadingException;
		expect(error).toBeInstanceOf(LoadingException);
		expect(error.cause).toBe(original);
		expect(String(error.identifier)).toBe('Symbol(REMOTE)');
		expect(error.message).toBe(
			`Symbol(REMOTE) strategy's loader was not able to load variables due "Error: connection refused"`,
		);
		expect(Object.keys(error)).not.toContain('cause');
	});

	it('should not set a cause when the reason is a string', () => {
		const error = new ValidationException('invalid', 'A');
		expect(error.cause).toBeUndefined();
		expect('cause' in error).toBe(false);
	});
});
