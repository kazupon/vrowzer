// TODO: fill in later

export interface BuildEnvironmentOptions {
  // TODO: fill in later
}

// TODO: fill in later

export type RenderBuiltAssetUrl = (
  filename: string,
  type: {
    type: 'asset' | 'public'
    hostId: string
    hostType: 'js' | 'css' | 'html'
    ssr: boolean
  },
) => string | { relative?: boolean; runtime?: string } | undefined


// TODO: fill in later
