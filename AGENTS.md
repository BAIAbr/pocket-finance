
- Stitch "Fox Dark" redesign is applied as a presentation layer only (classes/layout); hooks, data and routes stay untouched — keeps real data and features intact.
- Plan access resolves through `src/lib/planCapabilities.ts`: billing variations map to a base plan via `PLAN_FAMILY`, and only active/trial/vip non-expired subscriptions grant benefits (`entitledPlanCode`, mirroring backend `user_plan_code()`) — keeps frontend gating consistent with the backend in one place.
