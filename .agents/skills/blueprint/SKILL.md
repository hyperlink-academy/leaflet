---
name: blueprint
description: Start a new plan-writing session. Explores the codebase and asks clarifying questions.
---

## Blueprint — Start plan session

Start a new plan-writing session. Help the user write an implementation plan through multi-round Q&A.

### Step 1: Parse arguments and select template

Parse the user's message for the feature description.

Read [references/templates.json](references/templates.json) to get the available templates. Ask the user which template they'd like to use — one per template, using the template's `name` as the label and `description` as the description. Always include an "Other" option so the user can describe a custom template.

This is the ONLY time you should ask a template selection question during the session.

### Step 2: Read the plan template

Read the selected template's `prompt` field to understand the structure and level of detail expected. If the user selected "Other", use their custom description as the template prompt.

Your questions should match the template's level and perspective.

### Step 3: Explore the codebase

Explore the project to understand:
- The project structure, key modules, and architecture
- Existing patterns and conventions
- Files and systems relevant to the user's request

Spend real effort here. Read actual source files.

### Step 4: Ask clarifying questions

Help the user think through everything they'd need to answer in order to write that plan well.

Based on the codebase exploration, ask 3-5 clarifying questions following the format in [references/questions.md](references/questions.md).

Guidelines:
- Keep text between questions brief — a sentence or two of context at most, not a full analysis
- Gather facts before asking — if something can be determined by reading code, searching docs, or looking up external references, find the answer yourself. Do not make subjective decisions on behalf of the user
- Look up external documentation, APIs, or tools when relevant
- Ground questions in what you found in the codebase — do NOT ask questions whose answers are already obvious from the code
- Questions must match the level and perspective of the selected template — if the template asks about external behavior, ask about external behavior. If it asks about implementation details, ask about implementation details
- Users generally expect to continue existing patterns and expand their system — only question existing patterns when the user's change clearly conflicts with them. Focus on what's new or ambiguous
- Do NOT ask questions about the plan template itself — ask questions that help define what to build
- Do NOT ask about implementation details unless the plan template explicitly calls for them

Before the questions, add this hint:

```
> Answer with shorthand like `1a, 2b, 3e, 4a, 5b` or write freely.
```

After the questions, add:

```
Once you're done answering, I'll follow up with more questions. When you're ready, invoke the blueprint-generate skill to end the Q&A and generate the plan.
```

### Step 5: Continue Q&A

Wait for the user to respond. Accept answers in any format:
- Shorthand: `1a, 2b, 3e` or `1a 2b 3e`
- Prose: natural language answers
- Mixed: `1a, 2b, 3. I think we should...`

When they answer:
- If they answered a question with a follow-up question of their own, answer it (or finish the discussion with them) before moving to the next round
- Acknowledge briefly
- Show the updated refined prompt — take the original feature description and add bullet points (using `*` syntax) incorporating all clarifications so far. Follow the rules in [references/refine-prompt.md](references/refine-prompt.md). Display it in a blockquote so the user can see how their answers are shaping the plan.
- ALWAYS ask 3-5 more questions. These may be follow-ups to their answers or additional topics that still need to be discussed. Use the same question format as Step 4 (including the shorthand hint before the questions and the blueprint-generate reminder after).
- Keep asking rounds of follow-up questions until the user invokes the blueprint-generate skill

IMPORTANT: Do NOT stop asking questions on your own. Only the user decides when Q&A is done by invoking blueprint-generate. Do NOT generate the plan. Do NOT write or modify any code files — you are only gathering information.

### Progress indicator

Once a feature description has been provided and a template selected, append a single progress line at the end of **every** message. Do NOT show the progress line before then (e.g. when asking for a missing feature description or during template selection).

The line shows all four workflow phases using `✓` (completed), `●` (active), `○` (pending). Explore completes before the first user-visible question, so always show:

```
✓ Explore  ● Plan  ○ Write  ○ Refine
```

Place the line after all other content, separated by a blank line.
