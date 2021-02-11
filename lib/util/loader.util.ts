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
} from '../config.constants';
import {
	InvalidLoaderException,
	InvalidTransformerException,
	InvalidValidatorException,
	LoadingException,
	TransformationException,
	ValidationException,
} from '../exceptions';

export const retrieveVariablesByStrategy = async (
	strategy: ConfigLoaderStrategy,
	debug?: (message: string, identifier?: string | Symbol) => void,
): Promise<Record<string, any>> => {
	const { loader, identifier, options } = strategy;
	let loadedVariables: Record<string, any> = {};

	try {
		if (debug) {
			debug(LOADING_VARIABLES_FROM_STRATEGY, identifier);
		}

		if (isFunction(loader)) {
			loadedVariables = await (loader as LoaderMethod)(options);
		} else if (isFunction(loader?.load)) {
			loadedVariables = await (loader as LoaderClass).load(options);
		} else {
			throw new InvalidLoaderException(identifier);
		}
	} catch (err) {
		if (err instanceof InvalidLoaderException) {
			throw err;
		}

		throw new LoadingException(err, identifier);
	}

	await validateVariablesByStrategy(strategy, loadedVariables, debug);

	loadedVariables = await transformVariablesByStrategy(
		strategy,
		loadedVariables,
		debug,
	);

	return loadedVariables;
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
			} else if (isFunction(validator?.validate)) {
				isValid = await (validator as ValidatorClass).validate(variables);
			} else {
				throw new InvalidValidatorException(identifier);
			}
		}
	} catch (err) {
		if (err instanceof InvalidValidatorException) {
			throw err;
		}

		throw new ValidationException(err, identifier);
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
			} else if (isFunction(transformer?.transform)) {
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

			throw new TransformationException(err, identifier);
		}
	}

	return variables;
};
