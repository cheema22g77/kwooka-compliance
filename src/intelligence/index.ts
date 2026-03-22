// ============================================================================
// INTELLIGENCE: Barrel Export
// ============================================================================
export { INTENTS, type CopilotIntent, type ComputedContext, type OrchestratorResult, type QualityMetrics } from "./types";
export { classifyIntent, classifyIntentLocal } from "./intent-classifier";
export { gatherContext, buildSystemPrompt } from "./context-gatherer";
export { QualityMonitor, qualityMonitor } from "./quality-monitor";
export { orchestrate, type OrchestratorInput } from "./orchestrator";
