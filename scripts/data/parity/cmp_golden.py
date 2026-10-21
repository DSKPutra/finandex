# © 2026 Dea Saka Kurnia Putra. All rights reserved.
# Compare reference output with kit/golden using the golden tolerance (rel 1e-6 / abs 1e-9).
import json, sys, os, math
A, B = sys.argv[1], sys.argv[2]   # produced, golden
def cmp(a, b, p, errs):
    if isinstance(b, dict):
        if not isinstance(a, dict): errs.append(f"{p}: type"); return
        for k in set(a) | set(b):
            if k not in a: errs.append(f"{p}.{k}: missing"); continue
            if k not in b: errs.append(f"{p}.{k}: extra"); continue
            cmp(a[k], b[k], f"{p}.{k}", errs)
    elif isinstance(b, list):
        if not isinstance(a, list) or len(a) != len(b): errs.append(f"{p}: list len {len(a) if isinstance(a,list) else a} vs {len(b)}"); return
        for i, (x, y) in enumerate(zip(a, b)): cmp(x, y, f"{p}[{i}]", errs)
    elif isinstance(b, float) or isinstance(a, float):
        if a is None or b is None or isinstance(a,(str,bool)) or isinstance(b,(str,bool)):
            if a != b: errs.append(f"{p}: {a} vs {b}")
            return
        if not (abs(a-b) <= 1e-9 or abs(a-b) <= 1e-6*max(abs(a),abs(b))): errs.append(f"{p}: {a} vs {b}")
    else:
        if a != b: errs.append(f"{p}: {a!r} vs {b!r}")
tot = 0
for root, _, fs in os.walk(B):
    for f in sorted(fs):
        g = os.path.join(root, f); rel = os.path.relpath(g, B); pa = os.path.join(A, rel)
        if f == "chatbot_eval.json": continue
        if not os.path.exists(pa): print("SKIP", rel); continue
        errs = []; cmp(json.load(open(pa)), json.load(open(g)), "", errs); tot += len(errs)
        print("OK  " if not errs else "DIFF", rel, len(errs)); [print("   ", e) for e in errs[:8]]
print("total diffs", tot)
sys.exit(1 if tot else 0)
