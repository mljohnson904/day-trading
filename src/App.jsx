import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import Papa from 'papaparse';
import './index.css';

const KEY='mes-command-center-v3';
const today=()=>new Date().toISOString().slice(0,10);
const money=n=>Number(n||0).toLocaleString(undefined,{style:'currency',currency:'USD'});
const defaultState={trades:[],reviews:{},settings:{startingBalance:150,maxDailyLoss:50,maxTrades:3,minRuleScore:80,defaultInstrument:'MES',windowStart:'09:30',windowEnd:'11:00'}};
const ruleLabels=['Inside approved trading window','Aligned with 5M/15M bias','Price aligned with 100 EMA','Entry came from marked zone','1M confirmation present','Stop defined before entry','ATM/bracket confirmed','Risk/reward at least 1:2','No FOMO/revenge trade','Daily loss limit respected'];

function load(){try{return {...defaultState,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return defaultState}}
function saveState(state){localStorage.setItem(KEY,JSON.stringify(state))}
function csvValue(row,names){const key=Object.keys(row).find(k=>names.some(n=>k.toLowerCase().includes(n)));return key?row[key]:''}
function numberValue(v){const s=String(v??'').replace(/[$,]/g,'').trim();if(/^\(.*\)$/.test(s))return-Number(s.slice(1,-1));return Number(s)||0}

function App(){
  const [data,setData]=useState(load);
  const [tab,setTab]=useState('dashboard');
  const [message,setMessage]=useState('');
  const [reviewDate,setReviewDate]=useState(today());
  const [rules,setRules]=useState(Array(10).fill(false));
  const [form,setForm]=useState({date:today(),time:new Date().toTimeString().slice(0,5),instrument:data.settings.defaultInstrument,direction:'Long',contracts:1,entry:'',exit:'',pnl:'',setup:'Riley EMA Trend',emotion:'Calm',mistake:'None',notes:''});

  const updateData=next=>{setData(next);saveState(next)};
  const stats=useMemo(()=>{
    const t=data.trades, wins=t.filter(x=>x.pnl>0), losses=t.filter(x=>x.pnl<0);
    const net=t.reduce((a,b)=>a+b.pnl,0), grossWin=wins.reduce((a,b)=>a+b.pnl,0), grossLoss=Math.abs(losses.reduce((a,b)=>a+b.pnl,0));
    const avgWin=wins.length?grossWin/wins.length:0, avgLoss=losses.length?grossLoss/losses.length:0;
    let peak=0,equity=0,maxDrawdown=0;[...t].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).forEach(x=>{equity+=x.pnl;peak=Math.max(peak,equity);maxDrawdown=Math.max(maxDrawdown,peak-equity)});
    return {net,count:t.length,winRate:t.length?wins.length/t.length*100:0,profitFactor:grossLoss?grossWin/grossLoss:grossWin?99:0,avgWin,avgLoss,maxDrawdown,ruleScore:t.length?t.reduce((a,b)=>a+b.score,0)/t.length:0};
  },[data.trades]);

  const addTrade=()=>{
    if(!form.date||form.pnl===''){setMessage('Add a date and net P&L before saving.');return}
    const trade={...form,id:crypto.randomUUID(),contracts:Number(form.contracts)||1,entry:numberValue(form.entry),exit:numberValue(form.exit),pnl:numberValue(form.pnl),score:rules.filter(Boolean).length*10,rules};
    updateData({...data,trades:[...data.trades,trade]});
    setForm({...form,time:new Date().toTimeString().slice(0,5),entry:'',exit:'',pnl:'',notes:'',mistake:'None'});setRules(Array(10).fill(false));setMessage('Trade saved.');setTab('dashboard');
  };

  const importCsv=file=>{
    if(!file)return;
    Papa.parse(file,{header:true,skipEmptyLines:true,complete:({data:rows})=>{
      const imported=rows.map(row=>{
        let date=csvValue(row,['close date','date']);const parsed=new Date(date);if(!Number.isNaN(parsed.getTime()))date=parsed.toISOString().slice(0,10);
        const side=csvValue(row,['direction','side','action']);
        return {id:crypto.randomUUID(),date:date||today(),time:csvValue(row,['time'])||'',instrument:csvValue(row,['instrument','symbol'])||data.settings.defaultInstrument,direction:/sell|short/i.test(side)?'Short':'Long',contracts:numberValue(csvValue(row,['quantity','qty','contracts']))||1,entry:numberValue(csvValue(row,['entry'])),exit:numberValue(csvValue(row,['exit'])),pnl:numberValue(csvValue(row,['net pnl','net p&l','pnl','p&l','profit'])),setup:'Imported',emotion:'Not recorded',mistake:'None',notes:'Imported from NinjaTrader CSV',score:0,rules:Array(10).fill(false)};
      });
      updateData({...data,trades:[...data.trades,...imported]});setMessage(`Imported ${imported.length} trades.`);setTab('dashboard');
    },error:setMessage(error.message)});
  };

  const deleteTrade=id=>updateData({...data,trades:data.trades.filter(t=>t.id!==id)});
  const selectedReview=data.reviews[reviewDate]||{well:'',broke:'',worked:'',focus:''};
  const saveReview=review=>{updateData({...data,reviews:{...data.reviews,[reviewDate]:review}});setMessage('Daily review saved.');};
  const daily=useMemo(()=>{const map={};data.trades.forEach(t=>{map[t.date]=(map[t.date]||0)+t.pnl});return map},[data.trades]);
  const dayTrades=data.trades.filter(t=>t.date===reviewDate), dayNet=dayTrades.reduce((a,b)=>a+b.pnl,0);

  return <div className="appShell">
    <aside className="sidebar"><div className="brand">MES Command Center</div><div className="small muted">NinjaTrader journal</div>{['dashboard','journal','import','review','settings'].map(x=><button key={x} className={tab===x?'nav active':'nav'} onClick={()=>setTab(x)}>{x[0].toUpperCase()+x.slice(1)}</button>)}</aside>
    <main className="content">{message&&<div className="notice" onClick={()=>setMessage('')}>{message}</div>}
      {tab==='dashboard'&&<Dashboard stats={stats} trades={data.trades} daily={daily} startingBalance={data.settings.startingBalance} onDelete={deleteTrade}/>} 
      {tab==='journal'&&<Journal form={form} setForm={setForm} rules={rules} setRules={setRules} onSave={addTrade}/>} 
      {tab==='import'&&<ImportPage onCsv={importCsv}/>} 
      {tab==='review'&&<ReviewPage date={reviewDate} setDate={setReviewDate} dayTrades={dayTrades} dayNet={dayNet} initial={selectedReview} onSave={saveReview}/>} 
      {tab==='settings'&&<Settings settings={data.settings} onSave={settings=>{updateData({...data,settings});setMessage('Settings saved.')}} onReset={()=>{if(confirm('Delete all journal data?')){updateData(defaultState);location.reload()}}}/>} 
    </main>
  </div>
}

