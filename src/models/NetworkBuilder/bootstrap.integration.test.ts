import { describe, expect, it } from "vitest";
import { AddressType } from "../Address/Type";
import { NetworkBuilder } from "./index";

describe("Bootstrap Flow", () => {
	it(
		"NATted peer discovers external address via bootstrap peers",
		async () => {
			const network = await new NetworkBuilder()
				.addPeer("bootstrap1", { bindAddress: "127.0.0.1", natType: "none" })
				.addPeer("bootstrap2", { bindAddress: "127.0.1.1", natType: "none" })
				.addPeer("alice", { bindAddress: "127.0.2.1", natType: "port-restricted" })
				.build();

			try {
				const bootstrap1 = network.peers.get("bootstrap1")!;
				const bootstrap2 = network.peers.get("bootstrap2")!;
				const alice = network.peers.get("alice")!;

				const aliceChannel = alice.client.ipChannels[AddressType.IPv4]!;

				await aliceChannel.protocol.ping(bootstrap1.externalAddress);
				await aliceChannel.protocol.ping(bootstrap2.externalAddress);

				expect(aliceChannel.addressTracker.external?.key).toBe(alice.externalAddress.key);

				await alice.client.handleDiceAddress(bootstrap1.client.diceAddress);
				await alice.client.handleDiceAddress(bootstrap2.client.diceAddress);

				const coordinators = aliceChannel.coordinators.list();
				expect(coordinators.length).toBe(2);
				expect(coordinators.some((c) => c.key === bootstrap1.externalAddress.key)).toBe(true);
				expect(coordinators.some((c) => c.key === bootstrap2.externalAddress.key)).toBe(true);
			} finally {
				network.close();
			}
		},
		60_000
	);

	it(
		"NATted peer external address matches NatProxy external socket",
		async () => {
			const network = await new NetworkBuilder()
				.addPeer("bootstrap1", { bindAddress: "127.0.0.1", natType: "none" })
				.addPeer("bootstrap2", { bindAddress: "127.0.1.1", natType: "none" })
				.addPeer("alice", { bindAddress: "127.0.2.1", natType: "port-restricted" })
				.build();

			try {
				const bootstrap1 = network.peers.get("bootstrap1")!;
				const bootstrap2 = network.peers.get("bootstrap2")!;
				const alice = network.peers.get("alice")!;

				const aliceChannel = alice.client.ipChannels[AddressType.IPv4]!;

				await aliceChannel.protocol.ping(bootstrap1.externalAddress);
				await aliceChannel.protocol.ping(bootstrap2.externalAddress);

				const natProxyAddr = alice.natProxy.address();
				const discoveredExternal = aliceChannel.addressTracker.external;

				expect(discoveredExternal?.port).toBe(natProxyAddr.port);
			} finally {
				network.close();
			}
		},
		60_000
	);
});
