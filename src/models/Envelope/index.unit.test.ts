import { describe, expect, it } from "vitest";
import { Envelope } from ".";
import { MAGIC_BYTES } from "../../utilities/magicBytes";
import { Ipv4Address } from "../Ipv4Address";
import { EnvelopeVersion } from "./Codec";

describe("Envelope", () => {
	describe("constructor", () => {
		it("creates envelope with payload only", () => {
			const payload = new Uint8Array([1, 2, 3]);
			const envelope = new Envelope({ payload });

			expect(envelope.payload).toBe(payload);
			expect(envelope.reflectionAddress).toBeUndefined();
			expect(envelope.magicBytes).toBe(MAGIC_BYTES);
			expect(envelope.version).toBe(EnvelopeVersion.V1);
		});

		it("creates envelope with reflection address", () => {
			const payload = new Uint8Array([1, 2, 3]);
			const reflectionAddress = Ipv4Address.fromString("192.0.2.1:8080");

			const envelope = new Envelope({
				payload,
				reflectionAddress,
			});

			expect(envelope.payload).toBe(payload);
			expect(envelope.reflectionAddress).toBe(reflectionAddress);
		});
	});

	describe("buffer", () => {
		it("encodes to Uint8Array", () => {
			const payload = new Uint8Array([1, 2, 3]);
			const envelope = new Envelope({ payload });

			const buffer = envelope.buffer;

			expect(buffer).toBeInstanceOf(Uint8Array);
			expect(buffer.length).toBeGreaterThan(payload.length);
		});

		it("caches buffer", () => {
			const payload = new Uint8Array([1, 2, 3]);
			const envelope = new Envelope({ payload });

			const buffer1 = envelope.buffer;
			const buffer2 = envelope.buffer;

			expect(buffer1).toBe(buffer2);
		});
	});

	describe("byteLength", () => {
		it("returns correct size", () => {
			const payload = new Uint8Array([1, 2, 3]);
			const envelope = new Envelope({ payload });

			expect(envelope.byteLength).toBeGreaterThan(0);
		});

		it("caches byte length", () => {
			const payload = new Uint8Array([1, 2, 3]);
			const envelope = new Envelope({ payload });

			const length1 = envelope.byteLength;
			const length2 = envelope.byteLength;

			expect(length1).toBe(length2);
		});
	});

	describe("properties", () => {
		it("returns all envelope properties", () => {
			const payload = new Uint8Array([1, 2, 3]);
			const reflectionAddress = Ipv4Address.fromString("192.0.2.1:8080");

			const envelope = new Envelope({
				payload,
				reflectionAddress,
			});

			const props = envelope.properties;

			expect(props.payload).toBe(payload);
			expect(props.reflectionAddress).toBe(reflectionAddress);
			expect(props.magicBytes).toBe(MAGIC_BYTES);
			expect(props.version).toBe(EnvelopeVersion.V1);
			expect(props.flags).toEqual({});
		});
	});
});
