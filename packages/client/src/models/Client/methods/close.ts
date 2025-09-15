import { Client } from "..";

export const closeClient = (client: Client): void => {
	if (client.state === Client.STATE.CLOSED) return;

	client.logger?.info("Closing");

	clearInterval(client.healthcheckInterval);

	client.socket.removeListener("message", client.socketListeners.messageListener);

	client.events.removeListener("message", client.clientListeners.messageListener);
	client.events.removeListener("error", client.clientListeners.errorListener);

	for (const { abort } of client.responseListenerMap.values()) abort.abort("close");

	client.state = Client.STATE.CLOSED;
	client.events.emit("close");
	client.logger?.info("Closed");
};
