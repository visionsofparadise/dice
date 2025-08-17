import { Session } from "..";
import { Address } from "../../Address";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { DiceError } from "../../Error";

export interface ExternalAddressResult {
	reflectEndpointA: Nat1Endpoint;
	addressA: Address;
	reflectEndpointB: Nat1Endpoint;
	addressB: Address;
}

export const getSessionExternalAddress = async (session: Session): Promise<ExternalAddressResult> => {
	session.logger?.debug("Sampling reflect nodes");

	const [reflectAddressA, reflectAddressB] = session.sampleAddressPool(2);

	if (!reflectAddressA || !reflectAddressB) {
		throw new DiceError("Could not find endpoints to get external address");
	}

	const reflectEndpointA = new Nat1Endpoint({ address: reflectAddressA });
	const reflectEndpointB = new Nat1Endpoint({ address: reflectAddressB });

	const [addressA, addressB] = await Promise.all([session.reflect(reflectEndpointA), session.reflect(reflectEndpointB)]);

	session.logger?.debug(`Got external addresses ${addressA.toString()} & ${addressB.toString()}`);

	return {
		reflectEndpointA,
		addressA,
		reflectEndpointB,
		addressB,
	};
};
