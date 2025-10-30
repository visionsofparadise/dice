import { Codec } from "bufferfy";
import { Ipv4Address } from "../Ipv4Address";
import { Ipv4AddressCodec } from "../Ipv4Address/Codec";
import { Ipv6Address } from "../Ipv6Address";
import { Ipv6AddressCodec } from "../Ipv6Address/Codec";
import { AddressType } from "./Type";

export const AddressCodec = Codec.Union([Ipv6AddressCodec, Ipv4AddressCodec], Codec.UInt(8));

export interface AddressTypeMap {
	[AddressType.IPv6]: Ipv6Address;
	[AddressType.IPv4]: Ipv4Address;
}
