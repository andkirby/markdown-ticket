# dsh-plugin cookbook — lessons from mounting local CLIs as DSH tools

Hard-won rules from building and debugging `mdt.js` and `spec-trace.js`.
Each rule cites the failure that taught it. Current state, not history:
when a rule's cause changes, update the rule.

## Mounting

### Mount host-plane rows in the profile patch layer, not a preset

A user preset applies only to sessions that explicitly select it; the
profile's `cordis.patch.yml` (`~/.dsh/profiles/web/cordis.patch.yml`)
applies to every session on every preset:

```yaml
- insert:
    - id: tool-mdt
      name: /abs/path/to/dsh-plugin/mdt.js
```

Failure mode avoided: tools present in one preset, absent in another, and
a UAT that fails only because the session started on `standard`.

### The composition is read at boot; edits need a restart

Editing the patch layer or a plugin file has no effect on a running DSH
process. The HMR watcher covers the harness checkout only, not external
plugin directories. After any change: restart, then retest. Never
diagnose a "still failing" report without first checking the server
process start time.

## Plugin code

### Declare services with `inject`, never a one-shot `ctx.get` bail

```js
export const inject = ['tools', 'shell']
```

Host-plane entries activate in service-availability order. `ctx.get(name)`
at `apply()` time can return `undefined` for a service that appears a moment
later; bailing there registers nothing, permanently, with no boot failure.
`inject` makes the row wait instead. `ctx.get` with an absence check is for
genuinely optional services only.

Failure mode avoided: server boots clean, zero tools registered, one line
in a terminal nobody reads.

### Raw `tools.register` takes full JSON Schema, not the `defineTool` shorthand

```js
// WRONG — projects as an empty schema; every argument is stripped
parameters: { key: { type: 'string', required: true } }

// RIGHT
parameters: {
  type: 'object',
  additionalProperties: false,
  properties: { key: { type: 'string' } },
  required: ['key'],
}
```

The `{ prop: { type, required } }` form is a convenience that the typed
`defineTool` helper converts; dynamic plugins go through that conversion,
raw file plugins do not. A shorthand object schema is a bag of unknown
keywords: no properties, no required, arguments silently dropped before
`execute` runs. Declaring `required` in the schema also buys clean
validation errors for missing arguments instead of `args.x is undefined`
crashes inside `execute`.

### Resolve local binaries relative to the plugin file, and test the resolution

```js
const CLI = new URL('../cli/bin/mdt-cli', import.meta.url).pathname
```

Compute from `import.meta.url`, not from cwd — the plugin runs wherever the
DSH host runs. Then verify the resolved path actually executes before
committing: a module `import()` smoke test does NOT cover this constant;
it is read only at tool-call time. An env var (`SPEC_TRACE_BIN`) is the
alternative when the binary lives outside the repo; fail loud with the
variable's name when it is unset.

### Keep absolute home paths out of committed files

The repo's `block-home-paths-code` pre-commit hook rejects them. Resolve
via `import.meta.url` or environment variables, and describe machine-
specific paths in docs as env contracts.

## Process

### UAT with a step-1 catalog tripwire

Every real failure in this effort was caught by the same prompt shape:
step 1 lists the expected tools, middle steps exercise parameterized calls
from a non-project cwd (explicit `-p`), one negative test checks error
hygiene, and cleanup runs through bash because the plugin deliberately
exposes no delete. Rerun it after any change to the plugin, the patch
layer, or the CLI's flags — it caught wrong-plane mounting, a missing
binary path, and stripped arguments in sequence.

### Test through a fresh agent, not your own session

An in-session inspection shows the registry, not what a session's model
actually receives. A subagent with the UAT prompt exercises the full path:
mount → schema projection → argument validation → subprocess → JSON back.
Agents asked to report pass/fail per step do not fabricate results when a
tool is missing — the catalog check fails honestly, which is itself a
useful signal.

### One commit per defect, with the failure mode in the message

Each fix in this effort was a separate commit whose body names the
observed failure (silent no-op registration, exit 127, stripped args).
When a regression reappears, `git log --oneline -- dsh-plugin/` then reads
as a diagnostic checklist.
