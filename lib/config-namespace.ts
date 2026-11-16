import { Inject } from '@nestjs/common';

const CONFIG_NAMESPACE_TOKEN_PREFIX = 'EXTENDED_CONFIG_NAMESPACE:';

/**
 * Injection token of a configuration namespace registered with forFeature().
 */
export const getConfigToken = (namespace: string): string =>
	`${CONFIG_NAMESPACE_TOKEN_PREFIX}${namespace}`;

/**
 * Injects a configuration namespace (a registerAs key or any object path)
 * registered with ExtendedConfigModule.forFeature(). The injected value is a
 * read-only proxy that always reflects the latest loaded values.
 */
export const InjectConfig = (
	namespace: string,
): ParameterDecorator & PropertyDecorator => Inject(getConfigToken(namespace));
