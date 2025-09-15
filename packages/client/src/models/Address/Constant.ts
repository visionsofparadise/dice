export enum Family {
	IPv4,
	IPv6,
}

export const FAMILY_MAP = {
	[Family.IPv4]: "IPv4",
	[Family.IPv6]: "IPv6",
} as const;

export const FAMILY_REVERSE_MAP = {
	IPv4: Family.IPv4,
	IPv6: Family.IPv6,
} as const;
