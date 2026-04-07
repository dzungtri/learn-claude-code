# s00: LLM Foundation

`[ s00 ] s01 > s02 > s03 > s04 > s05 > s06 | s07 > s08 > s09 > s10 > s11 > s12`

> *"Before the loop, inspect the reply"* -- a tool call is just a content block until your harness executes it.
>
> **Harness layer**: Direct model call -- understanding the raw assistant message body.

## Problem

If you jump straight into the agent loop, it can look magical: the model "somehow" decides to use tools and "somehow" the loop knows what to do next. That hides the real foundation.

Before there is an agent, there is just one API call:

- you push `messages[]`
- the model returns `response.content[]`
- each item in `content[]` is a typed block

If you understand that shape first, the loop in `s01` becomes obvious.

## Solution

```
+-----------+      +-------+      +----------------------+
| messages[]| ---> |  LLM  | ---> | assistant response   |
+-----------+      +-------+      | - stop_reason        |
                                  | - text block(s)      |
                                  | - tool_use block(s)  |
                                  +----------------------+
```

In `s00`, we do one direct `client.messages.create(...)` call and print what came back. No tool execution. No loop. Just inspection.

## How It Works

1. Push the current conversation history to the model.

```python
response = client.messages.create(
    model=MODEL,
    system=SYSTEM,
    messages=messages,
    tools=TOOLS,
    max_tokens=2000,
)
```

2. Read the top-level control signal: `stop_reason`.

```python
print(f"stop_reason: {response.stop_reason}")
```

3. Walk the returned content blocks one by one.

```python
for block in response.content:
    if block.type == "text":
        print(block.text)
    elif block.type == "tool_use":
        print(block.name)
        print(block.input)
```

4. Stop there on purpose.

If the model emitted a `tool_use` block, `s00` does not execute it. That is the teaching point: a tool call is just structured output. `s01` adds the loop that turns that structure into action. Because there is no matching `tool_result` yet, `s00` also avoids saving that unfinished tool turn into chat history.

Full shape:

```python
def inspect_once(history, query):
    messages = history + [{"role": "user", "content": query}]
    response = client.messages.create(
        model=MODEL,
        system=SYSTEM,
        messages=messages,
        tools=TOOLS,
        max_tokens=2000,
    )

    print(f"stop_reason: {response.stop_reason}")
    for block in response.content:
        if block.type == "text":
            print(block.text)
        elif block.type == "tool_use":
            print(block.name)
            print(block.input)
            return

    history.append({"role": "user", "content": query})
    history.append({"role": "assistant", "content": response.content})
```

## What Changed

| Component     | Before | After                          |
|---------------|--------|--------------------------------|
| API call      | (none) | One direct `messages.create()` |
| Response view | (none) | Inspect `response.content[]`   |
| Control flow  | (none) | Read `stop_reason` only        |
| Tool handling | (none) | Observe tool blocks, do not run |

## Try It

```sh
cd learn-claude-code
python agents/s00_llm_foundation.py
```

1. `Say hello in one sentence`
2. `What are the first three prime numbers?`
3. `Use bash to print the current directory. Do not explain after the tool call.`
4. `Use bash to list files, then stop.`

When you see `stop_reason: tool_use`, you are looking at the raw material that `s01` turns into an agent loop.
