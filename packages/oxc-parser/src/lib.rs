use oxc_allocator::Allocator;
use oxc_ast_visit::utf8_to_utf16::Utf8ToUtf16;
use oxc_parser::{ParseOptions, Parser};
use oxc_semantic::SemanticBuilder;
use wasm_bindgen::prelude::*;

mod convert;
mod types;

use convert::*;
use types::*;

/// Parse result (napi-compatible)
#[wasm_bindgen]
pub struct ParseResult {
    program_json: String,
    module_json: String,
    comments_json: String,
    errors_json: String,
}

#[wasm_bindgen]
impl ParseResult {
    #[wasm_bindgen(getter)]
    pub fn program(&self) -> String {
        self.program_json.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn module(&self) -> String {
        self.module_json.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn comments(&self) -> String {
        self.comments_json.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn errors(&self) -> String {
        self.errors_json.clone()
    }
}

/// Main parse function.
/// Exposed as camelCase `parseSyncInternal` via the JS wrapper.
#[wasm_bindgen(js_name = "parseSyncInternal")]
pub fn parse_sync_internal(
    filename: String,
    source_text: String,
    options: JsValue,
) -> ParseResult {
    let options: ParserOptions =
        serde_wasm_bindgen::from_value(options).unwrap_or_default();

    let allocator = Allocator::default();
    let source_type = get_source_type(&filename, &options);
    let ast_type = get_ast_type(source_type, &options);
    let ranges = options.range.unwrap_or(false);

    let parse_options = ParseOptions {
        preserve_parens: options.preserve_parens.unwrap_or(true),
        ..ParseOptions::default()
    };

    let ret = Parser::new(&allocator, &source_text, source_type)
        .with_options(parse_options)
        .parse();

    let mut program = ret.program;
    let mut module_record = ret.module_record;
    let mut diagnostics = ret.errors;

    // Semantic errors (optional)
    if options.show_semantic_errors == Some(true) {
        let semantic_ret = SemanticBuilder::new()
            .with_check_syntax_error(true)
            .build(&program);
        diagnostics.extend(semantic_ret.errors);
    }

    // Convert UTF-8 spans to UTF-16 (same as napi version)
    let span_converter = Utf8ToUtf16::new(&source_text);
    span_converter.convert_program(&mut program);
    span_converter.convert_module_record(&mut module_record);

    // Convert errors (spans are also converted to UTF-16)
    let mut errors = convert_errors(&diagnostics);
    if let Some(mut converter) = span_converter.converter() {
        for error in &mut errors {
            for label in &mut error.labels {
                converter.convert_offset(&mut label.start);
                converter.convert_offset(&mut label.end);
            }
        }
    }
    let errors_json =
        serde_json::to_string(&errors).unwrap_or_else(|_| "[]".to_string());

    // Convert comments (spans are also converted to UTF-16)
    let mut comments = convert_comments(&program.comments, &source_text);
    if let Some(mut converter) = span_converter.converter() {
        for comment in &mut comments {
            converter.convert_offset(&mut comment.start);
            converter.convert_offset(&mut comment.end);
        }
    }

    // Add hashbang as a comment (for JavaScript AST only)
    if ast_type == AstType::JavaScript {
        if let Some(hashbang) = &program.hashbang {
            let mut start = hashbang.span.start;
            let mut end = hashbang.span.end;
            if let Some(mut converter) = span_converter.converter() {
                converter.convert_offset(&mut start);
                converter.convert_offset(&mut end);
            }
            comments.insert(
                0,
                Comment {
                    r#type: "Line".to_string(),
                    value: hashbang.value.to_string(),
                    start,
                    end,
                },
            );
        }
    }
    let comments_json =
        serde_json::to_string(&comments).unwrap_or_else(|_| "[]".to_string());

    // Convert module info (spans are already converted to UTF-16)
    let module = EcmaScriptModule::from(&module_record);
    let module_json =
        serde_json::to_string(&module).unwrap_or_else(|_| "{}".to_string());

    // ESTree JSON output (with_fixes handles BigInt/RegExp value)
    let program_json = match ast_type {
        AstType::JavaScript => program.to_estree_js_json_with_fixes(ranges),
        AstType::TypeScript => program.to_estree_ts_json_with_fixes(ranges),
    };

    ParseResult {
        program_json,
        module_json,
        comments_json,
        errors_json,
    }
}
