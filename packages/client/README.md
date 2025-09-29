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

DICE multiplexes on the same port your p2p application is running on, provides you with a publicly reachable DICE address, and facilitates sending to others' DICE addresses. With standard addresses around 20% of peers are publicly reachable, with DICE addresses this grows to around 80%.

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
import { Client, AddressType } from '@xkore/dice';

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

// Send message to another DICE address
await diceClient.send(targetAddress, message);

// Clean shutdown
await diceClient.close();
```

## API Documentation

<!-- API_START -->
<!-- This section is auto-generated from TypeDoc comments - do not edit manually -->

## Client

[**@xkore/dice**](../README.md)

***

[@xkore/dice](../README.md) / Client



Defined in: [packages/client/src/models/Client/index.ts:17](https://github.com/visionsofparadise/dice/blob/0c3f0caa1da797c66fef401dca16ce82c9f61f5b/packages/client/src/models/Client/index.ts#L17)

DICE Client for peer-to-peer networking without infrastructure dependencies.

Manages dual-stack IPv4/IPv6 overlays and provides a high-level interface for:
- Generating your own DICE addresses
- Sending messages to others' DICE addresses
- Automatic NAT traversal and connectivity handling

## Example

```typescript
const client = new Client({
  [AddressType.IPv4]: { socket: ipv4Socket },
  [AddressType.IPv6]: { socket: ipv6Socket }
});

await client.open();
console.log("My address:", client.diceAddress.toString());

client.on("diceaddress", (diceaddress) => {
  console.log(diceAddress.toString());
});

await client.send(targetAddress, messageBuffer);
```

## Constructors

### Constructor

> **new Client**(`options?`): `Client`

Defined in: [packages/client/src/models/Client/index.ts:87](https://github.com/visionsofparadise/dice/blob/0c3f0caa1da797c66fef401dca16ce82c9f61f5b/packages/client/src/models/Client/index.ts#L87)

Creates a new DICE client.

#### Parameters

##### options?

`Partial`\<`Options`\>

Configuration including sockets and networking parameters

#### Returns

`Client`

## Properties

### close()

> **close**: (...`args`) => `void`

Defined in: [packages/client/src/models/Client/index.ts:124](https://github.com/visionsofparadise/dice/blob/0c3f0caa1da797c66fef401dca16ce82c9f61f5b/packages/client/src/models/Client/index.ts#L124)

Closes the DICE client and all underlying network connections.

Gracefully shuts down both IPv4 and IPv6 overlays, stops healthcheck timers,
and emits the 'close' event when complete.

#### Parameters

##### args

...\[\]

#### Returns

`void`

***

### open()

> **open**: (...`args`) => `Promise`

Defined in: [packages/client/src/models/Client/index.ts:136](https://github.com/visionsofparadise/dice/blob/0c3f0caa1da797c66fef401dca16ce82c9f61f5b/packages/client/src/models/Client/index.ts#L136)

Opens the DICE client and begins peer discovery.

Initializes both IPv4 and IPv6 overlays, begins healthcheck cycles,
and starts discovering coordinators from bootstrap peers.
Emits 'open' event when ready to send/receive messages.

#### Parameters

##### args

...\[`boolean`\]

#### Returns

`Promise`

Promise that resolves when client is fully operational

***

### requestBind()

> **requestBind**: (...`args`) => `Promise`

Defined in: [packages/client/src/models/Client/index.ts:149](https://github.com/visionsofparadise/dice/blob/0c3f0caa1da797c66fef401dca16ce82c9f61f5b/packages/client/src/models/Client/index.ts#L149)

Requests NAT traversal coordination for a target endpoint.

Used internally when sending to peers behind NATs. Coordinates with
the target's coordinator peers to establish direct connectivity.

#### Parameters

##### args

...\[`DiceAddress`, `AddressType`\]

#### Returns

`Promise`

Promise that resolves when coordination is complete

#### Throws

When unable to request bind (no coordinators or overlays)

***

### send()

> **send**: (...`args`) => `Promise`

Defined in: [packages/client/src/models/Client/index.ts:170](https://github.com/visionsofparadise/dice/blob/0c3f0caa1da797c66fef401dca16ce82c9f61f5b/packages/client/src/models/Client/index.ts#L170)

Sends a message directly to another DICE address.

Automatically handles NAT traversal if needed by coordinating with
coordinator peers embedded in the target address. Prefers IPv6, falls back to IPv4.

#### Parameters

##### args

...\[`DiceAddress`, `Uint8Array`\<`ArrayBufferLike`\>, `AddressType`, `SendOverlayOptions`\]

#### Returns

`Promise`

Promise that resolves when message is sent

#### Example

```typescript
const message = new TextEncoder().encode("Hello, peer!");

