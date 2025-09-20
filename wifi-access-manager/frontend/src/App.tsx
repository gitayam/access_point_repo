import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore } from '@/stores/authStore'
import Layout from '@/components/Layout'
import MapView from '@/pages/MapView'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import AccessPointDetail from '@/pages/AccessPointDetail'
import Dashboard from '@/pages/Dashboard'
import Organization from '@/pages/Organization'

function App() {
  const { initAuth } = useAuthStore()

  useEffect(() => {
    initAuth()
  }, [initAuth])

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<MapView />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="access-point/:id" element={<AccessPointDetail />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="organization" element={<Organization />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App