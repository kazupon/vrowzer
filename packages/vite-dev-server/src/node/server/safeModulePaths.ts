import path from 'node:path'
import type { InputOption } from 'rolldown'
import { cleanUrl } from '../../shared/utils'

interface ResolvedInput {
  id: string
  external?: boolean | 'absolute' | 'relative'
}

type ResolveInput = (
  id: string,
  importer: undefined,
  options: {
    isEntry: true
    scan: true
  },
) => Promise<ResolvedInput | null | undefined>

export async function registerInputsAsSafeModules(
  input: InputOption | undefined,
  resolveId: ResolveInput,
  safeModulePaths: Set<string>,
  syncSafeModulePaths?: (paths: string[]) => Promise<void>,
): Promise<void> {
  const entries =
    input == null
      ? ['index.html']
      : typeof input === 'string'
        ? [input]
        : Array.isArray(input)
          ? input
          : Object.values(input)
  const registeredPaths = new Set<string>()

  const resolveEntries = async () => {
    const resolvedEntries = await Promise.all(
      entries.map((entry) =>
        resolveId(entry, undefined, {
          isEntry: true,
          // Avoid a deadlock when the dependency scanner triggers the first
          // buildStart while normal resolution waits for the scan to finish.
          scan: true,
        }),
      ),
    )
    for (const resolved of resolvedEntries) {
      if (resolved && !resolved.external) {
        const resolvedId = cleanUrl(resolved.id)
        if (path.isAbsolute(resolvedId)) {
          safeModulePaths.add(resolvedId)
          registeredPaths.add(resolvedId)
        }
      }
    }
  }

  if (input == null) {
    await resolveEntries().catch(() => {})
  } else {
    await resolveEntries()
  }

  if (registeredPaths.size > 0) {
    await syncSafeModulePaths?.([...registeredPaths])
  }
}
