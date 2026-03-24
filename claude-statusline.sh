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

# Progress bar for context window (10 chars wide)
BAR_WIDTH=10
FILLED=$(( used * BAR_WIDTH / 100 ))
EMPTY=$(( BAR_WIDTH - FILLED ))
BAR=""
for ((i=0; i<FILLED; i++)); do BAR="${BAR}▓"; done
for ((i=0; i<EMPTY; i++)); do BAR="${BAR}░"; done

# Color the bar based on usage
if [ "$used" -ge 80 ]; then
  BAR_COLOR="$RED"
elif [ "$used" -ge 50 ]; then
  BAR_COLOR="$YELLOW"
else
  BAR_COLOR="$GREEN"
fi

SEP="${DIM}|${RESET}"

# Model (cyan bold)
printf '%s' "${CYAN}${BOLD}${model}${RESET}"

# Context bar
printf '%s' " ${SEP} ctx: ${BAR_COLOR}${BAR}${RESET} ${DIM}${used}%${RESET}"

# Branch (blue)
if [ -n "$branch" ]; then
  printf '%s' " ${SEP} ${BLUE}${branch}${RESET}"
fi

# PR link – second line so URL is fully visible
if [ -n "$pr_url" ]; then
  printf '\n%s' "${MAGENTA}${pr_url}${RESET}"
elif [ -n "$pr_number" ]; then
  printf '\n%s' "${MAGENTA}PR #${pr_number}${RESET}"
fi

# Rate limits (only shown for Pro/Max subscribers)
if [ -n "$rate_5h" ]; then
  rate_5h_int=$(printf '%.0f' "$rate_5h")
  if [ "$rate_5h_int" -ge 80 ]; then RATE_5H_COLOR="$RED"
  elif [ "$rate_5h_int" -ge 50 ]; then RATE_5H_COLOR="$YELLOW"
  else RATE_5H_COLOR="$GREEN"; fi
  printf '%s' " ${SEP} 5h: ${RATE_5H_COLOR}${rate_5h_int}%${RESET}"
fi
if [ -n "$rate_7d" ]; then
  rate_7d_int=$(printf '%.0f' "$rate_7d")
  if [ "$rate_7d_int" -ge 80 ]; then RATE_7D_COLOR="$RED"
  elif [ "$rate_7d_int" -ge 50 ]; then RATE_7D_COLOR="$YELLOW"
  else RATE_7D_COLOR="$GREEN"; fi
  printf '%s' " ${SEP} 7d: ${RATE_7D_COLOR}${rate_7d_int}%${RESET}"
fi

# Worktree (yellow)
if [ -n "$worktree_name" ]; then
  WT="${YELLOW}worktree: ${worktree_name}${RESET}"
  if [ -n "$worktree_branch" ]; then
    WT="${WT} ${DIM}(${worktree_branch})${RESET}"
  fi
  printf '%s' " ${SEP} ${WT}"
fi

printf '\n'
