import React from 'react'

export function RepoHeader(props: {
  owner: string; repo: string;
  setOwner: (v:string)=>void; setRepo:(v:string)=>void;
  onInit: ()=>void; onRefresh: ()=>void;
}){
  return (
    <div style={{display:'flex', gap:8, alignItems:'center'}}>
      <h2 style={{margin:0}}>GitHub Clone · Basic Git</h2>
      <div style={{marginLeft:'auto', display:'flex', gap:8}}>
        <input value={props.owner} onChange={e=>props.setOwner(e.target.value)} placeholder="owner"/>
        <input value={props.repo} onChange={e=>props.setRepo(e.target.value)} placeholder="repo"/>
        <button onClick={props.onInit}>Init</button>
        <button onClick={props.onRefresh}>Refresh</button>
      </div>
    </div>
  )
}
