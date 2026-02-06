import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const { signInWithEmail, signUpWithEmail } = useAuth()

    useEffect(() => {
        const theme = localStorage.getItem('revot-theme') || 'dark'
        document.body.className = theme === 'light' ? 'light-theme' : ''
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (isSignUp) {
                await signUpWithEmail(email, password)
                alert('¡Revisa tu correo para el enlace de confirmación!')
            } else {
                await signInWithEmail(email, password)
            }
        } catch (err) {
            setError(err.message) // Error messages from Supabase might still be in English unless mapped, keeping simple for now
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '1rem' }}>
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Bienvenido</h1>
                    <p style={{ margin: '0.5rem 0 0', color: 'var(--text-secondary)' }}>
                        {isSignUp ? 'Crea una cuenta para continuar' : 'Inicia sesión para acceder a Revot'}
                    </p>
                </div>

                {error && (
                    <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Correo electrónico</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                background: 'var(--input-bg)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            placeholder="tu@ejemplo.com"
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                background: 'var(--input-bg)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            background: 'var(--accent-color)',
                            color: 'white',
                            border: 'none',
                            fontWeight: 600,
                            cursor: loading ? 'wait' : 'pointer',
                            marginTop: '0.5rem',
                            transition: 'background 0.2s'
                        }}
                    >
                        {loading ? 'Procesando...' : (isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión')}
                    </button>
                </form>

                <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {isSignUp ? '¿Ya tienes cuenta? ' : "¿No tienes cuenta? "}
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: 0 }}
                    >
                        {isSignUp ? 'Iniciar Sesión' : 'Regístrate'}
                    </button>
                </div>
            </div>
        </div>
    )
}
