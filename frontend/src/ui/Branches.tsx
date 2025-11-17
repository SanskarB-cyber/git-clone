import React, { useEffect, useState } from 'react'

export function Branches({ owner, repo, userId }:{ owner:string; repo:string; userId: string }){
  const [branches, setBranches] = useState<string[]>([])
  const [current, setCurrent] = useState<string | null>(null)
  const [newBranch, setNewBranch] = useState('feature/x')

  async function refresh(){
    const r = await fetch(`/api/repos/${owner}/${repo}/branches?owner_id=${encodeURIComponent(userId)}`)
    if(r.ok){
      const data = await r.json()
      setBranches(data.branches || [])
      setCurrent(data.current || null)
    }
  }

  useEffect(()=>{ refresh().catch(()=>{}) }, [owner, repo, userId])

  async function createBranch(){
    await fetch(`/api/repos/${owner}/${repo}/branch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newBranch, owner_id: userId })
    })
    setNewBranch('')
    await refresh()
  }

  async function checkout(ref: string){
    await fetch(`/api/repos/${owner}/${repo}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, owner_id: userId })
    })
    await refresh()
  }

  return (
    <div style={{marginTop:12}}>
      <h3>Branches</h3>
      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        <input value={newBranch} onChange={e=>setNewBranch(e.target.value)} placeholder="new-branch-name"/>
        <button onClick={createBranch}>Create</button>
      </div>
      <ul>
        {branches.map(b => (
          <li key={b}>
            {b === current ? '⭐ ' : ''}{b}
            {b !== current && <button style={{marginLeft:8}} onClick={()=>checkout(b)}>Checkout</button>}
          </li>
        ))}
      </ul>
    </div>
  )
}
