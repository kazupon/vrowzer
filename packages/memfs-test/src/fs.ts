export default {
  readFile: (path: string, encoding: string): Promise<string> => {
    console.log(`Reading file: ${path} with encoding: ${encoding}`)
    return Promise.resolve(`Contents of ${path}`)
  }
}
