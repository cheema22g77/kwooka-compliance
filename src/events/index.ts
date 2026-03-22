// ============================================================================
// RING 3: EVENTS — Barrel Export
// ============================================================================
export * from "./types";
export { EventBus, eventBus, createEvent, type DeadLetterEntry } from "./bus";
export { registerHandlers } from "./handlers";
