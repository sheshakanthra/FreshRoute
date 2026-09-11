-- D4: the queryable recommendation -> action_execution -> outcome_record
-- join, as a real Postgres view (queryable from any tool, not just app
-- code). This is the future ML training set (STAGE0's own framing of
-- recommendation_candidate applies equally here: audit trail today,
-- training data once enough real outcomes accumulate).
--
-- LEFT JOIN LATERAL rather than a plain LEFT JOIN because action_execution
-- and outcome_record have no unique constraint on recommendation_id (a
-- recommendation could in principle be executed or have its outcome
-- recorded more than once) — the lateral join picks the most recent row of
-- each, so the view stays one row per recommendation rather than
-- fanning out.
CREATE VIEW recommendation_outcomes AS
SELECT
  r.id AS recommendation_id,
  r.batch_id,
  b.commodity_id,
  b.variety AS batch_variety,
  b.quantity_kg,
  r.chosen_action_code,
  r.status AS recommendation_status,
  r.generated_at,
  r.valid_until,
  r.expected_recoverable_value_inr,
  r.baseline_value_inr,
  r.modelled_uplift_inr,
  r.confidence,
  r.engine_version,
  ae.id AS action_execution_id,
  ae.executed_action_code,
  ae.executed_at,
  ae.executed_by,
  ae.notes AS execution_notes,
  o.id AS outcome_record_id,
  o.realized_value_inr,
  o.realized_loss_kg,
  o.actual_destination,
  o.notes AS outcome_notes,
  o.recorded_at AS outcome_recorded_at,
  o.data_source AS outcome_data_source
FROM recommendation r
JOIN batch b ON b.id = r.batch_id
LEFT JOIN LATERAL (
  SELECT *
  FROM action_execution ae2
  WHERE ae2.recommendation_id = r.id
  ORDER BY ae2.executed_at DESC
  LIMIT 1
) ae ON true
LEFT JOIN LATERAL (
  SELECT *
  FROM outcome_record o2
  WHERE o2.recommendation_id = r.id
  ORDER BY o2.recorded_at DESC
  LIMIT 1
) o ON true;
