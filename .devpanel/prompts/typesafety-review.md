# TypeSafety Review

Analyze code for type safety issues, suspicious patterns, and opportunities to improve type strictness in the specified directories.

## Target Directories

$FOLDERS

## Analysis Steps

1. **Search for type safety violations:**
   - `as any` - Type assertions bypassing type checking
   - `: any` - Explicit any type annotations
   - `as unknown as Type` - Double casting patterns
   - Hardcoded values that should be constants
   - Union string types where enums would be better

2. **Categorize findings:**
   - **Critical:** Unsafe type casts that could hide bugs
   - **Moderate:** Hardcoded values and poor type definitions
   - **Improvement:** Union strings that should be enums

## Output Format

Provide a markdown report with:

### Type Safety Violations

#### 1. Unsafe Type Assertions (`as any`)
**Example:**
```typescript
const result = response as any;
const value = (data as any).property;
```
**Issues found:**
- `file:line` - Description of what's being cast and why it's problematic
- `file:line` - Description of what's being cast and why it's problematic

#### 2. Explicit Any Types (`: any`)
**Example:**
```typescript
function process(data: any) { }
const config: any = {};
```
**Issues found:**
- `file:line` - Description and suggested proper type
- `file:line` - Description and suggested proper type

#### 3. Double Casting (`as unknown as Type`)
**Example:**
```typescript
const element = document.querySelector('.foo') as unknown as CustomElement;
const data = response as unknown as ApiResponse;
```
**Issues found:**
- `file:line` - What's being cast and safer alternatives
- `file:line` - What's being cast and safer alternatives

### Code Quality Issues

#### 4. Hardcoded Values
**Example:**
```typescript
const tempFile = path.join(outputDir, '.prompt-temp.txt');
const timeout = setTimeout(fn, 5000);
```
**Issues found:**
- `file:line` - Hardcoded value and suggested constant name/location
- `file:line` - Hardcoded value and suggested constant name/location

#### 5. Union Strings Instead of Enums
**Example:**
```typescript
type Status = 'pending' | 'active' | 'completed';
function setMode(mode: 'light' | 'dark') { }
```
**Issues found:**
- `file:line` - Union type and suggested enum definition
- `file:line` - Union type and suggested enum definition

### Summary

- Total issues found: X
- Type safety violations: Y
- Code quality issues: Z
- Critical priority: W

### Recommendations

Prioritized list of fixes:
1. Most critical issue (brief description)
2. Second most critical (brief description)
3. ...

## Guidelines

**Type Safety Issues:**
- `as any` should almost never be used; find proper types instead
- `: any` defeats TypeScript's purpose; define proper interfaces
- `as unknown as T` suggests type system fighting; reconsider architecture

**Code Quality:**
- Magic strings/numbers should be named constants
- Reusable constants should be centralized
- Union strings used in multiple places should be enums for better IDE support and refactoring
