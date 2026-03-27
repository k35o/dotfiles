#!/bin/bash
event=$(cat)
event_type=$(echo "$event" | jq -r '.type // empty')
tool_name=$(echo "$event" | jq -r '.tool_name // empty')

if [ "$event_type" = "Stop" ]; then
  cmux notify --title "Claude Code" --body "Session complete"
elif [ "$event_type" = "PostToolUse" ] && [ "$tool_name" = "Task" ]; then
  cmux notify --title "Claude Code" --body "Agent finished"
fi
