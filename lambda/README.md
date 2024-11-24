<img src="https://mintlify.s3-us-west-1.amazonaws.com/duohub/logo/logo-light.svg" alt="duohub logo" height="20"> &nbsp;  <img src="../images/lambda.svg" alt="lambda logo" height="20"> 

# duohub x AWS Lambda integration example

This example shows how to use the duohub graph memory integration with AWS Lambda. 

## Overview

This Lambda function integrates with duohub's memory retrieval API to fetch relevant information based on queries. It supports both standard queries and memory-specific retrievals using a memoryID.

## Requirements

- AWS Account with Lambda access
- Node.js 18 or later
- [duohub API key](https://app.duohub.ai/account)

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
3. Set up your environment variables in AWS Lambda:
   - `API_KEY`: Your duohub API key

## Deployment

1. Build the TypeScript code:
   ```bash
   tsc
   ```
2. Zip the contents of the `dist` folder along with `node_modules`
3. Upload to AWS Lambda

## Usage

The Lambda function accepts events with the following structure:

```typescript
{
  "query": string,      // Required: The query to search for
  "memoryID": string  // Required: Specific memory ID to search within
}
```
