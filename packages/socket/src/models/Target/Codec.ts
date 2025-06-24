import { Endpoint } from "../Endpoint/Codec";

export interface Source<T extends Endpoint = Endpoint> {
	endpoint: T;
}

export interface Target<T extends Endpoint = Endpoint> {
	endpoint: T;
}

export interface RoutableTarget<T extends Endpoint = Endpoint> {
	diceAddress: Uint8Array;
	endpoint: T;
}
