# Orbit API

API endpoints are versioned and follow a shared request and response structure. Each API should document its endpoints, parameters, authentication requirements, supported types, and behavior in its own README.md.

## API Structure
APIs are organized by version and resource:
```
/app/api/
├-- README.md
└-- v1/
    ├-- media/
    │   └-- README.md
    ├-- ...
    └-- README.md
```
Each API version should use the `/api/vN/` prefix.

## Request Format
Requests should use standard HTTP methods and JSON bodies where applicable.

### JSON Requests
JSON request bodies must use:
`Content-Type: application/json`
Example:
```json
{
  "name": "Example"
}
```

## Response Format
All API responses use the `RequestResponse<T>` structure.

A successful response has the following format, all successful requests return a `200 OK` status code:
```json
{
  "success": true,
  "data": {}
}
```

A unsuccessful response has the following format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "A human-readable error message"
  }
}
```

The corresponding TypeScript types are located in [types.ts](app/api/types.ts)


All Error Codes should be in UPPER_SNAKE_CASE
