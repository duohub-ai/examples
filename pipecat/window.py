import io
import json
import logging
from typing import List, Iterator
from duohub import Duohub
from openai._types import NOT_GIVEN, NotGiven
from openai.types.chat import (
    ChatCompletionToolParam,
    ChatCompletionToolChoiceOptionParam,
    ChatCompletionMessageParam
)

logger = logging.getLogger(__name__)

class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, io.BytesIO):
            return (f"{obj.getbuffer()[0:8].hex()}...")
        return super().default(obj)

class Window:
    def __init__(
        self,
        messages: List[ChatCompletionMessageParam] | None = None,
        tools: List[ChatCompletionToolParam] | NotGiven = NOT_GIVEN,
        tool_choice: ChatCompletionToolChoiceOptionParam | NotGiven = NOT_GIVEN,
        memory_id: str | None = None,
        api_key: str | None = None,
        system_prompt: str = "You are a helpful assistant."
    ):
        """Initialize a Window instance for managing chat messages and tools.

        Args:
            messages: Initial list of chat messages
            tools: List of available tools
            tool_choice: Selected tool choice
            memory_id: ID for memory context
            api_key: API key for Duohub
            system_prompt: System prompt message
        """
        logger.info(f"Initializing Window with memory_id: {memory_id}")
        self.api_key = api_key
        self.system_message = {
            "role": "system",
            "content": system_prompt
        }
        
        self.messages: List[ChatCompletionMessageParam] = []
        if messages:
            self.messages.extend(messages)
        
        self.tool_choice: ChatCompletionToolChoiceOptionParam | NotGiven = tool_choice
        self.tools: List[ChatCompletionToolParam] | NotGiven = tools
        self.duohub_client = Duohub(api_key=self.api_key)
        self.memory_id = memory_id
        
        logger.debug(f"Initial message count: {len(self.messages)}")
        logger.debug(f"Tool choice: {self.tool_choice}")
        logger.debug(f"Tools: {self.tools}")

    @staticmethod
    def from_messages(
        messages: List[dict], 
        memory_id: str | None = None, 
        api_key: str | None = None
    ) -> "Window":
        """Create a Window instance from a list of messages.

        Args:
            messages: List of message dictionaries
            memory_id: ID for memory context
            api_key: API key for Duohub

        Returns:
            Window: New Window instance with loaded messages
        """
        logger.info(f"Creating Window from messages with memory_id: {memory_id}")
        context = Window(memory_id=memory_id, api_key=api_key)
        for message in messages:
            context.add_message(message)
        logger.debug(f"Created Window with {len(context.messages)} messages")
        return context

    def add_message(self, message: ChatCompletionMessageParam):
        logger.debug(f"Adding message: {message['role']} - {message.get('content', '')[:50]}...")
        self.messages.append(message)

        if message['role'] == 'user' and self.memory_id:
            duohub_response = self.duohub_client.query(query=message['content'], memoryID=self.memory_id, assisted=True)
            if duohub_response and isinstance(duohub_response, dict) and 'payload' in duohub_response:
                context_message = {
                    "role": "system",
                    "content": f"Context from graph: {duohub_response['payload']}"
                }
                self.messages.append(context_message)
                logger.info(f"Added Duohub context to messages: {context_message}")

        logger.info(f"Total messages after addition: {len(self.messages)}")

    def get_messages(self) -> List[ChatCompletionMessageParam]:
        logger.debug("Retrieving messages")
        messages = [self.system_message]
        
        # Add at least 10 messages from the history, or all if less than 10
        history_messages = self.messages[-10:] if len(self.messages) > 10 else self.messages
        messages.extend(history_messages)
        
        logger.info(f"Retrieved {len(messages)} messages")
        return messages

    def get_messages_json(self) -> str:
        logger.debug("Converting messages to JSON")

        messages = self.get_messages()
        json_result = json.dumps(messages, cls=CustomEncoder)
        logger.debug(f"JSON result length: {len(json_result)}")
        return json_result

    def get_messages_for_logging(self) -> List[dict]:
        logger.debug("Preparing messages for logging")
        messages = self.get_messages()
        return [
            {
                "role": msg["role"],
                "content": msg.get("content", "")[:50] + "..." if msg.get("content") else None
            }
            for msg in messages
        ]

    def set_tool_choice(self, tool_choice: ChatCompletionToolChoiceOptionParam | NotGiven):
        logger.info(f"Setting tool choice: {tool_choice}")
        self.tool_choice = tool_choice

    def set_tools(self, tools: List[ChatCompletionToolParam] | NotGiven = NOT_GIVEN):
        if tools != NOT_GIVEN and len(tools) == 0:
            logger.info("Setting tools to NOT_GIVEN due to empty list")
            tools = NOT_GIVEN
        else:
            logger.info(f"Setting tools: {tools}")
        self.tools = tools

    def __iter__(self) -> Iterator[ChatCompletionMessageParam]:
        """Iterate over messages in the window.

        Returns:
            Iterator of chat completion messages
        """
        logger.debug("Iterating over messages")
        return iter(self.get_messages())
