import logger, { type LogLevelNumbers } from "loglevel";
import { AddressType } from "../Address/Type";
import { Client } from "../Client";
import { Ipv4Address } from "../Ipv4Address";
import { NatProxy } from "../NatProxy";
import type { UdpTransport } from "../UdpTransport";

logger.setLevel(process.env.LOG_LEVEL ? (parseInt(process.env.LOG_LEVEL) as LogLevelNumbers) : 5);

export namespace NetworkBuilder {
	export interface PeerConfig {
		bindAddress?: string;
		name: string;
		natType: NatProxy.NatType;
	}

	export interface Peer {
		name: string;
		client: Client;
		natProxy: NatProxy;
		externalAddress: Ipv4Address;
	}

	export interface Network {
		peers: Map<string, Peer>;
		close: () => void;
	}
}

/**
 * Fluent API for building test networks with simulated NAT behavior.
 *
 * Creates a network of peers with configurable NAT types for testing
 * NAT traversal scenarios. All peers are IPv4-only on localhost.
 *
 * @example
 * ```typescript
 * const network = await new NetworkBuilder()
 *   .addPeer("bootstrap1", { natType: "none" })
 *   .addPeer("bootstrap2", { natType: "none" })
 *   .addPeer("alice", { natType: "port-restricted" })
 *   .build();
 *
 * const alice = network.peers.get("alice")!;
 * // Use alice.client to send/receive
 *
 * network.close();
 * ```
 */
export class NetworkBuilder {
	private readonly peerConfigs: Array<NetworkBuilder.PeerConfig> = [];

	addPeer(name: string, options: { bindAddress?: string; natType: NatProxy.NatType }): this {
		this.peerConfigs.push({ name, bindAddress: options.bindAddress, natType: options.natType });
		return this;
	}

	async build(): Promise<NetworkBuilder.Network> {
		const peers = new Map<string, NetworkBuilder.Peer>();
		const resources: Array<{ close: () => void }> = [];

		try {
			for (const config of this.peerConfigs) {
				const natProxy = await NatProxy.create({ bindAddress: config.bindAddress, natType: config.natType });
				resources.push(natProxy);

				const externalAddress = Ipv4Address.fromAddressInfo(natProxy.address());

				const client = new Client({
					[AddressType.IPv4]: {
						isAddressValidationDisabled: true,
						isPrefixFilteringDisabled: true,
						socket: natProxy as unknown as UdpTransport.Socket,
					},
					logger,
				});

				const ipChannel = client.ipChannels[AddressType.IPv4];

				if (ipChannel && config.natType === "none") {
					ipChannel.addressTracker.external = externalAddress;
					ipChannel.bindings.external = externalAddress;
					ipChannel.addressTracker.lastUnsolicitedAt = Date.now();
				}

				client.open();
				clearInterval(ipChannel?.healthcheckInterval);

				peers.set(config.name, {
					name: config.name,
					client,
					natProxy,
					externalAddress,
				});
			}

			return {
				peers,
				close: () => {
					for (const peer of peers.values()) {
						peer.client.close();
						peer.natProxy.close();
					}
				},
			};
		} catch (error) {
			for (const resource of resources) {
				resource.close();
			}
			throw error;
		}
	}
}
