import json
import os
import requests
from typing import Dict, Any, Optional

API_KEY = os.environ['DUOHUB_API_KEY']
BASE_URL = "https://api.duohub.ai"

headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY
}

def validate_role(role: str) -> bool:
    """Validate if the role is valid"""
    valid_roles = ['user', 'assistant', 'system']
    return role in valid_roles

def build_query_params(params: Dict[str, Any]) -> Dict[str, Any]:
    """Build query parameters, removing None values"""
    return {k: v for k, v in params.items() if v is not None}

def get_messages(
    session_id: Optional[str] = None,
    customer_user_id: Optional[str] = None,
    role: Optional[str] = None,
    limit: Optional[int] = 20,
    next_token: Optional[str] = None,
    previous_token: Optional[str] = None
) -> Dict:
    """
    Get messages with pagination support
    """
    params = build_query_params({
        "sessionID": session_id,
        "customerUserID": customer_user_id,
        "role": role,
        "limit": limit,
        "nextToken": next_token,
        "previousToken": previous_token
    })

    response = requests.get(
        f"{BASE_URL}/messages/list",
        headers=headers,
        params=params
    )
    response.raise_for_status()
    return response.json()

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict:
    try:
        # Extract query parameters
        query_params = event.get('queryStringParameters', {}) or {}
        
        session_id = query_params.get('sessionID')
        customer_user_id = query_params.get('customerUserID')
        role = query_params.get('role')
        
        # Parse and validate limit
        try:
            limit = int(query_params.get('limit', 20))
            if limit < 1 or limit > 100:
                limit = 20
        except (ValueError, TypeError):
            limit = 20

        next_token = query_params.get('nextToken')
        previous_token = query_params.get('previousToken')

        # Validate parameters
        if not (session_id or customer_user_id):
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Either sessionID or customerUserID must be provided'
                }),
                'headers': {
                    'Content-Type': 'application/json'
                }
            }

        if role and not validate_role(role):
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Invalid role. Must be one of: user, assistant, system'
                }),
                'headers': {
                    'Content-Type': 'application/json'
                }
            }

        # If both next_token and previous_token are provided, prioritize next_token
        if next_token and previous_token:
            previous_token = None

        # Get messages
        response_data = get_messages(
            session_id=session_id,
            customer_user_id=customer_user_id,
            role=role,
            limit=limit,
            next_token=next_token,
            previous_token=previous_token
        )

        # Extract pagination tokens from response
        data = response_data.get('data', {})
        pagination = {
            'nextToken': data.get('nextToken'),
            'previousToken': data.get('previousToken'),
            'totalCount': data.get('totalCount', 0)
        }

        # Build response with pagination metadata
        response = {
            'messages': data.get('messages', []),
            'pagination': pagination
        }

        return {
            'statusCode': 200,
            'body': json.dumps(response),
            'headers': {
                'Content-Type': 'application/json'
            }
        }

    except requests.exceptions.RequestException as e:
        status_code = e.response.status_code if hasattr(e, 'response') else 500
        error_message = str(e)
        
        if hasattr(e, 'response') and e.response.content:
            try:
                error_data = e.response.json()
                error_message = error_data.get('message', str(e))
            except json.JSONDecodeError:
                pass

        return {
            'statusCode': status_code,
            'body': json.dumps({
                'error': error_message
            }),
            'headers': {
                'Content-Type': 'application/json'
            }
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': f'Internal server error: {str(e)}'
            }),
            'headers': {
                'Content-Type': 'application/json'
            }
        }