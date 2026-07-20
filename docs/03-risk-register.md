# Risk Register (Template & Baseline)

**Purpose:** Capture project risks, categorize them, and prioritize via a probability × impact
matrix. Seeds the in-app Risk module, which computes priority automatically.

## Fields

| Field | Description |
|-------|-------------|
| Risk ID | Unique identifier (e.g., R-01) |
| Title / Description | Short statement of the risk |
| Category | TECHNICAL, SCHEDULE, COST, RESOURCE, SCOPE, EXTERNAL |
| Probability | 1 (rare) … 5 (almost certain) |
| Impact | 1 (negligible) … 5 (severe) |
| Priority | Derived = Probability × Impact → band |
| Owner | Person accountable for response |
| Mitigation / Response | Avoid / Mitigate / Transfer / Accept plan |
| Status | OPEN, MITIGATING, CLOSED |

## Priority Bands (Probability × Impact, 1–25)

| Score | Priority |
|-------|----------|
| 1–4 | **LOW** |
| 5–9 | **MEDIUM** |
| 10–15 | **HIGH** |
| 16–25 | **CRITICAL** |

> The application implements this exact banding in `server/src/modules/risks/service.ts`
> (`computePriority`).

## Example Baseline

| ID | Description | Category | P | I | Priority | Owner | Mitigation | Status |
|----|-------------|----------|---|---|----------|-------|------------|--------|
| R-01 | Key developer may leave mid-project | RESOURCE | 2 | 4 | MEDIUM | PM | Cross-train; document | OPEN |
| R-02 | Third-party API deprecation | TECHNICAL | 3 | 4 | HIGH | Tech Lead | Abstract integration layer | MITIGATING |
| R-03 | Scope creep from stakeholders | SCOPE | 4 | 4 | CRITICAL | PM | Change-control board | OPEN |