function Dashboard({stats,trades,daily,startingBalance,onDelete}){const recent=[...trades].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)).slice(0,10);return <>
  <div className="pageHead"><div><p className="eyebrow">Performance overview</p><h1>Trading Dashboard</h1></div><div className="balance">Estimated Balance <strong>{money(Number(startingBalance)+stats.net)}</strong></div></div>
  <section className="statsGrid">{[['Net P&L',money(stats.net)],['Win Rate',stats.winRate.toFixed(1)+'%'],['Profit Factor',stats.profitFactor.toFixed(2)],['Rule Score',stats.ruleScore.toFixed(0)+'/100'],['Avg Win',money(stats.avgWin)],['Avg Loss',money(stats.avgLoss)],['Max Drawdown',money(stats.maxDrawdown)],['Total Trades',stats.count]].map(([l,v])=><Card key={l} label={l} value={v}/>)}</section>
  <section className="panel"><h2>Trading Calendar</h2><div className="calendar">{Object.keys(daily).length?Object.entries(daily).sort().slice(-28).map(([d,p])=><div key={d} className={`day ${p>0?'win':p<0?'loss':''}`}><span>{d.slice(5)}</span><strong>{money(p)}</strong></div>):<p className="muted">Import or log trades to build your calendar.</p>}</div></section>
  <section className="panel"><h2>Recent Trades</h2><TradeTable rows={recent} onDelete={onDelete}/></section>
