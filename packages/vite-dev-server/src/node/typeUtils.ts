
// TODO: fill in later ...
export type RequiredExceptFor<T, K extends keyof T> = Pick<T, K> &
  Required<Omit<T, K>>
