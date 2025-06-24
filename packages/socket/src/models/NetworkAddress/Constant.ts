export enum IpFamily {
	IPv4,
	IPv6,
}

export const IP_FAMILY_MAP = {
	[IpFamily.IPv4]: "IPv4",
	[IpFamily.IPv6]: "IPv6",
} as const;

export const IP_FAMILY_REVERSE_MAP = {
	IPv4: IpFamily.IPv4,
	IPv6: IpFamily.IPv6,
} as const;
