# Forms API
> Designed by BuddyWinte with the assistance of Pawesome Contributers

[PR #166](https://github.com/PlanetaryOrbit/orbit/pull/166) is the RFC for the Forms. Please feel free to read there about the Forms.

Base Url: `/api/workspace/[id]/forms`, any routes with `/` are relative to this base url.

**Design is not final. It is very likely to change as we expand on the Forms functionality.**

---

# Forms

## Create

`POST /`

Creates a new form.

### Request Body
```json
{
  "name": "Developer Application",
  "description": "Apply to become a developer.",
  "slug": "developer-application",
  "settings": {
    "allowAnonymous": false,
    "allowMultiple": false
  }
}
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Developer Application",
    "createdAt": "2026-07-14T00:00:00Z"
  }
}
```

## List
`GET /`

Returns all forms in the workspace.

### Query Params
```
?archived=false
?enabled=true
?page=1
?limit=20
?search=developer
```

### Response
```json
{
  "success": true,
  "data": {
    "forms": [
      {
        "id": "uuid",
        "name": "Developer Application",
        "description": "...",
        "enabled": true,
        "archived": false,
        "createdAt": "..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50
    }
  }
}
```

## Get Form
`GET /[id]`

Returns a complete form schema.

### Response
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Developer Application",
    "description": "...",
    "settings": {
      "allowAnonymous": false,
      "allowMultiple": false
    },
    "pages": [
      {
        "id": "uuid",
        "name": "General",
        "questions": []
      }
    ]
  }
}
```

## Update
`PUT /[id]`

Updates a form.
> Only send fields that need changing.

### Request Body
```json
{
  "name": "Updated Application",
  "description": "Updated description"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "updatedAt": "..."
  }
}
```

## Delete
Deleting is not currently supported, we are still trying to plan this API.

## Duplicate
`POST /[id]/duplicate`

Creates a copy of a form.
> **Responses are not copied**.
> The word "**Copy**" is appended to the name of the copied form if `name` isn't given in the request body.

### Request Body
```json
{
  "name": "Developer Application Copy"
}
```

### Response
```json
{
  "id": "new-uuid",
  "name": "Developer Application Copy"
}
```
