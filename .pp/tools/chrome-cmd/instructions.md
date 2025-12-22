# Description

Control Chrome from the command line - List tabs, execute JavaScript, and more

# How to execute

IMPORTANT: Use Bash tool to run chrome-cmd commands directly. DO NOT use Skill tool.

Example:
```bash
chrome-cmd tab list
chrome-cmd tab exec "document.title"
```

# Features

- Tab management (list, select, focus, create, close, refresh)
- JavaScript execution in tabs
- Navigation control
- Screenshot capture (full page or viewport)
- HTML extraction with CSS selectors
- Console logs monitoring (error, warn, info, log, debug)
- Network requests inspection with filtering
- Storage inspection (cookies, localStorage, sessionStorage)
- Element interaction (click, input fill)
- Profile management
- Extension installation and updates

# When to use it?

- Need to automate browser interactions
- Extract data from active Chrome tabs
- Monitor console logs or network requests
- Debug web applications
- Capture screenshots programmatically
- Execute JavaScript in the context of open tabs
- Fill forms or click elements automatically
- Inspect browser storage (cookies, localStorage)

# Examples

```bash
## List all open tabs
chrome-cmd tab list

## Select a tab interactively or by index
chrome-cmd tab select
chrome-cmd tab select --tab 1

## Focus/activate a specific tab
chrome-cmd tab focus --tab 3

## Create new tab
chrome-cmd tab create https://google.com
chrome-cmd tab create https://google.com --background

## Navigate selected tab
chrome-cmd tab navigate https://github.com
chrome-cmd tab navigate https://github.com --tab 2

## Execute JavaScript
chrome-cmd tab exec "document.title"
chrome-cmd tab exec "console.log('Hello')" --tab 2

## Close tab
chrome-cmd tab close
chrome-cmd tab close --tab 1

## Screenshot
chrome-cmd tab screenshot --output screenshot.png
chrome-cmd tab screenshot --only-viewport --output viewport.png

## Extract HTML
chrome-cmd tab html
chrome-cmd tab html --selector ".main-content"
chrome-cmd tab html --raw

## Get console logs
chrome-cmd tab logs
chrome-cmd tab logs -n 10
chrome-cmd tab logs --error
chrome-cmd tab logs --warn

## Network requests
chrome-cmd tab requests
chrome-cmd tab requests -n 20
chrome-cmd tab requests --method POST
chrome-cmd tab requests --status 404
chrome-cmd tab requests --failed
chrome-cmd tab requests --all --body --headers
chrome-cmd tab requests --details 5

## Storage inspection
chrome-cmd tab storage
chrome-cmd tab storage --cookies
chrome-cmd tab storage --local
chrome-cmd tab storage --session

## Element interaction
chrome-cmd tab click --selector "button.submit"
chrome-cmd tab click --text "Click me"
chrome-cmd tab input --selector "input#email" --value "test@example.com"
chrome-cmd tab input --selector "input#search" --value "query" --submit

## Profile management
chrome-cmd profile select
chrome-cmd profile remove

## Install/update
chrome-cmd install
chrome-cmd update
```

# Rules

- Requires Chrome extension to be installed (`chrome-cmd install`)
- Most tab commands require a selected tab (use `tab select` first or `--tab` flag)
- JavaScript execution context is the selected tab's page
- Screenshot default captures full page unless `--only-viewport` is used
- Network requests require monitoring to be enabled in the extension

# Notes

- Extension bridge must be configured after installation
- Shell completion available via `chrome-cmd completion install`
- Tab index starts at 0
- Use `--raw` flag with HTML command for unformatted output
- Network request filters can be combined
- Storage commands show data from current tab's domain

# Troubleshooting

- Extension not responding: Run `chrome-cmd install` to reinstall/reconfigure bridge
- Tab selection not working: Verify Chrome is running and extension is enabled
- JavaScript execution fails: Check for page CSP restrictions or use different execution context
- Screenshots empty: Page may not be fully loaded, try adding delay or refresh first
