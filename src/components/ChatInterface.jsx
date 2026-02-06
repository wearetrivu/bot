
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import ReactMarkdown from 'react-markdown'
import { Send, LogOut, MessageSquare, Bot, User, Plus, Edit2, Check, X, Trash2, Sun, Moon } from 'lucide-react'

// Webhook URL provided by user
const WEBHOOK_URL = "https://n8n.srv1176776.hstgr.cloud/webhook/84aef1ae-2f12-4d0a-85c9-907a79b3690f/chat"

export default function ChatInterface() {
    const { user, signOut } = useAuth()
    const [sessions, setSessions] = useState([])
    const [currentSessionId, setCurrentSessionId] = useState(null)
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [initialLoad, setInitialLoad] = useState(false)
    const [editingSessionId, setEditingSessionId] = useState(null)
    const [editTitle, setEditTitle] = useState('')
    const [theme, setTheme] = useState(localStorage.getItem('revot-theme') || 'dark')

    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        if (messages.length) scrollToBottom()
    }, [messages])

    useEffect(() => {
        document.body.className = theme === 'light' ? 'light-theme' : ''
        localStorage.setItem('revot-theme', theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark')
    }

    // Load sessions on mount
    useEffect(() => {
        if (user) fetchSessions()
    }, [user.id])

    useEffect(() => {
        if (currentSessionId) {
            setInitialLoad(true)
            fetchHistory(currentSessionId)
        } else {
            setMessages([])
            setInitialLoad(false)
        }
    }, [currentSessionId])

    const fetchSessions = async () => {
        try {
            const { data, error } = await supabase
                .from('chat_sessions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setSessions(data || [])

            // Removed auto-select and auto-create logic
            // User must explicitly select or create a chat
        } catch (err) {
            console.error('Error fetching sessions:', err)
        }
    }

    const createNewSession = async () => {
        try {
            const { data, error } = await supabase
                .from('chat_sessions')
                .insert([
                    { user_id: user.id }
                ])
                .select()
                .single()

            if (error) throw error
            setSessions([data, ...sessions])
            setCurrentSessionId(data.id)
        } catch (err) {
            console.error('Error creating session:', err)
        }
    }

    const updateSessionTitle = async (sessionId, newTitle) => {
        try {
            const { error } = await supabase
                .from('chat_sessions')
                .update({ title: newTitle })
                .eq('id', sessionId)

            if (error) throw error

            setSessions(sessions.map(s => s.id === sessionId ? { ...s, title: newTitle } : s))
            setEditingSessionId(null)
        } catch (err) {
            console.error('Error updating title:', err)
        }
    }

    const deleteSession = async (sessionId, e) => {
        e.stopPropagation()
        if (!window.confirm("¿Estás seguro de que quieres eliminar este chat?")) return

        try {
            const { error } = await supabase
                .from('chat_sessions')
                .delete()
                .eq('id', sessionId)

            if (error) throw error

            setSessions(sessions.filter(s => s.id !== sessionId))
            if (currentSessionId === sessionId) {
                setCurrentSessionId(null)
            }
        } catch (err) {
            console.error('Error deleting session:', err)
        }
    }

    const fetchHistory = async (sessionId) => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('n8n_chat_histories')
                .select('*')
                .eq('session_id', sessionId)
                .order('id', { ascending: true })

            if (error) throw error

            if (data) {
                const formattedMessages = data.map(row => {
                    // Backward compatibility check if message is stored differently
                    // The current schema showed 'message' as JSONB
                    const msgContent = row.message
                    return {
                        id: row.id,
                        type: msgContent.type === 'human' ? 'user' : 'ai',
                        content: msgContent.content
                    }
                })
                setMessages(formattedMessages)
            }
        } catch (err) {
            console.error('Error fetching history:', err)
        } finally {
            setLoading(false)
            setInitialLoad(false)
        }
    }

    const handleSend = async (e) => {
        e.preventDefault()
        if (!input.trim() || loading || !currentSessionId) return

        const userMessage = input.trim()
        setInput('')

        // Optimistic UI update
        const tempId = Date.now()
        setMessages(prev => [...prev, { id: tempId, type: 'user', content: userMessage }])
        setLoading(true)

        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatInput: userMessage,
                    sessionId: currentSessionId
                })
            })

            if (!response.ok) throw new Error('Network response was not ok')

            const data = await response.json()

            let aiResponseText = "Respuesta recibida"
            if (typeof data === 'string') {
                aiResponseText = data;
            } else if (data.output) {
                aiResponseText = data.output;
            } else if (Array.isArray(data) && data[0]?.output) {
                aiResponseText = data[0].output;
            } else if (data.message) {
                aiResponseText = data.message;
            } else {
                aiResponseText = JSON.stringify(data)
            }

            setMessages(prev => [...prev, { id: Date.now() + 1, type: 'ai', content: aiResponseText }])

        } catch (err) {
            console.error('Error sending message:', err)
            setMessages(prev => [...prev, { id: Date.now() + 1, type: 'ai', content: "Error comunicando con el agente. Por favor inténtalo de nuevo." }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-color)' }}>
            {/* Sidebar */}
            <div style={{ width: '280px', background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }} className="sidebar">
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '32px', height: '32px', background: 'var(--accent-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bot size={20} color="white" />
                            </div>
                            <span style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Revot</span>
                        </div>
                        <button 
                            onClick={toggleTheme}
                            style={{ 
                                background: 'none', 
                                border: 'none', 
                                padding: '8px', 
                                cursor: 'pointer', 
                                color: 'var(--text-secondary)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background 0.2s'
                            }}
                            className="theme-toggle"
                        >
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    </div>

                    <button
                        onClick={createNewSession}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            background: 'var(--accent-color)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            fontWeight: 600
                        }}
                    >
                        <Plus size={18} />
                        Nuevo Chat
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                    <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>
                        Tus Chats
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {sessions.map(session => (
                            <div
                                key={session.id}
                                onClick={() => setCurrentSessionId(session.id)}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    background: currentSessionId === session.id ? 'var(--glass-bg)' : 'transparent',
                                    border: currentSessionId === session.id ? '1px solid var(--accent-color)' : '1px solid transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    transition: 'background 0.2s',
                                    position: 'relative',
                                    group: 'true'
                                }}
                                className="session-item"
                            >
                                <MessageSquare size={16} color={currentSessionId === session.id ? 'var(--accent-color)' : 'var(--text-secondary)'} />

                                {editingSessionId === session.id ? (
                                    <div style={{ display: 'flex', flex: 1, gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
                                        <input
                                            autoFocus
                                            value={editTitle}
                                            onChange={e => setEditTitle(e.target.value)}
                                            style={{
                                                background: 'var(--bg-color)',
                                                border: '1px solid var(--border-color)',
                                                color: 'var(--text-primary)',
                                                width: '100%',
                                                outline: 'none',
                                                fontSize: '0.9rem',
                                                padding: '2px 4px',
                                                borderRadius: '4px'
                                            }}
                                        />
                                        <button
                                            onClick={() => updateSessionTitle(session.id, editTitle)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--accent-color)' }}>
                                            <Check size={14} />
                                        </button>
                                        <button
                                            onClick={() => setEditingSessionId(null)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-secondary)' }}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                            {session.title}
                                        </span>
                                        <div style={{ display: 'flex', opacity: currentSessionId === session.id ? 1 : 0.5 }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setEditingSessionId(session.id)
                                                    setEditTitle(session.title)
                                                }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
                                                title="Rename"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button
                                                onClick={(e) => deleteSession(session.id, e)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
                                                title="Delete"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                        <User size={16} />
                        <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</span>
                    </div>
                    <button
                        onClick={signOut}
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '0.5rem',
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            fontSize: '0.85rem'
                        }}
                    >
                        <LogOut size={14} />
                        Cerrar Sesión
                    </button>
                </div>
            </div>

            {/* Main Chat Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {!currentSessionId ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '1.5rem', color: 'var(--text-secondary)' }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                background: 'var(--bg-secondary)',
                                borderRadius: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1rem',
                                border: '1px solid var(--border-color)'
                            }}>
                                <Bot size={40} color="var(--accent-color)" />
                            </div>
                            <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Bienvenido</h2>
                            <p style={{ margin: 0, opacity: 0.7 }}>Selecciona una conversación o empieza una nueva.</p>
                            <button
                                onClick={createNewSession}
                                style={{
                                    marginTop: '1rem',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '0.5rem',
                                    background: 'var(--accent-color)',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <Plus size={18} />
                                Empezar Nuevo Chat
                            </button>
                        </div>
                    ) : loading && initialLoad ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                            Cargando conversación...
                        </div>
                    ) : messages.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)' }}>
                            <Bot size={48} style={{ opacity: 0.2 }} />
                            <p>Escribe abajo para empezar esta conversación.</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div
                                key={msg.id || idx}
                                style={{
                                    alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '80%',
                                    display: 'flex',
                                    gap: '1rem',
                                    flexDirection: msg.type === 'user' ? 'row-reverse' : 'row'
                                }}
                                className="fade-in"
                            >
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: msg.type === 'user' ? 'var(--accent-color)' : 'var(--bg-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    border: '1px solid var(--border-color)'
                                }}>
                                    {msg.type === 'user' ? <User size={16} /> : <Bot size={16} />}
                                </div>

                                <div style={{
                                    background: msg.type === 'user' ? 'var(--message-user-bg)' : 'var(--message-ai-bg)',
                                    padding: '1rem 1.5rem',
                                    borderRadius: '1rem',
                                    borderTopRightRadius: msg.type === 'user' ? '4px' : '1rem',
                                    borderTopLeftRadius: msg.type === 'ai' ? '4px' : '1rem',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)',
                                    lineHeight: '1.6'
                                }}>
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area - Disabled if no session */}
                <div style={{ padding: '2rem', background: 'linear-gradient(to top, var(--bg-color) 80%, transparent)', position: 'sticky', bottom: 0, opacity: currentSessionId ? 1 : 0.5, pointerEvents: currentSessionId ? 'auto' : 'none' }}>
                    <form
                        onSubmit={handleSend}
                        className="glass-panel"
                        style={{
                            display: 'flex',
                            gap: '1rem',
                            padding: '0.75rem',
                            borderRadius: '1rem',
                            alignItems: 'center',
                            border: '1px solid var(--accent-color)'
                        }}
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Escribe tu mensaje..."
                            disabled={loading}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-primary)',
                                fontSize: '1rem',
                                outline: 'none',
                                padding: '0.5rem'
                            }}
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            style={{
                                background: input.trim() ? 'var(--accent-color)' : 'var(--bg-secondary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.75rem',
                                padding: '0.75rem',
                                cursor: input.trim() ? 'pointer' : 'default',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            <Send size={20} />
                        </button>
                    </form>
                    <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        La IA puede cometer errores. Verifica la información importante.
                    </div>
                </div>

            </div>
        </div>
    )
}
