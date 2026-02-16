use serde::{Deserialize, Serialize};

/// Parser options (napi-compatible)
#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ParserOptions {
    pub lang: Option<String>,
    pub source_type: Option<String>,
    pub ast_type: Option<String>,
    pub range: Option<bool>,
    pub preserve_parens: Option<bool>,
    pub show_semantic_errors: Option<bool>,
}

/// Comment information (napi-compatible)
#[derive(Serialize, Clone)]
pub struct Comment {
    pub r#type: String,
    pub value: String,
    pub start: u32,
    pub end: u32,
}

/// Error label (napi-compatible)
#[derive(Serialize, Clone)]
pub struct ErrorLabel {
    pub message: Option<String>,
    pub start: u32,
    pub end: u32,
}

/// Error information (napi-compatible)
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OxcError {
    pub severity: String,
    pub message: String,
    pub labels: Vec<ErrorLabel>,
    pub help_message: Option<String>,
}

/// Span
#[derive(Serialize, Clone)]
pub struct Span {
    pub start: u32,
    pub end: u32,
}

/// Span with value
#[derive(Serialize, Clone)]
pub struct ValueSpan {
    pub value: String,
    pub start: u32,
    pub end: u32,
}

// --- Import ---

/// Import name kind
#[derive(Serialize, Clone)]
pub enum ImportNameKind {
    Name,
    NamespaceObject,
    Default,
}

/// Import name
#[derive(Serialize, Clone)]
pub struct ImportName {
    pub kind: ImportNameKind,
    pub name: Option<String>,
    pub start: Option<u32>,
    pub end: Option<u32>,
}

/// Static import entry
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StaticImportEntry {
    pub import_name: ImportName,
    pub local_name: ValueSpan,
    pub is_type: bool,
}

/// Static import
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StaticImport {
    pub start: u32,
    pub end: u32,
    pub module_request: ValueSpan,
    pub entries: Vec<StaticImportEntry>,
}

// --- Export ---

/// Export import name kind
#[derive(Serialize, Clone)]
pub enum ExportImportNameKind {
    Name,
    All,
    AllButDefault,
    None,
}

/// Export import name
#[derive(Serialize, Clone)]
pub struct ExportImportName {
    pub kind: ExportImportNameKind,
    pub name: Option<String>,
    pub start: Option<u32>,
    pub end: Option<u32>,
}

/// Export export name kind
#[derive(Serialize, Clone)]
pub enum ExportExportNameKind {
    Name,
    Default,
    None,
}

/// Export export name
#[derive(Serialize, Clone)]
pub struct ExportExportName {
    pub kind: ExportExportNameKind,
    pub name: Option<String>,
    pub start: Option<u32>,
    pub end: Option<u32>,
}

/// Export local name kind
#[derive(Serialize, Clone)]
pub enum ExportLocalNameKind {
    Name,
    Default,
    None,
}

/// Export local name
#[derive(Serialize, Clone)]
pub struct ExportLocalName {
    pub kind: ExportLocalNameKind,
    pub name: Option<String>,
    pub start: Option<u32>,
    pub end: Option<u32>,
}

/// Static export entry
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StaticExportEntry {
    pub start: u32,
    pub end: u32,
    pub module_request: Option<ValueSpan>,
    pub import_name: ExportImportName,
    pub export_name: ExportExportName,
    pub local_name: ExportLocalName,
    pub is_type: bool,
}

/// Static export
#[derive(Serialize, Clone)]
pub struct StaticExport {
    pub start: u32,
    pub end: u32,
    pub entries: Vec<StaticExportEntry>,
}

/// Dynamic import
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DynamicImport {
    pub start: u32,
    pub end: u32,
    pub module_request: Span,
}

/// ECMAScript module information (napi-compatible)
#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct EcmaScriptModule {
    pub has_module_syntax: bool,
    pub static_imports: Vec<StaticImport>,
    pub static_exports: Vec<StaticExport>,
    pub dynamic_imports: Vec<DynamicImport>,
    pub import_metas: Vec<Span>,
}
