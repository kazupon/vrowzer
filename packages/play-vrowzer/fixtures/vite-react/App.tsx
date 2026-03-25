import { useState } from 'react'
import reactLogo from './react.svg'
import vrowzerLogo from './vrowzer.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://github.com/kazupon/vrowzer" target="_blank">
          <img src={vrowzerLogo} className="logo" alt="Vrowzer logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vrowzer + React</h1>
      <div className="card">
        <button onClick={() => setCount(count => count + 1)}>count is {count}</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">Click on the Vrowzer and React logos to learn more</p>
    </>
  )
}

export default App
