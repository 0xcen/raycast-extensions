## Session Start

At the beginning of every new session, say: **"Apex framework 0.2.1 loaded"**

This confirms AGENTS.md is loaded correctly.

---

## Interpretation (MANDATORY FIRST STEP)

<gate_1_interpretation>
╔═══════════════════════════════════════════════════════════════╗
║  GATE 1: Interpretation Required                              ║
║                                                               ║
║  Your FIRST action on ANY user message MUST be:               ║
║  → Spawn apex:interpreter with the user's message             ║
║                                                               ║
║  ⛔ BLOCKING: Do NOT read files, explore code, or respond     ║
║     until interpretation completes.                           ║
╚═══════════════════════════════════════════════════════════════╝
</gate_1_interpretation>

<only_skip_if>
- Pure greeting ("hi", "hello", "thanks", "bye")
- User explicitly says "skip interpretation" or "just do it"
- Continuation of existing task in same session (interpretation already done for this task)
</only_skip_if>

### Good First Response Example

User: "the calendar times are wrong"

```
Your first action MUST be:
[Task tool call to apex:interpreter with the user's message]

Then WAIT for the result before doing anything else.
```

### Bad First Response Example (NEVER DO THIS)

User: "the calendar times are wrong"

```
"Let me look at the calendar code..."
[Immediately reads files or starts exploring]
```

This skips interpretation. NEVER do this for task requests.

---

## Blocking Questions

<gate_2_blocking_questions>
╔═══════════════════════════════════════════════════════════════╗
║  GATE 2: Blocking Questions                                   ║
║                                                               ║
║  If interpretation returns `mode.blocking_questions`:         ║
║  → ASK each question                                          ║
║  → WAIT for user's answers                                    ║
║  → RECORD answers in task file                                ║
║                                                               ║
║  ⛔ BLOCKING: Cannot proceed until ALL questions answered     ║
╚═══════════════════════════════════════════════════════════════╝
</gate_2_blocking_questions>

Common blocking questions:
- "How will you verify this is complete?"
- "What does success look like?"

These answers go into the task file and guide verification.

---

## Following Interpretation Results

When apex:interpreter returns, follow its `routing.chain` IN ORDER.

### If `routing.skill` is `apex:plan` (Planning Workflow)

The chain is: `[apex:knowledge, apex:explorer, apex:plan, apex:plan-readiness-auditor, apex:work]`

<checkpoint_1_knowledge>
╔════════════════════════════════════════════╗
║ CHECKPOINT 1: Knowledge Searched?          ║
║                                            ║
║ □ Spawned apex:knowledge (Mode 1)?         ║
║ □ Received response?                       ║
║                                            ║
║ If NO → STOP, spawn apex:knowledge NOW     ║
╚════════════════════════════════════════════╝
</checkpoint_1_knowledge>

<checkpoint_2_explorer>
╔════════════════════════════════════════════╗
║ CHECKPOINT 2: Codebase Explored?           ║
║                                            ║
║ □ Spawned apex:explorer?                   ║
║ □ Received file list?                      ║
║                                            ║
║ If NO → STOP, spawn apex:explorer NOW      ║
╚════════════════════════════════════════════╝
</checkpoint_2_explorer>

<checkpoint_3_plan_complete>
╔════════════════════════════════════════════╗
║ CHECKPOINT 3: Plan Complete?               ║
║                                            ║
║ Plan MUST include ALL 5 sections:          ║
║ □ Completion criteria                      ║
║ □ Verification commands                    ║
║ □ Validation loop definition               ║
║ □ Tooling timeline                         ║
║ □ Risks & rollback                         ║
║                                            ║
║ If ANY missing → Add missing section       ║
╚════════════════════════════════════════════╝
</checkpoint_3_plan_complete>

