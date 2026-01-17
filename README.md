# DICE (@xkore/dice)

## Contents

-   [Installation](#installation)
-   [Quick Start](#quick-start)
-   [Architecture](#architecture)
-   [API Documentation](#api-documentation)
-   [Events](#events)
-   [Development](#development)

**DICE (Distributed Interactive Connectivity Establishment)** is a NAT traversal transport layer that wraps your UDP traffic to establish direct peer-to-peer connections without centralized infrastructure.

## Overview

DICE handles NAT traversal for UDP-based peer-to-peer applications:

-   **External address discovery** via peer reflection
-   **NAT/Firewall detection** (symmetric NAT, public reachability)
-   **UDP hole punching** to establish direct connections
-   **Coordinator discovery** from your application traffic
-   **Dual-stack support** (IPv4 and IPv6)

With standard UDP addresses, ~20% of peers are publicly reachable. DICE achieves 50-95% direct connectivity depending on region and network conditions.

## DICE Addresses

DICE addresses are self-contained connectivity descriptors:

```
dice://[ipv6]:[port]/[coordinators]/[ipv4]:[port]/[coordinators]
```

They contain:

-   Your external IPv4/IPv6 addresses and ports
-   Coordinator peers who help establish NAT bindings
-   Everything needed for peers to connect to you

## Installation

```bash
npm install @xkore/dice
```

## Quick Start

```typescript
import { createSocket } from "dgram";
import { Client, AddressType, DiceAddress } from "@xkore/dice";

// Create UDP sockets
const ipv6Socket = createSocket("udp6");
const ipv4Socket = createSocket("udp4");

// Create DICE client
const client = new Client({
	[AddressType.IPv6]: {
		socket: ipv6Socket,
		bootstrapAddresses: [], // Initial peers for your network
	},
	[AddressType.IPv4]: {
		socket: ipv4Socket,
		bootstrapAddresses: [],
	},
});

// Open client
await client.open();

// Get your DICE address to share with peers
const myAddress = client.diceAddress;
console.log("My address:", myAddress.toString());

// Listen for incoming messages
client.events.on("message", (payload, context) => {
	console.log("Received from:", context.remoteAddress.toString());
	console.log("Data:", new TextDecoder().decode(payload));
});

// Listen for address updates
client.events.on("diceAddress", (address) => {
	console.log("Address updated:", address.toString());
	// Share updated address with your peers
});

// Listen for coordinator depletion
client.events.on("depleted", () => {
	// Send messages to known peers to discover new coordinators
});

// Send to a peer
const peerAddress = DiceAddress.fromString("dice://...");
const message = new TextEncoder().encode("Hello!");
await client.send(peerAddress, message);

// Clean shutdown
client.close();
```

## Architecture

### Core Components

**Envelope**: Transport format wrapping all UDP traffic

-   Magic bytes identify DICE traffic: `0xdd11cc33`
-   Contains optional reflection metadata for address discovery
-   Wraps both DICE control messages and application payloads
-   6-24 byte overhead per packet

**Message**: DICE control protocol

-   `NOOP` - Creates NAT binding
-   `PING/PONG` - Reachability testing with reflection
-   `RELAY_BIND_REQUEST` - Request coordinator assistance
-   `BIND_REQUEST` - Coordinator signals target peer
-   `BIND` - Confirms NAT binding established

**UdpTransport**: UDP transport abstraction

-   Wraps one UDP socket
-   Handles Envelope wrapping and parsing
-   Manages send/receive with retry logic
-   Emits events at each stage: buffer → envelope → message/diceMessage

**AddressTracker**: External address and reachability management

-   Processes reflections from peers to determine external address
-   Detects NAT type (symmetric, cone, public)
-   Tracks public reachability via unsolicited messages
-   Emits events on address/status changes

**BindingCache**: NAT binding tracking

-   Caches successful peer connections (inbound/outbound)
-   Auto-establishes bindings from udpTransport events
-   TTL-based expiration (25s inbound, 20s outbound)
-   Determines if direct connectivity exists

**PendingRequests**: Request/response matching

-   Matches responses to pending requests by transaction ID
-   Handles timeouts and abort signals
-   Lives on UdpTransport for transport-level correlation

**Coordinators**: Coordinator pool management

-   Maintains pool of relay peers (max 9)
-   Periodic health checks remove dead peers
-   Emits events when pool depleted

**IpChannel**: Single address family protocol coordinator (IPv4 or IPv6)

-   Orchestrates UdpTransport, AddressTracker, BindingCache, Coordinators
-   Routes DICE control messages (PING, BIND, etc.)
-   Discovers coordinators from network traffic
-   Manages NAT traversal flow

**Client**: Multi-stack aggregator

-   Manages both IPv4 and IPv6 IpChannels
-   Aggregates events from all IpChannels
-   Primary API for applications
-   Generates and updates DiceAddress

### Event Flow

```
UDP packet received
  ↓
buffer event (raw bytes)
  ↓
Parse Envelope → envelope event
  ↓
Check payload magic bytes
  ↓
├─ DICE control → diceMessage event
└─ Application data → message event
```

### Coordinator Discovery

DICE discovers coordinators from your network traffic:

1. Your application sends messages to peers
2. DICE wraps traffic in Envelopes with reflection metadata
3. When receiving from a peer without existing NAT binding:
    - Tests reachability with PING
    - Adds successful peers to coordinator pool (max 9)
4. Coordinators assist with NAT traversal to new peers

Configure `excludeFromCoordinators` to prevent specific peers from becoming coordinators.

### Public Detection

DICE detects when you're publicly reachable:

-   Tracks unsolicited traffic (from peers without cached bindings)
-   If unsolicited traffic received within 60 seconds: publicly reachable
-   Public peers remove coordinators from their DiceAddress
-   Emits events when reachability status changes

### NAT Traversal Flow

1. Application sends to peer B
2. DICE wraps message in Envelope, sends NOOP to B
3. If no direct connection: sends RELAY_BIND_REQUEST to B's coordinators
4. Coordinator forwards BIND_REQUEST to B
5. B creates binding (NOOP) and confirms (BIND)
6. Direct connection established, cached for 20-25 seconds
7. Application messages flow directly via UDP

## API Documentation

### Client Constructor

Creates a DICE client for NAT traversal. Manages dual-stack IPv4/IPv6 IpChannels.

**Parameters:**

-   `options` - Configuration
    -   `[AddressType.IPv4]` - IPv4 IpChannel configuration
        -   `socket` - UDP socket from `dgram.createSocket("udp4")`
        -   `bootstrapAddresses` - Array of initial peer addresses
        -   `excludeFromCoordinators` - Set of address keys to exclude
        -   `isAddressValidationDisabled` - Disable validation (testing only)
        -   `isPrefixFilteringDisabled` - Disable prefix filtering (testing only)
    -   `[AddressType.IPv6]` - IPv6 IpChannel configuration (same options)
    -   `cacheSize` - Max NAT binding cache entries (default: 10000)
    -   `coordinatorCount` - Max coordinators per IpChannel (default: 9)
    -   `healthcheckIntervalMs` - Health check interval (default: 60000)
    -   `logger` - Optional logger for debugging

**Example:**

```typescript
import { createSocket } from "dgram";
import { Client, AddressType, Ipv4Address } from "@xkore/dice";

const bootstrapPeers = [new Ipv4Address({ ip: new Uint8Array([1, 2, 3, 4]), port: 8080 })];

const client = new Client({
	[AddressType.IPv4]: {
		socket: createSocket("udp4"),
		bootstrapAddresses: bootstrapPeers,
	},
	[AddressType.IPv6]: {
		socket: createSocket("udp6"),
		bootstrapAddresses: [],
	},
});
```

---

### client.open()

Opens the client and starts NAT traversal operations.

This method:

1. Opens all configured IpChannels (IPv4/IPv6)
2. Sets up event forwarding from IpChannels to client
3. Starts healthcheck intervals
4. Emits 'open' event when ready

Send messages to bootstrap peers after opening to discover coordinators.

**Returns:** Promise that resolves when client is operational

**Example:**

```typescript
await client.open();
console.log("Client ready");
console.log("Address:", client.diceAddress.toString());
```

---

### client.send(diceAddress, buffer, addressType?, options?)

Sends application payload to peer via DICE address.

Handles:

-   Envelope wrapping
-   Automatic NAT traversal via coordinators
-   Dual-stack (prefers IPv6, falls back to IPv4)
-   Connection establishment

**Parameters:**

-   `diceAddress` - Target peer's DICE address
-   `buffer` - Application payload as Uint8Array
-   `addressType` - Optional: force IPv4 or IPv6
-   `options` - Optional send options

**Returns:** Promise that resolves when sent

**Example:**

```typescript
import { DiceAddress } from "@xkore/dice";

const peerAddress = DiceAddress.fromString("dice://...");
const message = new TextEncoder().encode("Hello peer!");

await client.send(peerAddress, message);
```

---

### client.diceAddress

Your current DICE address. Share this with peers through your application's signaling.

The address updates when:

-   External addresses are discovered
-   Coordinator pool changes
-   Public reachability status changes

Listen to `diceAddress` event for updates.

**Returns:** DiceAddress object

**Example:**

```typescript
const myAddress = client.diceAddress;
console.log("Share this:", myAddress.toString());

client.events.on("diceAddress", (updated) => {
	console.log("Address changed:", updated.toString());
});
```

---

### client.close()

Closes the client and all IpChannels. Stops health checks and cleans up resources.

**Example:**

```typescript
client.close();
```

---

## Events

### Client Events

**buffer**: `(buffer: Uint8Array, remoteInfo: RemoteInfo) => void`

-   Raw UDP packet received before Envelope parsing

**envelope**: `(envelope: Envelope, context: IpChannel.Context) => void`

-   Envelope parsed successfully

**message**: `(payload: Uint8Array, context: IpChannel.Context) => void`

-   Application payload received (listen to this for your data)
-   Payload is raw Uint8Array, decode as needed

**diceMessage**: `(message: Message, context: IpChannel.Context) => void`

-   DICE control message received (PING, PONG, BIND, etc)
-   Useful for debugging

**diceAddress**: `(address: DiceAddress) => void`

-   Your DICE address changed
-   Share updated address with peers

**depleted**: `() => void`

-   Coordinator pool empty
-   Send messages to known peers to discover coordinators

**open**: `() => void`

-   Client opened successfully

**close**: `() => void`

-   Client closed

**error**: `(error: unknown) => void`

-   Error occurred in DICE operations

### IpChannel Events

IpChannels emit the same events as Client. Access individual IpChannels for fine-grained control:

```typescript
const ipv4Channel = client.ipChannels[AddressType.IPv4];

ipv4Channel?.events.on("message", (payload, context) => {
	console.log("IPv4 message:", payload);
});
```

---

## Advanced Usage

### Excluding Coordinators

Prevent specific peers from becoming coordinators:

```typescript
const excludedPeer = "c0a8010150"; // address key

const client = new Client({
	[AddressType.IPv4]: {
		socket: ipv4Socket,
		bootstrapAddresses: [],
		excludeFromCoordinators: new Set([excludedPeer]),
	},
});
```

### Accessing IpChannels

Direct access to IPv4/IPv6 IpChannels:

```typescript
const ipv4Channel = client.ipChannels[AddressType.IPv4];
const ipv6Channel = client.ipChannels[AddressType.IPv6];

// Check external addresses
console.log("IPv4 external:", ipv4Channel?.external?.toString());
console.log("IPv6 external:", ipv6Channel?.external?.toString());

// Check public reachability
console.log("Public?", ipv4Channel?.isPublic);

// Get coordinators
const coordinators = ipv4Channel?.coordinators.getAll();
```

### Working with Addresses

```typescript
import { DiceAddress, Ipv4Address, Ipv6Address, Address } from "@xkore/dice";

// Parse DICE address
const addr = DiceAddress.fromString("dice://...");

// Get components
const ipv4 = addr.ipv4Address;
const ipv6 = addr.ipv6Address;
const ipv4Coordinators = addr.ipv4Coordinators;
const ipv6Coordinators = addr.ipv6Coordinators;

// Create addresses
const ipv4Addr = new Ipv4Address({
	ip: new Uint8Array([192, 168, 1, 1]),
	port: 8080,
});

const ipv6Addr = new Ipv6Address({
	ip: new Uint8Array(16), // 16 bytes
	port: 8080,
});

// Address properties
console.log(ipv4Addr.key); // Hex key for maps
console.log(ipv4Addr.isPrivate); // Private IP check
console.log(ipv4Addr.toString()); // "192.168.1.1:8080"
```

---

## Regional Performance

Direct connectivity rates vary by region:

-   **Best** (85-95%): Japan, Korea, Western Europe
-   **Moderate** (70-85%): USA/Canada, UK
-   **Challenging** (50-70%): India, mobile networks, CGNAT-heavy regions

---

## Development

```bash
# Install dependencies
npm install

# Type check
npm run check

# Run tests
npm run unit        # Unit tests
npm run integration # Integration tests

# Build
npm run build
```

## License

ISC
