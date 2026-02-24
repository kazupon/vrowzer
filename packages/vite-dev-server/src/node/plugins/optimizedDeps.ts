import { ERR_OUTDATED_OPTIMIZED_DEP } from '../../shared/constants'

// TODO: fill code in later ...

export function throwOutdatedRequest(id: string): never {
  const err: any = new Error(
    `There is a new version of the pre-bundle for "${id}", ` +
    `a page reload is going to ask for it.`,
  )
  err.code = ERR_OUTDATED_OPTIMIZED_DEP
  // This error will be caught by the transform middleware that will
  // send a 504 status code request timeout
  throw err
}

// TODO: fill code in later ...
