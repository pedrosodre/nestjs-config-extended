import {
	ConfigLoaderStrategy,
	LoaderClass,
	LoaderMethod,
	TransformerClass,
	TransformerMethod,
	ValidatorClass,
	ValidatorMethod,
} from '../interfaces';
import isFunction from 'lodash.isfunction';
import {
	TRANSFORMING_VARIABLES_FROM_STRATEGY,
	LOADING_VARIABLES_FROM_STRATEGY,
	INVALID_VARIABLES,
	VALIDATING_VARIABLES_FROM_STRATEGY,
	PARSING_VARIABLES_WITH_SCHEMA,
	RETRYING_LOADER,
} from '../config.constants';
import {
	InvalidLoaderException,
	InvalidTransformerException,
	InvalidValidatorException,
	LoadingException,
	SchemaValidationException,
	TransformationException,
	ValidationException,
} from '../exceptions';

export const retrieveVariablesByStrategy = async (
	strategy: ConfigLoaderStrategy,
	debug?: (message: string, identifier?: string | Symbol) => void,
): Promise<Record<string, any>> => {
	const { identifier } = strategy;

	if (debug) {
		debug(LOADING_VARIABLES_FROM_STRATEGY, identifier);
	}

	let loadedVariables = await loadWithRetry(strategy, debug);

	await validateVariablesByStrategy(strategy, loadedVariables, debug);

	loadedVariables = await transformVariablesByStrategy(
		strategy,
		loadedVariables,
		debug,
	);

	loadedVariables = await parseVariablesWithSchema(
		strategy,
		loadedVariables,
		debug,
	);

	return loadedVariables;
};

export const parseVariablesWithSchema = async (
	strategy: ConfigLoaderStrategy,
	variables: Record<string, any>,
	debug?: (message: string, identifier?: string | Symbol) => void,
): Promise<Record<string, any>> => {
	const { schema, identifier } = strategy;

	if (!schema) {
		return variables;
	}

	if (debug) {
		debug(PARSING_VARIABLES_WITH_SCHEMA, identifier);
	}

	const result = await schema['~standard'].validate(variables);

	if (result.issues) {
		throw new SchemaValidationException(result.issues, identifier);
	}

	const value = result.value;
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		throw new SchemaValidationException(
			[{ message: 'schema output must be an object' }],
			identifier,
		);
	}

	return value as Record<string, any>;
};

const sleep = (ms: number) =>
	new Promise<void>(resolve => setTimeout(resolve, ms));

const callLoader = async (
	strategy: ConfigLoaderStrategy,
): Promise<Record<string, any>> => {
	const { loader, identifier, options } = strategy;

	if (isFunction(loader)) {
		return (loader as LoaderMethod)(options);
	}

	if (isFunction(loader?.load)) {
		return (loader as LoaderClass).load(options);
	}

	throw new InvalidLoaderException(identifier);
};

const loadWithRetry = async (
	strategy: ConfigLoaderStrategy,
	debug?: (message: string, identifier?: string | Symbol) => void,
): Promise<Record<string, any>> => {
	const { identifier, retry } = strategy;
	const retries = Math.max(0, retry?.retries || 0);
	const factor = retry?.factor ?? 2;
	const maxDelay = retry?.maxDelay ?? 30000;
	let delay = retry?.delay ?? 1000;

	for (let attempt = 0; ; attempt++) {
		try {
			return await callLoader(strategy);
		} catch (err) {
			if (err instanceof InvalidLoaderException) {
				throw err;
			}

			if (attempt >= retries) {
				throw new LoadingException(err as Error, identifier);
			}

			if (debug) {
				debug(
					`${RETRYING_LOADER} (${attempt + 1}/${retries}) in ${delay}ms`,
					identifier,
				);
			}

			await sleep(delay);
			delay = Math.min(delay * factor, maxDelay);
		}
	}
};

export const validateVariablesByStrategy = async (
	strategy: ConfigLoaderStrategy,
	variables: Record<string, any>,
	debug?: (message: string, identifier?: string | Symbol) => void,
): Promise<void> => {
	const { validator, identifier } = strategy;
	let isValid = true;

	try {
		if (validator) {
			if (debug) {
				debug(VALIDATING_VARIABLES_FROM_STRATEGY, identifier);
			}

			if (isFunction(validator)) {
				isValid = await (validator as ValidatorMethod)(variables);
			} else if ('validate' in validator && isFunction(validator?.validate)) {
				isValid = await (validator as ValidatorClass).validate(variables);
			} else {
				throw new InvalidValidatorException(identifier);
			}
		}
	} catch (err) {
		if (err instanceof InvalidValidatorException) {
			throw err;
		}

		throw new ValidationException(err as Error, identifier);
	}

	if (!isValid) {
		throw new ValidationException(INVALID_VARIABLES, identifier);
	}
};

export const transformVariablesByStrategy = async (
	strategy: ConfigLoaderStrategy,
	variables: Record<string, any>,
	debug?: (message: string, identifier?: string | Symbol) => void,
): Promise<Record<string, any>> => {
	const { transformer, identifier } = strategy;

	if (transformer) {
		if (debug) {
			debug(TRANSFORMING_VARIABLES_FROM_STRATEGY, identifier);
		}

		try {
			if (isFunction(transformer)) {
				variables = await (transformer as TransformerMethod)(variables);
			} else if (
				'transform' in transformer &&
				isFunction(transformer?.transform)
			) {
				variables = await (transformer as TransformerClass).transform(
					variables,
				);
			} else {
				throw new InvalidTransformerException(identifier);
			}
		} catch (err) {
			if (err instanceof InvalidTransformerException) {
				throw err;
			}

			throw new TransformationException(err as Error, identifier);
		}
	}

	return variables;
};
