import React,{useEffect,useMemo,useState}from'react';
import ReactDOM from'react-dom/client';
import'./index.css';
import{normState,save}from'./core.js';
import{RileyDashboard,RileyExecution,ZoneMarkup,RileyReplay,RileyAnalytics,RileySettings}from'./rileySystem.jsx';

function App(){
 const[data,setData]=useState(normState),[tab,setTab]=useState('dashboard'),[mode,setMode]=useState('SIM'),[notice,setNotice]=useState('');
 useEffect(()=>save(data),[data]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(t)},[notice]);
 const trades=useMemo(()=>data.trades||[],[data.trades]);
 const riskSettings={maxRisk:20,maxDailyLoss:60,maxTrades:5,...(data.settings?.[mode]||{})};
 const tabs=[['dashboard','Scorecard'],['execute','Enter Trade'],['zones','Zone Markup'],['replay','Trade Replay'],['analytics','Analytics'],['settings','Risk Rules']];
 const saveTrade=trade=>{setData(d=>({...d,trades:[...(d.trades||[]),trade]}));setNotice(`${trade.grade} ${trade.accountType} trade saved with ${trade.checklistScore}% Riley compliance.`);setTab('dashboard')};
 const saveZone=chart=>{setData(d=>({...d,zoneCharts:[...(d.zoneCharts||[]),{id:crypto.randomUUID(),date:new Date().toISOString(),chart}]}));setNotice('Annotated chart saved. Add it to the matching trade from the execution form.')};
 const saveRisk=s=>{setData(d=>({...d,settings:{...d.settings,[mode]:{...(d.settings?.[mode]||{}),...s}}}));setNotice(`${mode} risk rules saved.`)};
 return <div className="rileyApp"><aside><div className="rileyBrand"><span>RC</span><div><b>Riley Execution</b><small>Process over profit</small></div></div><div className="modeSwitch"><button className={mode==='SIM'?'active':''} onClick={()=>setMode('SIM')}>SIM</button><button className={mode==='LIVE'?'active live':''} onClick={()=>setMode('LIVE')}>LIVE</button></div>{tabs.map(([id,label])=><button key={id} className={tab===id?'rnav active':'rnav'} onClick={()=>setTab(id)}>{label}</button>)}<div className="sidebarRule"><b>Daily Rules</b><span>Max risk: ${riskSettings.maxRisk}</span><span>Max loss: ${riskSettings.maxDailyLoss}</span><span>Max trades: {riskSettings.maxTrades}</span></div></aside><main>{notice&&<div className="toast">{notice}</div>}{tab==='dashboard'&&<RileyDashboard trades={trades} mode={mode} settings={riskSettings}/>} {tab==='execute'&&<RileyExecution mode={mode} settings={riskSettings} onSave={saveTrade}/>} {tab==='zones'&&<ZoneMarkup onSave={saveZone}/>} {tab==='replay'&&<RileyReplay trades={trades.filter(t=>(t.accountType||'SIM')===mode)}/>} {tab==='analytics'&&<RileyAnalytics trades={trades.filter(t=>(t.accountType||'SIM')===mode)}/>} {tab==='settings'&&<RileySettings settings={riskSettings} onSave={saveRisk}/>}</main></div>
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);