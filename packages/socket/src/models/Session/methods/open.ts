import { Session } from "..";

export const openSession = async (session: Session, isBootstrapping = true): Promise<void> => {
	if (session.state === Session.STATE.OPENED) return;

	session.logger?.info("Opening");

	session.udpSocket.on("message", session.udpSocketListeners.messageListener);

	session.events.on("message", session.sessionListeners.messageListener);
	session.events.on("error", session.sessionListeners.errorListener);

	session.healthcheckEndpointInterval = setInterval(() => session.healthcheckEndpoint(), session.options.healthcheckIntervalMs);
	session.healthcheckAddressPoolInterval = setInterval(() => session.healthcheckAddressPool(), session.options.healthcheckIntervalMs);

	session.state = Session.STATE.OPENED;
	session.events.emit("open");
	session.logger?.info("Open");

	if (isBootstrapping) await session.bootstrap();
};
