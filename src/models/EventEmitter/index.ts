import EventEmitter from "events";

export type EventEmitterOptions<EventMap extends Record<keyof EventMap, any[]> | [never] = [never]> = NonNullable<ConstructorParameters<typeof EventEmitter<EventMap>>[0]>;