<gate_3_audit>
╔═══════════════════════════════════════════════════════════════╗
║  GATE 3: Plan Audit Required                                  ║
║                                                               ║
║  Before presenting plan to user:                              ║
║  → Spawn apex:plan-readiness-auditor with the plan            ║
║  → Wait for VERDICT                                           ║
║                                                               ║
║  VERDICT: PASS → Present plan to user                         ║
║  VERDICT: FAIL → Fix MUST-FIX items, re-audit                 ║
║                                                               ║
║  ⛔ BLOCKING: Cannot present plan until audit PASSES          ║
╚═══════════════════════════════════════════════════════════════╝
</gate_3_audit>

<gate_4_handoff>
╔═══════════════════════════════════════════════════════════════╗
║  GATE 4: Automatic Handoff to apex:work                       ║
║                                                               ║
║  When user approves the plan:                                 ║
║  → AUTOMATICALLY invoke apex:work skill                       ║
║  → This is NOT optional                                       ║
║                                                               ║
║  User requests changes? → Revise plan, re-audit, present      ║
║  User rejects? → End planning phase                           ║
╚═══════════════════════════════════════════════════════════════╝
</gate_4_handoff>

### If `routing.skill` is `apex:knowledge` (Error/Debug Workflow)

The chain is: `[apex:knowledge, apex:work]`

1. Spawn apex:knowledge with error description
2. Present any relevant findings to user BEFORE implementing
3. If a prior solution exists, ask: "Found a similar issue. Should I apply this solution?"
4. Then invoke apex:work to fix

### If `routing.skill` is `apex:work` (Direct Implementation)

1. Proceed with implementation
2. Use TodoWrite to track progress
3. Run validators after EACH batch of changes (not just at end)
4. On failure: search apex:knowledge (Mode 2) for known fix

### If `routing.skill` is `apex:review`:

1. Spawn apex:validator to run lint, typecheck, tests
2. Spawn apex:reviewer to review changes
3. Suggest improvements if needed

### If `routing.skill` is `null`:

- This is a question/lookup - answer directly without skill invocation

---

## Validation Loop (During Implementation)

<validation_loop_diagram>
```
┌─────────────┐
│ Implement   │
│ small batch │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ apex:validator  │ ← Run after EACH batch
│ (lint/type/test)│
└──────┬──────────┘
       │
       ▼
   ╔═════════════╗
   ║ Pass?       ║
   ╠═════════════╣
   ║ YES → Next  ║
   ║      batch  ║
   ║             ║
   ║ NO →        ║
   ║  apex:      ║
   ║  knowledge  ║
   ║  (Mode 2)   ║
   ║      │      ║
   ║      ▼      ║
   ║  Fix error  ║
   ║      │      ║
   ║      ▼      ║
   ║  Re-run     ║
   ╚═════════════╝
```
</validation_loop_diagram>

<gate_5_validators_green>
╔═══════════════════════════════════════════════════════════════╗
║  GATE 5: Validators Must Pass                                 ║
║                                                               ║
║  Before completing implementation:                            ║
║  → All validators MUST be green                               ║
║  → OR user explicitly accepts skipping                        ║
║                                                               ║
║  ⛔ BLOCKING: Cannot complete with failing validators         ║
╚═══════════════════════════════════════════════════════════════╝
</gate_5_validators_green>

---

## Verification (MANDATORY FINAL STEP)

<verification_requirement>
Include a final verification step in your TodoList for virtually any non-trivial task.
Use the apex:validator subagent for verification - do not self-verify.
</verification_requirement>

Verification methods by task type:
- **Code changes** → Run `npm run lint && npm run typecheck && npm test`
- **Bug fixes** → Confirm the original issue no longer reproduces
- **New features** → Demonstrate the feature works as specified
- **Refactors** → Ensure behavior is unchanged (tests pass)

<verification_example>
TodoList:
1. [completed] Implement calendar time fix
2. [completed] Update related tests
3. [in_progress] Verify: npm run typecheck && npm test
</verification_example>

---

## Task Files

