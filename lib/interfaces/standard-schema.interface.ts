// tslint:disable:no-namespace
/**
 * Standard Schema v1 interface (https://standardschema.dev).
 * Copied as recommended by the spec so no runtime dependency is needed.
 * Implemented by Zod, Valibot, ArkType and other validation libraries.
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
	readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}

export declare namespace StandardSchemaV1 {
	export interface Props<Input = unknown, Output = Input> {
		readonly version: 1;
		readonly vendor: string;
		readonly validate: (
			value: unknown,
		) => Result<Output> | Promise<Result<Output>>;
		readonly types?: Types<Input, Output> | undefined;
	}

	export type Result<Output> = SuccessResult<Output> | FailureResult;

	export interface SuccessResult<Output> {
		readonly value: Output;
		readonly issues?: undefined;
	}

	export interface FailureResult {
		readonly issues: ReadonlyArray<Issue>;
	}

	export interface Issue {
		readonly message: string;
		readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
	}

	export interface PathSegment {
		readonly key: PropertyKey;
	}

	export interface Types<Input = unknown, Output = Input> {
		readonly input: Input;
		readonly output: Output;
	}

	export type InferInput<Schema extends StandardSchemaV1> = NonNullable<
		Schema['~standard']['types']
	>['input'];

	export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<
		Schema['~standard']['types']
	>['output'];
}

/**
 * Configuration type produced by a Standard Schema, to type the service:
 * `ExtendedConfigService<InferConfig<typeof schema>>`.
 */
export type InferConfig<
	Schema extends StandardSchemaV1
> = StandardSchemaV1.InferOutput<Schema>;
