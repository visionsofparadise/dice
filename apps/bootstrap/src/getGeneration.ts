import { hex } from "@scure/base";
import { Codec } from "bufferfy";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

export const getGeneration = (publicKey: Uint8Array): number => {
	const generationDirectory = path.resolve(process.cwd(), `./data/${hex.encode(publicKey)}`);
	const generationPath = path.resolve(generationDirectory, `./generation`);

	let generation = 0;

	try {
		const buffer = readFileSync(generationPath);

		generation = Codec.VarInt(60).decode(buffer);

		return generation;
	} catch (error) {
		return generation;
	} finally {
		const nextBuffer = Codec.VarInt(60).encode(generation + 1);

		if (!existsSync(generationDirectory)) {
			mkdirSync(generationDirectory, { recursive: true });
		}

		writeFileSync(generationPath, nextBuffer);
	}
};
