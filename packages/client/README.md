# DICE (@xkore/dice)

## Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Development](#development)

DICE stands for distributed interactive connectivity establishment, a public and peer-to-peer ICE/STUN-like service without servers.

Most peers in peer-to-peer networks cannot participate fully because they are behind firewalls and NATs, preventing them from becoming publicly reachable. DICE is a general solution that allows peers to coordinate to become connectable.

It handles:

- External address discovery
- NAT/Firewall detection and traversal
- UDP hole punching.

DICE multiplexes on the same port as your p2p application, provides you with a publicly reachable DICE address, and facilitates sending to others' DICE addresses. With standard addresses around 20% of peers are publicly reachable, with DICE addresses this grows to around 80%.

**DICE Addresses** are self-contained URLs that embed connectivity information:

```
dice://[ipv6]:[port]/[coordinators]/[ipv4]:[port]/[coordinators]
```

## Installation

```bash
npm install @xkore/dice
```

## Quick Start

```typescript
import { Client, AddressType } from "@xkore/dice";

const diceClient = new Client({
	[AddressType.IPV6]: {
		socket: ipv6Socket,
	},
	[AddressType.IPV4]: {
		socket: ipv4Socket,
	},
});

// Open connection and discover peers
await diceClient.open();

const diceAddress = diceClient.diceAddress;

diceClient.on("diceAddress", (diceAddress) => {
	// Dice address has been updated
});

diceClient.on("message", (message, remoteInfo) => {
	// Raw messages from all sockets, including DICE messages so make sure you filter them out or filter for your protocols messages.
});

// Send message to another DICE address
await diceClient.send(targetAddress, message);

// Clean shutdown
await diceClient.close();
```

## API Documentation

### Client Constructor

Creates a new DICE client for P2P networking. The client manages dual-stack IPv4/IPv6 overlays for maximum connectivity. At minimum, provide at least one socket (IPv4 or IPv6). For best results, provide both to enable dual-stack operation.

**Parameters:**

- `options` (optional) - Configuration options
    - `[AddressType.IPv4]` - IPv4 configuration with UDP socket
    - `[AddressType.IPv6]` - IPv6 configuration with UDP socket
    - `cacheSize` - Maximum cache entries for NAT bindings (default: 10,000)
    - `concurrency` - Concurrent operations during peer discovery (default: 3)
    - `depth` - Min/max depth for iterative peer discovery (default: {minimum: 3, maximum: 10})
    - `healthcheckIntervalMs` - Interval between health checks in ms (default: 60,000)
    - `relayCount` - Number of coordinators to use for NAT traversal (default: 9)
    - `logger` - Optional logger instance for debugging

**Examples:**

```typescript
import { createSocket } from "dgram";
import { Client, AddressType } from "@xkore/dice";

// Dual-stack client (recommended)
const client = new Client({
	[AddressType.IPv4]: { socket: createSocket("udp4") },
	[AddressType.IPv6]: { socket: createSocket("udp6") },
});

// Single-stack IPv4 only
const ipv4Client = new Client({
	[AddressType.IPv4]: { socket: createSocket("udp4") },
});
```

---

### client.open(isBootstrapping?)

Opens the DICE client and establishes network connectivity.

This method performs several critical operations:

1. Initializes IPv4/IPv6 overlays based on provided sockets
2. Discovers external IP addresses through peer reflection
3. Bootstraps coordinator lists from the network (if enabled)
4. Starts health check intervals to maintain peer pools
5. Emits 'open' event when ready

After calling this method, the client will automatically:

- Maintain pools of coordinator peers for NAT traversal
- Keep external address information up-to-date
- Handle incoming messages and connectivity requests

**Parameters:**

- `isBootstrapping` (boolean, optional) - Whether to discover coordinators from bootstrap nodes (default: true). Set to false when running your own bootstrap node.

**Returns:** Promise that resolves when the client is fully operational and ready to send/receive

**Example:**

```typescript
await client.open();
console.log("Client ready at:", client.diceAddress.toString());

// Listen for address updates
client.events.on("diceAddress", (address) => {
	console.log("Address updated:", address.toString());
});
```

---

### client.send(diceAddress, buffer, addressType?, options?)

Sends a message to another peer via their DICE address.

This is the primary method for peer-to-peer communication. It handles:

- Automatic NAT traversal using coordinators from the target address
- Dual-stack connectivity (prefers IPv6, falls back to IPv4)
- Connection establishment for first-time peers
- Direct UDP delivery once connectivity is established

The method will coordinate with the target's embedded coordinator peers to establish direct connectivity if needed. Once a direct connection exists, messages are sent via UDP without coordination overhead.

**Parameters:**

- `diceAddress` - Target peer's DICE address (obtained from them out-of-band)
- `buffer` - Message payload as Uint8Array (use TextEncoder for strings)
- `addressType` (optional) - Force specific stack (AddressType.IPv4 or IPv6)
- `options` (optional) - Configuration
    - `timeoutMs` - Timeout for send operation in milliseconds
    - `retryCount` - Number of retry attempts on failure

**Returns:** Promise that resolves when message is successfully sent

**Throws:** DiceError when send fails after retries or no valid overlays available

**Examples:**

```typescript
// Send a text message
const message = new TextEncoder().encode("Hello, peer!");
await client.send(targetAddress, message);

// Send binary data
const data = new Uint8Array([1, 2, 3, 4]);
await client.send(targetAddress, data);

// Force IPv4 with custom timeout
await client.send(targetAddress, message, AddressType.IPv4, {
	timeoutMs: 5000,
	retryCount: 3,
});
```

---

### client.diceAddress

The current DICE address of this client.

This address is a self-contained connectivity descriptor that includes:

- External IPv4/IPv6 addresses and ports
- Coordinator peer addresses for NAT traversal coordination
- All information needed for other peers to contact you

The address format is: `dice://[ipv6]:[port]/[coordinators]/[ipv4]:[port]/[coordinators]`

Share this address with other peers (via your application's signaling mechanism) to enable them to send messages to you. The address updates automatically when:

- External IP addresses are discovered or change
- Coordinator lists are updated
- Network conditions change

Listen to the 'diceAddress' event to be notified of updates.

**Returns:** Your current DICE address

**Example:**

```typescript
await client.open();

// Get the address
const myAddress = client.diceAddress;
console.log("Share this:", myAddress.toString());

// Listen for updates
client.events.on("diceAddress", (updatedAddress) => {
	console.log("Address changed:", updatedAddress.toString());
	// Share the new address with peers
});
```

---

### client.events

Event emitter for client lifecycle and network events.

**Available Events:**

- `open` - Emitted when client successfully opens and is ready to send/receive
- `close` - Emitted when client closes and all connections are terminated
- `diceAddress` - Emitted when the DICE address changes (external IP discovered, coordinators updated)
- `message` - Emitted when receiving application-layer messages from other peers
- `error` - Emitted when errors occur during network operations

**Example:**

```typescript
client.events.on("open", () => {
	console.log("Client ready");
});

client.events.on("diceAddress", (diceAddress) => {
	console.log("My Dice address:", diceAddress.toString());
});

client.events.on("message", (message, remoteInfo) => {
	console.log("Received:", message);
});
```

## Development

```bash
# Install dependencies
npm install

# Type check
npm run check

# Run tests
npm run unit
npm run integration

# Build
npm run build
```

## License

ISC
