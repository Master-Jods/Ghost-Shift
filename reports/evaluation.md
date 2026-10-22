> Historical v1 report. Current model evidence: [v5 industrial evaluation](industrial-v5-evaluation.json) and [interpretation](../docs/ANALYTICS.md).

# Actual Ghost Shift evaluation

Generated 2026-10-19T11:59:42.479Z with `ghost-shift-v1-mc1` / `monte-carlo-actual-rules`. Full reproducible rows and assumptions are in [evaluation.json](evaluation.json). Previous scenario results are not valid for this release.

| Measure | Actual generated result |
|---|---:|
| Whole held-out scenarios | 12 (seeds 1001–1012) |
| Separate smoke seeds | 1–4 |
| Successful time-pair population | 5 |
| Successful remaining-time MAE | 2.40 s |
| Fixed 150-second baseline MAE | 109.40 s |
| Deadline Brier score | 0.0000 |
| Fixed 0.5 baseline Brier | 0.2500 |
| Candidate legality/feasibility | 100% |
| Matched baseline success | 41.7% |
| Matched best-candidate success | 41.7% |
| Both-success paired population | 5 |
| Mean paired time improvement | 0 s |

These are generated-system checks, not human accuracy or calibration. The small scenario set includes normal starts and legal idle delays leaving deadline pressure. Half the observed continuations include predefined standardized events; the forecasts explicitly assume no further injections. Successful-only time metrics exclude failures while deadline denominators retain them.

No recommendation improvement was observed in this matched set. A zero Brier score on these 12 coarse generated cases does not establish real-world predictive validity; confidence extremes, shared simulator assumptions and the lack of visitor data limit interpretation. `calibrated` remains false. Real visitor pacing, arbitrary manual director behavior and physical-device acceptance remain unvalidated.
