import log, { LogLevelNumbers } from "loglevel";
import { Socket } from "../models/Socket";
import { RequiredProperties } from "./RequiredProperties";

log.setLevel(process.env.LOG_LEVEL ? (parseInt(process.env.LOG_LEVEL) as LogLevelNumbers) : 1);

export const INTEGRATION_TEST_TIMEOUT_MS = 60_000;

export const spawnIntegrationSocket = (options: RequiredProperties<Socket.Options, "bootstrapNodes">): Socket => {
	return new Socket({
		isPortMappingDisabled: true,
		// logger: log,
		...options,
	});
};
