# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for the Charity Management System. ADRs are used to document important architectural decisions along with their context and consequences.

## ADR Format

Each ADR follows the standard format:
- **Title**: Short descriptive title
- **Status**: Proposed, Accepted, Deprecated, or Superseded
- **Context**: The situation that requires a decision
- **Decision**: The chosen solution
- **Consequences**: The positive and negative outcomes of the decision

## Current ADRs

| ADR | Title | Status |
|-----|-------|--------|
| [001](./001-monolith-to-microservices-readiness.md) | Monolith to Microservices Readiness | Accepted |
| [002](./002-websocket-vs-sse-for-realtime.md) | WebSocket vs SSE for Real-time Communication | Accepted |
| [003](./003-redis-vs-in-memory-caching.md) | Redis vs In-Memory Caching Strategy | Accepted |
| [004](./004-observability-stack-selection.md) | Observability Stack Selection | Accepted |
| [005](./005-rate-limiting-strategy.md) | Multi-tier Rate Limiting Strategy | Accepted |

## Template

Use the [ADR template](./adr-template.md) when creating new ADRs.

## Guidelines

1. **When to create an ADR**: When making significant architectural decisions that affect the system structure, technology choices, or operational aspects
2. **Keep it concise**: Focus on the decision, not implementation details
3. **Include context**: Explain why the decision was needed
4. **Document alternatives**: What other options were considered?
5. **Be honest about consequences**: Include both positive and negative outcomes