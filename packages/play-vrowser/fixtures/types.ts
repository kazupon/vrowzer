/**
 * VrowserManifest type matching schema/vrowser-manifest.json.
 *
 * When loaded via the vrowser manifest loader plugin, file path values
 * are resolved to actual file contents (strings).
 */
export interface VrowserManifest {
  /** Display name (e.g. "Vrowser + Vue") */
  name: string
  /** Source files shown in the editor and loaded into the virtual FS */
  files: Record<string, string>
  /** Pre-bundled vendor/runtime files (not shown in editor) */
  vendor?: Record<string, string>
  /** Node modules files loaded under /node_modules/ (not shown in editor) */
  nodeModules?: Record<string, string>
  /** Default file to open in the editor */
  activeFile?: string
}
