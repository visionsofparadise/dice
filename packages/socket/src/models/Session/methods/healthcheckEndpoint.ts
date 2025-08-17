import { Session } from "..";
import { Nat } from "../../Endpoint/Constant";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { Nat3Endpoint } from "../../Endpoint/Nat3";

export const healthcheckSessionEndpoint = async (session: Session): Promise<void> => {
	try {
		if (session.isHealthcheckingEndpoint) return;

		session.isHealthcheckingEndpoint = true;
		session.logger?.debug("Healthchecking endpoint");

		const externalAddressResult = await session.getExternalAddress();

		const { addressA, addressB } = externalAddressResult;

		session.endpoint = undefined;

		if (addressA.toString() !== addressB.toString()) return;

		if (!session.options.natType || session.options.natType === Nat.NAT3) {
			session.endpoint = new Nat3Endpoint({
				address: addressA,
				relayAddresses: [...session.cache.pool.values()].slice(0, 10),
			});
		}

		if (!session.options.natType || session.options.natType === Nat.NAT1) {
			if (session.options.natType === Nat.NAT1 || (await session.probeExternalAddress(externalAddressResult))) {
				session.endpoint = new Nat1Endpoint({
					address: addressA,
				});
			}
		}
	} catch (error) {
		session.events.emit("error", error);
	} finally {
		session.logger?.debug("Healthchecking endpoint complete");
		session.isHealthcheckingEndpoint = false;
	}
};
