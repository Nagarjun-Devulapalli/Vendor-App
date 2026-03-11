import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Vendors from './pages/Vendors'
import VendorDetail from './pages/VendorDetail'
import Activities from './pages/Activities'
import ActivityDetail from './pages/ActivityDetail'
import Payments from './pages/Payments'
import Categories from './pages/Categories'
import CategoryDetail from './pages/CategoryDetail'
import PendingApprovals from './pages/PendingApprovals'
import BranchAdmins from './pages/BranchAdmins'
import Credentials from './pages/Credentials'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="vendors" element={<Vendors />} />
            <Route path="vendors/:id" element={<VendorDetail />} />
            <Route path="activities" element={<Activities />} />
            <Route path="activities/:id" element={<ActivityDetail />} />
            <Route path="payments" element={<Payments />} />
            <Route path="pending-approvals" element={<PendingApprovals />} />
            <Route path="categories" element={<Categories />} />
            <Route path="categories/:id" element={<CategoryDetail />} />
            <Route path="branch-admins" element={<BranchAdmins />} />
            <Route path="credentials" element={<Credentials />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
