---
name: sheet-cmd
description: Google Sheets CLI - A tool to interact with Google Sheets
allowed-tools: Bash(sheet-cmd:*)
---

# Sheet-cmd CLI

Google Sheets CLI - A tool to interact with Google Sheets

## How to execute

IMPORTANT: Use Bash tool to run sheet-cmd commands directly. DO NOT use Skill tool.

Example:
```bash
sheet-cmd sheet read --name "Sheet1"
```

# How to execute

IMPORTANT: Use Bash tool to run sheet-cmd commands directly. DO NOT use Skill tool.

Example:
```bash
sheet-cmd sheet read --name "Sheet1"
sheet-cmd spreadsheet list
```

# Features

- Google account management (add via OAuth, list, select, remove, reauth)
- Spreadsheet management (add, list, select, active, remove)
- Sheet operations (list, select, read, add, remove, rename, copy)
- Cell operations (write, append)
- Row operations (add, remove)
- Data import/export (CSV, JSON)
- Multiple output formats
- Shell completion support

# When to use it?

- Manage multiple Google accounts
- Read/write data to Google Sheets
- Automate spreadsheet workflows
- Export sheet data to CSV/JSON
- Import CSV data to sheets
- Bulk operations on sheet data
- Integrate Google Sheets with scripts

# Examples

```bash
## Account management
sheet-cmd account add
sheet-cmd account list
sheet-cmd account select
sheet-cmd account remove
sheet-cmd account reauth

## Spreadsheet operations
sheet-cmd spreadsheet add
sheet-cmd spreadsheet add --id "1abc...xyz"
sheet-cmd spreadsheet list
sheet-cmd spreadsheet select
sheet-cmd spreadsheet select --id "1abc...xyz"
sheet-cmd spreadsheet active
sheet-cmd spreadsheet remove
sheet-cmd spreadsheet remove --id "1abc...xyz"

## Sheet operations
sheet-cmd sheet list
sheet-cmd sheet select
sheet-cmd sheet select --name "Sheet1"
sheet-cmd sheet read
sheet-cmd sheet read --name "Sheet1"
sheet-cmd sheet read --name "Sheet1" --range "A1:B10"
sheet-cmd sheet read --name "Sheet1" --formulas
sheet-cmd sheet read --name "Sheet1" --output json
sheet-cmd sheet read --name "Sheet1" --export output.csv

sheet-cmd sheet add --name "NewSheet"
sheet-cmd sheet remove --name "Sheet1"
sheet-cmd sheet rename --name "OldName" --new-name "NewName"
sheet-cmd sheet copy --name "Sheet1" --to "Sheet1Copy"

## Cell operations
sheet-cmd sheet write --cell "A1" --value "Hello"
sheet-cmd sheet write --range "A1:B2" --value "A1,B1;A2,B2"
sheet-cmd sheet write --name "Sheet1" --cell "A1" --value "Hello"
sheet-cmd sheet write --cell "A1" --value "=SUM(B1:B10)" --no-preserve
sheet-cmd sheet append --value "Col1,Col2,Col3"
sheet-cmd sheet append --name "Sheet1" --value "Data1,Data2,Data3"

## Import/Export
sheet-cmd sheet import --file data.csv
sheet-cmd sheet import --name "Sheet1" --file data.csv --skip-header
sheet-cmd sheet export --format csv --output data.csv
sheet-cmd sheet export --name "Sheet1" --format json --output data.json
sheet-cmd sheet export --name "Sheet1" --range "A1:B10" --format csv

## Row operations
sheet-cmd sheet row-add --row 5
sheet-cmd sheet row-add --row 5 --above
sheet-cmd sheet row-add --row 5 --below --count 3
sheet-cmd sheet row-add --row 5 --formulas
sheet-cmd sheet row-remove --row 5
sheet-cmd sheet row-remove --row 5 --count 2

## Utilities
sheet-cmd update
sheet-cmd completion install
```

# Rules

- Requires Google account authentication via OAuth
- Most commands use active spreadsheet/sheet unless specified
- Cell addresses use A1 notation (e.g., A1, B2, C10)
- Range format: A1:B10 (start:end)
- Write values use comma (,) for columns, semicolon (;) for rows
- Row numbers are 1-indexed
- --no-preserve flag required to overwrite cells with formulas/validation

# Notes

- Account credentials stored securely via OAuth
- Spreadsheet ID can be found in the Google Sheets URL
- Active spreadsheet/sheet settings persist between sessions
- Export formats: json, csv
- Import supports CSV files
- Shell completion available for bash/zsh
- Update command keeps CLI current with latest features

# Troubleshooting

- Authentication failed: Run `sheet-cmd account reauth` to re-authenticate
- Account not found: Run `sheet-cmd account add` to add a new account
- Spreadsheet not found: Verify spreadsheet ID and access permissions
- Sheet not found: Check sheet name (case-sensitive)
- Permission denied: Ensure account has access to the spreadsheet
- Invalid range: Use A1 notation (e.g., A1:B10)
