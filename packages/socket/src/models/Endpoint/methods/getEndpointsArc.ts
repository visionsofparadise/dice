import { IpFamily } from "../../NetworkAddress/Constant";
import { Source, Target } from "../../Target/Codec";
import { Endpoint } from "../Codec";
import { Nat } from "../Constant";

export interface GetEndpointsArcOptions {
	isIpFamily?: Set<IpFamily>;
	isNat?: Set<Nat>;
}

export const getEndpointsArc = <S extends Endpoint, T extends Endpoint>(
	endpointsA: Array<S>,
	endpointsB: Array<T>,
	options?: GetEndpointsArcOptions
):
	| {
			source: Source<S>;
			target: Target<T>;
	  }
	| undefined => {
	for (const endpointA of endpointsA) {
		if (options?.isIpFamily && !options.isIpFamily.has(endpointA.networkAddress.family)) continue;
		if (options?.isNat && !options.isNat.has(endpointA.nat)) continue;

		for (const endpointB of endpointsB) {
			if (endpointA.networkAddress.family !== endpointB.networkAddress.family) continue;
			if (options?.isNat && !options.isNat.has(endpointB.nat)) continue;

			return {
				source: { endpoint: endpointA },
				target: { endpoint: endpointB },
			};
		}
	}
};