await client.send(targetAddress, message);
```

## Accessors

### diceAddress

#### Get Signature

> **get** **diceAddress**(): `DiceAddress`

Defined in: [packages/client/src/models/Client/index.ts:196](https://github.com/visionsofparadise/dice/blob/0c3f0caa1da797c66fef401dca16ce82c9f61f5b/packages/client/src/models/Client/index.ts#L196)

The current DICE address.

The DICE address embeds connectivity information including external IP addresses
and coordinator lists for NAT traversal. This address can be shared with other
peers to enable direct messaging.

Address format: `dice://[ipv6]:[port]/[coordinators]/[ipv4]:[port]/[coordinators]`

##### Returns

`DiceAddress`

DiceAddress

## Overlay

[**@xkore/dice**](../README.md)

***

[@xkore/dice](../README.md) / Overlay



Defined in: [packages/client/src/models/Overlay/index.ts:35](https://github.com/visionsofparadise/dice/blob/0c3f0caa1da797c66fef401dca16ce82c9f61f5b/packages/client/src/models/Overlay/index.ts#L35)

Single-stack overlay network for DICE protocol implementation.

Manages peer discovery, NAT traversal, and direct UDP messaging for either
IPv4 or IPv6. Maintains pools of coordinator and candidate peers, handles
external address detection through reflection, and coordinates hole punching
for NAT traversal.

## Example

```typescript
const overlay = new Overlay({
  socket,
  bootstrapAddresses: BOOTSTRAP_ADDRESS[AddressType.IPv4]
});

await overlay.open();
console.log("External address:", overlay.external?.toString());
```

## Constructors

### Constructor

> **new Overlay**(`options`): `Overlay`

Defined in: [packages/client/src/models/Overlay/index.ts:119](https://github.com/visionsofparadise/dice/blob/0c3f0caa1da797c66fef401dca16ce82c9f61f5b/packages/client/src/models/Overlay/index.ts#L119)

Creates a new overlay network instance.

#### Parameters

##### options

`RequiredProperties`\<`Options`, `"socket"`\>

Configuration including socket and networking parameters

#### Returns

`Overlay`

## Properties

### close()

> **close**: (...`args`) => `void`

Defined in: [packages/client/src/models/Overlay/index.ts:157](https://github.com/visionsofparadise/dice/blob/0c3f0caa1da797c66fef401dca16ce82c9f61f5b/packages/client/src/models/Overlay/index.ts#L157)

Closes an overlay network and cleans up resources.

Stops healthcheck intervals, removes socket listeners, aborts pending
response listeners, and emits the 'close' event.

#### Parameters

##### args

...\[\]

#### Returns

`void`

***

### healthcheck()

> **healthcheck**: (...`args`) => `Promise`

Defined in: [packages/client/src/models/Overlay/index.ts:165](https://github.com/visionsofparadise/dice/blob/0c3f0caa1da797c66fef401dca16ce82c9f61f5b/packages/client/src/models/Overlay/index.ts#L165)

Runs candidate and coordinator health checks in parallel to verify
connectivity and remove dead peers.

#### Parameters

##### args

...\[\]

#### Returns

`Promise`

Promise that resolves when health check cycle completes

***

### open()

> **open**: (...`args`) => `Promise`

Defined in: [packages/client/src/models/Overlay/index.ts:180](https://github.com/visionsofparadise/dice/blob/0c3f0caa1da797c66fef401dca16ce82c9f61f5b/packages/client/src/models/Overlay/index.ts#L180)

Opens an overlay network and begins peer discovery.

Sets up socket listeners, starts healthcheck intervals, and optionally
bootstraps from the network by discovering initial coordinators.

#### Parameters

##### args

...\[`boolean`\]

#### Returns

`Promise`

Promise that resolves when overlay is operational

***

### send()

> **send**: (...`args`) => `Promise`

Defined in: [packages/client/src/models/Overlay/index.ts:190](https://github.com/visionsofparadise/dice/blob/0c3f0caa1da797c66fef401dca16ce82c9f61f5b/packages/client/src/models/Overlay/index.ts#L190)

Sends a UDP message to a specific network address.

#### Parameters

##### args

...\[`Ipv4Address` \| `Ipv6Address`, `Uint8Array`\<`ArrayBufferLike`\>, `SendOverlayOptions`\]

#### Returns

`Promise`

Promise that resolves when message is sent (or retries exhausted)

***

### findAddresses()

> **findAddresses**: (...`args`) => `Promise`

Defined in: [packages/client/src/models/Overlay/index.ts:199](https://github.com/visionsofparadise/dice/blob/0c3f0caa1da797c66fef401dca16ce82c9f61f5b/packages/client/src/models/Overlay/index.ts#L199)

Discovers new coordinator addresses through iterative network exploration.

#### Parameters

##### args

...\[`number`, `Set`\<`string`\>\]

#### Returns

`Promise`

Promise resolving to array of discovered addresses, sorted by latency

***

### handleAddress()

> **handleAddress**: (...`args`) => `void`

Defined in: [packages/client/src/models/Overlay/index.ts:213](https://github.com/visionsofparadise/dice/blob/0c3f0caa1da797c66fef401dca16ce82c9f61f5b/packages/client/src/models/Overlay/index.ts#L213)

Handles several critical functions:
- Updates reachability status when receiving unsolicited messages
- Manages NAT binding cache for successful connections
- Adds/removes peers from candidate pool based on connectivity flags
- Enforces candidate pool size limits with FIFO eviction

#### Parameters

##### args

...\[`Ipv4Address` \| `Ipv6Address`, `Message`\<`MessageBodyType`\>\]

#### Returns

`void`

***

### handleReflection()

> **handleReflection**: (...`args`) => `void`

Defined in: [packages/client/src/models/Overlay/index.ts:227](https://github.com/visionsofparadise/dice/blob/0c3f0caa1da797c66fef401dca16ce82c9f61f5b/packages/client/src/models/Overlay/index.ts#L227)

Processes external address reflections to detect NAT type and external IP.

#### Parameters

##### args

...\[`Ipv4Address` \| `Ipv6Address`, `Ipv4Address` \| `Ipv6Address`\]

#### Returns

`void`

***

### list()

> **list**: (...`args`) => `Promise`

Defined in: [packages/client/src/models/Overlay/index.ts:240](https://github.com/visionsofparadise/dice/blob/0c3f0caa1da797c66fef401dca16ce82c9f61f5b/packages/client/src/models/Overlay/index.ts#L240)

Requests a list of known addresses from a peer.

#### Parameters

##### args

...\[`Ipv4Address` \| `Ipv6Address`, `Partial`\<`ListBody`\>, `AwaitOverlayResponseOptions` & `SendOverlayOptions`\]

#### Returns

`Promise`

Promise resolving to array of addresses from the peer

#### Throws

When request times out or peer doesn't respond

***

### noop()

> **noop**: (...`args`) => `Promise`

Defined in: [packages/client/src/models/Overlay/index.ts:248](https://github.com/visionsofparadise/dice/blob/0c3f0caa1da797c66fef401dca16ce82c9f61f5b/packages/client/src/models/Overlay/index.ts#L248)

Sends a no-operation message to create NAT binding.

#### Parameters

##### args

...\[`Ipv4Address` \| `Ipv6Address`\]

#### Returns

`Promise`

Promise that resolves when noop is sent

***

### ping()

> **ping**: (...`args`) => `Promise`

Defined in: [packages/client/src/models/Overlay/index.ts:259](https://github.com/visionsofparadise/dice/blob/0c3f0caa1da797c66fef401dca16ce82c9f61f5b/packages/client/src/models/Overlay/index.ts#L259)

Sends a ping message and waits for a pong response.

#### Parameters

##### args

...\[`Ipv4Address` \| `Ipv6Address`, `Partial`\<`PingBody`\>, `AwaitOverlayResponseOptions` & `SendOverlayOptions`\]

#### Returns

`Promise`

Promise that resolves when pong is received

#### Throws

When ping times out or target is unreachable

***

### requestBind()

> **requestBind**: (...`args`) => `Promise`

Defined in: [packages/client/src/models/Overlay/index.ts:278](https://github.com/visionsofparadise/dice/blob/0c3f0caa1da797c66fef401dca16ce82c9f61f5b/packages/client/src/models/Overlay/index.ts#L278)

Requests NAT traversal coordination through relay peers.

Implements the DICE hole punching protocol by:
1. Sending a noop to create outbound NAT binding
2. Requesting coordinators to signal the target peer
3. Waiting for the target to initiate contact using our NAT binding

This enables direct connectivity between peers behind different NATs.

#### Parameters

##### args

...\[`Ipv4Address` \| `Ipv6Address`, (`Ipv4Address` \| `Ipv6Address`)[], `Partial`\<`RelayBindRequestBody`\>, `AwaitOverlayResponseOptions` & `SendOverlayOptions`\]

#### Returns

`Promise`

Promise that resolves when direct connectivity is established

#### Throws

When no coordinators available or bind fails

<!-- API_END -->

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

# Generate documentation
npm run docs
```

## License

ISC
