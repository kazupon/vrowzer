import { RuleTester } from 'oxlint/plugins-dev'
import rule from './require-string-scope.ts'

const ruleTester = new RuleTester()

ruleTester.run('require-string-scope', rule, {
  // TODO: add test cases
  valid: [],
  // TODO: add test cases
  invalid: []
})
