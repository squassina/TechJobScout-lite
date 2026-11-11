# Fit Score, Assessment Coverage and Eligibility

TechJobScout Lite uses a client-side, evidence-based heuristic to help prioritize review. It does not predict hiring outcomes or replace a recruiter's assessment.

| Dimension | Weight |
|---|---:|
| Technical and functional skills | 25% |
| Experience and responsibilities | 25% |
| Target role alignment | 15% |
| Seniority | 15% |
| Industry and business context | 10% |
| Education and certifications | 10% |

The implementation uses deterministic vocabulary and text matching. It does not fully understand context, synonyms, transferable skills or nuanced scope, and repeated keywords can distort the signal.

## Unknown evidence and coverage

A dimension is Unknown when the posting or profile lacks enough evidence. Unknown dimensions are excluded from the score denominator, not treated as matches or mismatches. Assessment Coverage is the sum of weights that could be evaluated. A high score with low coverage is a weak signal.

## Eligibility is separate

Location, work modality, work authorization and language are separate from Fit Score. Unknown means insufficient information, not eligible or ineligible. A location mismatch does not automatically remove a job.

## Recommended review

1. Open the original posting and confirm it is active.
2. Review each dimension's job and candidate evidence.
3. Read Unknown dimensions and coverage before comparing scores.
4. Confirm location, work authorization, language and work-mode requirements directly.
5. Use the score as a triage aid, then make the decision using the full role scope and your judgment.
