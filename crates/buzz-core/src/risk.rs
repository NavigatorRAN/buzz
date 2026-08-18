//! Strict Command Adviser operational-risk contracts.

use std::collections::BTreeSet;

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

/// Operational domain in which a risk is primarily expressed.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum RiskDomain {
    /// Risk to achieving the assigned mission.
    Mission,
    /// Risk to people.
    Personnel,
    /// Risk to capability or equipment.
    Capability,
    /// Risk to reputation or confidence.
    Reputation,
    /// Risk to the natural or operating environment.
    Environment,
}

/// Scope of one risk record.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum RiskScopeType {
    /// Ship-wide risk.
    Ship,
    /// Operation-scoped risk.
    Operation,
    /// Planning-project risk.
    Project,
    /// Battle Rhythm activity risk.
    Activity,
    /// Planning-task risk.
    Task,
}

/// ADFP likelihood descriptor encoded as its doctrinal index.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(try_from = "u8", into = "u8")]
pub enum RiskLikelihood {
    /// Rare.
    Rare = 1,
    /// Improbable.
    Improbable = 2,
    /// Occasional.
    Occasional = 3,
    /// Probable.
    Probable = 4,
    /// Almost certain.
    AlmostCertain = 5,
}

impl TryFrom<u8> for RiskLikelihood {
    type Error = String;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            1 => Ok(Self::Rare),
            2 => Ok(Self::Improbable),
            3 => Ok(Self::Occasional),
            4 => Ok(Self::Probable),
            5 => Ok(Self::AlmostCertain),
            _ => Err("likelihood must be an integer from 1 to 5".to_owned()),
        }
    }
}

impl From<RiskLikelihood> for u8 {
    fn from(value: RiskLikelihood) -> Self {
        value as u8
    }
}

/// ADFP consequence descriptor encoded as its doctrinal letter.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum RiskConsequence {
    /// Minor.
    A,
    /// Moderate.
    B,
    /// Major.
    C,
    /// Critical.
    D,
    /// Catastrophic.
    E,
}

/// Derived risk level.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "camelCase")]
pub enum RiskLevel {
    /// Very low.
    VeryLow,
    /// Low.
    Low,
    /// Medium.
    Medium,
    /// High.
    High,
    /// Very high.
    VeryHigh,
}

/// Implementation state of one risk control.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum RiskControlStatus {
    /// Identified but not started.
    Planned,
    /// Work is underway.
    InProgress,
    /// Implemented and available for effectiveness review.
    Implemented,
    /// Implemented control was found ineffective.
    Ineffective,
}

/// Confidence state of the residual assessment.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ResidualAssessmentState {
    /// Expected result before completed-control validation.
    Projected,
    /// Reviewed after every control was implemented.
    Validated,
}

/// Lifecycle state of a risk.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum RiskStatus {
    /// Identified and awaiting or undergoing analysis.
    Open,
    /// Controls are being applied.
    Treating,
    /// Controls are implemented but the risk is not accepted or closed.
    Controlled,
    /// Residual risk was accepted by the recorded human authority.
    Accepted,
    /// Residual risk was transferred to a higher authority.
    Elevated,
    /// Risk is no longer active.
    Closed,
}

/// Human command disposition state.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum RiskAcceptanceState {
    /// No acceptance decision is recorded.
    NotAccepted,
    /// A human authority accepted the residual risk.
    Accepted,
    /// The configured local ceiling is exceeded.
    ElevationRequired,
    /// A human transferred the risk to a higher authority.
    Elevated,
}

/// Likelihood and consequence pair.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RiskAssessment {
    /// Likelihood index.
    pub likelihood: RiskLikelihood,
    /// Consequence index.
    pub consequence: RiskConsequence,
}

/// Scope descriptor linking a risk to ship or planning state.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RiskScope {
    /// Scope category.
    #[serde(rename = "type")]
    pub scope_type: RiskScopeType,
    /// Linked entity identifier for non-ship scopes.
    pub id: Option<String>,
    /// Human-readable scope label.
    pub label: String,
}

