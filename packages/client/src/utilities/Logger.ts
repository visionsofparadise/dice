import { Logger as LogLevelLogger } from "loglevel";

export type Logger = Pick<LogLevelLogger, "debug" | "error" | "info" | "log" | "trace" | "warn">;

export const wrapLogger = (logger: Logger | undefined, prefix: string): Logger | undefined => {
	if (!logger) return;

	const prefixer = (log: (value: any) => any) => (value: any) => {
		if (typeof value === "string") {
			value = prefix + ": " + value;

			log(value);
		} else {
			log(prefix + ":");
			log(value);
		}
	};

	return {
		debug: prefixer(logger.debug),
		error: prefixer(logger.error),
		info: prefixer(logger.info),
		log: prefixer(logger.log),
		trace: prefixer(logger.trace),
		warn: prefixer(logger.warn),
	};
};
