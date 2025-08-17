import { Session } from "..";
import { Nat3Endpoint } from "../../Endpoint/Nat3";
import { ExternalAddressResult } from "./getExternalAddress";

export const probeSessionExternalAddress = async (session: Session, externalAddressResult: ExternalAddressResult): Promise<boolean> => {
	try {
		const { addressA, addressB } = externalAddressResult;

		if (addressA.key !== addressB.key) return false;

		const probeAddress = await session.searchAddresses((endpoints) => {
			return endpoints.find((address) => session.isValidPoolAddress(address) && !session.cache.pool.has(address.key) && !session.cache.probe.has(address.key));
		});

		const relayAddresses = session.sampleAddressPool(session.options.concurrency);

		const targetEndpoint = new Nat3Endpoint({
			address: probeAddress,
			relayAddresses,
		});

		session.cache.probe.set(targetEndpoint.address.key, undefined);

		await session.punch(targetEndpoint, undefined, {
			isPrePunchDisabled: true,
		});

		return true;
	} catch (error) {
		return false;
	}
};
