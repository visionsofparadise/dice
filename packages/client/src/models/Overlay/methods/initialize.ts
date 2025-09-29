import { sample } from "@technically/lodash";
import { Overlay } from "..";
import { DiceError } from "../../Error";

export const initializeOverlay = async (overlay: Overlay): Promise<void> => {
	const address = sample(overlay.coordinators) || sample(overlay.candidates) || sample(overlay.options.bootstrapAddresses);

	if (!address) throw new DiceError("Cannot find initialize address");

	await overlay.send(address, Uint8Array.from([0]));
};
