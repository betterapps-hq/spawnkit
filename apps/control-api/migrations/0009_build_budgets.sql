CREATE TABLE build_budget_claims (
  deployment_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  day TEXT NOT NULL
);
CREATE INDEX build_budget_owner_day ON build_budget_claims(owner_id, day);
CREATE INDEX build_budget_day ON build_budget_claims(day);