/// One treatment control.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RiskControl {
    /// Stable control identifier within the risk.
    pub id: String,
    /// Control action.
    pub description: String,
    /// Accountable owner.
    pub owner: String,
    /// Implementation state.
    pub status: RiskControlStatus,
    /// Optional linked Plans task.
    pub linked_task_id: Option<String>,
    /// Optional due date.
    pub due_date: Option<String>,
    /// Effectiveness review when known.
    pub effectiveness: Option<String>,
}

/// Residual assessment and its validation state.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ResidualRiskAssessment {
    /// Residual likelihood.
    pub likelihood: RiskLikelihood,
    /// Residual consequence.
    pub consequence: RiskConsequence,
    /// Basis for the residual estimate.
    pub basis: String,
    /// Projected or validated state.
    pub state: ResidualAssessmentState,
}

/// Human acceptance or elevation decision.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RiskAcceptance {
    /// Decision state.
    pub state: RiskAcceptanceState,
    /// Required or acting authority.
    pub authority: Option<String>,
    /// Human decision maker.
    pub decided_by: Option<String>,
    /// Decision time.
    pub decided_at: Option<String>,
    /// Recorded command direction.
    pub direction: Option<String>,
}

/// Owner-authored operational risk record.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(
    rename_all = "camelCase",
    deny_unknown_fields,
    try_from = "RiskRecordWire"
)]
pub struct RiskRecordV1 {
    /// Contract version.
    pub schema_version: u8,
    /// Stable risk identifier.
    pub id: String,
    /// Short risk title.
    pub title: String,
    /// Hazard or uncertainty description.
    pub description: String,
    /// Consequence description.
    pub consequence_description: String,
    /// Primary risk domain.
    pub domain: RiskDomain,
    /// Operational or departmental labels.
    pub operational_tags: Vec<String>,
    /// Accountable owner.
    pub owner: String,
    /// Ship or planning scope.
    pub scope: RiskScope,
    /// Pre-treatment assessment.
    pub inherent_assessment: RiskAssessment,
    /// Treatment controls.
    pub controls: Vec<RiskControl>,
    /// Post-treatment assessment.
    pub residual_assessment: ResidualRiskAssessment,
    /// Risk lifecycle state.
    pub status: RiskStatus,
    /// Next review date.
    pub review_date: String,
    /// Human disposition.
    pub acceptance: RiskAcceptance,
    /// Optional source evidence.
    pub source_evidence: Option<String>,
    /// Optional originating Mission Constraint.
    pub source_constraint_id: Option<String>,
    /// Record creation time.
    pub created_at: String,
    /// Last update time.
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RiskRecordWire {
    schema_version: u8,
    id: String,
    title: String,
    description: String,
    consequence_description: String,
    domain: RiskDomain,
    operational_tags: Vec<String>,
    owner: String,
    scope: RiskScope,
    inherent_assessment: RiskAssessment,
    controls: Vec<RiskControl>,
    residual_assessment: ResidualRiskAssessment,
    status: RiskStatus,
    review_date: String,
    acceptance: RiskAcceptance,
    source_evidence: Option<String>,
    source_constraint_id: Option<String>,
    created_at: String,
    updated_at: String,
}

/// Exact set of values indexed by risk level.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RiskLevelValues<T> {
    /// Very-low value.
    pub very_low: T,
    /// Low value.
    pub low: T,
    /// Medium value.
    pub medium: T,
    /// High value.
    pub high: T,
    /// Very-high value.
    pub very_high: T,
}

