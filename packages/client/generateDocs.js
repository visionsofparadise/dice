const { execSync } = require("child_process");
const { readFileSync, writeFileSync, rmSync, readdirSync } = require("fs");
const { join } = require("path");

const TEMP_DOCS_DIR = "temp";
const API_MARKER_START = "<!-- API_START -->";
const API_MARKER_END = "<!-- API_END -->";

function generateDocs() {
	try {
		execSync(`npx typedoc --options typedoc.json`, { stdio: "inherit" });

		let apiContent = "";

		const clientPath = join(TEMP_DOCS_DIR, "classes", "Client.md");
		const overlayPath = join(TEMP_DOCS_DIR, "classes", "Overlay.md");
		const diceAddressPath = join(TEMP_DOCS_DIR, "classes", "DiceAddress.md");

		try {
			const clientDocs = readFileSync(clientPath, "utf8");
			apiContent += "## Client\n\n" + clientDocs.replace(/^# .*$/m, "").trim() + "\n\n";
		} catch {}

		try {
			const overlayDocs = readFileSync(overlayPath, "utf8");
			apiContent += "## Overlay\n\n" + overlayDocs.replace(/^# .*$/m, "").trim() + "\n\n";
		} catch {}

		try {
			const diceAddressDocs = readFileSync(diceAddressPath, "utf8");
			apiContent += "## DiceAddress\n\n" + diceAddressDocs.replace(/^# .*$/m, "").trim() + "\n\n";
		} catch {}

		if (!apiContent.trim()) {
			apiContent = "API documentation could not be generated.";
		}

		const readmePath = "README.md";
		const readmeContent = readFileSync(readmePath, "utf8");

		const updatedContent = readmeContent.replace(
			new RegExp(`${API_MARKER_START}[\\s\\S]*?${API_MARKER_END}`, "g"),
			`${API_MARKER_START}
<!-- This section is auto-generated from TypeDoc comments - do not edit manually -->

${apiContent.trim()}

${API_MARKER_END}`
		);

		writeFileSync(readmePath, updatedContent, "utf8");
		rmSync(TEMP_DOCS_DIR, { recursive: true, force: true });
	} catch (error) {
		try {
			rmSync(TEMP_DOCS_DIR, { recursive: true, force: true });
		} catch {}

		process.exit(1);
	}
}

generateDocs();