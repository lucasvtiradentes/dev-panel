# What is it?

CLI to interact with GitHub from the terminal

# Features

- view and manage pull requests
- check GitHub Actions status
- work with issues and repositories
- manage workflows and releases

# When to use it?

- checking PR details
- checking GitHub Actions status
- viewing issue details
- creating and managing PRs
- viewing repository information

# Examples

```bash
## check all the commands
gh --help

## view PR details
gh pr view 123 --json number,title,url,state

## check GitHub Actions status
gh run list

## create a PR
gh pr create --title "New feature" --body "Description" --base main --head feature-branch

## view issue details
gh issue view 456
```