/// Owner-authored risk acceptance-authority profile.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(
    rename_all = "camelCase",
    deny_unknown_fields,
    try_from = "RiskAuthorityProfileWire"
)]
pub struct RiskAuthorityProfileV1 {
    /// Contract version.
    pub schema_version: u8,
    /// Stable profile identifier.
    pub id: String,
    /// Profile title.
    pub title: String,
    /// Highest risk level the local authority may accept.
    pub local_acceptance_ceiling: RiskLevel,
    /// Required authority by risk level.
    pub authorities: RiskLevelValues<String>,
    /// Default review cadence by risk level.
    pub review_cadence_days: RiskLevelValues<u16>,
    /// Source or order prescribing the profile.
    pub source: String,
    /// Last update time.
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RiskAuthorityProfileWire {
    schema_version: u8,
    id: String,
    title: String,
    local_acceptance_ceiling: RiskLevel,
    authorities: RiskLevelValues<String>,
    review_cadence_days: RiskLevelValues<u16>,
    source: String,
    updated_at: String,
}

fn bounded(value: &str, field: &str, max: usize) -> Result<(), String> {
    if value.trim().is_empty() || value.len() > max {
        Err(format!("{field} must be bounded nonempty text"))
    } else {
        Ok(())
    }
}

fn optional_bounded(value: Option<&str>, field: &str, max: usize) -> Result<(), String> {
    if let Some(value) = value {
        bounded(value, field, max)?;
    }
    Ok(())
}

fn date(value: &str, field: &str) -> Result<(), String> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map(|_| ())
        .map_err(|_| format!("{field} must be YYYY-MM-DD"))
}

fn timestamp(value: &str, field: &str) -> Result<(), String> {
    chrono::DateTime::parse_from_rfc3339(value)
        .map(|_| ())
        .map_err(|_| format!("{field} must be RFC3339"))
}

fn complete_decision(value: &RiskAcceptance) -> bool {
    value
        .authority
        .as_deref()
        .is_some_and(|item| !item.trim().is_empty())
        && value
            .decided_by
            .as_deref()
            .is_some_and(|item| !item.trim().is_empty())
        && value
            .decided_at
            .as_deref()
            .is_some_and(|item| !item.trim().is_empty())
        && value
            .direction
            .as_deref()
            .is_some_and(|item| !item.trim().is_empty())
}

impl TryFrom<RiskRecordWire> for RiskRecordV1 {
    type Error = String;

