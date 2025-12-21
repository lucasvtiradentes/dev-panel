---
name: linear
description: Linear CLI - A GitHub CLI-like tool for Linear
allowed-tools: Bash(linear:*)
---

# Linear CLI

Linear CLI - A GitHub CLI-like tool for Linear

## How to execute

IMPORTANT: Use Bash tool to run linear commands directly. DO NOT use Skill tool.

Example:
```bash
linear issue show ISSUE-123
```

# How to execute

IMPORTANT: Use Bash tool to run linear commands directly. DO NOT use Skill tool.

Example:
```bash
linear issue show ISSUE-123
linear project list
```

# Features

- Multi account management (add, list, remove, select, test)
- Issue management (create, list, show, update, comment)
- Project management (create, list, show, delete, issues)
- Document management (create, show, delete)
- Multiple output formats (pretty, json)
- Shell completion support

# When to use it?

- Manage multiple Linear accounts/workspaces
- Create and track issues from the terminal
- Query issue details and status
- Organize work in projects
- Create and manage Linear documents
- Automate Linear workflows
- Bulk operations on issues

# Examples

```bash
## Account management
linear account add
linear account add --name "work" --api-key "lin_api_..."
linear account list
linear account remove
linear account select
linear account test

## Issue operations
linear issue show ISSUE-123
linear issue show https://linear.app/team/issue/ISSUE-123
linear issue show ISSUE-123 --format json

linear issue create --title "Fix bug"
linear issue create --title "New feature" --description "Description" --priority 2
linear issue create --title "Task" --assignee user@example.com --label bug
linear issue create --title "Feature" --project "Q1 Goals" --team TES

linear issue list
linear issue list --state "In Progress"
linear issue list --assignee user@example.com --limit 20
linear issue list --team WORK --label critical

linear issue update ISSUE-123 --title "New title"
linear issue update ISSUE-123 --state "Done" --priority 1
linear issue update ISSUE-123 --assignee dev@example.com

linear issue comment ISSUE-123 --body "Adding context here"

## Project operations
linear project list
linear project list --team TES --limit 10
linear project list --format json

linear project show PROJECT-ID
linear project show PROJECT-ID --format json

linear project issues PROJECT-ID
linear project issues PROJECT-ID --limit 50

linear project create --name "Q1 Roadmap" --description "Goals for Q1"
linear project create --name "Sprint 5" --team WORK --state "planned" --targetDate 2025-12-31

linear project delete PROJECT-ID

## Document operations
linear document show DOC-ID
linear document show DOC-ID --format json

linear document add --title "Architecture" --content "Design doc content"
linear document add --title "Specs" --project PROJECT-ID

linear document delete DOC-ID

## Utilities
linear update
linear completion install
```

# Rules

- Requires API key for each account (get from Linear settings)
- Most commands use active account unless `--account` flag is specified
- Priority values: 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low
- Issue/project identifiers accept URLs or IDs
- Team keys are short codes (e.g., TES, WORK)
- Dates use YYYY-MM-DD format

# Notes

- Account API keys stored securely in config
- Default output is pretty-formatted, use `--format json` for automation
- Can filter issues by state, assignee, label, project, team
- Shell completion available for bash/zsh
- Update command keeps CLI current with latest features

# Troubleshooting

- API key invalid: Verify key in Linear settings and re-add account
- Account not found: Run `linear account select` to choose active account
- Team not found: Use correct team key from your workspace
- State not found: State names must match exactly (case-sensitive)
- Permission denied: Check API key has required scopes
