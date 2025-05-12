import { RequiredProperties } from "../../../utilities/RequiredProperties";
import { Sequenced } from "../../../utilities/Sequenced";
import { RSignature } from "../../Keys/Codec";
import { BaseNodeProperties } from "./Codec";
import { isBaseNodeEqualPublicKey } from "./methods/isEqualPublicKey";

export namespace BaseNode {
	export type Properties = BaseNodeProperties;
}

export abstract class BaseNode implements BaseNode.Properties, Sequenced {
	sequenceNumber: number;
	generation: number;
	isDisabled: boolean;
	rSignature: RSignature;

	constructor(properties: RequiredProperties<BaseNode.Properties, "rSignature">) {
		this.sequenceNumber = properties.sequenceNumber !== undefined ? properties.sequenceNumber : 0;
		this.generation = properties.generation !== undefined ? properties.generation : 0;
		this.isDisabled = properties.isDisabled !== undefined ? properties.isDisabled : false;
		this.rSignature = properties.rSignature;
	}

	abstract buffer: Uint8Array;
	abstract byteLength: number;
	abstract checksum: Uint8Array;

	get properties(): BaseNode.Properties {
		const { sequenceNumber, generation, isDisabled, rSignature } = this;

		return { sequenceNumber, generation, isDisabled, rSignature };
	}

	abstract publicKey: Uint8Array;

	isEqualPublicKey = isBaseNodeEqualPublicKey.bind(this, this);
}
