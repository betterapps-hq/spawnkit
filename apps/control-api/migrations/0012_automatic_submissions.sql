-- Existing live games enter review without a creator action. Approval remains explicit.
INSERT OR IGNORE INTO game_submissions(id,project_id,release_id,deployment_id,title,description,submitted_at)
SELECT lower(hex(randomblob(16))),p.id,r.id,d.id,substr(p.name,1,64),'Play ' || p.name || ' in your browser.',strftime('%Y-%m-%dT%H:%M:%fZ','now')
FROM projects p JOIN environments e ON e.project_id=p.id AND e.name='production'
JOIN releases r ON r.id=e.current_release_id
JOIN deployments d ON d.id=(SELECT latest.id FROM deployments latest JOIN deployment_hostnames h ON h.deployment_id=latest.id WHERE latest.project_id=p.id AND latest.release_id=r.id AND latest.environment='production' AND latest.status='succeeded' ORDER BY latest.created_at DESC,latest.id DESC LIMIT 1)
WHERE e.enabled=1 AND r.status='ready';
