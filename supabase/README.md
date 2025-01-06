<img src="https://mintlify.s3-us-west-1.amazonaws.com/duohub/logo/logo-light.svg" alt="duohub logo" height="20"> &nbsp;  <img src="../images/supabase.png" alt="supabase logo" height="20"> 

# duohub Integration Examples

This repository contains examples of integrating duohub's graph memory with Supabase Edge Functions.

## Overview

These examples demonstrate how to use duohub's memory retrieval API in the Supabase Edge Functions (TypeScript/Deno) serverless environment.

## Project Structure

```
─ supabase/
    ├── chat_handler.ts
    ├── create_user.ts
    ├── get_memory_response.ts
    └── list_user_messages.ts
```

## Supabase Edge Functions Integration

### Requirements
- Supabase account and project
- Deno (installed with Supabase CLI)
- [duohub API key](https://app.duohub.ai/account)

### Local Development

1. Start Supabase locally:
   ```bash
   supabase start
   ```

2. Set up environment variables:
   ```bash
   cp ./supabase/.env.local.example ./supabase/.env.local
   # Edit .env.local with your duohub API key
   ```

3. Serve functions locally:
   ```bash
   supabase functions serve --env-file ./supabase/.env.local --no-verify-jwt
   ```

### Supabase Deployment

1. Login to Supabase CLI:
   ```bash
   supabase login
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. Set environment variables:
   ```bash
   supabase secrets set --env-file ./supabase/.env.local
   ```

4. Deploy functions:
   ```bash
   supabase functions deploy
   ```

## Function Usage

### Event Structure

**Supabase Edge Functions**:
```typescript
{
  "query": string,      // Required: The query to search for
  "memoryID": string   // Required: Specific memory ID to search within
}
```

## Available Functions

All environments support the following functions:
- `chat_handler`: Handles chat interactions
- `create_user`: Creates new users
- `get_memory_response`: Retrieves memory-specific responses
- `list_user_messages`: Lists messages for a specific user

## GitHub Actions Deployment

This repository includes GitHub Actions workflows for automated deployments:

```yaml
name: Deploy Functions

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase functions deploy --project-ref ${{ secrets.PROJECT_ID }}
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

Set up the following secrets in your GitHub repository:
- `SUPABASE_ACCESS_TOKEN`
- `PROJECT_ID`
