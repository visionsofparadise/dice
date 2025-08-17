import { sample, uniqBy } from "@technically/lodash";
import { Session } from "..";
import { Address } from "../../Address";
import { Nat1Endpoint } from "../../Endpoint/Nat1";

export type PageSessionAddressesSelector = (addresses: Array<Address>) => Promise<Address | undefined | void> | Address | undefined | void;

export const pageSessionAddresses = async (session: Session, callback: PageSessionAddressesSelector = (addresses) => sample(addresses)): Promise<void> => {
	const history = new Set<string>();
	const initialAddresses = session.sampleAddressPool(session.options.concurrency);

	const promises = initialAddresses.map(async (initialAddress) => {
		let address: Address | undefined | void = initialAddress;
		let depth = session.options.depth;

		while (address && depth--) {
			try {
				history.add(address.key);

				const addresses = await session.sample(new Nat1Endpoint({ address }));

				const nextAddresses = uniqBy(
					addresses.filter((a) => !history.has(a.key)),
					({ key }) => key
				).slice(0, 20);

				address = await callback(nextAddresses);
			} catch (error) {
				session.events.emit("error", error);

				throw error;
			}
		}
	});

	if (promises.length) await Promise.allSettled(promises);
};
