import { NOT_IDENTIFIED } from '../config.constants';

/**
 * Formats a strategy identifier for messages. Symbols cannot be interpolated
 * in template literals, so they are converted explicitly.
 */
export const formatIdentifier = (identifier?: string | symbol): string =>
	identifier ? String(identifier) : NOT_IDENTIFIED;
