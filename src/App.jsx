import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

const KEY='mes-trades-v1';
const money=n=>Number(n||0).toLocaleString(undefined,{style:'currency',currency:'USD'});

function App(){
  const [trades,setTrades]=useState(()=>JSON.parse(localStorage.getItem(KEY)||'[]'));
  const [form,setForm]=useState({date:new Date().toISOString().slice(0,10),instrument:'MES',direction:'Long',pnl:'',score:80,notes:''});
  const stats=useMemo(()=>{
    const net=trades.reduce((a,t)=>a+Number(t.pnl||0),0);
    const wins=trades.filter(t=>Number(t.pnl)>0).length;
    const avgScore=trades.length?trades.reduce((a,t)=>a+Number(t.score||0),0)/trades.length:0;
    return {net,winRate:trades.length?wins/trades.length*100:0,avgScore};
  },[trades]);
  const save=()=>{
    const next=[...trades,{...form,id:crypto.randomUUID(),pnl:Number(form.pnl||0),score:Number(form.score||0)}];
    setTrades(next); localStorage.setItem(KEY,JSON.stringify(next));
    setForm({...form,pnl:'',notes:''});
  };
  return <div className="shell">
    <header><div><p className="eyebrow">Trading journal</p><h1>MES Trading Command Center</h1></div></header>
    <section className="stats">
      <Card label="Net P&L" value={money(stats.net)} tone={stats.net>=0?'good':'bad'}/>
      <Card label="Win Rate" value={`${stats.winRate.toFixed(1)}%`}/>
      <Card label="Trades" value={trades.length}/>
      <Card label="Rule Score" value={`${stats.avgScore.toFixed(0)}/100`}/>
    </section>
    <section className="panel">
      <h2>Log Trade</h2>
      <div className="formgrid">
        {['date','instrument','pnl','score'].map(k=><label key={k}>{k.toUpperCase()}<input type={k==='date'?'date':k==='pnl'||k==='score'?'number':'text'} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}
        <label>DIRECTION<select value={form.direction} onChange={e=>setForm({...form,direction:e.target.value})}><option>Long</option><option>Short</option></select></label>
        <label className="wide">NOTES<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
      </div>
      <button onClick={save}>Save Trade</button>
    </section>
    <section className="panel"><h2>Recent Trades</h2>{trades.length===0?<p className="muted">No trades logged yet.</p>:<table><thead><tr><th>Date</th><th>Instrument</th><th>Direction</th><th>Score</th><th>P&L</th></tr></thead><tbody>{[...trades].reverse().map(t=><tr key={t.id}><td>{t.date}</td><td>{t.instrument}</td><td>{t.direction}</td><td>{t.score}</td><td className={t.pnl>=0?'good':'bad'}>{money(t.pnl)}</td></tr>)}</tbody></table>}</section>
  </div>
}
function Card({label,value,tone=''}){return <div className="card"><span>{label}</span><strong className={tone}>{value}</strong></div>}
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
