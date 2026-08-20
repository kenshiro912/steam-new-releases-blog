#!/bin/bash
# git add / git commit を含むBashコマンドの実行前に、.env等の秘密情報ファイルが
# 対象になっていないか確認する。該当すればコマンド自体をブロックする。
#
# 二重チェック構成:
#   1. コマンド文字列そのものに保護パターンへの言及がないか（`git add -f .env` を
#      単独で実行するケースや、`git add ... && git commit ...` のように add と commit を
#      1コマンドにまとめて実行し、実行前時点ではまだステージングされていないケースに対応）
#   2. 既にステージされているファイル一覧に保護パターンへの一致がないか（`git add` を
#      別コマンドで先に実行済みの状態で `git commit` する一般的なケースに対応）

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# git add / git commit のどちらも含まないコマンドは対象外
if [[ "$COMMAND" != *"git add"* && "$COMMAND" != *"git commit"* ]]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0

# ファイル名末尾（パス区切りの直後、または文字列先頭）に一致させ、
# サブディレクトリ配下の同名ファイルも保護対象にする
PROTECTED_PATTERNS=(
  '(^|/)\.env$'
  '(^|/)\.env\.[^/]*$'
  '(^|/)[^/]*\.pem$'
  '(^|/)[^/]*\.key$'
)

# .env.example / .env.sample / .env.template は秘密情報を含まない
# 慣習的なテンプレートファイルなので保護対象から除外する
SAFE_EXCEPTIONS=(
  '(^|/)\.env\.(example|sample|template)$'
)

matches_protected_pattern() {
  local target="$1"
  for exception in "${SAFE_EXCEPTIONS[@]}"; do
    if [[ "$target" =~ $exception ]]; then
      return 1
    fi
  done
  for pattern in "${PROTECTED_PATTERNS[@]}"; do
    if [[ "$target" =~ $pattern ]]; then
      return 0
    fi
  done
  return 1
}

# 1. コマンド文字列から「git add ...」の区間だけを抜き出し（&&・|・;・改行で区切る）、
#    その区間内のトークン（引数）が保護対象ファイルに一致しないか確認する。
#    addの区間だけに限定することで、コミットメッセージ本文中に偶然".env"等の
#    文字列が含まれていても誤検知しないようにする。
ADD_SEGMENTS=$(printf '%s\n' "$COMMAND" | grep -oE 'git add [^&|;]*' || true)
if [[ -n "$ADD_SEGMENTS" ]]; then
  while IFS= read -r segment; do
    for token in $segment; do
      if matches_protected_pattern "$token"; then
        echo "Blocked: 'git add' の引数 '$token' は秘密情報ファイルのパターンに一致します: $segment" >&2
        exit 2
      fi
    done
  done <<< "$ADD_SEGMENTS"
fi

# 2. 既にステージ済みのファイルに保護対象がないか
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null)
for file in $STAGED_FILES; do
  if matches_protected_pattern "$file"; then
    echo "Blocked: ステージされたファイル '$file' は秘密情報ファイルのパターンに一致します。git reset で unstage してからコミットしてください。" >&2
    exit 2
  fi
done

exit 0
