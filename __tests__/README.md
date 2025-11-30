# Orbit Test Suite

This directory contains comprehensive unit tests for the Orbit project.

## Overview

The test suite includes 294+ unit tests covering core utility functions with a focus on:
- Edge cases and boundary conditions
- Error handling and failure scenarios
- Input validation and sanitization
- Time-based logic
- API integration with proper mocking

## Test Coverage

### `utils/sanitise.test.ts` (129 tests)
Tests the JSON sanitization utility that protects against XSS attacks:
- **Basic sanitization**: Validates safe nodes pass through unchanged
- **Disallowed node types**: Ensures dangerous nodes (iframe, script, etc.) are removed
- **URL validation**: Tests proper filtering of javascript:, data:, and relative URLs
- **Marks sanitization**: Validates link marks with safe/unsafe URLs
- **Nested content**: Tests deep sanitization of complex document structures
- **Error handling**: Ensures graceful degradation on malformed input
- **Real-world scenarios**: Complex documents with mixed safe/unsafe content

### `utils/sessionMessage.test.ts` (60+ tests)
Tests the session time-based message generator:
- **Time-based selection**: Validates correct message categories for different hours
- **Game name handling**: Tests null, empty, and special character handling
- **Randomness**: Ensures variety in message selection
- **Edge cases**: Boundary conditions at midnight, noon, and time transitions
- **Format validation**: Consistent message structure across all times

### `utils/randomText.test.ts` (70+ tests)
Tests the Christmas-themed random greeting generator:
- **Time-based text selection**: Morning, afternoon, evening, late night messages
- **Name interpolation**: Handles special characters, empty strings, long names
- **Randomness and variety**: Ensures diverse message selection
- **Theme consistency**: Validates Christmas theme and emoji presence
- **Boundary conditions**: Tests time transition points
- **Real-world scenarios**: Typical Roblox usernames

### `utils/roblox.test.ts` (35+ tests)
Tests Roblox API integration functions with proper mocking:
- **Username retrieval**: Valid IDs, BigInt IDs, error handling
- **Thumbnail fetching**: API integration, timeout handling
- **Display name retrieval**: Fallback logic, multiple failure scenarios
- **User ID lookup**: Username to ID conversion, error scenarios
- **Timeout functionality**: 12-second timeout enforcement

## Running Tests

### Run all tests
```bash
npm test
```

### Watch mode (re-runs on file changes)
```bash
npm run test:watch
```

### Generate coverage report
```bash
npm run test:coverage
```

## Test Structure

Each test file follows the pattern:
```typescript
describe('FunctionName', () => {
  describe('Feature category', () => {
    it('should do something specific', () => {
      // Arrange
      const input = ...;
      
      // Act
      const result = functionUnderTest(input);
      
      // Assert
      expect(result).toBe(...);
    });
  });
});
```

## Mocking Strategy

External dependencies are mocked to ensure:
- Tests run quickly without network calls
- Tests are deterministic and reliable
- Edge cases can be simulated easily

Example:
```typescript
jest.mock('noblox.js');
const mockedNoblox = noblox as jest.Mocked<typeof noblox>;
```

## Best Practices Followed

1. **Descriptive test names**: Each test clearly states what it validates
2. **Isolated tests**: No interdependencies between tests
3. **Comprehensive coverage**: Happy paths, edge cases, and error conditions
4. **Consistent structure**: Arrange-Act-Assert pattern
5. **Proper cleanup**: `afterEach` hooks to restore mocks
6. **Type safety**: Full TypeScript support throughout

## Adding New Tests

When adding new utility functions:

1. Create a test file: `__tests__/utils/yourFile.test.ts`
2. Import the function under test
3. Mock external dependencies
4. Write describe blocks for logical groupings
5. Cover happy paths, edge cases, and errors
6. Run `npm test` to verify

## Coverage Goals

- **Utilities**: 90%+ coverage (pure functions are highly testable)
- **Components**: 70%+ coverage (UI components with external deps)
- **API routes**: Integration tests recommended over unit tests

## CI/CD Integration

The test suite is designed to run in CI/CD pipelines:
- Fast execution (no network calls)
- Deterministic results (no random failures)
- Clear error messages
- Exit codes indicate pass/fail

## Common Test Patterns

### Testing time-dependent functions
```typescript
const mockDate = (hour: number) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  jest.spyOn(global, 'Date').mockImplementation(() => date as any);
};
```

### Testing async functions
```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBe(expected);
});
```

### Testing error scenarios
```typescript
it('should handle errors gracefully', async () => {
  mockApi.mockRejectedValue(new Error('API Error'));
  const result = await functionUnderTest();
  expect(result).toBe('fallback value');
});
```

## Troubleshooting

### Tests fail with module resolution errors
- Run `npm install` to ensure all dependencies are installed
- Check that `jest.config.js` has correct `moduleNameMapper`

### Tests timeout
- Increase timeout for long-running tests: `it('test', async () => {...}, 15000)`
- Check for unresolved promises

### Mock not working
- Ensure mock is called before importing the module
- Use `jest.clearAllMocks()` in `beforeEach`

## Future Enhancements

Potential additions to the test suite:
- Integration tests for API routes
- Component tests for React components
- E2E tests for critical user flows
- Performance benchmarks
- Visual regression tests

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Next.js Testing](https://nextjs.org/docs/testing)