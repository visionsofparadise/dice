import { RemoteInfo, SocketType } from "dgram";

export enum IpType {
	IPV4 = "ipv4",
	IPV6 = "ipv6",
}

export const IP_TYPE_UDP_TYPE_MAPPING: Record<IpType, SocketType> = {
	[IpType.IPV4]: "udp4",
	[IpType.IPV6]: "udp6",
};

export const IP_TYPE_IP_FAMILY_MAPPING: Record<IpType, RemoteInfo["family"]> = {
	[IpType.IPV4]: "IPv4",
	[IpType.IPV6]: "IPv6",
};

export const IP_FAMILY_IP_TYPE_MAPPING: Record<RemoteInfo["family"], IpType> = {
	IPv4: IpType.IPV4,
	IPv6: IpType.IPV6,
};
