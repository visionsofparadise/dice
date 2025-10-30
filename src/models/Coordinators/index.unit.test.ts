import { describe, it, expect, vi, beforeEach } from "vitest";
import { Coordinators } from ".";
import { Ipv4Address } from "../Ipv4Address";

describe("Coordinators", () => {
	let coordinators: Coordinators;

	beforeEach(() => {
		coordinators = new Coordinators({ coordinatorCount: 3 });
	});

	describe("pool size limit enforcement", () => {
		it("respects pool size limit", () => {
			const addr1 = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 1]), port: 8080 });
			const addr2 = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 2]), port: 8080 });
			const addr3 = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 3]), port: 8080 });
			const addr4 = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 4]), port: 8080 });

			coordinators.add(addr1);
			coordinators.add(addr2);
			coordinators.add(addr3);

			expect(coordinators.size).toBe(3);

			// tryAdd should return false when pool is full
			const added = coordinators.tryAdd(addr4);
			expect(added).toBe(false);
			expect(coordinators.size).toBe(3);
		});

		it("tryAdd returns true when space available", () => {
			const addr1 = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 1]), port: 8080 });

			const added = coordinators.tryAdd(addr1);

			expect(added).toBe(true);
			expect(coordinators.size).toBe(1);
		});

		it("tryAdd returns false for duplicate", () => {
			const addr1 = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 1]), port: 8080 });

			coordinators.add(addr1);

			const added = coordinators.tryAdd(addr1);

			expect(added).toBe(false);
			expect(coordinators.size).toBe(1);
		});
	});

	describe("excluded addresses filtering", () => {
		it("isValidAddress rejects excluded addresses", () => {
			const addr1 = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 1]), port: 8080 });
			const excluded = new Set([addr1.key]);

			coordinators = new Coordinators({ coordinatorCount: 3, excluded });

			expect(coordinators.isValidAddress(addr1)).toBe(false);
		});

		it("isValidAddress accepts non-excluded addresses", () => {
			const addr1 = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 1]), port: 8080 });
			const addr2 = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 2]), port: 8080 });
			const excluded = new Set([addr1.key]);

			coordinators = new Coordinators({ coordinatorCount: 3, excluded });

			expect(coordinators.isValidAddress(addr2)).toBe(true);
		});
	});

	describe("coordinator operations", () => {
		it("has() checks coordinator existence", () => {
			const addr1 = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 1]), port: 8080 });

			expect(coordinators.has(addr1.key)).toBe(false);

			coordinators.add(addr1);

			expect(coordinators.has(addr1.key)).toBe(true);
		});

		it("list() returns array of coordinators", () => {
			const addr1 = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 1]), port: 8080 });
			const addr2 = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 2]), port: 8080 });

			coordinators.add(addr1);
			coordinators.add(addr2);

			const list = coordinators.list();

			expect(list).toHaveLength(2);
			expect(list).toContainEqual(addr1);
			expect(list).toContainEqual(addr2);
		});

		it("remove() removes coordinator", () => {
			const addr1 = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 1]), port: 8080 });

			coordinators.add(addr1);
			expect(coordinators.size).toBe(1);

			coordinators.remove(addr1.key);
			expect(coordinators.size).toBe(0);
		});

		it("size getter returns correct count", () => {
			const addr1 = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 1]), port: 8080 });
			const addr2 = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 2]), port: 8080 });

			expect(coordinators.size).toBe(0);

			coordinators.add(addr1);
			expect(coordinators.size).toBe(1);

			coordinators.add(addr2);
			expect(coordinators.size).toBe(2);
		});
	});

	describe("event emissions", () => {
		it("emits depleted when pool reaches 0", () => {
			const addr1 = new Ipv4Address({ ip: new Uint8Array([192, 168, 1, 1]), port: 8080 });
			const depletedListener = vi.fn();

			coordinators.events.on("depleted", depletedListener);

			coordinators.add(addr1);
			coordinators.remove(addr1.key);

			expect(depletedListener).toHaveBeenCalled();
		});

		it("does not emit depleted if pool was already empty", () => {
			const depletedListener = vi.fn();

			coordinators.events.on("depleted", depletedListener);

			// Remove from empty pool
			coordinators.remove("nonexistent");

			expect(depletedListener).not.toHaveBeenCalled();
		});
	});
});
