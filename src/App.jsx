import React,{useEffect,useMemo,useState}from'react';
import ReactDOM from'react-dom/client';
import'./index.css';
import'./importDashboard.css';
import'./guidance.css';
import{normState,save}from'./core.js';
import{RulesPanel,ProDashboard,ProEntry,Roadmap,ProAnalytics,ChartStudio}from'./rileyPro.jsx';
import{TradeImport,AccountDashboard}from'./importDashboard.jsx';
import{GuidedHome,Onboarding,HelpPage,ReviewQueue}from'./guidance.jsx';

function App(){
 const[data,setData]=useState(normState),[tab,setTab]=useState('home'),[mode,setMode]=useState('SIM'),[notice,setNotice]=useState(''),[showTour,setShowTour]=useState(()=>localStorage.getItem('rrjp-onboarding-complete')!=='yes');
 useEffect(()=>save(data),[data]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(t)},[notice]);
 const trades=useMemo(()=>data.trades||[],[data.trades]);
 const groups=[
  ['DAILY',[['home','Start Here'],['entry','Journal a Trade'],['import','Import NinjaTrader CSV']]],
  ['REVIEW',[['account','SIM / LIVE Results'],['reviewQueue','Review Imported Trades'],['dashboard','Discipline Scorecard'],['analytics','Find My Strengths']]],
  ['TRAINING',[['charts','Mark Up a Chart'],['roadmap','Learning Roadmap'],['help','How to Use the App']]]
 ];
 const saveTrade=t=>{const trade={...t,accountType:mode};setData(d=>({...d,trades:[...(d.trades||[]),trade]}));setNotice(`${trade.tradeGrade} ${mode} trade saved · ${trade.checklistPct}% checklist · ${trade.processScore} process score`);setTab('account')};
 const saveChart=chart=>{setData(d=>({...d,zoneCharts:[...(d.zoneCharts||[]),{id:crypto.randomUUID(),date:new Date().toISOString(),chart}]}));setNotice('Annotated chart saved. Next step: attach it while journaling the matching trade.')};
 const importTrades=(incoming,duplicates,destination)=>{if(!incoming.length){setNotice(`No new ${destination} trades found. ${duplicates} duplicates skipped.`);return}setData(d=>({...d,trades:[...(d.trades||[]),...incoming]}));setMode(destination);setNotice(`${incoming.length} ${destination} trades imported. ${duplicates} duplicates skipped. Review them next.`);setTab('reviewQueue')};
 const deleteTrade=id=>setData(d=>({...d,trades:(d.trades||[]).filter(t=>t.id!==id)}));
 const updateTrade=trade=>{setData(d=>({...d,trades:(d.trades||[]).map(t=>t.id===trade.id?trade:t)}));setNotice('Riley review saved. Process scores updated.')};
 const finishTour=selectedMode=>{setMode(selectedMode||'SIM');localStorage.setItem('rrjp-onboarding-complete','yes');setShowTour(false)};
 const intro={account:<p className="pageIntro"><b>SIM / LIVE Results</b> shows what happened financially in the selected account.</p>,dashboard:<p className="pageIntro"><b>Discipline Scorecard</b> shows whether you followed Riley’s process, even when a good trade loses.</p>,import:<p className="pageIntro">Upload a NinjaTrader Trade Performance CSV, choose SIM or LIVE, preview it, and import only new trades.</p>,entry:<p className="pageIntro">Complete the Riley checklist, risk checks, screenshots, and post-trade review. The app grades execution quality before profit.</p>,analytics:<p className="pageIntro">Compare the patterns, zones, timing, emotions, and confirmation quality that separate strong trades from weak ones.</p>};
 return <div className="proApp"><aside className="proNav"><div className="proBrand"><span>RR</span><div><b>Riley Reversal</b><small>Journal Pro</small></div></div><div className="accountSwitch"><button className={mode==='SIM'?'active':''} onClick={()=>setMode('SIM')}>SIM</button><button className={mode==='LIVE'?'active live':''} onClick={()=>setMode('LIVE')}>LIVE</button></div>{groups.map(([name,items])=><div className="navGroup" key={name}><span>{name}</span>{items.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</div>)}<div className="smallAccount"><b>{mode} MES Account</b><span>Margin $50</span><span>Preferred risk $20</span><span>Maximum risk $25</span><span>Minimum reward $40</span><span>Target reward $50+</span></div><button onClick={()=>setShowTour(true)}>Restart Tutorial</button></aside><main>{notice&&<div className="toast">{notice}</div>}{tab==='home'&&<GuidedHome mode={mode} trades={trades} onGo={setTab}/>} {tab==='account'&&<>{intro.account}<AccountDashboard mode={mode} trades={trades} onDelete={deleteTrade}/></>} {tab==='import'&&<>{intro.import}<TradeImport existing={trades} onImport={importTrades}/></>} {tab==='reviewQueue'&&<ReviewQueue mode={mode} trades={trades} onUpdate={updateTrade}/>} {tab==='dashboard'&&<>{intro.dashboard}<ProDashboard trades={trades.filter(t=>(t.accountType||'SIM')===mode)}/></>} {tab==='entry'&&<>{intro.entry}<ProEntry onSave={saveTrade}/></>} {tab==='charts'&&<ChartStudio onSave={saveChart}/>} {tab==='analytics'&&<>{intro.analytics}<ProAnalytics trades={trades.filter(t=>(t.accountType||'SIM')===mode)}/></>} {tab==='roadmap'&&<Roadmap/>} {tab==='help'&&<HelpPage onGo={setTab}/>}</main><RulesPanel/>{showTour&&<Onboarding onFinish={finishTour} onGo={setTab}/>}</div>
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);