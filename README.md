<img src="https://mintlify.s3-us-west-1.amazonaws.com/duohub/logo/logo-light.svg" alt="duohub logo" height="20">

# duohub memory integration examples

This repository contains examples of how to use the duohub graph memory integration.

## [pipecat](/pipecat)  &nbsp; <img src="https://mintlify.s3-us-west-1.amazonaws.com/daily/logo/dark.svg" alt="pipecat logo" height="20">

This example shows how to use the duohub graph memory integration with the pipecat framework for voice AI. 

It uses: 

- OpenAI for the LLM
- Cartesia for the TTS
- Daily for the audio call
- duohub for the graph memory integration

Dependencies are managed with Poetry. The project can be containerised with Docker and deployed on ECS.

## [lambda](/lambda) &nbsp; <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Amazon_Lambda_architecture_logo.svg/1920px-Amazon_Lambda_architecture_logo.svg.png" alt="lambda logo" height="20">

This example demonstrates how to integrate duohub's graph memory with AWS Lambda for serverless memory retrieval.

It uses:

- AWS Lambda for serverless execution
- TypeScript for type-safe development
- duohub for memory retrieval
- Axios for API requests

Dependencies are managed with npm/yarn. The project can be deployed directly to AWS Lambda.