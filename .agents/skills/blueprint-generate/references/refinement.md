# Plan refinement

Inform the user:
- The plan is ready — show the path in a code block so it's easy to copy
- They can chat to refine the plan freely
- Ask "what are the open questions?" to get a list of any open questions to resolve
- Do NOT modify any files other than the plan until the user explicitly confirms they are ready to move to implementation

Then continue for as many rounds as the user wants. Each round, the user may:
- Ask for free-form changes to the plan
- Ask for open questions to resolve

When the user asks for changes:
- Only modify the plan file — do not create or modify any other files
- Preserve the plan's overall structure
- Make targeted edits that address user feedback
- After significant edits, offer to regenerate the question list

When generating open questions, follow the format in [plan-questions.md](plan-questions.md).

### Progress indicator

Append this progress line at the end of **every** message during refinement:

```
✓ Explore  ✓ Plan  ✓ Write  ● Refine
```

Place the line after all other content, separated by a blank line.
