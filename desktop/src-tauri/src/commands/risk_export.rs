use serde::Deserialize;
use std::io::{Cursor, Write};
use tauri::AppHandle;
use zip::{write::SimpleFileOptions, ZipWriter};

use crate::commands::export_util::save_bytes_with_dialog;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RiskExportRow {
    pub title: String,
    pub domain: String,
    pub owner: String,
    pub scope: String,
    pub inherent: String,
    pub residual: String,
    pub controls: String,
    pub status: String,
    pub review_date: String,
    pub acceptance: String,
    pub psychosocial: String,
}

const HEADERS: [&str; 11] = [
    "Risk title",
    "Domain",
    "Owner",
    "Scope",
    "Inherent",
    "Residual",
    "Controls",
    "Status",
    "Review date",
    "Acceptance",
    "Psychosocial attention",
];

fn xml_escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

fn pdf_escape(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('(', "\\(")
        .replace(')', "\\)")
}

fn values(row: &RiskExportRow) -> [&str; 11] {
    [
        &row.title,
        &row.domain,
        &row.owner,
        &row.scope,
        &row.inherent,
        &row.residual,
        &row.controls,
        &row.status,
        &row.review_date,
        &row.acceptance,
        &row.psychosocial,
    ]
}

fn validate_rows(rows: &[RiskExportRow]) -> Result<(), String> {
    if rows.len() > 5_000 {
        return Err("Risk export is limited to 5,000 records.".to_string());
    }
    if rows
        .iter()
        .flat_map(values)
        .any(|value| value.len() > 8_192)
    {
        return Err("A risk export field exceeds the 8 KiB limit.".to_string());
    }
    Ok(())
}

fn zip_bytes(files: &[(&str, String)]) -> Result<Vec<u8>, String> {
    let cursor = Cursor::new(Vec::new());
    let mut archive = ZipWriter::new(cursor);
    for (name, content) in files {
        archive
            .start_file(*name, SimpleFileOptions::default())
            .map_err(|_| "Cannot create risk workbook.".to_string())?;
        archive
            .write_all(content.as_bytes())
            .map_err(|_| "Cannot write risk workbook.".to_string())?;
    }
    archive
        .finish()
        .map(|cursor| cursor.into_inner())
        .map_err(|_| "Cannot finish risk workbook.".to_string())
}

fn spreadsheet_row(index: usize, cells: &[&str]) -> String {
    const COLUMNS: [&str; 11] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];
    let cells = cells
        .iter()
        .enumerate()
        .map(|(column, value)| {
            format!(
                r#"<c r="{}{index}" t="inlineStr"><is><t>{}</t></is></c>"#,
                COLUMNS[column],
                xml_escape(value)
            )
        })
        .collect::<String>();
    format!(r#"<row r="{index}">{cells}</row>"#)
}

