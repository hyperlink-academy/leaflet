---
name: spec
description: Draft design documents and specs with research-informed questioning
disable-model-invocation: true
---

# Spec Writing

## When to Use

Use this skill when the user explicitly requests a spec, design document, or similar planning artifact. Do not auto-trigger for routine tasks.

## Process

### 1. Initial Scoping

When starting a spec:
- Ask the user for a brief description of what they want to build/change
- Reason about which question categories matter for this particular work—derive these from the problem, not a checklist

### 2. Interrogation Loop

Conduct open-ended questioning until the designer signals completion:

**Research-informed questions**: Before asking about an area, do just-in-time codebase research. Find relevant files, understand current patterns, identify constraints. Reference specific files and functions in questions when it adds clarity.

**Adaptive scope**: When the designer marks something as out of scope, update your mental model and don't revisit. However, flag when you believe there are gaps that could cause problems:
- "This approach assumes X—is that intentional?"
- "The current implementation of Y in `src/foo.ts:42` handles Z differently. Should we align or diverge?"

**Question style**:
- Ask one focused question at a time, or a small related cluster
- Ground questions in what you've learned from the codebase
- Avoid hypotheticals that don't apply to this codebase
- When presenting options, describe tradeoffs without recommending unless asked

### 3. Spec Writing

When the designer indicates readiness, produce the spec document.

## Output

Save to: `/specs/YYYY-MM-DD-short-name.md`

### Required Elements

**Title and status** (draft | approved | implemented)

**Goal**: What this achieves and why. 1-3 sentences.

**Design**: The substance of what will be built/changed. For each significant component or concern:
- Describe the approach
- State key decisions with their rationale inline
- Reference specific files, functions, and types where relevant
- Structure subsections to fit the problem—no fixed format

**Implementation**: Ordered steps that an agent or developer can execute. Each step should:
- Be concrete and actionable
- Reference specific files/functions to modify or create
- Be sequenced correctly (dependencies before dependents)

### Optional

- Background context (only if necessary for understanding)
- Open questions (only if unresolved items remain)

Add other sections if the problem demands it.

## Writing Style

- No filler, hedging, or preamble
- No "This document describes..." or "In this spec we will..."
- Start sections with substance, not meta-commentary
- Use precise technical language
- Keep decisions and rationale tight—one sentence each when possible
- Code references use `file/path.ts:lineNumber` or `functionName` in backticks
- Prefer concrete over abstract; specific over general

## Status Lifecycle

- **draft**: Work in progress. Should not be merged to main.
- **approved**: Designer has signed off. Ready for implementation.
- **implemented**: Work is complete. Spec is now historical record.

Update status in the document as it progresses. Specs are point-in-time snapshots—do not update content after implementation begins except to change status.
