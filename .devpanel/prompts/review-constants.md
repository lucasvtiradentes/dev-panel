# Review Constants

Analyze all constant declarations in the codebase to identify hardcoded values that should be moved to centralized constant files.

## Analysis Steps

1. **Search for constant patterns:**
   - Use grep pattern: `^const [A-Z_]+ = ` in `src/` directory
   - Look for uppercase constant declarations
   - Find hardcoded strings, numbers, and configuration values

2. **Evaluate each constant:**
   - Is it used in multiple files?
   - Is it a configuration value?
   - Is it a magic number/string that should be named?
   - Does it define behavior that might need to change?

3. **Categorize constants:**
   - **Should move to constants:** Reusable values, configs, magic numbers
   - **Can stay local:** Function-specific constants, one-off values
   - **Already centralized:** Values already in src/common/constants/

## Output Format

Provide a markdown report with:

### Constants to Move
List each constant with:
- Current location (file:line)
- Constant name and value
- Reason it should be centralized
- Suggested location (scripts-constants.ts or constants.ts)

### Constants OK to Stay Local
Brief list of constants that are fine where they are and why

### Summary
- Total constants found: X
- Should be moved: Y
- Already well-placed: Z

## Guidelines

Constants should be centralized if they:
- Are used across multiple files
- Define configuration/behavior
- Are magic numbers/strings that need names
- Might need to change in different environments
- Are part of public API or contracts

Constants can stay local if they:
- Are only used within one function/class
- Are implementation details
- Are throwaway/temporary values
- Have no semantic meaning outside their context
