# TypeSafety Review

Analyze code for type safety issues, suspicious patterns, and opportunities to improve type strictness in the specified directories.

## Target Directories

$FOLDERS

## Analysis Steps

1. **Search for type safety violations:**
   - `as any` - Type assertions bypassing type checking
   - `: any` - Explicit any type annotations
   - `as unknown as Type` - Double casting patterns
   - String literals in enum comparisons - Using `case 'value':` when parameter is enum type
   - `catch (error)` - Untyped error objects in catch blocks
   - `match[1]` or `array[0]` - Array/regex indexing without bounds checking
   - `JSON.parse()` - Unvalidated JSON parsing with type assertions
   - `==` - Loose equality instead of strict equality
   - `typeof x === 'object'` - Incomplete type guards
   - `obj[key]` - Object property access without existence checks
   - Type assertions on dynamic properties without validation
   - Excessive optional chaining (`?.`) masking bugs
   - Hardcoded values that should be constants
   - Union string types where enums would be better

2. **Categorize findings:**
   - **Critical:** Unsafe type casts, untyped errors, unsafe indexing, unvalidated JSON
   - **Moderate:** Loose equality, incomplete type guards, property access issues, type assertions, optional chaining abuse
   - **Improvement:** Hardcoded values, union strings that should be enums

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

#### 4. String Literals Instead of Enum Values
**Example:**
```typescript
enum TaskStatus {
  Todo = 'todo',
  Done = 'done'
}

function check(status: TaskStatus) {
  switch (status) {
    case 'todo':  // Should be TaskStatus.Todo
      break;
    case 'done':  // Should be TaskStatus.Done
      break;
  }
}
```
**Issues found:**
- `file:line` - Using string literal instead of enum member (defeats exhaustive checking)
- `file:line` - Using string literal instead of enum member (defeats exhaustive checking)

#### 5. Untyped Error Objects in Catch Blocks
**Example:**
```typescript
try {
  await riskyOperation();
} catch (error) {  // Should be: catch (error: unknown)
  console.log(error.message);  // Error: 'error' is of type 'any'
  vscode.window.showErrorMessage(`Failed: ${error}`);
}
```
**Issues found:**
- `file:line` - Untyped catch block, should use `catch (error: unknown)` and type guard
- `file:line` - Untyped catch block, should use `catch (error: unknown)` and type guard

#### 6. Unsafe Array/Regex Match Indexing
**Example:**
```typescript
const match = text.match(/pattern: (\d+)/);
const value = match[1];  // Error: match could be null
const id = parseInt(match[1]);  // Unsafe access

const lines = content.split('\n');
const firstLine = lines[0];  // Could be undefined if empty
```
**Issues found:**
- `file:line` - Array/match indexed without checking existence first
- `file:line` - Array/match indexed without checking existence first

#### 7. Unvalidated JSON.parse Results
**Example:**
```typescript
const metadata = JSON.parse(jsonString) as SectionMetadata;  // No validation!
const config = JSON.parse(configStr) as Record<string, unknown>;

// JSON could be anything, assertion doesn't guarantee structure
metadata.version;  // Might not exist at runtime
```
**Issues found:**
- `file:line` - JSON.parse with type assertion but no runtime validation
- `file:line` - JSON.parse with type assertion but no runtime validation

### Type Guard and Comparison Issues

#### 8. Loose Equality (== vs ===)
**Example:**
```typescript
if (value == null) { }  // Matches both null and undefined
if (count == 0) { }  // "0" == 0 is true!
if (status == 'active') { }  // Should use ===
```
**Issues found:**
- `file:line` - Using == instead of ===
- `file:line` - Using == instead of ===

#### 9. Typeof/Instanceof Misuse for Type Guards
**Example:**
```typescript
if (typeof config === 'object') {  // null also passes!
  config.value = 'test';  // Could fail if config is null
}

// Better:
if (typeof config === 'object' && config !== null) {
  config.value = 'test';
}
```
**Issues found:**
- `file:line` - Incomplete type guard, `typeof === 'object'` doesn't check for null
- `file:line` - Incomplete type guard, `typeof === 'object'` doesn't check for null

#### 10. Object Property Access Without Checks
**Example:**
```typescript
const valueMap: Record<string, string> = {};
const result = valueMap[key];  // Could be undefined
result.toUpperCase();  // Crash if key doesn't exist

// Better:
if (key in valueMap) {
  valueMap[key].toUpperCase();
}
```
**Issues found:**
- `file:line` - Dynamic object property access without existence check
- `file:line` - Dynamic object property access without existence check

#### 11. Type Assertions on Dynamic Properties
**Example:**
```typescript
const state = getState();
const userId = state.user as string;  // No validation
const config = apiResponse.config as AppConfig;  // Assumes structure

// Better: validate at runtime
if (typeof state.user === 'string') {
  const userId = state.user;
}
```
**Issues found:**
- `file:line` - Type assertion on dynamic property without validation
- `file:line` - Type assertion on dynamic property without validation

#### 12. Excessive Optional Chaining
**Example:**
```typescript
const name = user?.profile?.settings?.display?.name ?? 'Unknown';
const value = config?.options?.[0]?.value;

// Masks the real question: should these be optional or required?
// Better: validate structure upfront
```
**Issues found:**
- `file:line` - Excessive optional chaining suggesting unclear data contracts
- `file:line` - Excessive optional chaining suggesting unclear data contracts

### Code Quality Issues

#### 13. Hardcoded Values
**Example:**
```typescript
const tempFile = path.join(outputDir, '.prompt-temp.txt');
const timeout = setTimeout(fn, 5000);
```
**Issues found:**
- `file:line` - Hardcoded value and suggested constant name/location
- `file:line` - Hardcoded value and suggested constant name/location

#### 14. Union Strings Instead of Enums
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

**Critical Type Safety Issues:**
- `as any` should almost never be used; find proper types instead
- `: any` defeats TypeScript's purpose; define proper interfaces
- `as unknown as T` suggests type system fighting; reconsider architecture
- String literals in enum comparisons defeat exhaustive checking; use enum members
- Always use `catch (error: unknown)` and implement type guards for error handling
- Check array/match existence before indexing (`match?.[1]` or verify `match !== null`)
- Validate JSON.parse results at runtime; never blindly cast to types

**Type Guards and Comparisons:**
- Always use `===` instead of `==` to avoid type coercion bugs
- When using `typeof x === 'object'`, always add `&& x !== null` check
- Verify object properties exist before accessing (`key in obj` or `obj.hasOwnProperty(key)`)
- Type assertions on dynamic data require runtime validation

**Code Quality:**
- Excessive optional chaining suggests unclear data contracts; validate structure upfront
- Magic strings/numbers should be named constants
- Reusable constants should be centralized
- Union strings used in multiple places should be enums for better IDE support and refactoring
