#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
cp "$ROOT/qa/v11-auth-browser/v11-workspace-attest.py" "$TMP/attest.py"
cp "$ROOT/qa/v11-auth-browser/attestation-policy.json" "$TMP/policy.json"
python3 - "$TMP" <<'PY'
import json,sys
from pathlib import Path
root=Path(sys.argv[1]); p=json.loads((root/'policy.json').read_text())
for rel in p['blobBindings']:
 f=root/rel; f.parent.mkdir(parents=True,exist_ok=True); f.write_text(rel+'\n')
(root/'README.md').write_text('clean\n')
PY
cd "$TMP"; git init -q; git config user.email test@example.test; git config user.name test; git add .; git commit -qm baseline
COMMIT=$(git rev-parse HEAD); TREE=$(git rev-parse HEAD^{tree}); CACHE=$(mktemp -d)
attest(){ PYTHONPYCACHEPREFIX="$CACHE" python3 attest.py --point inject --repo "$TMP" --out "$TMP/tasks/evidence/test" --run-id inject --tested-commit "$COMMIT" --tested-tree "$TREE" --policy "$TMP/policy.json" >/dev/null 2>&1; }
attest
echo inject >> README.md; ! attest; git checkout -- README.md
echo inject >> README.md; git add README.md; ! attest; git reset -q HEAD -- README.md; git checkout -- README.md
mkdir -p src/lib; touch src/lib/injected.ts; ! attest; rm -rf src
echo .npmrc >> .git/info/exclude; echo 'registry=https://invalid.example' > .npmrc; ! attest; rm .npmrc
echo .ignored-runtime-input >> .git/info/exclude; echo injected > .ignored-runtime-input; ! attest
python3 - <<'PY'
import json
data=json.load(open('tasks/evidence/test/attestation-results.json'))
assert '.ignored-runtime-input' in data['checkpoints'][-1]['runtimeUntracked']['defaultRejected']
PY
rm .ignored-runtime-input
[[ ! -f "$TMP/tasks/evidence/test/acceptance-results.json" ]]
echo 'attestation injection tests: positive + unstaged + staged + runtime-untracked + ignored-runtime-config + ignored-default-reject PASS'
