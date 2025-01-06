<img src="https://mintlify.s3-us-west-1.amazonaws.com/duohub/logo/logo-light.svg" alt="duohub logo" height="20"> &nbsp;  <img src="../images/lambda.svg" alt="lambda logo" height="20"> 

# duohub x AWS Lambda integration example

This example shows how to use the duohub graph memory integration with AWS Lambda, supporting both Python and TypeScript implementations.

## Overview

These Lambda functions integrate with duohub's memory retrieval API to fetch relevant information based on queries. They support both standard queries and memory-specific retrievals using a memoryID.

## Requirements

- AWS Account with Lambda access
- Node.js 18+ (for TypeScript) or Python 3.8+ (for Python)
- [duohub API key](https://app.duohub.ai/account)

## Setup

1. Clone this repository
2. Install dependencies:

   For TypeScript:
   ```bash
   cd lambda/typescript
   npm install
   # or
   yarn install
   ```

   For Python:
   ```bash
   cd lambda/python
   pip install -r requirements.txt
   ```

3. Set up your environment variables in AWS Lambda:
   - `API_KEY`: Your duohub API key

## Project Structure

```
lambda/
├── python/
│   ├── chat_handler.py
│   ├── create_user.py
│   └── list_user_messages.py
└── typescript/
    ├── chat_handler.ts
    ├── create_user.ts
    ├── get_memory_response.ts
    └── list_user_messages.ts
```

## Deployment

### TypeScript
1. Build the TypeScript code:
   ```bash
   cd lambda/typescript
   tsc
   ```
2. Zip the contents of the `dist` folder along with `node_modules`
3. Upload to AWS Lambda

### Python
1. Create a ZIP file containing your Python files and dependencies:
   ```bash
   cd lambda/python
   zip -r ../function.zip .
   ```
2. Upload to AWS Lambda

## Usage

The Lambda functions accept events with the following structure:

TypeScript/JavaScript:
```typescript
{
  "query": string,      // Required: The query to search for
  "memoryID": string   // Required: Specific memory ID to search within
}
```

Python:
```python
{
    "query": str,      # Required: The query to search for
    "memoryID": str    # Required: Specific memory ID to search within
}
```

## Available Functions

### TypeScript
- `chat_handler`: Handles chat interactions
- `create_user`: Creates new users
- `get_memory_response`: Retrieves memory-specific responses
- `list_user_messages`: Lists messages for a specific user

### Python
- `chat_handler`: Handles chat interactions
- `create_user`: Creates new users
- `list_user_messages`: Lists messages for a specific user
