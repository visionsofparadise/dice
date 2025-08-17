import { Session } from "..";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { Nat3Endpoint } from "../../Endpoint/Nat3";

export const healthcheckSessionAddressPool = async (session: Session): Promise<void> => {
	try {
		if (session.isHealthcheckingAddressPool) return;

		session.isHealthcheckingAddressPool = true;
		session.logger?.debug("Healthchecking address pool");

		const now = Date.now();

		const promises = [...session.cache.pool].map(async ([key, address]) => {
			const cacheItem = session.cache.pool.map.get(key);

			if (!cacheItem || now < cacheItem.createdAt + session.options.healthcheckIntervalMs) return;

			await session.ping(new Nat1Endpoint({ address }));
		});

		if (promises.length) await Promise.allSettled(promises);

		if (session.endpoint instanceof Nat3Endpoint) {
			session.endpoint = new Nat3Endpoint({
				...session.endpoint.properties,
				relayAddresses: [...session.cache.pool.values()].slice(0, 10),
			});
		}

		if (!session.cache.pool.size) await session.bootstrapAddressPool();
	} catch (error) {
		session.events.emit("error", error);
	} finally {
		session.logger?.debug("Healthchecking address pool complete");
		session.isHealthcheckingAddressPool = false;
	}
};
