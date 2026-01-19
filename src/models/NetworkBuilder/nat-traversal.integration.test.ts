import { describe, expect, it } from "vitest";
import { AddressType } from "../Address/Type";
import { NetworkBuilder } from "./index";

describe("NAT Traversal", () => {
	it(
		"two NATted peers connect via coordinator relay",
		async () => {
			const network = await new NetworkBuilder()
				.addPeer("coord1", { bindAddress: "127.0.0.1", natType: "none" })
				.addPeer("coord2", { bindAddress: "127.0.1.1", natType: "none" })
				.addPeer("alice", { bindAddress: "127.0.2.1", natType: "port-restricted" })
				.addPeer("bob", { bindAddress: "127.0.3.1", natType: "port-restricted" })
				.build();

			try {
				const coord1 = network.peers.get("coord1")!;
				const coord2 = network.peers.get("coord2")!;
				const alice = network.peers.get("alice")!;
				const bob = network.peers.get("bob")!;

				const aliceChannel = alice.client.ipChannels[AddressType.IPv4]!;
				const bobChannel = bob.client.ipChannels[AddressType.IPv4]!;

				await aliceChannel.protocol.ping(coord1.externalAddress);
				await aliceChannel.protocol.ping(coord2.externalAddress);
				await bobChannel.protocol.ping(coord1.externalAddress);
				await bobChannel.protocol.ping(coord2.externalAddress);

				aliceChannel.coordinators.add(coord1.externalAddress);
				bobChannel.coordinators.add(coord1.externalAddress);

				aliceChannel.addressTracker.lastUnsolicitedAt = 0;
				bobChannel.addressTracker.lastUnsolicitedAt = 0;

				const aliceDiceAddress = alice.client.diceAddress;
				const bobDiceAddress = bob.client.diceAddress;

				expect(aliceDiceAddress[AddressType.IPv4]?.coordinators?.length).toBe(1);
				expect(bobDiceAddress[AddressType.IPv4]?.coordinators?.length).toBe(1);

				const bobReceived = new Promise<Uint8Array>((resolve) => {
					bobChannel.udpTransport.events.on("message", (buffer) => {
						resolve(buffer);
					});
				});

				const testMessage = new TextEncoder().encode("Hello Bob!");

				await alice.client.send(bobDiceAddress, testMessage, AddressType.IPv4);

				const received = await bobReceived;
				expect(new TextDecoder().decode(received)).toBe("Hello Bob!");

				const aliceReceived = new Promise<Uint8Array>((resolve) => {
					aliceChannel.udpTransport.events.on("message", (buffer) => {
						resolve(buffer);
					});
				});

				const replyMessage = new TextEncoder().encode("Hello Alice!");

				await bob.client.send(aliceDiceAddress, replyMessage, AddressType.IPv4);

				const reply = await aliceReceived;
				expect(new TextDecoder().decode(reply)).toBe("Hello Alice!");
			} finally {
				network.close();
			}
		},
		60_000
	);

	it(
		"message reaches destination without coordinator relay after hole punch",
		async () => {
			const network = await new NetworkBuilder()
				.addPeer("coord1", { bindAddress: "127.0.0.1", natType: "none" })
				.addPeer("coord2", { bindAddress: "127.0.1.1", natType: "none" })
				.addPeer("alice", { bindAddress: "127.0.2.1", natType: "port-restricted" })
				.addPeer("bob", { bindAddress: "127.0.3.1", natType: "port-restricted" })
				.build();

			try {
				const coord1 = network.peers.get("coord1")!;
				const coord2 = network.peers.get("coord2")!;
				const alice = network.peers.get("alice")!;
				const bob = network.peers.get("bob")!;

				const aliceChannel = alice.client.ipChannels[AddressType.IPv4]!;
				const bobChannel = bob.client.ipChannels[AddressType.IPv4]!;

				await aliceChannel.protocol.ping(coord1.externalAddress);
				await aliceChannel.protocol.ping(coord2.externalAddress);
				await bobChannel.protocol.ping(coord1.externalAddress);
				await bobChannel.protocol.ping(coord2.externalAddress);

				aliceChannel.coordinators.add(coord1.externalAddress);
				bobChannel.coordinators.add(coord1.externalAddress);

				aliceChannel.addressTracker.lastUnsolicitedAt = 0;
				bobChannel.addressTracker.lastUnsolicitedAt = 0;

				const bobDiceAddress = bob.client.diceAddress;

				const bobReceived = new Promise<Uint8Array>((resolve) => {
					bobChannel.udpTransport.events.on("message", (buffer) => {
						resolve(buffer);
					});
				});

				await alice.client.send(bobDiceAddress, new TextEncoder().encode("First"), AddressType.IPv4);
				await bobReceived;

				expect(aliceChannel.bindings.hasInboundBinding(bob.externalAddress.key, alice.externalAddress.key)).toBe(true);
				expect(aliceChannel.bindings.hasOutboundBinding(alice.externalAddress.key, bob.externalAddress.key)).toBe(true);
			} finally {
				network.close();
			}
		},
		60_000
	);
});
