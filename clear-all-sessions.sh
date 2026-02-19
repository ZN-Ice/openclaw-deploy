#!/bin/bash
# 获取所有Session Key
SESSION_KEYS=$(moltbot gateway call sessions.list --json | jq -r '.sessions[].key')

# 遍历并删除每个Session
for session_key in $SESSION_KEYS; do
  echo "Deleting session: $session_key"
  moltbot gateway call sessions.delete --params "{\"key\": \"$session_key\"}"
done

echo "All sessions deleted successfully!"