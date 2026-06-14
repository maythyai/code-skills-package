# YAML Frontmatter Schema

`schema.yaml` in this directory is the canonical contract for `docs/solutions/` frontmatter written by `csp-compound`.

## Tracks

| Track | problem_types | Description |
|-------|--------------|-------------|
| **Bug** | `build_error`, `test_failure`, `runtime_error`, `performance_issue`, `database_issue`, `security_issue`, `ui_bug`, `integration_issue`, `logic_error` | Defects and failures that were diagnosed and fixed |
| **Knowledge** | `best_practice`, `documentation_gap`, `workflow_issue`, `developer_experience`, `architecture_pattern`, `design_pattern`, `tooling_decision`, `convention` | Practices, patterns, conventions, decisions, workflow improvements |

## Required Fields (both tracks)

- **module**: Module or area affected
- **date**: ISO date in `YYYY-MM-DD`
- **problem_type**: One of the values listed in the Tracks table
- **component**: One of `api`, `database`, `frontend`, `backend`, `authentication`, `testing`, `deployment`, `configuration`, `documentation`, `tooling`, `data_processing`, `messaging`, `caching`, `ui_component`, `state_management`, `build_system`
- **severity**: One of `critical`, `high`, `medium`, `low`

## Bug Track Fields

Required:
- **symptoms**: YAML array with 1-5 observable symptoms
- **root_cause**: One of `missing_dependency`, `missing_config`, `missing_index`, `wrong_api`, `scope_issue`, `thread_violation`, `async_timing`, `memory_leak`, `config_error`, `logic_error`, `test_isolation`, `missing_validation`, `missing_permission`, `missing_workflow_step`, `inadequate_documentation`, `missing_tooling`, `incomplete_setup`
- **resolution_type**: One of `code_fix`, `migration`, `config_change`, `test_fix`, `dependency_update`, `environment_setup`, `workflow_improvement`, `documentation_update`, `tooling_addition`

## Knowledge Track Fields

No additional required fields beyond the shared ones. Optional: `applies_when`, `symptoms`, `root_cause`, `resolution_type`

## Category Mapping

- `build_error` -> `docs/solutions/build-errors/`
- `test_failure` -> `docs/solutions/test-failures/`
- `runtime_error` -> `docs/solutions/runtime-errors/`
- `performance_issue` -> `docs/solutions/performance-issues/`
- `database_issue` -> `docs/solutions/database-issues/`
- `security_issue` -> `docs/solutions/security-issues/`
- `ui_bug` -> `docs/solutions/ui-bugs/`
- `integration_issue` -> `docs/solutions/integration-issues/`
- `logic_error` -> `docs/solutions/logic-errors/`
- `developer_experience` -> `docs/solutions/developer-experience/`
- `workflow_issue` -> `docs/solutions/workflow-issues/`
- `best_practice` -> `docs/solutions/best-practices/`
- `documentation_gap` -> `docs/solutions/documentation-gaps/`
- `architecture_pattern` -> `docs/solutions/architecture-patterns/`
- `design_pattern` -> `docs/solutions/design-patterns/`
- `tooling_decision` -> `docs/solutions/tooling-decisions/`
- `convention` -> `docs/solutions/conventions/`

## YAML Safety Rules

Strict YAML 1.2 parsers reject array items that start with a reserved indicator character as unquoted scalars. Wrap in double quotes if item starts with:

`` ` ``, `[`, `*`, `&`, `!`, `|`, `>`, `%`, `@`, `?`

Also quote if the value contains the substring `": "`.
