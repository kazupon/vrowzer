use oxc_ast::CommentKind;
use oxc_diagnostics::OxcDiagnostic;
use oxc_span::SourceType;
use oxc_syntax::module_record::{self, ModuleRecord};
use rustc_hash::FxHashMap;

use crate::types::*;

/// Determine the source type (same logic as napi version)
pub fn get_source_type(filename: &str, options: &ParserOptions) -> SourceType {
    let ty = match options.lang.as_deref() {
        Some("js") => SourceType::unambiguous(),
        Some("jsx") => SourceType::unambiguous().with_jsx(true),
        Some("ts") => SourceType::unambiguous().with_typescript(true),
        Some("tsx") => SourceType::unambiguous().with_typescript(true).with_jsx(true),
        Some("dts") => SourceType::d_ts(),
        _ => SourceType::from_path(filename).unwrap_or_default(),
    };
    match options.source_type.as_deref() {
        Some("script") => ty.with_script(true),
        Some("module") => ty.with_module(true),
        Some("commonjs") => ty.with_commonjs(true),
        Some("unambiguous") => ty.with_unambiguous(true),
        _ => ty,
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum AstType {
    JavaScript,
    TypeScript,
}

pub fn get_ast_type(source_type: SourceType, options: &ParserOptions) -> AstType {
    match options.ast_type.as_deref() {
        Some("js") => AstType::JavaScript,
        Some("ts") => AstType::TypeScript,
        _ if source_type.is_javascript() => AstType::JavaScript,
        _ => AstType::TypeScript,
    }
}

/// Convert OxcDiagnostic to OxcError
pub fn convert_errors(diagnostics: &[OxcDiagnostic]) -> Vec<OxcError> {
    diagnostics
        .iter()
        .map(|d| {
            let labels = d
                .labels
                .as_ref()
                .map(|ls| {
                    ls.iter()
                        .map(|l| ErrorLabel {
                            message: l.label().map(|s| s.to_string()),
                            start: l.offset() as u32,
                            end: (l.offset() + l.len()) as u32,
                        })
                        .collect()
                })
                .unwrap_or_default();

            let severity = match d.severity {
                oxc_diagnostics::Severity::Error => "Error",
                oxc_diagnostics::Severity::Warning => "Warning",
                oxc_diagnostics::Severity::Advice => "Advice",
            };

            OxcError {
                severity: severity.to_string(),
                message: d.message.to_string(),
                labels,
                help_message: d.help.as_ref().map(|h| h.to_string()),
            }
        })
        .collect()
}

/// Convert comments
pub fn convert_comments(
    comments: &[oxc_ast::ast::Comment],
    source_text: &str,
) -> Vec<Comment> {
    comments
        .iter()
        .map(|c| {
            let span = c.span;
            let value = c.content_span().source_text(source_text).to_string();
            Comment {
                r#type: match c.kind {
                    CommentKind::Line => "Line".to_string(),
                    CommentKind::SingleLineBlock | CommentKind::MultiLineBlock => {
                        "Block".to_string()
                    }
                },
                value,
                start: span.start,
                end: span.end,
            }
        })
        .collect()
}

// --- ModuleRecord conversion (fully compatible with napi convert.rs) ---

impl From<&ModuleRecord<'_>> for EcmaScriptModule {
    fn from(record: &ModuleRecord<'_>) -> Self {
        let mut static_imports = record
            .requested_modules
            .iter()
            .flat_map(|(name, requested_modules)| {
                requested_modules
                    .iter()
                    .filter(|m| m.is_import)
                    .map(|m| {
                        let entries = record
                            .import_entries
                            .iter()
                            .filter(|e| e.statement_span == m.statement_span)
                            .map(StaticImportEntry::from)
                            .collect::<Vec<_>>();
                        StaticImport {
                            start: m.statement_span.start,
                            end: m.statement_span.end,
                            module_request: ValueSpan {
                                value: name.to_string(),
                                start: m.span.start,
                                end: m.span.end,
                            },
                            entries,
                        }
                    })
            })
            .collect::<Vec<_>>();
        static_imports.sort_unstable_by_key(|e| e.start);

        let mut static_exports = record
            .local_export_entries
            .iter()
            .chain(record.indirect_export_entries.iter())
            .chain(record.star_export_entries.iter())
            .map(|e| (e.statement_span, StaticExportEntry::from(e)))
            .collect::<Vec<_>>()
            .into_iter()
            .fold(
                FxHashMap::<_, Vec<StaticExportEntry>>::default(),
                |mut acc, (span, e)| {
                    acc.entry(span).or_default().push(e);
                    acc
                },
            )
            .into_iter()
            .map(|(span, entries)| StaticExport {
                start: span.start,
                end: span.end,
                entries,
            })
            .collect::<Vec<_>>();
        static_exports.sort_unstable_by_key(|e| e.start);

        let dynamic_imports = record
            .dynamic_imports
            .iter()
            .map(|i| DynamicImport {
                start: i.span.start,
                end: i.span.end,
                module_request: Span {
                    start: i.module_request.start,
                    end: i.module_request.end,
                },
            })
            .collect::<Vec<_>>();

        let import_metas = record
            .import_metas
            .iter()
            .map(|s| Span {
                start: s.start,
                end: s.end,
            })
            .collect();

        Self {
            has_module_syntax: record.has_module_syntax,
            static_imports,
            static_exports,
            dynamic_imports,
            import_metas,
        }
    }
}

