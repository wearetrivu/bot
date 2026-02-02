import { AuthProvider, useAuth } from './hooks/useAuth'
import Login from './components/Login'
import ChatInterface from './components/ChatInterface'

const AppContent = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    )
  }

  return user ? <ChatInterface /> : <Login />
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
