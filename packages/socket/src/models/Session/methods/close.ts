import { Session } from "..";

export const closeSession = (session: Session): void => {
	if (session.state === Session.STATE.CLOSED) return;

	session.logger?.info("Closing");

	clearInterval(session.healthcheckEndpointInterval);
	clearInterval(session.healthcheckAddressPoolInterval);

	session.udpSocket.removeListener("message", session.udpSocketListeners.messageListener);

	session.events.removeListener("message", session.sessionListeners.messageListener);
	session.events.removeListener("error", session.sessionListeners.errorListener);

	for (const { abort } of session.responseListenerMap.values()) abort.abort("close");

	session.state = Session.STATE.CLOSED;
	session.events.emit("close");
	session.logger?.info("Closed");
};