<gate_task_location>
╔═══════════════════════════════════════════════════════════════╗
║  GATE: Task Files Location                                    ║
║                                                               ║
║  All task/plan files MUST be written to:                      ║
║  → .apex/tasks/                                               ║
║                                                               ║
║  NEVER write task files to:                                   ║
║  → .claude/tasks/                                             ║
║  → .factory/tasks/                                            ║
║                                                               ║
║  The .apex/ directory is shared across all environments.      ║
║  Writing to .claude/ or .factory/ loses task history.         ║
║                                                               ║
║  ⛔ BLOCKING: Wrong path = task will be lost                  ║
╚═══════════════════════════════════════════════════════════════╝
</gate_task_location>

---

## Skill Reference (for routing)

| Skill | When to Use |
|-------|-------------|
| `apex:knowledge` | Error/debug scenarios - check for prior solutions first |
| `apex:plan` | Multi-file changes, architecture decisions, 3+ files |
| `apex:work` | Implementation tasks, single-file fixes |
| `apex:review` | Pre-commit review, change validation |
| `apex:compound` | Session end - capture learnings |
| `dual-harness` | Changes to .claude/ or .factory/ directories |

---

## Writing Guidelines

- **Avoid temporal language**: Don't use "now", "currently", "new", "old" in code or docs (unless in changelogs). The codebase only knows its current state.
  - Bad: "Tasks now live in .apex/tasks/"
  - Good: "Tasks live in .apex/tasks/"

---

## Creating Skills, Agents, and Hooks

<gate_skill_agent_creation>
╔═══════════════════════════════════════════════════════════════╗
║  GATE: Use CLI Commands - Never Write Tool                    ║
║                                                               ║
║  When creating skills, agents, or hooks you MUST use the      ║
║  apex CLI. The CLI creates files in multiple directories      ║
║  that must stay synchronized. Write tool cannot do this.      ║
║                                                               ║
║  REQUIRED - Use Bash tool with these commands:                ║
║  • apex skill create <name> --description "..."               ║
║  • apex agent create <name> --description "..."               ║
║  • apex hook create <name> --event <event>                    ║
║                                                               ║
║  FORBIDDEN - Never use Write tool to these paths:             ║
║  • .claude/skills/*   • .claude/agents/*   • .claude/hooks/*  ║
║  • .factory/skills/*  • .factory/droids/*  • .factory/hooks/* ║
║                                                               ║
║  After CLI creates the file, use Edit tool to add content.    ║
║                                                               ║
║  ⛔ BLOCKING: Write tool to these paths breaks the system     ║
╚═══════════════════════════════════════════════════════════════╝
</gate_skill_agent_creation>

---

## Project Manifest

The manifest (`.apex/MANIFEST.md`) declares project vision and capabilities.

### On Session Start

1. Check if `.apex/MANIFEST.md` exists
2. If exists, parse frontmatter - only process if `active: true`
3. Store vision and capabilities in context

### Planning Mode

If entering planning mode with an active manifest:
- Ask: **"Which capability are we working on today?"**
- List uncompleted capabilities
- User can select one or say "something else"

### Marking Complete

To mark a capability complete:
- Edit MANIFEST.md: change `- [ ]` to `- [x]`
- Or user says "mark X capability as complete" and you update the file

---

## Session End Triggers

When a task completes (all TodoList items checked), evaluate:

| Condition | Action |
|-----------|--------|
| Multi-step implementation completed | Suggest: "Should I capture learnings with apex:compound?" |
| Novel problem solved | Suggest: "This could be a reusable skill. Run /create-skill?" |
| Bug fixed after debugging | Log to knowledge base for future reference |

<session_end_prompt>
"Implementation complete and verified. Should I capture this as a learning (apex:compound) 
or create a reusable skill (/create-skill)?"
</session_end_prompt>

Only suggest for substantial sessions. Skip for: simple lookups, single-file edits, quick fixes.

<!-- APEX:PROJECT -->
<!-- Project-specific content below this line is preserved during sync -->
