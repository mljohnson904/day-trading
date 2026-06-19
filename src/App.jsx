import React,{useEffect,useMemo,useState}from'react';
import ReactDOM from'react-dom/client';
import'./index.css';
import{normState,save}from'./core.js';
import{RulesPanel,ProDashboard,ProEntry,Roadmap,ProAnalytics,ChartStudio}from'./rileyPro.jsx';
import{TradeImport,AccountDashboard}from'./importDashboard.jsx';

function App(){
 const[data,setData]=useState(normState),[tab,setTab]=useState('account'),[mode,setMode]=useState('SIM'),[notice,setNotice]=useState('');
 useEffect(()=>save(data),[data]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(t)},[notice]);
 const trades=useMemo(()=>data.trades||[],[data.trades]);
 const tabs=[['account','Account Dashboard'],['import','Import Trades'],['dashboard','Process Dashboard'],['entry','Enter Trade'],['charts','Chart Markup'],['analytics','Analytics'],['roadmap','90 Day Roadmap']];
 const saveTrade=t=>{const trade={...t,accountType:mode};setData(d=>({...d,trades:[...(d.trades||[]),trade]}));setNotice(`${trade.tradeGrade} ${mode} trade saved · ${trade.checklistPct}% checklist · ${trade.processScore} process score`);setTab('account')};
 const saveChart=chart=>{setData(d=>({...d,zoneCharts:[...(d.zoneCharts||[]),{id:crypto.randomUUID(),date:new Date().toISOString(),chart}]}));setNotice('Annotated chart saved to the journal library.')};
 const importTrades=(incoming,duplicates,destination)=>{if(!incoming.length){setNotice(`No new ${destination} trades found. ${duplicates} duplicates skipped.`);return}setData(d=>({...d,trades:[...(d.trades||[]),...incoming]}));setMode(destination);setNotice(`${incoming.length} ${destination} trades imported. ${duplicates} duplicates skipped.`);setTab('account')};
 const deleteTrade=id=>setData(d=>({...d,trades:(d.trades||[]).filter(t=>t.id!==id)}));
 return <div className="proApp"><aside className="proNav"><div className="proBrand"><span>RR</span><div><b>Riley Reversal</b><small>Journal Pro</small></div></div><div className="accountSwitch"><button className={mode==='SIM'?'active':''} onClick={()=>setMode('SIM')}>SIM</button><button className={mode==='LIVE'?'active live':''} onClick={()=>setMode('LIVE')}>LIVE</button></div>{tabs.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}<div className="smallAccount"><b>{mode} MES Account</b><span>Margin $50</span><span>Preferred risk $20</span><span>Maximum risk $25</span><span>Minimum reward $40</span><span>Target reward $50+</span></div></aside><main>{notice&&<div className="toast">{notice}</div>}{tab==='account'&&<AccountDashboard mode={mode} trades={trades} onDelete={deleteTrade}/>} {tab==='import'&&<TradeImport existing={trades} onImport={importTrades}/>} {tab==='dashboard'&&<ProDashboard trades={trades.filter(t=>(t.accountType||'SIM')===mode)}/>} {tab==='entry'&&<ProEntry onSave={saveTrade}/>} {tab==='charts'&&<ChartStudio onSave={saveChart}/>} {tab==='analytics'&&<ProAnalytics trades={trades.filter(t=>(t.accountType||'SIM')===mode)}/>} {tab==='roadmap'&&<Roadmap/>}</main><RulesPanel/></div>
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);