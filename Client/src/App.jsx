import { Outlet } from 'react-router-dom'

function App() {


  return (
      <div className="min-h-screen">
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export default App