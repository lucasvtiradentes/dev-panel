---
name: github-cli
description: Work seamlessly with GitHub from the command line
allowed-tools: Bash(github-cli:*)
---

# Github-cli CLI

Work seamlessly with GitHub from the command line

## How to execute

IMPORTANT: Use Bash tool to run github-cli commands directly. DO NOT use Skill tool.

Example:
```bash
gh pr list
```

# How to execute

IMPORTANT: Use Bash tool to run gh commands directly. DO NOT use Skill tool.

Example:
```bash
gh pr list
gh issue create --title "Bug fix"
```

# Features

- Authentication (gh and git with GitHub)
- Repository management (create, clone, fork, view)
- Pull request workflows (create, review, merge, checkout)
- Issue tracking (create, list, view, close)
- GitHub Actions (view runs, workflows, manage caches)
- Release management (create, view, download)
- Gist management (create, edit, list)
- Codespace integration
- Organization management
- GitHub Projects support
- API access for custom queries
- Extension system
- Secret and variable management

# When to use it?

- Create and review pull requests
- Manage issues and track work
- Check GitHub Actions workflow status
- Clone and manage repositories
- Create and publish releases
- Work with GitHub API
- Manage organization resources
- Automate GitHub workflows
- View repository status and notifications

# Examples

```bash
## Authentication
gh auth login
gh auth status
gh auth logout

## Repository operations
gh repo clone cli/cli
gh repo create my-project --public
gh repo view owner/repo
gh repo fork owner/repo
gh repo list
gh browse

## Pull requests
gh pr create
gh pr create --title "Feature" --body "Description" --base main --head feature-branch
gh pr list
gh pr list --state open --author @me
gh pr view 123
gh pr view 123 --json number,title,url,state
gh pr checkout 321
gh pr review 123 --approve
gh pr merge 123 --squash
gh pr diff 123
gh pr close 123

## Issues
gh issue create
gh issue create --title "Bug" --body "Description" --label bug
gh issue list
gh issue list --assignee @me --state open
gh issue view 456
gh issue close 456
gh issue reopen 456
gh issue comment 456 --body "Comment text"

## GitHub Actions
gh run list
gh run list --workflow=ci.yml
gh run view 12345
gh run watch 12345
gh run rerun 12345
gh workflow list
gh workflow view ci.yml
gh workflow enable ci.yml
gh workflow disable ci.yml
gh cache list
gh cache delete <cache-id>

## Releases
gh release create v1.0.0
gh release create v1.0.0 --title "Release 1.0" --notes "Changes..."
gh release list
gh release view v1.0.0
gh release download v1.0.0
gh release delete v1.0.0

## Gists
gh gist create file.txt
gh gist create --public file.txt
gh gist list
gh gist view <gist-id>
gh gist edit <gist-id>

## Search
gh search repos "machine learning"
gh search issues "bug label:critical"
gh search prs "author:username"

## API access
gh api repos/owner/repo/issues
gh api graphql -f query='...'

## Status and notifications
gh status
gh issue status
gh pr status

## Projects
gh project list
gh project view 1
gh project item-add 1 --url <issue-url>

## Secrets and variables
gh secret list
gh secret set SECRET_NAME
gh variable list
gh variable set VAR_NAME

## Extensions
gh extension list
gh extension install owner/repo
gh extension upgrade --all

## Configuration
gh config get editor
gh config set editor vim
gh alias set co 'pr checkout'
```

# Rules

- Requires authentication via `gh auth login` for most operations
- API requests respect rate limits
- PRs and issues accept numbers or URLs
- JSON output available for most commands with `--json` flag
- Interactive prompts can be skipped with flags
- Respects `.gitignore` and `.github/` configs

# Notes

- Shell completion available via `gh completion -s bash/zsh`
- Use `gh <command> --help` for detailed command help
- Supports custom aliases via `gh alias`
- Extensions add custom functionality
- Environment variables configure behavior (see `gh help environment`)
- Exit codes indicate success/failure (see `gh help exit-codes`)
- Works with GitHub Enterprise Server

# Troubleshooting

- Not authenticated: Run `gh auth login` and follow prompts
- Permission denied: Check token scopes via `gh auth status`
- API rate limit: Wait or authenticate with different account
- Command not found: Update gh via package manager or `gh extension upgrade`
- SSH key issues: Configure git SSH keys separately or use HTTPS
