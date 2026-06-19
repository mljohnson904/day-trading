import React,{useEffect,useMemo,useState}from'react';
import ReactDOM from'react-dom/client';
import'./index.css';
import{normState,save}from'./core.js';
import{RULES,RulesPanel,ProDashboard,ProEntry,Roadmap,ProAnalytics,ChartStudio}from'./rileyPro.jsx';

function App(){
 const[data,setData]=useState(normState),[tab,setTab]=useState('dashboard'),[notice,setNotice]=useState('');
 useEffect(()=>save(data),[data]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(t)},[notice]);
 const trades=useMemo(()=>data.trades||[],[data.trades]);
 const tabs=[['dashboard','Home'],['entry','Enter Trade'],['charts','Chart Markup'],['analytics','Analytics'],['roadmap','90 Day Roadmap']];
 const saveTrade=t=>{setData(d=>({...d,trades:[...(d.trades||[]),t]}));setNotice(`${t.tradeGrade} trade saved · ${t.checklistPct}% checklist · ${t.processScore} process score`);setTab('dashboard')};
 const saveChart=chart=>{setData(d=>({...d,zoneCharts:[...(d.zoneCharts||[]),{id:crypto.randomUUID(),date:new Date().toISOString(),chart}]}));setNotice('Annotated chart saved to the journal library.')};
 return <div className="proApp"><aside className="proNav"><div className="proBrand"><span>RR</span><div><b>Riley Reversal</b><small>Journal Pro</small></div></div>{tabs.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}<div className="smallAccount"><b>MES Small Account</b><span>Margin $50</span><span>Preferred risk $20</span><span>Maximum risk $25</span><span>Minimum reward $40</span><span>Target reward $50+</span></div></aside><main>{notice&&<div className="toast">{notice}</div>}{tab==='dashboard'&&<ProDashboard trades={trades}/>} {tab==='entry'&&<ProEntry onSave={saveTrade}/>} {tab==='charts'&&<ChartStudio onSave={saveChart}/>} {tab==='analytics'&&<ProAnalytics trades={trades}/>} {tab==='roadmap'&&<Roadmap/>}</main><RulesPanel/></div>
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);