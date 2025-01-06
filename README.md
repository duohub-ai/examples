<img src="https://mintlify.s3-us-west-1.amazonaws.com/duohub/logo/logo-light.svg" alt="duohub logo" height="20">

# duohub memory integration examples

This repository contains examples of how to use the duohub graph memory integration across different platforms and frameworks.

## [<img src="images/pipecat-light.svg" alt="pipecat logo" height="20"> &nbsp; Pipecat](/pipecat) 

This example shows how to use the duohub graph memory integration with the pipecat framework for voice AI. 

It uses: 
- OpenAI for the LLM
- Cartesia for the TTS
- Daily for the audio call
- duohub for the graph memory integration

Dependencies are managed with Poetry. The project can be containerised with Docker and deployed on ECS.

## [<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Amazon_Lambda_architecture_logo.svg/1920px-Amazon_Lambda_architecture_logo.svg.png" alt="lambda logo" height="24"> &nbsp; Lambda](/lambda) 

This example demonstrates how to integrate duohub's graph memory with AWS Lambda for serverless memory retrieval.

Available in both Python and TypeScript, it uses:
- AWS Lambda for serverless execution
- TypeScript/Python for type-safe development
- duohub for memory retrieval
- Axios for API requests (TypeScript)
- Requests for API calls (Python)

Dependencies are managed with npm/yarn (TypeScript) or pip (Python). The project can be deployed directly to AWS Lambda.

## [<img src="./images/supabase-icon.png" alt="supabase icon" height="20"> &nbsp; Supabase Edge Functions](/supabase)

This example shows how to integrate duohub's graph memory with Supabase Edge Functions for serverless memory operations.

It uses:
- Supabase Edge Functions for serverless execution
- TypeScript/Deno runtime
- duohub for memory operations
- Built-in fetch for API requests

Dependencies are managed through Deno's import maps. The project can be deployed directly to Supabase using the CLI or GitHub Actions.

## Project Structure