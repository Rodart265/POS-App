import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RequireRole from './routes/RequireRole'
import Checkout from './cashier/screens/Checkout'
import Dashboard from './admin/screens/Dashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Checkout />} />
        <Route
          path="/admin/*"
          element={
            <RequireRole role="admin">
              <Dashboard />
            </RequireRole>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
