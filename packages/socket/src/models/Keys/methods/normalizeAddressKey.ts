import { concat } from "uint8array-tools";
import { DiceAddressCodec } from "../Codec";

export const normalizeKeysAddress = (key: Uint8Array): Uint8Array => {
	if (key.byteLength === DiceAddressCodec.byteLength()) return key;

	if (key.byteLength > DiceAddressCodec.byteLength()) return key.subarray(0, DiceAddressCodec.byteLength());

	return concat([key, new Uint8Array(DiceAddressCodec.byteLength() - key.byteLength).fill(0)]);
};
