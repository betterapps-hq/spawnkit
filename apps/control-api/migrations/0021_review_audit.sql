-- Keep existing review/deployment events and make their history append-only.
CREATE TRIGGER audit_events_no_update BEFORE UPDATE ON audit_events BEGIN SELECT RAISE(ABORT,'Audit history is immutable'); END;
CREATE TRIGGER audit_events_no_delete BEFORE DELETE ON audit_events BEGIN SELECT RAISE(ABORT,'Audit history is immutable'); END;
DROP TRIGGER game_review_audit;
CREATE TRIGGER game_review_audit AFTER UPDATE OF status ON game_submissions WHEN OLD.status != NEW.status BEGIN
  INSERT INTO audit_events(id,project_id,actor_id,action,detail,created_at)
  VALUES(lower(hex(randomblob(16))),NEW.project_id,NEW.reviewer_id,'game.' || NEW.status,
    json_object('submissionId',NEW.id,'releaseId',NEW.release_id,'note',NEW.review_note,
      'title',NEW.title,'beforeState',OLD.status,'actorName',
      COALESCE((SELECT NULLIF(name,'') FROM community_access WHERE user_id=NEW.reviewer_id),'Administrator')),
    NEW.reviewed_at);
END;
