#!/usr/bin/env bash
#
# Verifies that anonymous visitors cannot read episode_submissions.
#
# Run before and after applying
# sql/migrations/06-episode-submissions-rls-lockdown.sql:
#
#   ./scripts/verify-submission-privacy.sh
#
# Reads PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY from .env. Both are
# public by design (the publishable key ships in the browser bundle), and this
# script never prints either of them. It only ever issues GETs.

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
	echo "error: .env not found in $(pwd)" >&2
	exit 2
fi

eval "$(grep -m1 '^PUBLIC_SUPABASE_URL=' .env)"
eval "$(grep -m1 '^PUBLIC_SUPABASE_ANON_KEY=' .env)"

if [ -z "${PUBLIC_SUPABASE_URL:-}" ] || [ -z "${PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
	echo "error: PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY missing from .env" >&2
	exit 2
fi

URL="${PUBLIC_SUPABASE_URL%/}"
status=0

# Returns the total row count an anonymous caller can see, parsed from the
# content-range header PostgREST sets under `Prefer: count=exact`. The header
# reads "0-24/137" when rows are visible and "*/0" when none are.
anon_visible_count() {
	curl -sS -D - -o /dev/null "$URL/rest/v1/$1?select=id&limit=1" \
		-H "apikey: $PUBLIC_SUPABASE_ANON_KEY" \
		-H "Prefer: count=exact" \
		| grep -i '^content-range' | tr -d '\r' | awk -F/ '{print $2}'
}

check() {
	local table="$1" expected="$2" why="$3" actual
	actual="$(anon_visible_count "$table")"
	actual="${actual:-unknown}"

	if [ "$actual" = "$expected" ]; then
		printf '  PASS  %-32s anon sees %s rows\n' "$table" "$actual"
	else
		printf '  FAIL  %-32s anon sees %s rows, expected %s — %s\n' \
			"$table" "$actual" "$expected" "$why"
		status=1
	fi
}

echo "Anonymous read access:"

# The finding this script exists for.
check episode_submissions 0 \
	"contributor names, notes and payloads are world-readable"

# Control: RLS is enforced here, so a failure means the whole check is
# meaningless rather than that users leaked.
check users 0 \
	"control probe — if this fails the harness is wrong, not just one table"

echo
echo "Public data (these SHOULD be readable — a zero here means over-tightening):"

for t in episodes transcript_lines episode_transcript_versions; do
	count="$(anon_visible_count "$t")"
	count="${count:-unknown}"
	if [ "$count" = "0" ] || [ "$count" = "unknown" ]; then
		printf '  FAIL  %-32s anon sees %s rows, expected many\n' "$t" "$count"
		status=1
	else
		printf '  PASS  %-32s anon sees %s rows\n' "$t" "$count"
	fi
done

echo
if [ "$status" -eq 0 ]; then
	echo "OK — submissions are private and public data is still reachable."
else
	echo "PROBLEM — see the failures above."
	echo "Not yet applied sql/migrations/06-episode-submissions-rls-lockdown.sql? Start there."
fi

exit "$status"