fn risk_xlsx_bytes(rows: &[RiskExportRow]) -> Result<Vec<u8>, String> {
    validate_rows(rows)?;
    let mut sheet_rows = spreadsheet_row(1, &HEADERS);
    for (index, row) in rows.iter().enumerate() {
        sheet_rows.push_str(&spreadsheet_row(index + 2, &values(row)));
    }
    zip_bytes(&[
        (
            "[Content_Types].xml",
            r#"<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>"#.into(),
        ),
        (
            "_rels/.rels",
            r#"<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>"#.into(),
        ),
        (
            "xl/workbook.xml",
            r#"<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Risk Register" sheetId="1" r:id="rId1"/></sheets></workbook>"#.into(),
        ),
        (
            "xl/_rels/workbook.xml.rels",
            r#"<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>"#.into(),
        ),
        (
            "xl/worksheets/sheet1.xml",
            format!(r#"<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>{sheet_rows}</sheetData></worksheet>"#),
        ),
    ])
}

fn risk_pdf_bytes(rows: &[RiskExportRow]) -> Result<Vec<u8>, String> {
    validate_rows(rows)?;
    const ROWS_PER_PAGE: usize = 40;
    let page_count = rows.len().max(1).div_ceil(ROWS_PER_PAGE);
    let font_object = 3 + page_count * 2;
    let kids = (0..page_count)
        .map(|index| format!("{} 0 R", 3 + index * 2))
        .collect::<Vec<_>>()
        .join(" ");
    let mut objects = vec![
        "<< /Type /Catalog /Pages 2 0 R >>".to_string(),
        format!("<< /Type /Pages /Kids [{kids}] /Count {page_count} >>"),
    ];
    for page in 0..page_count {
        let content_object = 4 + page * 2;
        objects.push(format!(
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 {font_object} 0 R >> >> /Contents {content_object} 0 R >>"
        ));
        let mut content =
            String::from("BT /F1 9 Tf 28 560 Td 12 TL (Command Adviser Risk Register) Tj T* ");
        for row in rows.iter().skip(page * ROWS_PER_PAGE).take(ROWS_PER_PAGE) {
            let line = format!(
                "{} | {} | {} | {} | {} | {} | {} | {}",
                row.title,
                row.owner,
                row.scope,
                row.inherent,
                row.residual,
                row.status,
                row.review_date,
                row.psychosocial
            );
            let compact = line.chars().take(150).collect::<String>();
            content.push_str(&format!("({}) Tj T* ", pdf_escape(&compact)));
        }
        content.push_str("ET");
        objects.push(format!(
            "<< /Length {} >>\nstream\n{}\nendstream",
            content.len(),
            content
        ));
    }
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>".to_string());
    let mut bytes = b"%PDF-1.4\n".to_vec();
    let mut offsets = Vec::new();
    for (index, object) in objects.iter().enumerate() {
        offsets.push(bytes.len());
        bytes.extend_from_slice(format!("{} 0 obj\n{}\nendobj\n", index + 1, object).as_bytes());
    }
    let xref = bytes.len();
    bytes.extend_from_slice(
        format!("xref\n0 {}\n0000000000 65535 f \n", objects.len() + 1).as_bytes(),
    );
    for offset in offsets {
        bytes.extend_from_slice(format!("{offset:010} 00000 n \n").as_bytes());
    }
    bytes.extend_from_slice(
        format!(
            "trailer << /Size {} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n",
            objects.len() + 1
        )
        .as_bytes(),
    );
    Ok(bytes)
}

#[tauri::command]
pub async fn export_risk_register(
    format: String,
    rows: Vec<RiskExportRow>,
    app: AppHandle,
) -> Result<bool, String> {
    let bytes = match format.as_str() {
        "xlsx" => risk_xlsx_bytes(&rows)?,
        "pdf" => risk_pdf_bytes(&rows)?,
        _ => return Err("Risk export format must be xlsx or pdf.".to_string()),
    };
    save_bytes_with_dialog(
        &app,
        &format!("Command-Adviser-Risk-Register.{format}"),
        "Risk register",
        &[&format],
        &bytes,
    )
    .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Read;

    fn row(title: &str) -> RiskExportRow {
        RiskExportRow {
            title: title.to_string(),
            domain: "capability".to_string(),
            owner: "MEO".to_string(),
            scope: "Regional deployment".to_string(),
            inherent: "E4 Very High".to_string(),
            residual: "D2 Medium".to_string(),
            controls: "1/2 implemented".to_string(),
            status: "treating".to_string(),
            review_date: "2026-08-25".to_string(),
            acceptance: "not accepted".to_string(),
            psychosocial: "Material: Lack of role clarity".to_string(),
        }
    }

    #[test]
    fn xlsx_contains_column_headers_and_escaped_rows() {
        let bytes = risk_xlsx_bytes(&[row("Davit & crane")]).expect("xlsx");
        let mut archive = zip::ZipArchive::new(std::io::Cursor::new(bytes)).expect("zip");
        let mut xml = String::new();
        archive
            .by_name("xl/worksheets/sheet1.xml")
            .expect("sheet")
            .read_to_string(&mut xml)
            .expect("read");
        assert!(xml.contains("Risk title"));
        assert!(xml.contains("Davit &amp; crane"));
        assert!(xml.contains("Residual"));
        assert!(xml.contains("Psychosocial attention"));
        assert!(xml.contains("Material: Lack of role clarity"));
    }

    #[test]
    fn pdf_paginates_without_dropping_register_rows() {
        let rows = (0..100)
            .map(|index| row(&format!("Risk {index}")))
            .collect::<Vec<_>>();
        let bytes = risk_pdf_bytes(&rows).expect("pdf");
        let body = String::from_utf8_lossy(&bytes);
        assert!(body.starts_with("%PDF-1.4"));
        assert!(body.contains("Risk 0"));
        assert!(body.contains("Risk 99"));
        assert!(body.contains("/Count 3"));
    }
}