    fn try_from(value: RiskRecordWire) -> Result<Self, Self::Error> {
        if value.schema_version != 1 {
            return Err("invalid risk version".to_owned());
        }
        bounded(&value.id, "id", 256)?;
        bounded(&value.title, "title", 512)?;
        bounded(&value.description, "description", 8_192)?;
        bounded(
            &value.consequence_description,
            "consequenceDescription",
            8_192,
        )?;
        bounded(&value.owner, "owner", 512)?;
        bounded(&value.scope.label, "scope label", 512)?;
        match value.scope.scope_type {
            RiskScopeType::Ship if value.scope.id.is_some() => {
                return Err("ship scope must not carry an id".to_owned())
            }
            RiskScopeType::Ship => {}
            _ if value
                .scope
                .id
                .as_deref()
                .is_none_or(|id| id.trim().is_empty()) =>
            {
                return Err("non-ship scope requires an id".to_owned())
            }
            _ => {}
        }
        if value.operational_tags.len() > 64 || value.controls.len() > 64 {
            return Err("risk arrays exceed their bounds".to_owned());
        }
        for tag in &value.operational_tags {
            bounded(tag, "operational tag", 512)?;
        }
        let mut control_ids = BTreeSet::new();
        for control in &value.controls {
            bounded(&control.id, "control id", 256)?;
            bounded(&control.description, "control description", 8_192)?;
            bounded(&control.owner, "control owner", 512)?;
            optional_bounded(control.linked_task_id.as_deref(), "linkedTaskId", 256)?;
            optional_bounded(
                control.effectiveness.as_deref(),
                "control effectiveness",
                8_192,
            )?;
            if let Some(due) = control.due_date.as_deref() {
                date(due, "control dueDate")?;
            }
            if !control_ids.insert(control.id.as_str()) {
                return Err("control ids must be unique".to_owned());
            }
        }
        bounded(&value.residual_assessment.basis, "residual basis", 8_192)?;
        if value.residual_assessment.state == ResidualAssessmentState::Validated {
            if value.controls.is_empty()
                || value.controls.iter().any(|control| {
                    control.status != RiskControlStatus::Implemented
                        || control
                            .effectiveness
                            .as_deref()
                            .is_none_or(|item| item.trim().is_empty())
                })
            {
                return Err(
                    "validated residual risk requires implemented effective controls".to_owned(),
                );
            }
        }
        if matches!(value.status, RiskStatus::Controlled | RiskStatus::Accepted)
            && value.controls.is_empty()
        {
            return Err("controlled or accepted risk requires controls".to_owned());
        }
        if matches!(
            value.acceptance.state,
            RiskAcceptanceState::Accepted | RiskAcceptanceState::Elevated
        ) && !complete_decision(&value.acceptance)
        {
            return Err("accepted or elevated risk requires a complete human decision".to_owned());
        }
        if (value.status == RiskStatus::Accepted
            && value.acceptance.state != RiskAcceptanceState::Accepted)
            || (value.status == RiskStatus::Elevated
                && value.acceptance.state != RiskAcceptanceState::Elevated)
        {
            return Err("risk status and decision state must agree".to_owned());
        }
        if value.status == RiskStatus::Closed
            && value
                .acceptance
                .direction
                .as_deref()
                .is_none_or(|item| item.trim().is_empty())
        {
            return Err("closed risk requires command direction".to_owned());
        }
        optional_bounded(
            value.acceptance.authority.as_deref(),
            "acceptance authority",
            1_024,
        )?;
        optional_bounded(value.acceptance.decided_by.as_deref(), "decidedBy", 512)?;
        optional_bounded(value.acceptance.direction.as_deref(), "direction", 8_192)?;
        if let Some(decided_at) = value.acceptance.decided_at.as_deref() {
            timestamp(decided_at, "decidedAt")?;
        }
        date(&value.review_date, "reviewDate")?;
        optional_bounded(value.source_evidence.as_deref(), "sourceEvidence", 8_192)?;
        optional_bounded(
            value.source_constraint_id.as_deref(),
            "sourceConstraintId",
            256,
        )?;
        timestamp(&value.created_at, "createdAt")?;
        timestamp(&value.updated_at, "updatedAt")?;
        Ok(Self {
            schema_version: value.schema_version,
            id: value.id,
            title: value.title,
            description: value.description,
            consequence_description: value.consequence_description,
            domain: value.domain,
            operational_tags: value.operational_tags,
            owner: value.owner,
            scope: value.scope,
            inherent_assessment: value.inherent_assessment,
            controls: value.controls,
            residual_assessment: value.residual_assessment,
            status: value.status,
            review_date: value.review_date,
            acceptance: value.acceptance,
            source_evidence: value.source_evidence,
            source_constraint_id: value.source_constraint_id,
            created_at: value.created_at,
            updated_at: value.updated_at,
        })
    }
}

impl TryFrom<RiskAuthorityProfileWire> for RiskAuthorityProfileV1 {
    type Error = String;

    fn try_from(value: RiskAuthorityProfileWire) -> Result<Self, Self::Error> {
        if value.schema_version != 1 {
            return Err("invalid authority profile version".to_owned());
        }
        bounded(&value.id, "id", 256)?;
        bounded(&value.title, "title", 512)?;
        bounded(&value.authorities.very_low, "veryLow authority", 1_024)?;
        bounded(&value.authorities.low, "low authority", 1_024)?;
        bounded(&value.authorities.medium, "medium authority", 1_024)?;
        bounded(&value.authorities.high, "high authority", 1_024)?;
        bounded(&value.authorities.very_high, "veryHigh authority", 1_024)?;
        let cadences = [
            value.review_cadence_days.very_low,
            value.review_cadence_days.low,
            value.review_cadence_days.medium,
            value.review_cadence_days.high,
            value.review_cadence_days.very_high,
        ];
        if cadences.iter().any(|days| !(1..=3_650).contains(days)) {
            return Err("review cadence must be between 1 and 3650 days".to_owned());
        }
        bounded(&value.source, "source", 2_048)?;
        timestamp(&value.updated_at, "updatedAt")?;
        Ok(Self {
            schema_version: value.schema_version,
            id: value.id,
            title: value.title,
            local_acceptance_ceiling: value.local_acceptance_ceiling,
            authorities: value.authorities,
            review_cadence_days: value.review_cadence_days,
            source: value.source,
            updated_at: value.updated_at,
        })
    }
}
