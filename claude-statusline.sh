#!/usr/bin/env bash
input=$(cat)

# Colors (actual escape sequences via $'...')
RESET=$'\033[0m'
BOLD=$'\033[1m'
DIM=$'\033[2m'
CYAN=$'\033[36m'
GREEN=$'\033[32m'
YELLOW=$'\033[33m'
RED=$'\033[31m'
BLUE=$'\033[34m'
MAGENTA=$'\033[35m'

model=$(echo "$input" | jq -r '.model.display_name // "unknown"')
used=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d'.' -f1)
cwd=$(echo "$input" | jq -r '.cwd // ""')
branch=$(git -C "$cwd" branch --show-current 2>/dev/null)
pr_json=$(cd "$cwd" && gh pr view --json number,url 2>/dev/null)
pr_number=$(echo "$pr_json" | jq -r '.number // empty' 2>/dev/null)
pr_url=$(echo "$pr_json" | jq -r '.url // empty' 2>/dev/null)
worktree_name=$(echo "$input" | jq -r '.worktree.name // empty')
worktree_branch=$(echo "$input" | jq -r '.worktree.branch // empty')
rate_5h=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
rate_7d=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty')

SEP=" ${DIM}│${RESET} "

# Helper: build a progress bar
# Usage: make_bar <percentage> <width>
make_bar() {
  local pct=$1 width=$2
  local filled=$(( pct * width / 100 ))
  local empty=$(( width - filled ))
  local bar=""
  for ((i=0; i<filled; i++)); do bar="${bar}▓"; done
  for ((i=0; i<empty; i++)); do bar="${bar}░"; done
  echo "$bar"
}

# Helper: color by percentage threshold
color_for_pct() {
  local pct=$1
  if [ "$pct" -ge 80 ]; then echo "$RED"
  elif [ "$pct" -ge 50 ]; then echo "$YELLOW"
  else echo "$GREEN"; fi
}

# --- Line 1: Model │ Branch │ PR │ Worktree ---
printf '%s' "${CYAN}${BOLD}${model}${RESET}"

if [ -n "$branch" ]; then
  printf '%s' "${SEP}${BLUE}⎇ ${branch}${RESET}"
fi

if [ -n "$pr_url" ]; then
  printf '%s' "${SEP}${MAGENTA}${pr_url}${RESET}"
elif [ -n "$pr_number" ]; then
  printf '%s' "${SEP}${MAGENTA}PR #${pr_number}${RESET}"
fi

if [ -n "$worktree_name" ]; then
  WT="${YELLOW}worktree: ${worktree_name}${RESET}"
  if [ -n "$worktree_branch" ]; then
    WT="${WT} ${DIM}(${worktree_branch})${RESET}"
  fi
  printf '%s' "${SEP}${WT}"
fi

# --- Line 2: Context │ 5h │ 7d ---
CTX_COLOR=$(color_for_pct "$used")
CTX_BAR=$(make_bar "$used" 10)
printf '\n%s' "${DIM}ctx${RESET} ${CTX_COLOR}${CTX_BAR}${RESET} ${DIM}${used}%${RESET}"

if [ -n "$rate_5h" ]; then
  rate_5h_int=$(printf '%.0f' "$rate_5h")
  R5_COLOR=$(color_for_pct "$rate_5h_int")
  R5_BAR=$(make_bar "$rate_5h_int" 5)
  printf '%s' "${SEP}${DIM}5h${RESET} ${R5_COLOR}${R5_BAR}${RESET} ${DIM}${rate_5h_int}%${RESET}"
fi

if [ -n "$rate_7d" ]; then
  rate_7d_int=$(printf '%.0f' "$rate_7d")
  R7_COLOR=$(color_for_pct "$rate_7d_int")
  R7_BAR=$(make_bar "$rate_7d_int" 5)
  printf '%s' "${SEP}${DIM}7d${RESET} ${R7_COLOR}${R7_BAR}${RESET} ${DIM}${rate_7d_int}%${RESET}"
fi

printf '\n'
