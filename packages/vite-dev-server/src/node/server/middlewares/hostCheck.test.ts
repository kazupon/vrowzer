import { expect, test } from 'vite-plus/test'
import { getAdditionalAllowedHosts } from './hostCheck'

test('getAdditionalAllowedHosts includes the server.ws host', () => {
  const actual = getAdditionalAllowedHosts(
    {
      host: 'vite.host.example.com',
      ws: {
        host: 'vite.ws-host.example.com',
      },
      origin: 'http://vite.origin.example.com:5173',
    },
    {
      host: 'vite.preview-host.example.com',
    },
  ).sort()

  expect(actual).toStrictEqual(
    [
      'vite.host.example.com',
      'vite.ws-host.example.com',
      'vite.origin.example.com',
      'vite.preview-host.example.com',
    ].sort(),
  )
})
