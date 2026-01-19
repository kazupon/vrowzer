import { RuleTester } from 'oxlint'
import rule from './no-use-navigator-service-worker.ts'

const ruleTester = new RuleTester()

ruleTester.run('no-use-navigator-service-worker', rule, {
  // TODO: add test cases
  valid: [],
  // TODO: add test cases
  invalid: []
})
