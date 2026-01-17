import type EventEmitter from "events";

export type EventEmitterOptions = NonNullable<ConstructorParameters<typeof EventEmitter>[0]>;
