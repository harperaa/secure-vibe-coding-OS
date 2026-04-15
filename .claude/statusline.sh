#!/bin/bash

# Function to format numbers in k notation
format_k() {
    local num=$1
    if [ "$num" -ge 1000 ]; then
        echo "$((num / 1000))k"
    else
        echo "$num"
    fi
}

# Read JSON input from stdin
input=$(cat)

# 1. Model name
model=$(echo "$input" | jq -r '.model.display_name')

# 2. Progress bar - calculate percentage first
usage=$(echo "$input" | jq '.context_window.current_usage')
if [ "$usage" != "null" ]; then
    current=$(echo "$usage" | jq '.input_tokens + .cache_creation_input_tokens +
 .cache_read_input_tokens')
    size=$(echo "$input" | jq '.context_window.context_window_size')
    pct=$((current * 100 / size))

    # Create progress bar (10 chars wide)
    filled=$((pct * 10 / 100))
    empty=$((10 - filled))
    bar=$(printf '%*s' "$filled" | tr ' ' '█')$(printf '%*s' "$empty" | tr ' ' '░')

    # 3. Percentage
    pct_display="${pct}%"

    # 4. Tokens (showing current context usage in k notation)
    current_k=$(format_k "$current")
    size_k=$(format_k "$size")
    tokens="${current_k}/${size_k}"
else
    bar="██████████"
    pct_display="0%"
    tokens="0/0"
fi

# 5. Session cost - calculate based on model pricing
model_id=$(echo "$input" | jq -r '.model.id')
total_input=$(echo "$input" | jq '.context_window.total_input_tokens')
total_output=$(echo "$input" | jq '.context_window.total_output_tokens')

# Pricing per million tokens (as of Jan 2025)
case "$model_id" in
    "claude-opus-4-5-20251101")
        input_price=15.00
        output_price=75.00
        ;;
    "claude-sonnet-4-5-20250929")
        input_price=3.00
        output_price=15.00
        ;;
    "claude-3-5-sonnet-20241022")
        input_price=3.00
        output_price=15.00
        ;;
    "claude-3-5-haiku-20241022")
        input_price=1.00
        output_price=5.00
        ;;
    *)
        # Default to Sonnet pricing
        input_price=3.00
        output_price=15.00
        ;;
esac

# Calculate cost in cents to avoid floating point, then convert to dollars
input_cost=$(awk "BEGIN {printf \"%.0f\", ($total_input / 1000000) * $input_price * 100}")
output_cost=$(awk "BEGIN {printf \"%.0f\", ($total_output / 1000000) * $output_price * 100}")
total_cost_cents=$((input_cost + output_cost))
session_cost=$(awk "BEGIN {printf \"\$%.2f\", $total_cost_cents / 100}")

# 6. Cumulative tokens (total session)
cumulative_total=$((total_input + total_output))
cumulative_k=$(format_k "$cumulative_total")

# 7. Rate limit usage
session_pct=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty | if . != "" then round else . end')
week_pct=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty | if . != "" then round else . end')
if [ -n "$session_pct" ] && [ "$session_pct" -ge 80 ] 2>/dev/null; then
  session_pct_display="\033[31m${session_pct}%\033[0m"
elif [ -n "$session_pct" ] && [ "$session_pct" -ge 60 ] 2>/dev/null; then
  session_pct_display="\033[33m${session_pct}%\033[0m"
else
  session_pct_display="${session_pct:-—}%"
fi
if [ -n "$week_pct" ] && [ "$week_pct" -ge 80 ] 2>/dev/null; then
  week_pct_display="\033[31m${week_pct}%\033[0m"
elif [ -n "$week_pct" ] && [ "$week_pct" -ge 60 ] 2>/dev/null; then
  week_pct_display="\033[33m${week_pct}%\033[0m"
else
  week_pct_display="${week_pct:-—}%"
fi

# 8. Git branch + unstaged count
branch=""
unstaged=""
if git rev-parse --git-dir > /dev/null 2>&1; then
    branch=$(git branch 2>/dev/null | sed -n '/\* /s///p')
    unstaged_count=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    if [ "$unstaged_count" -gt 0 ] 2>/dev/null; then
        unstaged=" [${unstaged_count}]"
    fi
fi

# Output all elements in order
echo -e "${model} | ${bar} ${pct_display} ${tokens} | 5h:${session_pct_display} 7d:${week_pct_display} | ${session_cost} | ${cumulative_k} | ${branch}${unstaged}"

