import { sample } from "lodash-es";
import { Layer } from "..";
import { DiceError } from "../../Error";

export const initializeOverlay = async (layer: Layer): Promise<void> => {
	const address = sample(layer.coordinators.getAll()) || sample(layer.options.bootstrapAddresses);

	if (!address) throw new DiceError("Cannot find initialize address");

	await layer.send(address, Uint8Array.from([0]));
};
