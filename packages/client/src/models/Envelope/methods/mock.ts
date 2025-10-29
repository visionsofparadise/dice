import { Envelope } from "..";

export const mockEnvelope = (properties?: Partial<Envelope.Properties>) =>
	new Envelope({
		payload: new Uint8Array([0x00]),
		...properties,
	});
