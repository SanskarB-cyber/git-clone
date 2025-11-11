import React, { useState } from 'react'

export function FileEditor({ owner, repo, onCommitted }:{ owner:string; repo:string; onCommitted: ()=>void }){
  const [filepath, setFilepath] = useState('README.md')
  const [content, setContent] = useState('# Hello\n')
  const [message, setMessage] = useState('feat: initial commit')

  async function call(path: string, init?: RequestInit){
    const r = await fetch(path, init)
    if(!r.ok) throw new Error(await r.text())
    return r.json()
  }

  async function save(){
    await call(`/api/repos/${owner}/${repo}/file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filepath, content })
    })
  }

  async function commit(){
    await save()
    await call(`/api/repos/${owner}/${repo}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    })
    onCommitted()
  }

  return (
    <div style={{marginBottom:12}}>
      <h3>Editor</h3>
      <div style={{display:'grid', gap:8}}>
        <input value={filepath} onChange={e=>setFilepath(e.target.value)} placeholder="path/to/file.txt"/>
        <textarea value={content} onChange={e=>setContent(e.target.value)} rows={10} style={{width:'100%'}}/>
        <div style={{display:'flex', gap:8}}>
          <input value={message} onChange={e=>setMessage(e.target.value)} placeholder="commit message"/>
          <button onClick={commit}>Save & Commit</button>
        </div>
      </div>
    </div>
  )
}
