# DICE (@xkore/dice)

## Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Events](#events)
- [Development](#development)

**DICE (Distributed Interactive Connectivity Establishment)** is a NAT traversal transport layer that wraps your UDP traffic to establish direct peer-to-peer connections without centralized infrastructure.

## Overview

DICE handles NAT traversal for UDP-based peer-to-peer applications:

- **External address discovery** via peer reflection
- **NAT/Firewall detection** (symmetric NAT, public reachability)
- **UDP hole punching** to establish direct connections
- **Coordinator discovery** from your application traffic
- **Dual-stack support** (IPv4 and IPv6)

With standard UDP addresses, ~20% of peers are publicly reachable. DICE achieves 50-95% direct connectivity depending on region and network conditions.

## DICE Addresses

DICE addresses are self-contained connectivity descriptors:

```
dice://[ipv6]:[port]/[coordinators]/[ipv4]:[port]/[coordinators]
```

They contain:
- Your external IPv4/IPv6 addresses and ports
- Coordinator peers who help establish NAT bindings
- Everything needed for peers to connect to you

## Installation

```bash
npm install @xkore/dice
```

## Quick Start

```typescript
import { createSocket } from "dgram";
import { Stack, AddressType, DiceAddress } from "@xkore/dice";

// Create UDP sockets
const ipv6Socket = createSocket("udp6");
const ipv4Socket = createSocket("udp4");

// Create DICE stack
const stack = new Stack({
  [AddressType.IPv6]: {
    socket: ipv6Socket,
    bootstrapAddresses: [], // Initial peers for your network
  },
  [AddressType.IPv4]: {
    socket: ipv4Socket,
    bootstrapAddresses: [],
  },
});

// Open stack
await stack.open();

// Get your DICE address to share with peers
const myAddress = stack.diceAddress;
console.log("My address:", myAddress.toString());

// Listen for incoming messages
stack.events.on("message", (payload, context) => {
  console.log("Received from:", context.remoteAddress.toString());
  console.log("Data:", new TextDecoder().decode(payload));
});

// Listen for address updates
stack.events.on("diceAddress", (address) => {
  console.log("Address updated:", address.toString());
  // Share updated address with your peers
});

// Listen for coordinator depletion
stack.events.on("coordinatorPoolDepleted", () => {
  // Send messages to known peers to discover new coordinators
});

// Send to a peer
const peerAddress = DiceAddress.fromString("dice://...");
const message = new TextEncoder().encode("Hello!");
await stack.send(peerAddress, message);

// Clean shutdown
stack.close();
```

## Architecture

### Core Components

**Envelope**: Transport format wrapping all UDP traffic
- Magic bytes identify DICE traffic: `0xdd11cc33`
- Contains optional reflection metadata for address discovery
- Wraps both DICE control messages and application payloads
- 6-24 byte overhead per packet

**Message**: DICE control protocol
- `NOOP` - Creates NAT binding
- `PING/PONG` - Reachability testing with reflection
- `RELAY_BIND_REQUEST` - Request coordinator assistance
- `BIND_REQUEST` - Coordinator signals target peer
- `BIND` - Confirms NAT binding established

**Layer**: Single-stack UDP wrapper (IPv4 or IPv6)
- Manages one UDP socket
- Parses Envelopes and manages NAT bindings
- Discovers coordinators from network traffic
- Emits events: buffer → envelope → message/diceMessage

**Stack**: Multi-stack aggregator
- Manages both IPv4 and IPv6 layers
- Aggregates events from all layers
- Primary API for applications
- Generates and updates DiceAddress

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

- Tracks unsolicited traffic (from peers without cached bindings)
- If unsolicited traffic received within 60 seconds: publicly reachable
- Public peers remove coordinators from their DiceAddress
- Emits events when reachability status changes

### NAT Traversal Flow

1. Application sends to peer B
2. DICE wraps message in Envelope, sends NOOP to B
3. If no direct connection: sends RELAY_BIND_REQUEST to B's coordinators
4. Coordinator forwards BIND_REQUEST to B
5. B creates binding (NOOP) and confirms (BIND)
6. Direct connection established, cached for 20-25 seconds
7. Application messages flow directly via UDP

## API Documentation

### Stack Constructor

Creates a DICE stack for NAT traversal. Manages dual-stack IPv4/IPv6 layers.

**Parameters:**

- `options` - Configuration
  - `[AddressType.IPv4]` - IPv4 layer configuration
    - `socket` - UDP socket from `dgram.createSocket("udp4")`
    - `bootstrapAddresses` - Array of initial peer addresses
    - `excludeFromCoordinators` - Set of address keys to exclude
    - `isAddressValidationDisabled` - Disable validation (testing only)
    - `isPrefixFilteringDisabled` - Disable prefix filtering (testing only)
  - `[AddressType.IPv6]` - IPv6 layer configuration (same options)
  - `cacheSize` - Max NAT binding cache entries (default: 10000)
  - `coordinatorCount` - Max coordinators per layer (default: 9)
  - `healthcheckIntervalMs` - Health check interval (default: 60000)
  - `logger` - Optional logger for debugging

**Example:**

```typescript
import { createSocket } from "dgram";
import { Stack, AddressType, Ipv4Address } from "@xkore/dice";

const bootstrapPeers = [
  new Ipv4Address({ ip: new Uint8Array([1, 2, 3, 4]), port: 8080 }),
];

const stack = new Stack({
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

### stack.open()

Opens the stack and starts NAT traversal operations.

This method:
1. Opens all configured layers (IPv4/IPv6)
2. Sets up event forwarding from layers to stack
3. Starts healthcheck intervals
4. Emits 'open' event when ready

Send messages to bootstrap peers after opening to discover coordinators.

**Returns:** Promise that resolves when stack is operational

**Example:**

```typescript
await stack.open();
console.log("Stack ready");
console.log("Address:", stack.diceAddress.toString());
```

---

### stack.send(diceAddress, buffer, addressType?, options?)

Sends application payload to peer via DICE address.

Handles:
- Envelope wrapping
- Automatic NAT traversal via coordinators
- Dual-stack (prefers IPv6, falls back to IPv4)
- Connection establishment

**Parameters:**

- `diceAddress` - Target peer's DICE address
- `buffer` - Application payload as Uint8Array
- `addressType` - Optional: force IPv4 or IPv6
- `options` - Optional send options

**Returns:** Promise that resolves when sent

**Example:**

```typescript
import { DiceAddress } from "@xkore/dice";

const peerAddress = DiceAddress.fromString("dice://...");
const message = new TextEncoder().encode("Hello peer!");

await stack.send(peerAddress, message);
```

---

### stack.diceAddress

Your current DICE address. Share this with peers through your application's signaling.

The address updates when:
- External addresses are discovered
- Coordinator pool changes
- Public reachability status changes

Listen to `diceAddress` event for updates.

**Returns:** DiceAddress object

**Example:**

```typescript
const myAddress = stack.diceAddress;
console.log("Share this:", myAddress.toString());

stack.events.on("diceAddress", (updated) => {
  console.log("Address changed:", updated.toString());
});
```

---

### stack.close()

Closes the stack and all layers. Stops health checks and cleans up resources.

**Example:**

```typescript
stack.close();
```

---

## Events

### Stack Events

**buffer**: `(buffer: Uint8Array, remoteInfo: RemoteInfo) => void`
- Raw UDP packet received before Envelope parsing

**envelope**: `(envelope: Envelope, context: Layer.Context) => void`
- Envelope parsed successfully

**message**: `(payload: Uint8Array, context: Layer.Context) => void`
- Application payload received (listen to this for your data)
- Payload is raw Uint8Array, decode as needed

**diceMessage**: `(message: Message, context: Layer.Context) => void`
- DICE control message received (PING, PONG, BIND, etc)
- Useful for debugging

**diceAddress**: `(address: DiceAddress) => void`
- Your DICE address changed
- Share updated address with peers

**coordinatorPoolDepleted**: `() => void`
- Coordinator pool empty
- Send messages to known peers to discover coordinators

**open**: `() => void`
- Stack opened successfully

**close**: `() => void`
- Stack closed

**error**: `(error: unknown) => void`
- Error occurred in DICE operations

### Layer Events

Layers emit the same events as Stack. Access individual layers for fine-grained control:

```typescript
const ipv4Layer = stack.layers[AddressType.IPv4];

ipv4Layer?.events.on("message", (payload, context) => {
  console.log("IPv4 message:", payload);
});
```

---

## Advanced Usage

### Excluding Coordinators

Prevent specific peers from becoming coordinators:

```typescript
const excludedPeer = "c0a8010150"; // address key

const stack = new Stack({
  [AddressType.IPv4]: {
    socket: ipv4Socket,
    bootstrapAddresses: [],
    excludeFromCoordinators: new Set([excludedPeer]),
  },
});
```

### Accessing Layers

Direct access to IPv4/IPv6 layers:

```typescript
const ipv4Layer = stack.layers[AddressType.IPv4];
const ipv6Layer = stack.layers[AddressType.IPv6];

// Check external addresses
console.log("IPv4 external:", ipv4Layer?.external?.toString());
console.log("IPv6 external:", ipv6Layer?.external?.toString());

// Check public reachability
console.log("Public?", ipv4Layer?.isPublic);

// Get coordinators
const coordinators = ipv4Layer?.coordinators.getAll();
```

### Working with Addresses

```typescript
import {
  DiceAddress,
  Ipv4Address,
  Ipv6Address,
  Address
} from "@xkore/dice";

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

- **Best** (85-95%): Japan, Korea, Western Europe
- **Moderate** (70-85%): USA/Canada, UK
- **Challenging** (50-70%): India, mobile networks, CGNAT-heavy regions

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
