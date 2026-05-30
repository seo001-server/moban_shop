import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import LoginPage from './pages/LoginPage'

function LegacyProductsRedirect() {
  const { id } = useParams()
  if (id === 'new') {
    return <Navigate to="/templates/new" replace />
  }
  const num = Number(id)
  if (Number.isFinite(num) && num > 0) {
    return <Navigate to="/templates" replace state={{ editId: num }} />
  }
  return <Navigate to="/templates" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/products" element={<Navigate to="/templates" replace />} />
      <Route path="/products/:id" element={<LegacyProductsRedirect />} />
      <Route path="/templates/:id" element={<LegacyProductsRedirect />} />

      <Route path="/*" element={<MainLayout />} />
    </Routes>
  )
}
