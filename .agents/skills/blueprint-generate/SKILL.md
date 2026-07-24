---
name: blueprint-generate
description: End the Q&A phase and generate the plan. Use after the blueprint skill has gathered enough context.
---

## Blueprint — Generate plan

Generate an implementation plan from the Q&A session.

### Step 1: Resolve template

Recall the template name from the blueprint Q&A conversation. Read [references/templates.json](references/templates.json) and find the matching template.

### Step 2: Generate slug

Create a concise 2-5 word kebab-case slug (max 50 chars) for the feature. Sanitize: lowercase, alphanumeric + hyphens only, no leading/trailing hyphens. If `blueprint/<slug>` already exists, append `-2`, `-3`, etc.

### Step 3: Create plan directory

```bash
mkdir -p blueprint/<slug>
```

### Step 4: Refine the prompt

Use the most recent refined prompt from the Q&A conversation. If for any reason it wasn't shown during Q&A, generate it now — see [references/refine-prompt.md](references/refine-prompt.md).

### Step 5: Write the plan

See [references/write-plan.md](references/write-plan.md).

Append this progress line at the end of **every** message during the Write phase:

```
✓ Explore  ✓ Plan  ● Write  ○ Refine
```

Place the line after all other content, separated by a blank line.

### Step 6: Refinement

See [references/refinement.md](references/refinement.md).
