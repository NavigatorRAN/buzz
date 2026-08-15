#!/usr/bin/env python3
"""Drive the release Buzz LM Studio adapter over ACP against loopback."""

from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
import sys


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--binary", required=True)
    parser.add_argument("--image", required=True)
    parser.add_argument("--cwd", required=True)
    args = parser.parse_args()

    env = os.environ.copy()
    env.update(
        {
            "BUZZ_AGENT_PROVIDER": "lmstudio-native",
            "BUZZ_AGENT_MAX_CONTEXT_TOKENS": "65536",
            "BUZZ_AGENT_MAX_OUTPUT_TOKENS": "8192",
            "BUZZ_AGENT_LLM_TIMEOUT_SECS": "900",
            "BUZZ_AGENT_MAX_SESSIONS": "4",
            "BUZZ_AGENT_NO_HINTS": "1",
            "LM_STUDIO_BASE_URL": "http://127.0.0.1:1234",
            "LM_STUDIO_MODEL": "google/gemma-4-26b-a4b",
            "LM_STUDIO_MCP_INTEGRATIONS": "[]",
            "LM_STUDIO_REASONING": "off",
        }
    )
    env.pop("LM_STUDIO_FALLBACK_PROVIDER", None)

    child = subprocess.Popen(
        [args.binary],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
        env=env,
    )
    assert child.stdin is not None
    assert child.stdout is not None

    next_id = 1

    def call(method: str, params: dict) -> tuple[dict, str, list[str]]:
        nonlocal next_id
        request_id = next_id
        next_id += 1
        child.stdin.write(
            json.dumps(
                {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "method": method,
                    "params": params,
                }
            )
            + "\n"
        )
        child.stdin.flush()
        messages: list[str] = []
        thoughts: list[str] = []
        while True:
            line = child.stdout.readline()
            if not line:
                stderr = child.stderr.read() if child.stderr is not None else ""
                raise RuntimeError(f"adapter exited before response: {stderr[-1000:]}")
            value = json.loads(line)
            if value.get("id") == request_id:
                return value, "".join(messages), thoughts
            update = value.get("params", {}).get("update", {})
            content = update.get("content", {})
            if update.get("sessionUpdate") == "agent_message_chunk":
                messages.append(content.get("text", ""))
            elif update.get("sessionUpdate") == "agent_thought_chunk":
                thoughts.append(content.get("text", ""))

    initialize, _, _ = call(
        "initialize", {"protocolVersion": 2, "clientCapabilities": {}}
    )
    if "error" in initialize:
        raise RuntimeError(initialize["error"])

    def new_session() -> str:
        response, _, _ = call(
            "session/new",
            {
                "cwd": os.path.abspath(args.cwd),
                "mcpServers": [],
                "systemPrompt": "Follow the user instruction exactly.",
            },
        )
        if "error" in response:
            raise RuntimeError(response["error"])
        return response["result"]["sessionId"]

    text_session = new_session()
    text_response, text, text_thoughts = call(
        "session/prompt",
        {
            "sessionId": text_session,
            "prompt": [{"type": "text", "text": "Reply exactly BUZZ ADAPTER READY"}],
        },
    )
    if "error" in text_response or text.strip() != "BUZZ ADAPTER READY" or text_thoughts:
        raise RuntimeError(
            f"text canary failed: response={text_response!r} text={text!r} thoughts={len(text_thoughts)}"
        )

    with open(args.image, "rb") as image_file:
        image_data = base64.b64encode(image_file.read()).decode("ascii")
    image_session = new_session()
    image_response, image_text, image_thoughts = call(
        "session/prompt",
        {
            "sessionId": image_session,
            "prompt": [
                {
                    "type": "text",
                    "text": "Read the single word shown in the image. Reply exactly Buzz",
                },
                {"type": "image", "data": image_data, "mimeType": "image/png"},
            ],
        },
    )
    if (
        "error" in image_response
        or image_text.strip() != "Buzz"
        or image_thoughts
    ):
        raise RuntimeError(
            f"image canary failed: response={image_response!r} text={image_text!r} thoughts={len(image_thoughts)}"
        )

    child.stdin.close()
    child.wait(timeout=10)
    print(
        json.dumps(
            {
                "adapter": "buzz-lmstudio-agent",
                "model": "google/gemma-4-26b-a4b",
                "text": "pass",
                "nativeImage": "pass",
                "reasoning": "off",
                "contextLength": 65536,
                "generationCapacity": 1,
                "result": "pass",
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"live adapter canary failed: {error}", file=sys.stderr)
        raise SystemExit(1)
