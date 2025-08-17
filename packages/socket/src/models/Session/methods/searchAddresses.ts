import { sample, uniqBy } from "@technically/lodash";
import { Session } from "..";
import { Address } from "../../Address";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { DiceError } from "../../Error";

export type SearchSessionAddressesCallback = (endpoints: Array<Address>) => Promise<Address | undefined> | Address | undefined;

export const searchSessionAddresses = async (session: Session, callback: SearchSessionAddressesCallback): Promise<Address> => {
	const history = new Set<string>();
	const initialAddresses = session.sampleAddressPool(session.options.concurrency);

	const promises = initialAddresses.map(async (initialAddress) => {
		let address: Address | undefined = initialAddress;
		let depth = session.options.depth;

		while (address && depth--) {
			try {
				history.add(address.key);

				const addresses = await session.sample(new Nat1Endpoint({ address }));

				const nextEndpoints = uniqBy(
					addresses.filter((a) => !history.has(a.key)),
					({ key }) => key
				).slice(0, 20);

				const result = await callback(nextEndpoints);

				if (result !== undefined) return result;

				address = sample(nextEndpoints);
			} catch (error) {
				session.events.emit("error", error);

				throw error;
			}
		}

		throw new DiceError("Could not find result");
	});

	return Promise.any(promises);
};
