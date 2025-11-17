import React, { useEffect, useState } from 'react'

type Entry = { oid: string; commit: { message:string; author:{ name:string; email:string; timestamp:number } } }

export function History({ owner, repo, userId }:{ owner:string; repo:string; userId: string }){
  const [log, setLog] = useState<Entry[]>([])

  async function load(){
    const r = await fetch(`/api/repos/${owner}/${repo}/log?owner_id=${encodeURIComponent(userId)}`)
    if(r.ok){
      const data = await r.json()
      setLog(data.log || [])
    }
  }

  useEffect(()=>{ load().catch(()=>{}) }, [owner, repo, userId])

  return (
    <div style={{marginBottom:12}}>
      <h3>History</h3>
      <div style={{border:'1px solid #eee', borderRadius:8}}>
        {log.length === 0 ? <div style={{padding:8}}>No commits yet.</div> : (
          <ul>
            {log.map((e)=> (
              <li key={e.oid}>
                <code>{e.oid.slice(0,7)}</code> — {e.commit.message.trim()} <em>by {e.commit.author.name}</em>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
