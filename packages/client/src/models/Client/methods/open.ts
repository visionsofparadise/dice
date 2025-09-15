import { Client } from "..";

export const openClient = async (client: Client, isBootstrapping = true): Promise<void> => {
	if (client.state === Client.STATE.OPENED) return;

	client.logger?.info("Opening");

	client.socket.on("message", client.socketListeners.messageListener);

	client.events.on("message", client.clientListeners.messageListener);
	client.events.on("error", client.clientListeners.errorListener);

	client.healthcheckInterval = setInterval(() => client.healthcheck(), client.options.healthcheckIntervalMs);

	client.state = Client.STATE.OPENED;
	client.events.emit("open");
	client.logger?.info("Open");

	if (isBootstrapping) await client.healthcheck();
};
