use std::collections::BTreeSet;

use chrono::DateTime;
use serde_json::{Map, Value};

use super::MAX_TEXT_BYTES;

pub(super) fn psychosocial_projection(
    value: &Value,
) -> Result<Option<(String, Vec<&'static str>)>, ()> {
    let Some(review) = value.get("psychosocialReview") else {
        return Ok(None);
    };
    let review = review.as_object().ok_or(())?;
    let expected = [
        "state",
        "hazards",
        "exposure",
        "basis",
        "linkedRiskId",
        "reviewedAt",
    ];
    if review.len() != expected.len() || review.keys().any(|key| !expected.contains(&key.as_str()))
    {
        return Err(());
    }
    let state = review.get("state").and_then(Value::as_str).ok_or(())?;
    if !matches!(state, "notIndicated" | "consideration" | "material") {
        return Err(());
    }
    let hazards = review
        .get("hazards")
        .and_then(Value::as_array)
        .filter(|hazards| hazards.len() <= 11)
        .ok_or(())?;
    let mut seen = BTreeSet::new();
    let labels = hazards
        .iter()
        .map(|hazard| {
            let hazard = hazard.as_str().ok_or(())?;
            if !seen.insert(hazard) {
                return Err(());
            }
            match hazard {
                "jobDemands" => Ok("Job demands"),
                "lowJobControl" => Ok("Low job control"),
                "poorSupport" => Ok("Poor support"),
                "lackOfRoleClarity" => Ok("Lack of role clarity"),
                "poorOrganisationalChangeManagement" => Ok("Poor organisational change management"),
                "inadequateRewardAndRecognition" => Ok("Inadequate reward and recognition"),
                "poorOrganisationalJustice" => Ok("Poor organisational justice"),
                "traumaticEventsOrMaterial" => Ok("Traumatic events or material"),
                "remoteOrIsolatedWork" => Ok("Remote or isolated work"),
                "poorPhysicalEnvironment" => Ok("Poor physical environment"),
                "harmfulBehaviours" => Ok("Harmful behaviours or poor workplace relationships"),
                _ => Err(()),
            }
        })
        .collect::<Result<Vec<_>, _>>()?;

    if state == "notIndicated" {
        if !labels.is_empty()
            || !review.get("exposure").is_some_and(Value::is_null)
            || !review.get("linkedRiskId").is_some_and(Value::is_null)
        {
            return Err(());
        }
        return Ok(None);
    }
    if labels.is_empty() {
        return Err(());
    }
    let exposure = review
        .get("exposure")
        .and_then(Value::as_object)
        .ok_or(())?;
    if !matches!(
        exposure.get("frequency").and_then(Value::as_str),
        Some("isolated" | "repeated" | "ongoing")
    ) || !matches!(
        exposure.get("duration").and_then(Value::as_str),
        Some("brief" | "extended" | "prolonged")
    ) || !matches!(
        exposure.get("severity").and_then(Value::as_str),
        Some("low" | "moderate" | "high")
    ) {
        return Err(());
    }
    required_string(review, "basis").ok_or(())?;
    let reviewed_at = required_string(review, "reviewedAt").ok_or(())?;
    DateTime::parse_from_rfc3339(reviewed_at).map_err(|_| ())?;
    if state != "material" && !review.get("linkedRiskId").is_some_and(Value::is_null) {
        return Err(());
    }
    if let Some(linked_risk_id) = review.get("linkedRiskId").and_then(Value::as_str) {
        if linked_risk_id.trim().is_empty() || linked_risk_id.len() > 256 {
            return Err(());
        }
    }
    Ok(Some((state.to_string(), labels)))
}

fn required_string<'a>(value: &'a Map<String, Value>, key: &str) -> Option<&'a str> {
    value
        .get(key)
        .and_then(Value::as_str)
        .filter(|item| !item.trim().is_empty() && item.len() <= MAX_TEXT_BYTES)
}

#[cfg(test)]
mod tests {
    use buzz_core_pkg::kind::KIND_RISK_RECORD;
    use serde_json::{json, Value};

    use super::super::{select_planning_evidence, RawPlanningEvent};

    const OWNER: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const OBSERVED_AT: &str = "2026-08-25T06:00:00+10:00";

    fn record(seed: u64, id: &str, created_at: u64, content: Value) -> RawPlanningEvent {
        RawPlanningEvent {
            event_id: format!("{seed:064x}"),
            author: OWNER.to_string(),
            kind: KIND_RISK_RECORD,
            d_tag: id.to_string(),
            created_at,
            content: content.to_string(),
        }
    }

    fn risk(id: &str, status: &str, psychosocial_review: Value) -> Value {
        json!({
            "schemaVersion": 1,
            "id": id,
            "title": "Seaboat davit unavailable",
            "domain": "capability",
            "owner": "MEO",
            "scope": { "type": "project", "id": "deployment", "label": "Regional deployment" },
            "inherentAssessment": { "likelihood": 4, "consequence": "E" },
            "controls": [
                { "id": "repair", "description": "Repair davit", "owner": "MEO", "status": "implemented", "linkedTaskId": "repair-davit", "dueDate": "2026-08-24", "effectiveness": "Function test passed" }
            ],
            "residualAssessment": { "likelihood": 2, "consequence": "D", "basis": "After repair", "state": "validated" },
            "status": status,
            "reviewDate": "2026-08-25",
            "acceptance": { "state": "notAccepted", "authority": null, "decidedBy": null, "decidedAt": null, "direction": null },
            "psychosocialReview": psychosocial_review
        })
    }

    #[test]
    fn material_attention_is_concise_and_closed_risks_are_excluded() {
        let material = json!({
            "state": "material",
            "hazards": ["lackOfRoleClarity", "poorOrganisationalChangeManagement"],
            "exposure": { "frequency": "repeated", "duration": "extended", "severity": "high" },
            "basis": "Do not include this detailed basis in the brief.",
            "linkedRiskId": null,
            "reviewedAt": "2026-08-25T01:00:00Z"
        });
        let batch = select_planning_evidence(
            vec![
                record(
                    20,
                    "risk-open",
                    200,
                    risk("risk-open", "treating", material),
                ),
                record(
                    21,
                    "risk-closed",
                    201,
                    risk(
                        "risk-closed",
                        "closed",
                        json!({
                            "state": "notIndicated",
                            "hazards": [],
                            "exposure": null,
                            "basis": null,
                            "linkedRiskId": null,
                            "reviewedAt": null
                        }),
                    ),
                ),
            ],
            OWNER,
            OBSERVED_AT,
        );

        assert_eq!(batch.candidates.len(), 1);
        let quote = &batch.candidates[0].quote;
        assert!(quote.contains("\"psychosocialState\":\"material\""));
        assert!(quote.contains("Lack of role clarity"));
        assert!(!quote.contains("detailed basis"));
        assert!(!quote.contains("risk-closed"));
    }

    #[test]
    fn not_indicated_review_is_omitted() {
        let batch = select_planning_evidence(
            vec![record(
                30,
                "risk-weather",
                300,
                risk(
                    "risk-weather",
                    "open",
                    json!({
                        "state": "notIndicated",
                        "hazards": [],
                        "exposure": null,
                        "basis": null,
                        "linkedRiskId": null,
                        "reviewedAt": null
                    }),
                ),
            )],
            OWNER,
            OBSERVED_AT,
        );

        assert_eq!(batch.candidates.len(), 1);
        assert!(!batch.candidates[0].quote.contains("psychosocial"));
    }
}
