/**
 * Minimal contract the module needs from a cron scheduler.
 * Kept local so published typings do not depend on node-cron's types.
 */
export interface CronScheduledTask {
	destroy(): void;
}

export interface CronScheduleOptions {
	scheduled?: boolean;
	timezone?: string;
}

export interface CronScheduler {
	validate(expression: string): boolean;
	schedule(
		expression: string,
		task: () => void | Promise<void>,
		options?: CronScheduleOptions,
	): CronScheduledTask;
}
