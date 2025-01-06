import json
import os
import requests
from openai import OpenAI
from operator import itemgetter
from typing import Optional, Dict, List, Any

API_KEY = os.environ['DUOHUB_API_KEY']
OPENAI_API_KEY = os.environ['OPENAI_API_KEY']
BASE_URL = "https://api.duohub.ai"

headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY
}

client = OpenAI(api_key=OPENAI_API_KEY)

def get_session(session_id: str) -> Optional[Dict]:
    """Check if a session exists"""
    try:
        response = requests.get(
            f"{BASE_URL}/sessions/get/{session_id}",
            headers=headers
        )
        if response.status_code == 200:
            return response.json()
        return None
    except requests.exceptions.RequestException:
        return None

def create_session(customer_user_id: str, metadata: Optional[List] = None) -> Dict:
    """Create a new session"""
    payload = {
        "customerUserID": customer_user_id
    }
    if metadata:
        payload["metadata"] = metadata

    response = requests.post(
        f"{BASE_URL}/sessions/create",
        headers=headers,
        json=payload
    )
    response.raise_for_status()
    return response.json()

def create_message(session_id: str, content: str, role: str, customer_user_id: Optional[str] = None) -> Dict:
    """Create a new message"""
    payload = {
        "sessionID": session_id,
        "role": role,
        "content": content
    }
    if customer_user_id:
        payload["customerUserID"] = customer_user_id

    response = requests.post(
        f"{BASE_URL}/messages/create",
        headers=headers,
        json=payload
    )
    response.raise_for_status()
    return response.json()

def retrieve_memory(memory_id: str, query: str, assisted: bool = True) -> Dict:
    """Retrieve memory context"""
    params = {
        "memoryID": memory_id,
        "query": query,
        "assisted": assisted
    }

    response = requests.get(
        f"{BASE_URL}/memory/",
        headers=headers,
        params=params
    )
    response.raise_for_status()
    return response.json()

def list_messages(session_id: str, customer_user_id: Optional[str] = None) -> Dict:
    """List messages for a session"""
    params = {
        "sessionID": session_id,
        "limit": 20
    }
    if customer_user_id:
        params["customerUserID"] = customer_user_id

    response = requests.get(
        f"{BASE_URL}/messages/list",
        headers=headers,
        params=params
    )
    response.raise_for_status()
    data = response.json()

    if data.get('data', {}).get('messages'):
        data['data']['messages'] = sorted(
            data['data']['messages'],
            key=itemgetter('updatedAt')
        )
    return data

def parse_to_openai_format(messages: List[Dict]) -> List[Dict]:
    """Convert messages to OpenAI format"""
    return [
        {
            "role": msg.get("role", "user"),
            "content": msg.get("content", "")
        }
        for msg in messages
    ]

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict:
    try:
        # Parse input parameters
        body = json.loads(event.get('body', '{}'))
        
        content = body.get('content')
        memory_id = body.get('memoryID')
        customer_user_id = body.get('customerUserID')
        session_id = body.get('sessionID')
        metadata = body.get('metadata')
        assisted = body.get('assisted', True)

        # Validate required parameters
        if not all([content, memory_id, customer_user_id]):
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Missing required parameters: content, memoryID, or customerUserID'
                })
            }

        # Check if session exists or create new one
        if session_id:
            session_data = get_session(session_id)
            if not session_data:
                session_data = create_session(customer_user_id, metadata)
        else:
            session_data = create_session(customer_user_id, metadata)

        session_id = session_data['data']['id']

        # Create user message
        create_message(
            session_id=session_id,
            content=content,
            role="user",
            customer_user_id=customer_user_id
        )

        # Get memory context
        memory_response = retrieve_memory(
            memory_id=memory_id,
            query=content,
            assisted=assisted
        )

        # Get chat history
        chat_history = list_messages(session_id=session_id)
        chat_messages = parse_to_openai_format(
            chat_history.get('data', {}).get('messages', [])
        )

        # Create completion request
        messages = [
            {"role": "system", "content": memory_response.get("payload", "")}
        ]
        messages.extend(chat_messages)

        # Get OpenAI response
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=messages
        )

        assistant_response = completion.choices[0].message.content

        # Create assistant message
        create_message(
            session_id=session_id,
            content=assistant_response,
            role="assistant",
            customer_user_id=customer_user_id
        )

        return {
            'statusCode': 200,
            'body': json.dumps({
                'response': assistant_response,
                'sessionID': session_id
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }