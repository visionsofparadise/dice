import { Layer } from "..";
import { Address } from "../../Address";

export const isValidOverlayAddress = (layer: Layer, address: Address | undefined): boolean => {
	return (
		!!address &&
		address.type === layer.local.type &&
		address.key !== layer.local.key &&
		address.key !== layer.external?.key &&
		layer.options.bootstrapAddresses.every((bootstrapAddress) => address.key !== bootstrapAddress.key)
	);
};
