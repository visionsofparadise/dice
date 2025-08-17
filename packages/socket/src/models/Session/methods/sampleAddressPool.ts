import { sampleSize } from "@technically/lodash";
import { Session } from "..";
import { Address } from "../../Address";

export const sampleSessionAddressPool = (session: Session, count: number, filter = (_: Address) => true): Array<Address> => {
	let addresses = sampleSize([...session.cache.pool.values()].filter(filter), count);

	if (addresses.length < count) {
		addresses = addresses.concat(sampleSize(session.options.bootstrapAddresses.filter(filter), count - addresses.length));
	}

	return addresses;
};
