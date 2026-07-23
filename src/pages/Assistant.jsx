import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { askAssistant, SUGGESTED_QUESTIONS } from '../lib/assistant'
import { IconSparkle, IconSend, IconVideo, IconFile } from '../components/Icons'

function ResourceLink({ resource }) {
  const isVideo = resource.type === 'video'
  const Icon = isVideo ? IconVideo : IconFile
  const inner = (
    <>
      <span className="res-icon"><Icon size={16} /></span>
      <span className="res-text">
        <strong>{resource.title}</strong>
        <small>{isVideo ? 'Video · Education' : 'Document · Education'}</small>
      </span>
    </>
  )
  return isVideo
    ? <Link to="/education" className="assistant-resource">{inner}</Link>
    : <a href={resource.url} target="_blank" rel="noreferrer" className="assistant-resource">{inner}</a>
}

function Message({ message }) {
  if (message.role === 'user') {
    return <div className="chat-row user"><div className="chat-bubble user">{message.text}</div></div>
  }
  return (
    <div className="chat-row bot">
      <span className="chat-avatar"><IconSparkle size={16} /></span>
      <div className="chat-bubble bot">
        {message.text.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
        {message.resources?.length > 0 && (
          <div className="assistant-resources">
            {message.resources.map((r) => <ResourceLink key={`${r.type}-${r.id}`} resource={r} />)}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Assistant() {
  const { profile } = useAuth()
  const loId = profile?.role === 'agent' ? profile.loId : profile?.id
  const [resources, setResources] = useState([])
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: "Hi! I'm your Own It Social assistant. Ask me about loan guidelines, qualifying, investor loans, or growing your business — I'll answer and point you to helpful training in your Education section.",
      resources: [],
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!loId) return
    const load = async () => {
      const [videoSnap, docSnap] = await Promise.all([
        getDocs(query(collection(db, 'videos'), where('loId', '==', loId))),
        getDocs(query(collection(db, 'documents'), where('loId', '==', loId))),
      ])
      const vids = videoSnap.docs.map((d) => ({ type: 'video', id: d.id, ...d.data() }))
      const docs = docSnap.docs.map((d) => ({ type: 'document', id: d.id, url: d.data().fileUrl, ...d.data() }))
      setResources([...vids, ...docs])
    }
    load().catch(() => {})
  }, [loId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  const send = async (text) => {
    const q = (text ?? input).trim()
    if (!q || busy) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: q }])
    setBusy(true)
    try {
      const { text: answer, resources: matched } = await askAssistant(q, resources)
      setMessages((m) => [...m, { role: 'bot', text: answer, resources: matched }])
    } catch {
      setMessages((m) => [...m, {
        role: 'bot',
        text: 'Sorry — something went wrong. Please try again in a moment.',
        resources: [],
      }])
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = (e) => { e.preventDefault(); send() }

  return (
    <div className="assistant">
      <div className="page-header">
        <p className="muted">
          Ask about loan guidelines, investor business, marketing, and more. Answers link to
          training your loan officer has published.
        </p>
      </div>

      <div className="chat-window" ref={scrollRef}>
        {messages.map((m, i) => <Message key={i} message={m} />)}
        {busy && (
          <div className="chat-row bot">
            <span className="chat-avatar"><IconSparkle size={16} /></span>
            <div className="chat-bubble bot typing"><span></span><span></span><span></span></div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="chat-suggestions">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button key={q} className="chip" onClick={() => send(q)}>{q}</button>
          ))}
        </div>
      )}

      <form className="chat-input" onSubmit={onSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          disabled={busy}
        />
        <button type="submit" className="btn" disabled={busy || !input.trim()}>
          <IconSend size={18} />
        </button>
      </form>
      <p className="assistant-disclaimer muted">
        General guidance only — always confirm program specifics and any real client scenario
        with your loan officer.
      </p>
    </div>
  )
}
