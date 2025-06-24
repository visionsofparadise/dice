import { Node } from "..";
import { Endpoint } from "../../Endpoint/Codec";

export const scoreNode = (node: Node): number => {
	return node.endpoints.reduce((score, endpoint) => score + Endpoint.score(endpoint), 0);
};
