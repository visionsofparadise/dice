import { createSocket, type Socket as UdpSocket } from "dgram";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NatProxy } from "./index";

describe("NatProxy", () => {
	let natProxy: NatProxy;
	let targetSocket: UdpSocket;

	beforeEach(async () => {
		targetSocket = createSocket("udp4");
		await new Promise<void>((resolve) => {
			targetSocket.bind(undefined, "127.0.0.1", () => resolve());
		});
	});

	afterEach(() => {
		natProxy?.close();
		targetSocket?.close();
	});

	describe("NAT type: none", () => {
		beforeEach(async () => {
			natProxy = await NatProxy.create({ natType: "none" });
		});

		it("allows all inbound without prior send", async () => {
			const received = new Promise<Buffer>((resolve) => {
				natProxy.on("message", (buffer) => resolve(buffer));
			});

			const testData = Buffer.from("hello");
			const natAddr = natProxy.address();
			targetSocket.send(testData, natAddr.port, natAddr.address);

			const buffer = await received;
			expect(buffer.toString()).toBe("hello");
		});
	});

	describe("NAT type: port-restricted", () => {
		beforeEach(async () => {
			natProxy = await NatProxy.create({ natType: "port-restricted" });
		});

		it("blocks inbound without prior send", async () => {
			let received = false;
			natProxy.on("message", () => {
				received = true;
			});

			const testData = Buffer.from("blocked");
			const natAddr = natProxy.address();
			targetSocket.send(testData, natAddr.port, natAddr.address);

			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(received).toBe(false);
		});

		it("allows response from exact ip:port sent to", async () => {
			const received = new Promise<Buffer>((resolve) => {
				natProxy.on("message", (buffer) => resolve(buffer));
			});

			const targetAddr = targetSocket.address();
			natProxy.send(Buffer.from("ping"), targetAddr.port, targetAddr.address);

			const testData = Buffer.from("pong");
			const natAddr = natProxy.address();
			targetSocket.send(testData, natAddr.port, natAddr.address);

			const buffer = await received;
			expect(buffer.toString()).toBe("pong");
		});

		it("blocks response from different port", async () => {
			const otherSocket = createSocket("udp4");
			await new Promise<void>((resolve) => {
				otherSocket.bind(undefined, "127.0.0.1", () => resolve());
			});

			try {
				let received = false;
				natProxy.on("message", () => {
					received = true;
				});

				const targetAddr = targetSocket.address();
				natProxy.send(Buffer.from("ping"), targetAddr.port, targetAddr.address);

				const natAddr = natProxy.address();
				otherSocket.send(Buffer.from("blocked"), natAddr.port, natAddr.address);

				await new Promise((resolve) => setTimeout(resolve, 50));
				expect(received).toBe(false);
			} finally {
				otherSocket.close();
			}
		});
	});

	describe("NAT type: address-restricted", () => {
		beforeEach(async () => {
			natProxy = await NatProxy.create({ natType: "address-restricted" });
		});

		it("allows response from same IP, different port", async () => {
			const otherSocket = createSocket("udp4");
			await new Promise<void>((resolve) => {
				otherSocket.bind(undefined, "127.0.0.1", () => resolve());
			});

			try {
				const received = new Promise<Buffer>((resolve) => {
					natProxy.on("message", (buffer) => resolve(buffer));
				});

				const targetAddr = targetSocket.address();
				natProxy.send(Buffer.from("ping"), targetAddr.port, targetAddr.address);

				const natAddr = natProxy.address();
				otherSocket.send(Buffer.from("pong-other-port"), natAddr.port, natAddr.address);

				const buffer = await received;
				expect(buffer.toString()).toBe("pong-other-port");
			} finally {
				otherSocket.close();
			}
		});
	});

	describe("NAT type: full-cone", () => {
		beforeEach(async () => {
			natProxy = await NatProxy.create({ natType: "full-cone" });
		});

		it("blocks inbound when no bindings exist", async () => {
			let received = false;
			natProxy.on("message", () => {
				received = true;
			});

			const natAddr = natProxy.address();
			targetSocket.send(Buffer.from("blocked"), natAddr.port, natAddr.address);

			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(received).toBe(false);
		});

		it("allows any inbound after any outbound", async () => {
			const otherSocket = createSocket("udp4");
			await new Promise<void>((resolve) => {
				otherSocket.bind(undefined, "127.0.0.1", () => resolve());
			});

			try {
				const received = new Promise<Buffer>((resolve) => {
					natProxy.on("message", (buffer) => resolve(buffer));
				});

				const targetAddr = targetSocket.address();
				natProxy.send(Buffer.from("ping"), targetAddr.port, targetAddr.address);

				const natAddr = natProxy.address();
				otherSocket.send(Buffer.from("from-stranger"), natAddr.port, natAddr.address);

				const buffer = await received;
				expect(buffer.toString()).toBe("from-stranger");
			} finally {
				otherSocket.close();
			}
		});
	});

	describe("address()", () => {
		it("returns external socket address", async () => {
			natProxy = await NatProxy.create({ natType: "none" });
			const addr = natProxy.address();
			expect(addr.address).toBe("127.0.0.1");
			expect(typeof addr.port).toBe("number");
		});
	});

	describe("binding table", () => {
		it("updates on each send", async () => {
			natProxy = await NatProxy.create({ natType: "port-restricted" });

			const socket1 = createSocket("udp4");
			const socket2 = createSocket("udp4");

			await Promise.all([
				new Promise<void>((resolve) => socket1.bind(undefined, "127.0.0.1", () => resolve())),
				new Promise<void>((resolve) => socket2.bind(undefined, "127.0.0.1", () => resolve())),
			]);

			try {
				const messagesReceived: string[] = [];
				natProxy.on("message", (buffer) => {
					messagesReceived.push(buffer.toString());
				});

				const addr1 = socket1.address();
				const addr2 = socket2.address();
				natProxy.send(Buffer.from("to-1"), addr1.port, addr1.address);
				natProxy.send(Buffer.from("to-2"), addr2.port, addr2.address);

				const natAddr = natProxy.address();
				socket1.send(Buffer.from("from-1"), natAddr.port, natAddr.address);
				socket2.send(Buffer.from("from-2"), natAddr.port, natAddr.address);

				await new Promise((resolve) => setTimeout(resolve, 50));

				expect(messagesReceived).toContain("from-1");
				expect(messagesReceived).toContain("from-2");
			} finally {
				socket1.close();
				socket2.close();
			}
		});
	});
});
