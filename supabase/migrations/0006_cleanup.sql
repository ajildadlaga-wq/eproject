-- =====================================================================
-- 0006_cleanup.sql — Remove dead objects
--   * project_progress view: the client computes portfolio stats itself,
--     so this view (0002, rebuilt in 0005) is unused.
-- =====================================================================

drop view if exists project_progress;
