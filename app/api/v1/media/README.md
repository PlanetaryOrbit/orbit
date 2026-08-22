# Media API

The Media API manages all media uploaded to an Orbit instance, including images, videos, photos, GIFs, and other supported media types.

> **Instance-wide:** The Media API is scoped to the entire Orbit instance and cannot be configured or isolated per workspace.

Media files are stored on the local filesystem of the Orbit instance and are served publicly from `/media/:id`.

Refer to the main [README.md](/app/api/README.md) for information about request and response formats, authentication, etc.

## Storage

Uploaded files are stored in the instance's local `public/media/` directory.

The original filename is stored in the database, while the physical file uses an internally generated storage key.

Files should never use user-provided filenames as their filesystem path.

## Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `POST` | `/api/v1/media` | Upload media |
| `GET` | `/api/v1/media` | List uploaded media |
| `GET` | `/media/:id` | Retrieve a media file |
| `DELETE` | `/api/v1/media/:id` | Delete media |

## Media Object

Media management endpoints return media metadata using the following structure:

```ts
type Media = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  storageKey: string;
  hash: string | null;
  width: number | null;
  height: number | null;
  alt: string | null;
  createdAt: string;
  updatedAt: string;
};
