import type { RemoteInfo, Socket as UdpSocket } from "dgram";
import { createSocket } from "dgram";

export namespace NatProxy {
	export type NatType = "none" | "full-cone" | "address-restricted" | "port-restricted";

	export interface Options {
		bindAddress?: string;
		natType: NatType;
		socket: UdpSocket;
	}

	export interface BindingEntry {
		remoteIp: string;
		remotePort: number;
	}
}

/**
 * NAT simulation socket wrapper for integration testing.
 *
 * Wraps a dgram.Socket and simulates NAT behavior by filtering inbound packets
 * based on the configured NAT type and existing bindings.
 *
 * NAT Types:
 * - `none`: All inbound allowed (public IP simulation)
 * - `full-cone`: Any external host can send to the mapped port
 * - `address-restricted`: Only hosts we've sent to (any port) can reply
 * - `port-restricted`: Only exact ip:port pairs we've sent to can reply
 *
 * @example
 * ```typescript
 * const natProxy = await NatProxy.create({ natType: "port-restricted" });
 * // Use natProxy as UdpTransport.Socket
 * const transport = new UdpTransport({ socket: natProxy });
 * ```
 */
export class NatProxy {
	readonly options: NatProxy.Options;
	readonly externalSocket: UdpSocket;
	private readonly bindings = new Map<string, NatProxy.BindingEntry>();
	private readonly messageListeners: Array<(buffer: Buffer, remoteInfo: RemoteInfo) => void> = [];

	private constructor(options: NatProxy.Options) {
		this.options = options;
		this.externalSocket = options.socket;

		this.externalSocket.on("message", this.handleInbound);
	}

	/**
	 * Creates a NatProxy with an externally-bound socket.
	 */
	static async create(options: Partial<NatProxy.Options> & { natType: NatProxy.NatType }): Promise<NatProxy> {
		const socket = createSocket("udp4");
		const bindAddress = options.bindAddress ?? "127.0.0.1";

		await new Promise<void>((resolve) => {
			socket.bind(undefined, bindAddress, () => resolve());
		});

		return new NatProxy({ ...options, socket });
	}

	/**
	 * Returns external socket address (the "public" NAT address).
	 */
	address(): ReturnType<UdpSocket["address"]> {
		return this.externalSocket.address();
	}

	/**
	 * Close the external socket.
	 */
	close(callback?: () => void): void {
		this.externalSocket.removeListener("message", this.handleInbound);
		this.externalSocket.close(callback);
	}

	/**
	 * Register message listener (called for allowed inbound packets).
	 */
	on(_event: "message", listener: (buffer: Buffer, remoteInfo: RemoteInfo) => void): this {
		this.messageListeners.push(listener);
		return this;
	}

	/**
	 * Remove message listener.
	 */
	removeListener(_event: "message", listener: (buffer: Buffer, remoteInfo: RemoteInfo) => void): this {
		const index = this.messageListeners.indexOf(listener);
		if (index !== -1) {
			this.messageListeners.splice(index, 1);
		}
		return this;
	}

	/**
	 * Send through external socket, recording binding.
	 */
	send(
		buffer: Buffer | Uint8Array,
		port: number,
		address: string,
		callback?: (error: Error | null, bytes: number) => void
	): void {
		this.recordBinding(address, port);
		this.externalSocket.send(buffer, port, address, callback);
	}

	/**
	 * Unref the external socket.
	 */
	unref(): UdpSocket {
		return this.externalSocket.unref();
	}

	private recordBinding(remoteIp: string, remotePort: number): void {
		const key = `${remoteIp}:${remotePort}`;
		this.bindings.set(key, { remoteIp, remotePort });
	}

	private readonly handleInbound = (buffer: Buffer, remoteInfo: RemoteInfo): void => {
		if (!this.isAllowed(remoteInfo)) {
			return;
		}

		for (const listener of this.messageListeners) {
			listener(buffer, remoteInfo);
		}
	};

	private isAllowed(remoteInfo: RemoteInfo): boolean {
		const { address: remoteIp, port: remotePort } = remoteInfo;

		switch (this.options.natType) {
			case "none":
				return true;

			case "full-cone":
				return this.bindings.size > 0;

			case "address-restricted":
				for (const binding of this.bindings.values()) {
					if (binding.remoteIp === remoteIp) {
						return true;
					}
				}
				return false;

			case "port-restricted": {
				const key = `${remoteIp}:${remotePort}`;
				return this.bindings.has(key);
			}
		}
	}
}
