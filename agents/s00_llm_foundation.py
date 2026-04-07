#!/usr/bin/env python3
# Harness: direct model call -- inspect the reply before building the loop.
"""
s00_llm_foundation.py - LLM Foundation

Before an agent can run tools, it needs one simpler idea:
an LLM reply is a structured message body with content blocks.

    messages[] ----> LLM ----> response
                               |
                               +--> stop_reason
                               +--> text block(s)
                               +--> tool_use block(s)

Key insight: a tool call is just data in the response body until
your harness chooses to execute it.
"""

import json
import os

try:
    import readline
    # #143 UTF-8 backspace fix for macOS libedit
    readline.parse_and_bind('set bind-tty-special-chars off')
    readline.parse_and_bind('set input-meta on')
    readline.parse_and_bind('set output-meta on')
    readline.parse_and_bind('set convert-meta off')
    readline.parse_and_bind('set enable-meta-keybindings on')
except ImportError:
    pass

from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv(override=True)

if os.getenv("ANTHROPIC_BASE_URL"):
    os.environ.pop("ANTHROPIC_AUTH_TOKEN", None)

client = Anthropic(base_url=os.getenv("ANTHROPIC_BASE_URL"))
MODEL = os.environ["MODEL_ID"]

SYSTEM = (
    f"You are a coding assistant at {os.getcwd()}. "
    "Keep replies compact. If a tool would help, you may emit a tool call."
)

TOOLS = [{
    "name": "bash",
    "description": "Run a shell command.",
    "input_schema": {
        "type": "object",
        "properties": {"command": {"type": "string"}},
        "required": ["command"],
    },
},  {
    "name": "get_weather",
    "description": "Get the current weather for a location.",
    "input_schema": {
        "type": "object",
        "properties": {"location": {"type": "string"}},
        "required": ["location"],
    },
}
]


def dump_block(block) -> None:
    print(f"[{block.type}]")
    if block.type == "text":
        text = block.text.strip() or "(empty text)"
        print("msg:")
        print(text)
        return

    if block.type == "tool_use":
        print(f"tool_name: {block.name}")
        print(f"tool_use_id: {block.id}")
        print("tool_params:")
        print(json.dumps(block.input, indent=2, ensure_ascii=False))
        return

    print("raw_block:")
    if hasattr(block, "model_dump"):
        print(json.dumps(block.model_dump(), indent=2,
              ensure_ascii=False, default=str))
    else:
        print(str(block))


def inspect_once(history: list, query: str) -> None:
    messages = history + [{"role": "user", "content": query}]
    response = client.messages.create(
        model=MODEL,
        system=SYSTEM,
        messages=messages,
        tools=TOOLS,
        max_tokens=2000,
    )

    print("\n=== Assistant Response ===")
    print(f"stop_reason: {response.stop_reason}")
    print(f"content_blocks: {len(response.content)}")
    print()

    for idx, block in enumerate(response.content, start=1):
        print(f"Block {idx}")
        dump_block(block)
        print()

    if response.stop_reason == "tool_use":
        print("s00 stops here on purpose.")
        print("s01 adds the loop that executes the tool and sends tool_result back.")
        print("This unfinished tool turn is not saved into chat history.")
        return

    history.append({"role": "user", "content": query})
    history.append({"role": "assistant", "content": response.content})


if __name__ == "__main__":
    history = []
    while True:
        try:
            query = input("\033[36ms00 _> \033[0m")
        except (EOFError, KeyboardInterrupt):
            break
        if query.strip().lower() in ("q", "exit", ""):
            break
        inspect_once(history, query)
