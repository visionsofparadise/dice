import { Session } from "..";
import { Address } from "../../Address";

export const isValidSessionPoolAddress = (session: Session, address: Address | undefined): boolean => {
	return (
		!!address &&
		address.ip.family === session.localAddress.ip.family &&
		address.key !== session.localAddress.key &&
		address.key !== session.endpoint?.address.key &&
		session.options.bootstrapAddresses.every((bootstrapAddress) => address.key !== bootstrapAddress.key)
	);
};
