type Primitive = string | number | boolean | bigint | symbol | null | undefined;
/**
 * True for `any` and `unknown`. Nest's `app.get(ExtendedConfigService)` infers
 * the configuration type as `unknown`, which must behave as an untyped service.
 */
type IsUntyped<T> = unknown extends T ? true : false;
type Leaf =
	Primitive | ((...args: any[]) => any) | Date | RegExp | ReadonlyArray<any>;
type PrevDepth = [never, 0, 1, 2, 3, 4, 5];

/**
 * Every dotted path of a configuration type, e.g. "PORT" | "db" | "db.host".
 * Falls back to `string` for untyped configurations. Limited to 5 levels deep.
 */
export type ConfigPath<T, Depth extends number = 5> =
	IsUntyped<T> extends true
		? string
		: [Depth] extends [never]
			? never
			: T extends Leaf
				? never
				: {
						[K in keyof T & string]: IsUntyped<T[K]> extends true
							? K | `${K}.${string}`
							: NonNullable<T[K]> extends Leaf
								? K
								: K | `${K}.${ConfigPath<NonNullable<T[K]>, PrevDepth[Depth]>}`;
					}[keyof T & string];

/**
 * Type of the value found at a dotted path of a configuration type.
 */
export type ConfigPathValue<T, P extends string> =
	IsUntyped<T> extends true
		? any
		: P extends keyof T
			? T[P]
			: P extends `${infer Head}.${infer Rest}`
				? Head extends keyof T
					? ConfigPathValue<NonNullable<T[Head]>, Rest>
					: unknown
				: unknown;
