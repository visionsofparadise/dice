import { Overlay } from "..";
import { Address } from "../../Address";

export const isValidOverlayAddress = (overlay: Overlay, address: Address | undefined): boolean => {
	return (
		!!address &&
		address.type === overlay.local.type &&
		address.key !== overlay.local.key &&
		address.key !== overlay.external?.key &&
		overlay.options.bootstrapAddresses.every((bootstrapAddress) => address.key !== bootstrapAddress.key)
	);
};
