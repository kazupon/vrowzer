/**
 * Vrowser - Preview with Vite HMR flavor for the browser
 *
 * @module preview
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

export interface VrowserOptions {
  // TODO(kazupon): add some options, if we need
}

export interface VrowserConfig {
  /**
   * A record of file paths and their corresponding content, which can be either a string or an ArrayBuffer.
   */
  files: Record<string, string | ArrayBuffer>
  // TODO(kazupon): add some config options, if we need
}

/**
 * The main interface for the Vrowser preview environment.
 */
export interface Vrowser {
  /**
   * Ready for preview system initialization.
   *
   * This method initializes the necessary components and starts the preview system.
   *
   * @return A promise that resolves to `true` if the boot process is successful, or `false` if it fails.
   */
  ready(config: VrowserConfig): Promise<boolean>
  /**
   * Mounts the preview system to a specified container element in the DOM.
   *
   * @param container - A DOM element where the preview iframe will be mounted.
   */
  mount(container: HTMLElement): Promise<void>
  /**
   * Reloads the preview iframe
   */
  reloadPreview(): Promise<void>
  /**
   * Adds a new file to the preview environment with the specified content.
   *
   * The file can be represented as a string or an ArrayBuffer.
   *
   * @param filePath - The path of the file to be added.
   * @param content - The content of the file, which can be a string or an ArrayBuffer.
   */
  addFile(filePath: string, content: string | ArrayBuffer): void
  /**
   * Updates the content of a specific file in the preview environment.
   * @param filePath - The path of the file to be updated.
   * @param content - The new content for the file, which can be a string or an ArrayBuffer.
   */
  updateFile(filePath: string, content: string | ArrayBuffer): Promise<void>
  /**
   * Deletes a specific file from the preview environment.
   * @param filePath - The path of the file to be deleted.
   */
  deleteFile(filePath: string): Promise<void>
}

export function Vrowser(_options: VrowserOptions = {}): Readonly<Vrowser> {
  // TODO(kazupon): implement the main logic of Vrowser the below, and export the instance of Vrowser ...

  const instance: Vrowser = {
    // TODO(kazupon): implement the main logic of Vrowser
  }

  return Object.freeze(instance)
}
