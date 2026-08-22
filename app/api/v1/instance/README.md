# Instance API

The Instance API manages instance-level configuration and settings.

> **Instance-wide:** The Instance API is scoped to the entire Orbit instance and cannot be configured or isolated per workspace.

Refer to the main [README.md](/app/api/README.md) for information about request and response formats, authentication, and additional API conventions.

## Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/api/v1/instance` | Get instance settings |
| `PATCH` | `/api/v1/instance` | Update instance settings |

#### Errors

| Status | Code | Description |
| ------ | ---- | ----------- |
| `403` | `NOT_SETUP` | The instance has not been configured yet. |
| `500` | `INTERNAL_SERVER_ERROR` | An unexpected error occurred while processing the request. |

**Changelog**
- `8/21/26` - Created the Instance API, **BuddyWinte**
