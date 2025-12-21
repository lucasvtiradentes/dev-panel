# Description

CLI to interact with linear from the terminal

# Features

- multi account management 
- work with issues, projects, documents

# When to use it?

- checking for issue details
- checking for project details
- checking for document details
- create structure projects 

# Examples

```bash
## check all the commands
linear --help

## se issue details
linear issue show https://linear.app/team/issue/ISSUE-123

## create an issue
linear issue create --title "New feature" --description "Description" --assignee user@example.com --label bug --priority 2 
```
