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

# Pages

## List Pages
`GET /[id]/pages`

### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "General Information",
      "order": 0
    }
  ]
}
```


## Create
`POST /[id]/pages`

### Request Body
```json
{
  "name": "Experience",
  "order": 1
}
```

### Response
```json
{
  "success": true,
}
```

## Update
`PATCH /[id]/pages/[pageId]`

### Request Body
```json
{
  "name": "Updated Experience",
  "order": 2
}
```

## Delete
`DELETE /[id]/pages/[pageId]`

# Questions
## List Questions
`GET /[id]/questions`

## Create
`POST /[id]/questions`

### Request Body
```json
{
  "label": "Why do you want to join?",
  "description": "Explain your experience.",
  "type": "LONG_TEXT",
  "required": true,
  "order": 1,
  "settings": {}
}
```

## Update
`PATCH /[id]/questions/[questionId]`
> Only send fields that need to be updated.

### Request Body
```json
{
  "label": "Updated question",
  "required": false
}
```

## Delete
`DELETE /[id]/questions/[questionId]`

## Duplicate
`POST /[id]/questions/[questionId]/duplicate`

### Response Body
```json
{
  "success": true,
  "data": {
    "id": "new-question-id"
  }
}
```

## Reorder
`PATCH /[id]/questions/reorder`
> All questions must be included in the request or a 400 BAD_REQUEST will be returned.
> Order starts at 0, and must be sequential. **Questions cannot have the same order value.**

### Request Body
```json
[
  {
    "id": "question-1",
    "order": 0
  },
  {
    "id": "question-2",
    "order": 1
  }
]
```

# Responses

## Submit
`POST /[id]/responses`

### Request Body
```json
{
  "answers": [
    {
      "questionId": "question-id",
      "value": "BuddyWinte"
    },
    {
      "questionId": "question-id-2",
      "value": true
    }
  ]
}
```

### Response Body
```json
{
  "success": true,
  "data": {
    "id": "response-id",
    "status": "PENDING",
    "submittedAt": "2026-06-01T12:00:00Z"
  }
}
```

## List Responses
`GET /[id]/responses`

### Query Parameters
```
?status=PENDING
?page=1
?limit=50
?search=text
```

### Response Body
```json
{
  "success": true,
  "data": {
    "Responses": [
      {
        "id": "response-id",
        "status": "PENDING",
        "submittedAt": "2026-06-01T12:00:00Z"
      }
    ],
    "pagination": {}
  }
}
```

## Get Response
`GET /[id]/responses/[responseId]`

### Response Body
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "PENDING",
    "submittedBy": {
      "id": 123,
      "username": "BuddyWinte"
    },
    "answers": [
      {
        "questionId": "uuid",
        "value": "Example"
      }
    ]
  }
}
```

## Get My Response
`GET /[id]/responses/me`
> **Authorization is required**
Returns the user's response for the form. Only returns minimal data, meaning you will need to fetch the full information through the ID for everything.

### Response Body
```json
{
  "success": true,
  "data": {
    "id": "response-id",
    "status": "PENDING",
    "submittedAt": "2026-06-01T12:00:00Z"
  }
}
```

## Withdraw Response
> Can only be done if a user is logged in, requires `CanWithdrawResponses` to be enabled in the forms settings.
`POST /[id]/responses/[responseId]/withdraw`

### Response Body
```json
{
  "success": true,
}
```

# Reviews API coming soons

# Miscellaneous

## Form Statistics
`GET /[id]/stats`

### Response Body
```json
{
  "success": true,
  "data": {
    "views": 500,
    "responses": 120,
    "pending": 20,
    "approved": 80,
    "denied": 20
  }
}
```