impl From<&module_record::ExportEntry<'_>> for StaticExportEntry {
    fn from(e: &module_record::ExportEntry) -> Self {
        Self {
            start: e.span.start,
            end: e.span.end,
            module_request: e.module_request.as_ref().map(|ns| ValueSpan {
                value: ns.name.to_string(),
                start: ns.span.start,
                end: ns.span.end,
            }),
            import_name: ExportImportName::from(&e.import_name),
            export_name: ExportExportName::from(&e.export_name),
            local_name: ExportLocalName::from(&e.local_name),
            is_type: e.is_type,
        }
    }
}

impl From<&module_record::ImportEntry<'_>> for StaticImportEntry {
    fn from(e: &module_record::ImportEntry<'_>) -> Self {
        Self {
            import_name: ImportName::from(&e.import_name),
            local_name: ValueSpan {
                value: e.local_name.name.to_string(),
                start: e.local_name.span.start,
                end: e.local_name.span.end,
            },
            is_type: e.is_type,
        }
    }
}

impl From<&module_record::ImportImportName<'_>> for ImportName {
    fn from(e: &module_record::ImportImportName<'_>) -> Self {
        let (kind, name, start, end) = match e {
            module_record::ImportImportName::Name(name_span) => (
                ImportNameKind::Name,
                Some(name_span.name.to_string()),
                Some(name_span.span.start),
                Some(name_span.span.end),
            ),
            module_record::ImportImportName::NamespaceObject => {
                (ImportNameKind::NamespaceObject, None, None, None)
            }
            module_record::ImportImportName::Default(span) => {
                (ImportNameKind::Default, None, Some(span.start), Some(span.end))
            }
        };
        Self {
            kind,
            name,
            start,
            end,
        }
    }
}

impl From<&module_record::ExportImportName<'_>> for ExportImportName {
    fn from(e: &module_record::ExportImportName<'_>) -> Self {
        let (kind, name, start, end) = match e {
            module_record::ExportImportName::Name(name_span) => (
                ExportImportNameKind::Name,
                Some(name_span.name.to_string()),
                Some(name_span.span.start),
                Some(name_span.span.end),
            ),
            module_record::ExportImportName::All => {
                (ExportImportNameKind::All, None, None, None)
            }
            module_record::ExportImportName::AllButDefault => {
                (ExportImportNameKind::AllButDefault, None, None, None)
            }
            module_record::ExportImportName::Null => {
                (ExportImportNameKind::None, None, None, None)
            }
        };
        Self {
            kind,
            name,
            start,
            end,
        }
    }
}

impl From<&module_record::ExportExportName<'_>> for ExportExportName {
    fn from(e: &module_record::ExportExportName<'_>) -> Self {
        let (kind, name, start, end) = match e {
            module_record::ExportExportName::Name(name_span) => (
                ExportExportNameKind::Name,
                Some(name_span.name.to_string()),
                Some(name_span.span.start),
                Some(name_span.span.end),
            ),
            module_record::ExportExportName::Default(span) => (
                ExportExportNameKind::Default,
                None,
                Some(span.start),
                Some(span.end),
            ),
            module_record::ExportExportName::Null => {
                (ExportExportNameKind::None, None, None, None)
            }
        };
        Self {
            kind,
            name,
            start,
            end,
        }
    }
}

impl From<&module_record::ExportLocalName<'_>> for ExportLocalName {
    fn from(e: &module_record::ExportLocalName<'_>) -> Self {
        let (kind, name, start, end) = match e {
            module_record::ExportLocalName::Name(name_span) => (
                ExportLocalNameKind::Name,
                Some(name_span.name.to_string()),
                Some(name_span.span.start),
                Some(name_span.span.end),
            ),
            module_record::ExportLocalName::Default(name_span) => (
                ExportLocalNameKind::Default,
                Some(name_span.name.to_string()),
                Some(name_span.span.start),
                Some(name_span.span.end),
            ),
            module_record::ExportLocalName::Null => {
                (ExportLocalNameKind::None, None, None, None)
            }
        };
        Self {
            kind,
            name,
            start,
            end,
        }
    }
}