</>}
function Card({label,value}){return <div className="card"><span>{label}</span><strong>{value}</strong></div>}
function TradeTable({rows,onDelete}){if(!rows.length)return <p className="muted">No trades yet.</p>;return <div className="tableWrap"><table><thead><tr><th>Date</th><th>Instrument</th><th>Side</th><th>Setup</th><th>Score</th><th>P&L</th><th></th></tr></thead><tbody>{rows.map(t=><tr key={t.id}><td>{t.date} {t.time}</td><td>{t.instrument}</td><td>{t.direction}</td><td>{t.setup}</td><td>{t.score}</td><td className={t.pnl>=0?'good':'bad'}>{money(t.pnl)}</td><td><button className="danger" onClick={()=>onDelete(t.id)}>Delete</button></td></tr>)}</tbody></table></div>}
function Journal({form,setForm,rules,setRules,onSave}){const set=(k,v)=>setForm({...form,[k]:v});return <><div className="pageHead"><div><p className="eyebrow">Guided entry</p><h1>Trade Journal</h1></div></div><section className="panel"><div className="formGrid">{[['date','Date','date'],['time','Time','time'],['instrument','Instrument','text'],['contracts','Contracts','number'],['entry','Entry','number'],['exit','Exit','number'],['pnl','Net P&L','number']].map(([k,l,type])=><label key={k}>{l}<input type={type} step="0.25" value={form[k]} onChange={e=>set(k,e.target.value)}/></label>)}<label>Direction<select value={form.direction} onChange={e=>set('direction',e.target.value)}><option>Long</option><option>Short</option></select></label><label>Setup<select value={form.setup} onChange={e=>set('setup',e.target.value)}><option>Riley EMA Trend</option><option>Supply/Demand Zone</option><option>Breakout</option><option>Reversal</option><option>Other</option></select></label><label>Emotion<select value={form.emotion} onChange={e=>set('emotion',e.target.value)}><option>Calm</option><option>Confident</option><option>Hesitant</option><option>FOMO</option><option>Revenge</option><option>Frustrated</option></select></label><label>Mistake<select value={form.mistake} onChange={e=>set('mistake',e.target.value)}><option>None</option><option>Overtrading</option><option>Outside trading window</option><option>Early entry</option><option>Chasing</option><option>No confirmed bracket</option><option>Ignored bias</option><option>Second contract too early</option></select></label><label className="wide">Notes<textarea value={form.notes} onChange={e=>set('notes',e.target.value)}/></label></div></section><section className="panel"><div className="scoreHead"><h2>Rule Score</h2><strong>{rules.filter(Boolean).length*10}/100</strong></div><div className="checkGrid">{ruleLabels.map((r,i)=><label className="check" key={r}><input type="checkbox" checked={rules[i]} onChange={()=>setRules(rules.map((v,j)=>j===i?!v:v))}/><span>{r}</span></label>)}</div><button className="primary" onClick={onSave}>Save Trade</button></section></>}
function ImportPage({onCsv}){return <><div className="pageHead"><div><p className="eyebrow">Automatic entry</p><h1>Import NinjaTrader Performance</h1></div></div><section className="panel"><h2>CSV Import</h2><p className="muted">Export your NinjaTrader trade performance as CSV, then upload it here. The app maps common Date, Symbol, Quantity, Entry, Exit and Net P&L columns automatically.</p><input className="file" type="file" accept=".csv,text/csv" onChange={e=>onCsv(e.target.files?.[0])}/></section><section className="panel"><h2>PDF Performance Pages</h2><p className="muted">PDF uploads can be stored as references, but reliable automatic trade extraction is not enabled yet. Use NinjaTrader CSV export for accurate import without manual typing.</p><input className="file" type="file" accept="application/pdf"/></section></>}
function ReviewPage({date,setDate,dayTrades,dayNet,initial,onSave}){const [review,setReview]=useState(initial);React.useEffect(()=>setReview(initial),[date,initial]);return <><div className="pageHead"><div><p className="eyebrow">End-of-day process</p><h1>Daily Review</h1></div></div><section className="statsGrid"><Card label="Review Date" value={<input type="date" value={date} onChange={e=>setDate(e.target.value)}/>}/><Card label="Daily P&L" value={money(dayNet)}/><Card label="Trades" value={dayTrades.length}/><Card label="Avg Rule Score" value={(dayTrades.length?dayTrades.reduce((a,b)=>a+b.score,0)/dayTrades.length:0).toFixed(0)+'/100'}/></section><section className="panel"><div className="formGrid two">{[['well','What did I do well?'],['broke','What rule did I break?'],['worked','What setup worked best?'],['focus','Tomorrow’s focus']].map(([k,l])=><label key={k}>{l}<textarea value={review[k]||''} onChange={e=>setReview({...review,[k]:e.target.value})}/></label>)}</div><button className="primary" onClick={()=>onSave(review)}>Save Daily Review</button></section></>}
function Settings({settings,onSave,onReset}){const [s,setS]=useState(settings);return <><div className="pageHead"><div><p className="eyebrow">Risk controls</p><h1>Settings</h1></div></div><section className="panel"><div className="formGrid">{[['startingBalance','Starting Balance','number'],['maxDailyLoss','Max Daily Loss','number'],['maxTrades','Max Trades Per Day','number'],['minRuleScore','Minimum Rule Score','number'],['defaultInstrument','Default Instrument','text'],['windowStart','Window Start','time'],['windowEnd','Window End','time']].map(([k,l,type])=><label key={k}>{l}<input type={type} value={s[k]} onChange={e=>setS({...s,[k]:type==='number'?Number(e.target.value):e.target.value})}/></label>)}</div><button className="primary" onClick={()=>onSave(s)}>Save Settings</button><button className="danger large" onClick={onReset}>Reset All Data</button></section></>}

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
