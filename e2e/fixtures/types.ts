/**
 * Fixture manifest type for vrowser test fixtures.
 *
 * Each fixture directory contains a `manifest.ts` that exports a `FixtureManifest`
 * describing the files to load into the Vrowser virtual filesystem.
 *
 * Used by both play-vrowser (development UI) and E2E test hosts.
 */
export interface FixtureManifest {
  /** Display name (e.g. "Vrowser + Vue") */
  name: string
  /** Files shown in the editor and loaded into the virtual FS */
  files: Record<string, string>
  /** Files not shown in the editor but loaded into the virtual FS (e.g. vendor bundles) */
  vendorFiles: Record<string, string>
  /** Default file to open in the editor */
  activeFile: string
}
