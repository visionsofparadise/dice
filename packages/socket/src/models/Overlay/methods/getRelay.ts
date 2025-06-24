import { Overlay } from "..";
import { Endpoint } from "../../Endpoint/Codec";
import { Nat } from "../../Endpoint/Constant";
import { Nat1Endpoint } from "../../Endpoint/Nat1";
import { Source, Target } from "../../Target/Codec";

export const getOverlayRelay = (overlay: Overlay, source: Source, target: Target): Target<Nat1Endpoint> | undefined => {
	const [relayNode] = overlay.sample(1, (relayNode) => {
		const relayEndpoints = relayNode.endpoints.filter((endpoint) => endpoint.nat === Nat.NAT1);

		const arcA = Endpoint.getArc([source.endpoint], relayEndpoints);
		const arcB = Endpoint.getArc(relayEndpoints, [target.endpoint]);

		return !!arcA && !!arcB;
	});

	if (!relayNode) return;

	const relayEndpoints = relayNode.endpoints.filter((endpoint) => endpoint.nat === Nat.NAT1);

	const arc = Endpoint.getArc([source.endpoint], relayEndpoints);

	if (!arc || arc.target.endpoint.nat !== Nat.NAT1) return;

	return {
		endpoint: arc.target.endpoint,
	};
};
