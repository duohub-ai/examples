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

def validate_email(email: str) -> bool:
    """Basic email validation"""
    if not email:
        return True  # Email is optional
    return '@' in email and '.' in email.split('@')[1]

def validate_phone(phone: str) -> bool:
    """Basic phone validation"""
    if not phone:
        return True  # Phone is optional
    return len(phone.replace(' ', '').replace('-', '').replace('+', '')) >= 10

def create_user(
    first_name: str,
    last_name: str,
    user_id: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None
) -> Dict:
    """
    Create a new user in DuoHub
    """
    payload = {
        "firstName": first_name,
        "lastName": last_name
    }

    if user_id:
        payload["id"] = user_id
    if email:
        payload["email"] = email
    if phone:
        payload["phone"] = phone

    response = requests.post(
        f"{BASE_URL}/users/create",
        headers=headers,
        json=payload
    )
    response.raise_for_status()
    return response.json()

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict:
    try:
        # Parse input parameters
        body = json.loads(event.get('body', '{}'))
        
        # Extract required fields
        first_name = body.get('firstName')
        last_name = body.get('lastName')
        
        # Extract optional fields
        user_id = body.get('id')
        email = body.get('email')
        phone = body.get('phone')

        # Validate required fields
        if not first_name or not last_name:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Missing required fields: firstName and lastName are required'
                }),
                'headers': {
                    'Content-Type': 'application/json'
                }
            }

        # Validate email format if provided
        if email and not validate_email(email):
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Invalid email format'
                }),
                'headers': {
                    'Content-Type': 'application/json'
                }
            }

        # Validate phone format if provided
        if phone and not validate_phone(phone):
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Invalid phone format. Must be at least 10 digits'
                }),
                'headers': {
                    'Content-Type': 'application/json'
                }
            }

        # Create user
        response_data = create_user(
            first_name=first_name,
            last_name=last_name,
            user_id=user_id,
            email=email,
            phone=phone
        )

        return {
            'statusCode': 200,
            'body': json.dumps(response_data),
            'headers': {
                'Content-Type': 'application/json'
            }
        }

    except requests.exceptions.RequestException as e:
        # Handle API-specific errors
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
        # Handle unexpected errors
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': f'Internal server error: {str(e)}'
            }),
            'headers': {
                'Content-Type': 'application/json'
            }
        }