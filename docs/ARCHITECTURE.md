# ARCHITECTURE

Public `/`
  ↓
Zenthra AI `/ai`
  ↓
Gemini 2.5 Flash (AI API)
  ↓
AI Orchestrator
  ↓
Research Planner
  ↓
Tool Layer
  ├── Market
  ├── Futures
  ├── On-chain
  ├── Entities
  └── Context
  ↓
Normalization
  ↓
Evidence
  ↓
Conflict Detector
  ↓
Confluence Scoring
  ↓
Risk Engine
  ↓
Structured Result
  ↓
AI Explanation

Gemini 2.5 Flash is the orchestration/explanation layer, not the source of truth for raw data, scores or risk levels. Provider/model are configurable through environment variables.
