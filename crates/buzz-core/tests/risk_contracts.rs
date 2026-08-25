use buzz_core::kind::{KIND_RISK_AUTHORITY_PROFILE, KIND_RISK_RECORD};
use buzz_core::risk::{RiskAuthorityProfileV1, RiskRecordV1};
use serde_json::json;

fn risk() -> serde_json::Value {
    json!({
        "schemaVersion": 1,
        "id": "risk-davit",
        "title": "Seaboat davit unavailable",
        "description": "The port seaboat davit cannot launch the assigned boat.",
        "consequenceDescription": "The mission may lose its assigned seaboat capability.",
        "domain": "capability",
        "operationalTags": ["MEO", "seaboat"],
        "owner": "Marine Engineering Officer",
        "scope": { "type": "project", "id": "deployment-1", "label": "Regional deployment" },
        "inherentAssessment": { "likelihood": 4, "consequence": "D" },
        "controls": [{
            "id": "repair",
            "description": "Repair and function-test the davit.",
            "owner": "MEO",
            "status": "inProgress",
            "linkedTaskId": "repair-davit",
            "dueDate": "2026-08-24",
            "effectiveness": null
        }],
        "residualAssessment": {
            "likelihood": 2,
            "consequence": "D",
            "basis": "Projected after repair and operational test.",
            "state": "projected"
        },
        "status": "treating",
        "reviewDate": "2026-08-25",
        "acceptance": {
            "state": "notAccepted",
            "authority": null,
            "decidedBy": null,
            "decidedAt": null,
            "direction": null
        },
        "psychosocialReview": {
            "state": "notIndicated",
            "hazards": [],
            "exposure": null,
            "basis": null,
            "linkedRiskId": null,
            "reviewedAt": null
        },
        "sourceEvidence": "Defect list 42",
        "sourceConstraintId": "constraint-1",
        "createdAt": "2026-08-19T00:00:00Z",
        "updatedAt": "2026-08-19T00:00:00Z"
    })
}

fn profile() -> serde_json::Value {
    json!({
        "schemaVersion": 1,
        "id": "adfp-default",
        "title": "ADF operational risk authority",
        "localAcceptanceCeiling": "medium",
        "authorities": {
            "veryLow": "Team Leader APS4-6 / Corporal-O3",
            "low": "O3-O4 / Deputy Director / EL1",
            "medium": "Commanding Officer / independent Officer Commanding / Director EL2 / O4-O6",
            "high": "Functional or Formation Commander / CJTF / 1-2 Star / SES Band 1-2",
            "veryHigh": "Secretary / CDF / Chief of Service / CJOPS / CJC / Group Head"
        },
        "reviewCadenceDays": { "veryLow": 90, "low": 30, "medium": 7, "high": 1, "veryHigh": 1 },
        "source": "ADFP 5.0.1 Annex 1C Table 1C.5",
        "updatedAt": "2026-08-19T00:00:00Z"
    })
}

#[test]
fn accepts_exact_risk_contracts_and_unique_parameterized_kinds() {
    serde_json::from_value::<RiskRecordV1>(risk()).unwrap();
    serde_json::from_value::<RiskAuthorityProfileV1>(profile()).unwrap();
    assert_ne!(KIND_RISK_RECORD, KIND_RISK_AUTHORITY_PROFILE);
    assert!((30_000..=39_999).contains(&KIND_RISK_RECORD));
    assert!((30_000..=39_999).contains(&KIND_RISK_AUTHORITY_PROFILE));
}

#[test]
fn rejects_unknown_fields_duplicate_controls_and_invalid_validated_state() {
    let mut extra = risk();
    extra["unexpected"] = json!(true);
    assert!(serde_json::from_value::<RiskRecordV1>(extra).is_err());

    let mut duplicate = risk();
    let first = duplicate["controls"][0].clone();
    duplicate["controls"].as_array_mut().unwrap().push(first);
    assert!(serde_json::from_value::<RiskRecordV1>(duplicate).is_err());

    let mut validated = risk();
    validated["residualAssessment"]["state"] = json!("validated");
    assert!(serde_json::from_value::<RiskRecordV1>(validated).is_err());
}

#[test]
fn accepted_risk_requires_a_complete_human_decision() {
    let mut accepted = risk();
    accepted["controls"][0]["status"] = json!("implemented");
    accepted["controls"][0]["effectiveness"] = json!("Verified.");
    accepted["residualAssessment"]["state"] = json!("validated");
    accepted["status"] = json!("accepted");
    accepted["acceptance"]["state"] = json!("accepted");
    assert!(serde_json::from_value::<RiskRecordV1>(accepted.clone()).is_err());
    accepted["acceptance"]["authority"] = json!("Commanding Officer");
    accepted["acceptance"]["decidedBy"] = json!("CO HMAS Supply");
    accepted["acceptance"]["decidedAt"] = json!("2026-08-19T01:00:00Z");
    accepted["acceptance"]["direction"] = json!("Proceed with controls maintained.");
    serde_json::from_value::<RiskRecordV1>(accepted).unwrap();
}

#[test]
fn validates_psychosocial_review_materiality_and_linking() {
    let mut considered = risk();
    considered["psychosocialReview"] = json!({
        "state": "consideration",
        "hazards": ["lackOfRoleClarity", "poorOrganisationalChangeManagement"],
        "exposure": {
            "frequency": "isolated",
            "duration": "brief",
            "severity": "moderate"
        },
        "basis": "The sailing programme changed within the preparation window.",
        "linkedRiskId": null,
        "reviewedAt": "2026-08-25T01:00:00Z"
    });
    serde_json::from_value::<RiskRecordV1>(considered.clone()).unwrap();

    let mut missing_hazards = considered.clone();
    missing_hazards["psychosocialReview"]["hazards"] = json!([]);
    assert!(serde_json::from_value::<RiskRecordV1>(missing_hazards).is_err());

    let mut linked_consideration = considered.clone();
    linked_consideration["psychosocialReview"]["linkedRiskId"] = json!("risk-personnel-1");
    assert!(serde_json::from_value::<RiskRecordV1>(linked_consideration).is_err());

    let mut material = considered;
    material["psychosocialReview"]["state"] = json!("material");
    material["psychosocialReview"]["linkedRiskId"] = json!("risk-personnel-1");
    serde_json::from_value::<RiskRecordV1>(material).unwrap();
}
