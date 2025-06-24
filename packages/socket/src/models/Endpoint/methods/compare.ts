import { compare } from "uint8array-tools";
import { Endpoint } from "../Codec";

export const compareEndpoints = (endpointA: Endpoint, endpointB: Endpoint) => {
	const scoreA = Endpoint.score(endpointA);
	const scoreB = Endpoint.score(endpointB);

	if (scoreA !== scoreB) return scoreB - scoreA;

	return compare(endpointA.checksum, endpointB.checksum);
};
