/**
 * Injection tokens
 */
export const CRON_SCHEDULER = 'CRON_SCHEDULER';
export const EXTENDED_CONFIG_OPTIONS = 'EXTENDED_CONFIG_OPTIONS';
export const PRE_LOADED_VALUES = 'PRE_LOADED_VALUES';

/**
 * Messages and useful strings
 */
export const NOT_IDENTIFIED = 'Not identified';
export const VARIABLES_PRELOADED_BY_MODULE =
	'Variables was preloaded by module from enabled strategies';
export const FIRST_LOAD_REQUESTED = 'Starting variables loading process';
export const LOAD_REQUEST_IGNORED_DUE_ALREADY_LOADED =
	'Load request was ignored since variables already was loaded';
export const LOAD_REQUEST_IGNORED_DUE_IN_PROGRESS =
	'Load request was ignored since a loading process is in progress at this moment';
export const INVALID_VARIABLES =
	"Variables was not validated by strategy's validator.";
export const STARTING_STRATEGY = 'Starting strategy';
export const LOADING_VARIABLES_FROM_STRATEGY =
	"Loading variables from strategy's loader";
export const RELOADING_VARIABLES_FROM_STRATEGY =
	"Reloading variables from strategy's loader";
export const RELOADING_VARIABLES_FROM_STRATEGY_BY_SCHEDULER =
	"Reloading variables from strategy's loader by scheduler";
export const VALIDATING_VARIABLES_FROM_STRATEGY =
	"Validating variables from strategy's validator";
export const TRANSFORMING_VARIABLES_FROM_STRATEGY =
	"Transforming variables from strategy's transformer";
export const ASSIGNING_VARIABLES_TO_PROCESS_ENV =
	'Assigning loaded variables to process.env';
export const ASSIGNING_VARIABLES_TO_CACHE =
	'Assigning loaded variables to memory cache';
export const STARTING_RELOAD = 'Starting variables reload';
export const ALL_STRATEGIES = 'ALL';
export const NOT_LOADED_STRATEGY_DISABLED =
	'Variables not loaded since strategy is disabled';
export const DEBUG_LOG_PREFIX = '[Extended Config Module]';
export const SCHEDULED_RELOAD_FAILED =
	'Scheduled reload failed, keeping previously loaded variables';
export const PARSING_VARIABLES_WITH_SCHEMA =
	"Parsing variables with strategy's schema";
export const ON_CHANGE_HOOK_FAILED = 'onChange hook failed';
export const ON_RELOAD_ERROR_HOOK_FAILED = 'onReloadError hook failed';
export const RETRYING_LOADER = "Retrying strategy's loader";
export const RELOADING_VARIABLES_FROM_STRATEGY_BY_INTERVAL =
	"Reloading variables from strategy's loader by interval";
