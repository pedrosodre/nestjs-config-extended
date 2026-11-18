/**
 * Longest delay Node timers support (2^31 - 1 ms, about 24.8 days). Longer
 * delays are silently clamped to 1 ms by setTimeout/setInterval.
 */
export const MAX_TIMER_DELAY = 2 ** 31 - 1;

const UNITS: Record<string, number> = {
	ms: 1,
	s: 1000,
	m: 60 * 1000,
	h: 60 * 60 * 1000,
	d: 24 * 60 * 60 * 1000,
};

/**
 * Parses a duration in milliseconds (number) or as a string like "500ms",
 * "30s", "5m", "1h" or "1d". Returns undefined when invalid, not positive or
 * longer than MAX_TIMER_DELAY.
 */
export const parseDuration = (value: number | string): number | undefined => {
	if (typeof value === 'number') {
		return isTimerDelay(value) ? value : undefined;
	}

	const match = /^\s*(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)\s*$/.exec(value);
	if (!match) {
		return undefined;
	}

	const duration = Number(match[1]) * UNITS[match[2]];
	return isTimerDelay(duration) ? duration : undefined;
};

const isTimerDelay = (value: number): boolean =>
	Number.isFinite(value) && value > 0 && value <= MAX_TIMER_DELAY;
