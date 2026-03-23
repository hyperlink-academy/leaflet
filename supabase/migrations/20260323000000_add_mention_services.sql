CREATE TABLE mention_services (
  uri TEXT PRIMARY KEY,
  identity_did TEXT NOT NULL,
  record JSONB NOT NULL
);
CREATE INDEX idx_mention_services_did ON mention_services(identity_did);

CREATE TABLE mention_service_configs (
  uri TEXT PRIMARY KEY,
  identity_did TEXT NOT NULL UNIQUE,
  record JSONB NOT NULL
);
CREATE INDEX idx_mention_service_configs_did ON mention_service_configs(identity_did);
