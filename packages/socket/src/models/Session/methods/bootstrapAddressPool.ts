import { Session } from "..";
import { Nat1Endpoint } from "../../Endpoint/Nat1";

export const bootstrapSessionAddressPool = async (session: Session): Promise<void> => {
	try {
		if (session.isBootstrappingAddressPool) return;

		session.isBootstrappingAddressPool = true;
		session.logger?.debug("Bootstrapping address pool");

		await session.pageAddresses(async (addresses) => {
			if (session.cache.pool.size >= session.cache.pool.limit) return;

			return Promise.any(
				addresses.map(async (address) => {
					await session.ping(new Nat1Endpoint({ address }));

					return address;
				})
			);
		});
	} finally {
		session.logger?.debug("Bootstrapping address pool complete");
		session.isBootstrappingAddressPool = false;
	}
};
