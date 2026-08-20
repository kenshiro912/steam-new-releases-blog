#!/bin/bash
# git commit の直前に、.env等の秘密情報ファイルがステージされていないか確認する。
# ステージされていた場合はコミットをブロックする。

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# git commit を含まないBashコマンドは対象外
if [[ "$COMMAND" != *"git commit"* ]]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0

PROTECTED_PATTERNS=("^\.env$" "^\.env\..*" ".*\.pem$" ".*\.key$")

STAGED_FILES=$(git diff --cached --name-only 2>/dev/null)

for file in $STAGED_FILES; do
  for pattern in "${PROTECTED_PATTERNS[@]}"; do
    if [[ "$file" =~ $pattern ]]; then
      echo "Blocked: ステージされたファイル '$file' は秘密情報ファイルのパターン '$pattern' に一致します。git reset で unstage してからコミットしてください。" >&2
      exit 2
    fi
  done
done

exit 0
