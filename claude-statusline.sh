#!/usr/bin/env bash
input=$(cat)

model=$(echo "$input" | jq -r '.model.display_name // "unknown"')
used=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
branch=$(git -C "$(echo "$input" | jq -r '.cwd')" branch --show-current 2>/dev/null)
pr=$(gh pr view --json number -q .number 2>/dev/null)

parts="$model"

if [ -n "$used" ]; then
  parts="$parts | ctx: ${used}%"
fi

if [ -n "$branch" ]; then
  parts="$parts | $branch"
fi

if [ -n "$pr" ]; then
  parts="$parts | PR #$pr"
fi

echo "$parts"
