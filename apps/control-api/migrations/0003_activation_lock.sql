CREATE UNIQUE INDEX deployment_environment_active ON deployments(project_id,environment)
WHERE status IN ('queued','building','validating','activating');
