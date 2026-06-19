import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Papa from 'papaparse';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import {
  Activity, AlertTriangle, BarChart3, CalendarDays, CheckCircle2, ClipboardList, FileUp, Home, Lock, Settings, ShieldCheck, Target, TrendingUp, XCircle,
} from 'lucide-react';
import './index.css';

const STORAGE_KEY = 'mes-trading-command-center-v1';

const defaultSettings = {
  instrument: 'MES',
  tradingWindowStart: '09:30',
  tradingWindowEnd: '11:00',
  maxTradesPerDay: 3,
  maxDailyLoss: 50,
  maxContracts: 1,
  minimumRuleScore: 80,
  accountSize: 150,
  contractMarginReminder: 150,
};

const demoTrades = [
  {
    id: crypto.randomUUID(), date: '2026-06-09', time: '09:42', instrument: 'MES', direction: 'Long', contracts: 1,
    entry: 6018.25, exit: 6022.25, stop: 6015.25, target: 6024.25, netPnl: 20, setup: 'Riley EMA Trend', timeframe: '5M bias / 1M entry', emotion: 'calm',
    notes: 'Clean trend continuation after confirmation. Took profit quickly.', screenshotName: '', pdfName: '', locked: false,
    checklist: { window: true, ema: true, trend: true, zone: true, confirmation: true, stop: true, bracket: true, rr: true, noFomo: true, dailyLoss: true },
    mistakes: [],
  },
  {
    id: crypto.randomUUID(), date: '2026-06-10', time: '10:18', instrument: 'MES', direction: 'Short', contracts: 1,
    entry: 6030.5, exit: 6034.5, stop: 6033.5, target: 6024.5, netPnl: -20, setup: 'Reversal', timeframe: '1M entry', emotion: 'frustrated',
    notes: 'Entry was early and bracket/margin needed more attention.', screenshotName: '', pdfName: '', locked: false,
    checklist: { window: true, ema: false, trend: false, zone: true, confirmation: false, stop: true, bracket: false, rr: true, noFomo: false, dailyLoss: true },
    mistakes: ['Early entry', 'No confirmed bracket', 'Ignored bias'],
  },
  {
    id: crypto.randomUUID(), date: '2026-06-12', time: '09:58', instrument: 'MES', direction: 'Long', contracts: 1,
    entry: 6008.25, exit: 6014.25, stop: 6005.25, target: 6014.25, netPnl: 30, setup: 'Supply/Demand Zone', timeframe: '15M bias / 5M setup / 1M entry', emotion: 'confident',
    notes: 'Best example of waiting for a level and confirmation.', screenshotName: '', pdfName: '', locked: false,
    checklist: { window: true, ema: true, trend: true, zone: true, confirmation: true, stop: true, bracket: true, rr: true, noFomo: true, dailyLoss: true },
    mistakes: [],
  },
];

const ruleLabels = {
  window: 'Trade was between approved window',
  ema: '100 EMA bias aligned',
  trend: '5M/15M trend was clear',
  zone: 'Came from marked zone',
  confirmation: '1M confirmation appeared',
  stop: 'Stop was placed',
  bracket: 'ATM/bracket confirmed',
  rr: 'Risk/reward was at least 1:2',
  noFomo: 'Not revenge/FOMO/chase',
  dailyLoss: 'Daily loss rule respected',
};

const mistakes = ['Overtrading', 'Trading outside window', 'No confirmed bracket', 'Early entry', 'Chasing', 'Revenge trade', 'Second contract too early', 'Ignored bias', 'Moved stop', 'No clear zone'];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { trades: demoTrades, reviews: {}, settings: defaultSettings, imports: [] };
    const parsed = JSON.parse(raw);
    return {
      trades: parsed.trades || demoTrades,
      reviews: parsed.reviews || {},
      settings: { ...defaultSettings, ...(parsed.settings || {}) },
      imports: parsed.imports || [],
    };
  } catch {
    return { trades: demoTrades, reviews: {}, settings: defaultSettings, imports: [] };
  }
}

function saveState(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function ruleScore(checklist = {}) {
  const keys = Object.keys(ruleLabels);
  const earned = keys.filter(k => checklist[k]).length;
  return Math.round((earned / keys.length) * 100);
}

function num(value, fallback = 0) {
  if (typeof value === 'number') return value;
  if (value === undefined || value === null) return fallback;
  const cleaned = String(value).replace(/[$,()]/g, '').trim();
  const n = Number(cleaned);
  if (Number.isNaN(n)) return fallback;
  return String(value).includes('(') ? -Math.abs(n) : n;
}

function statFormat(value, prefix = '', suffix = '') {
  if (Number.isNaN(value) || value === undefined || value === null) return '—';
  return `${prefix}${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
}

function normalizeImportedRow(row) {
  const keys = Object.keys(row || {});
  const find = (...names) => {
    const key = keys.find(k => names.some(n => k.toLowerCase().includes(n.toLowerCase())));
    return key ? row[key] : '';
  };
  const dateRaw = find('date', 'close date', 'time');
  const timeRaw = find('time');
  const pnlRaw = find('net pnl', 'net p&l', 'pnl', 'p&l', 'profit');
  const entryRaw = find('entry', 'avg entry', 'entry price');
  const exitRaw = find('exit', 'avg exit', 'exit price');
  const qtyRaw = find('qty', 'quantity', 'contracts');
  const instrumentRaw = find('symbol', 'instrument', 'market');
  const directionRaw = find('direction', 'side', 'action');

  let date = new Date().toISOString().slice(0, 10);
  const parsedDate = new Date(dateRaw);
  if (!Number.isNaN(parsedDate.getTime())) date = parsedDate.toISOString().slice(0, 10);
  const time = String(timeRaw || dateRaw || '').match(/\d{1,2}:\d{2}/)?.[0] || '09:30';
  const pnl = num(pnlRaw);
  return {
    id: crypto.randomUUID(), date, time,
    instrument: instrumentRaw || 'MES',
    direction: String(directionRaw || '').toLowerCase().includes('short') || String(directionRaw || '').toLowerCase().includes('sell') ? 'Short' : 'Long',
    contracts: num(qtyRaw, 1) || 1,
    entry: num(entryRaw), exit: num(exitRaw), stop: '', target: '', netPnl: pnl,
    setup: 'Imported', timeframe: 'Unknown', emotion: 'calm', notes: 'Imported from CSV. Review and score this trade.', screenshotName: '', pdfName: '', locked: false,
    checklist: { window: false, ema: false, trend: false, zone: false, confirmation: false, stop: false, bracket: false, rr: false, noFomo: true, dailyLoss: true },
    mistakes: [],
  };
}

function useAppState() {
  const [state, setState] = useState(loadState);
  const update = (patch) => {
    const next = typeof patch === 'function' ? patch(state) : { ...state, ...patch };
    setState(next);
    saveState(next);
  };
  return [state, update];
}

function computeStats(trades) {
  const total = trades.reduce((s, t) => s + num(t.netPnl), 0);
  const wins = trades.filter(t => num(t.netPnl) > 0);
  const losses = trades.filter(t => num(t.netPnl) < 0);
  const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
  const avgWin = wins.length ? wins.reduce((s, t) => s + num(t.netPnl), 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + num(t.netPnl), 0) / losses.length : 0;
  const grossWin = wins.reduce((s, t) => s + num(t.netPnl), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + num(t.netPnl), 0));
  const profitFactor = grossLoss ? grossWin / grossLoss : grossWin ? grossWin : 0;
  let peak = 0, equity = 0, maxDrawdown = 0;
  [...trades].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)).forEach(t => {
    equity += num(t.netPnl);
    peak = Math.max(peak, equity);
    maxDrawdown = Math.min(maxDrawdown, equity - peak);
  });
  const avgRuleScore = trades.length ? Math.round(trades.reduce((s, t) => s + ruleScore(t.checklist), 0) / trades.length) : 0;
  return { total, wins: wins.length, losses: losses.length, winRate, avgWin, avgLoss, profitFactor, maxDrawdown, totalTrades: trades.length, avgRuleScore };
}

function dailyData(trades) {
  const byDate = {};
  trades.forEach(t => {
    byDate[t.date] ||= { date: t.date, pnl: 0, trades: 0 };
    byDate[t.date].pnl += num(t.netPnl);
    byDate[t.date].trades += 1;
  });
  let cumulative = 0;
  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({ ...d, cumulative: cumulative += d.pnl }));
}

function Card({ children, className = '' }) {
  return <div className={`card ${className}`}>{children}</div>;
}

function StatCard({ title, value, icon: Icon, danger }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className={`mt-2 text-2xl font-black ${danger ? 'text-rose-400' : 'text-slate-100'}`}>{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${danger ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'}`}><Icon size={22} /></div>
      </div>
    </Card>
  );
}

function Shell({ tab, setTab, children }) {
  const tabs = [
    ['dashboard', Home, 'Dashboard'], ['import', FileUp, 'Import'], ['journal', ClipboardList, 'Journal'], ['review', CalendarDays, 'Daily Review'], ['rules', ShieldCheck, 'Rules'], ['mistakes', AlertTriangle, 'Mistakes'], ['settings', Settings, 'Settings'],
  ];
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#12352f_0,#06080d_34%,#06080d_100%)]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-800/80 bg-slate-950/90 p-5 backdrop-blur lg:block">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-400 p-2 text-slate-950"><TrendingUp /></div>
          <div>
            <h1 className="text-lg font-black">MES Trading</h1>
            <p className="text-xs text-slate-400">Command Center</p>
          </div>
        </div>
        <nav className="mt-8 space-y-2">
          {tabs.map(([id, Icon, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${tab === id ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-900'}`}>
              <Icon size={18} />{label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
          Built for journaling, consistency tracking, and rule discipline. Not financial advice.
        </div>
      </aside>
      <main className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/75 p-4 backdrop-blur lg:hidden">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map(([id, Icon, label]) => <button key={id} onClick={() => setTab(id)} className={`btn ${tab === id ? 'btn-primary' : 'btn-secondary'}`}><Icon size={16} className="inline" /> <span className="ml-1">{label}</span></button>)}
          </div>
        </header>
        <div className="mx-auto max-w-7xl p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}

function Dashboard({ trades }) {
  const stats = computeStats(trades);
  const days = dailyData(trades);
  const radar = [
    { metric: 'Win %', value: Math.min(stats.winRate, 100) },
    { metric: 'Rule Score', value: stats.avgRuleScore },
    { metric: 'Consistency', value: Math.max(0, 100 - Math.abs(stats.maxDrawdown)) },
    { metric: 'Profit Factor', value: Math.min(stats.profitFactor * 25, 100) },
    { metric: 'Discipline', value: stats.avgRuleScore },
  ];
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-emerald-300">Dashboard</p>
        <h2 className="text-3xl font-black tracking-tight">Performance + rule discipline</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Net P&L" value={statFormat(stats.total, '$')} icon={Activity} danger={stats.total < 0} />
        <StatCard title="Win Rate" value={statFormat(stats.winRate, '', '%')} icon={Target} />
        <StatCard title="Profit Factor" value={statFormat(stats.profitFactor)} icon={BarChart3} />
        <StatCard title="Rule Score" value={`${stats.avgRuleScore}/100`} icon={ShieldCheck} danger={stats.avgRuleScore < 80} />
        <StatCard title="Average Win" value={statFormat(stats.avgWin, '$')} icon={CheckCircle2} />
        <StatCard title="Average Loss" value={statFormat(stats.avgLoss, '$')} icon={XCircle} danger />
        <StatCard title="Max Drawdown" value={statFormat(stats.maxDrawdown, '$')} icon={AlertTriangle} danger={stats.maxDrawdown < 0} />
        <StatCard title="Total Trades" value={stats.totalTrades} icon={ClipboardList} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <h3 className="mb-4 font-bold">Cumulative P&L</h3>
          <div className="h-72"><ResponsiveContainer><AreaChart data={days}><defs><linearGradient id="pnl" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="currentColor" stopOpacity={0.35}/><stop offset="95%" stopColor="currentColor" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/><XAxis dataKey="date" stroke="#64748b"/><YAxis stroke="#64748b"/><Tooltip contentStyle={{ background:'#020617', border:'1px solid #1e293b', borderRadius:12 }}/><Area type="monotone" dataKey="cumulative" stroke="#34d399" fill="url(#pnl)" /></AreaChart></ResponsiveContainer></div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 font-bold">Zella-style Score</h3>
          <div className="h-72"><ResponsiveContainer><RadarChart data={radar}><PolarGrid stroke="#1e293b"/><PolarAngleAxis dataKey="metric" tick={{ fill:'#94a3b8', fontSize:11 }}/><Radar dataKey="value" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.35}/></RadarChart></ResponsiveContainer></div>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <h3 className="mb-4 font-bold">Daily Net P&L</h3>
          <div className="h-72"><ResponsiveContainer><BarChart data={days}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/><XAxis dataKey="date" stroke="#64748b"/><YAxis stroke="#64748b"/><Tooltip contentStyle={{ background:'#020617', border:'1px solid #1e293b', borderRadius:12 }}/><Bar dataKey="pnl" fill="#34d399" radius={[8,8,0,0]} /></BarChart></ResponsiveContainer></div>
        </Card>
        <CalendarPanel days={days} />
      </div>
      <RecentTrades trades={trades.slice(-6).reverse()} />
    </div>
  );
}

function CalendarPanel({ days }) {
  const map = Object.fromEntries(days.map(d => [d.date, d]));
  const all = days.length ? days : [{ date: new Date().toISOString().slice(0, 10), pnl: 0 }];
  const base = new Date(all[all.length - 1].date);
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const total = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: startPad + total }, (_, i) => i < startPad ? null : new Date(year, month, i - startPad + 1));
  return (
    <Card className="p-5">
      <h3 className="mb-4 font-bold">Daily Calendar</h3>
      <div className="grid grid-cols-7 gap-2 text-center text-xs text-slate-500">{['S','M','T','W','T','F','S'].map((d,i)=><div key={i}>{d}</div>)}</div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const key = d.toISOString().slice(0,10);
          const day = map[key];
          const pnl = day?.pnl || 0;
          return <div key={key} className={`min-h-16 rounded-xl border p-2 text-xs ${pnl > 0 ? 'border-emerald-500/30 bg-emerald-500/15' : pnl < 0 ? 'border-rose-500/30 bg-rose-500/15' : 'border-slate-800 bg-slate-900/50'}`}><div className="text-slate-400">{d.getDate()}</div><div className="mt-2 font-black">{day ? statFormat(pnl, '$') : ''}</div><div className="text-[10px] text-slate-500">{day ? `${day.trades} trade${day.trades === 1 ? '' : 's'}` : ''}</div></div>
        })}
      </div>
    </Card>
  );
}

function RecentTrades({ trades }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-800 p-5"><h3 className="font-bold">Recent Trades</h3></div>
      <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-900/70 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{['Date','Time','Instrument','Direction','Setup','Net P&L','Score'].map(h=><th key={h} className="table-cell">{h}</th>)}</tr></thead><tbody>{trades.map(t=><tr key={t.id} className="border-t border-slate-900"><td className="table-cell">{t.date}</td><td className="table-cell">{t.time}</td><td className="table-cell">{t.instrument}</td><td className="table-cell">{t.direction}</td><td className="table-cell">{t.setup}</td><td className={`table-cell font-bold ${num(t.netPnl) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{statFormat(num(t.netPnl),'$')}</td><td className="table-cell">{ruleScore(t.checklist)}/100</td></tr>)}</tbody></table></div>
    </Card>
  );
}

function ImportPage({ state, update }) {
  const [preview, setPreview] = useState([]);
  const [fileName, setFileName] = useState('');
  const handleCsv = (file) => {
    setFileName(file.name);
    Papa.parse(file, { header: true, skipEmptyLines: true, complete: (res) => setPreview(res.data.map(normalizeImportedRow)) });
  };
  const importPreview = () => {
    update(s => ({ ...s, trades: [...s.trades, ...preview], imports: [...s.imports, { type:'CSV', name:fileName, date:new Date().toISOString() }] }));
    setPreview([]); setFileName('');
  };
  const handlePdf = (file) => {
    update(s => ({ ...s, imports: [...s.imports, { type:'PDF', name:file.name, date:new Date().toISOString(), size:file.size }] }));
  };
  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold text-emerald-300">Import Performance</p><h2 className="text-3xl font-black">Bring in NinjaTrader results</h2><p className="mt-2 max-w-3xl text-slate-400">CSV import creates journal entries. PDF upload is stored as an import log in V1 so you can attach performance pages to daily reviews later.</p></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><h3 className="font-bold">CSV Import</h3><p className="mt-2 text-sm text-slate-400">Export executions or trade performance from NinjaTrader as CSV, then import here.</p><input className="field mt-4" type="file" accept=".csv,text/csv" onChange={e => e.target.files?.[0] && handleCsv(e.target.files[0])}/>{preview.length > 0 && <button className="btn btn-primary mt-4" onClick={importPreview}>Import {preview.length} trades</button>}</Card>
        <Card className="p-5"><h3 className="font-bold">PDF Performance Pages</h3><p className="mt-2 text-sm text-slate-400">Upload performance PDFs to track them in the import log. Automatic PDF parsing can be added in V2.</p><input className="field mt-4" type="file" accept=".pdf" onChange={e => e.target.files?.[0] && handlePdf(e.target.files[0])}/></Card>
      </div>
      {preview.length > 0 && <RecentTrades trades={preview.slice(0, 10)} />}
      <Card className="p-5"><h3 className="mb-4 font-bold">Import Log</h3><div className="space-y-2">{state.imports.length ? state.imports.slice().reverse().map((i,idx)=><div key={idx} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-sm"><span><b>{i.type}</b> — {i.name}</span><span className="text-slate-500">{new Date(i.date).toLocaleString()}</span></div>) : <p className="text-sm text-slate-500">No imports yet.</p>}</div></Card>
    </div>
  );
}

function TradeForm({ state, update }) {
  const blank = { date:new Date().toISOString().slice(0,10), time:'09:30', instrument:state.settings.instrument, direction:'Long', contracts:1, entry:'', exit:'', stop:'', target:'', netPnl:'', setup:'Riley EMA Trend', timeframe:'15M bias / 5M setup / 1M entry', emotion:'calm', notes:'', screenshotName:'', pdfName:'', checklist:{ window:false, ema:false, trend:false, zone:false, confirmation:false, stop:false, bracket:false, rr:false, noFomo:true, dailyLoss:true }, mistakes:[] };
  const [form, setForm] = useState(blank);
  const set = (k,v) => setForm(f => ({ ...f, [k]: v }));
  const toggleRule = k => setForm(f => ({ ...f, checklist:{ ...f.checklist, [k]: !f.checklist[k] }}));
  const toggleMistake = m => setForm(f => ({ ...f, mistakes: f.mistakes.includes(m) ? f.mistakes.filter(x=>x!==m) : [...f.mistakes,m] }));
  const add = () => {
    update(s => ({ ...s, trades: [...s.trades, { ...form, id: crypto.randomUUID(), contracts:num(form.contracts,1), entry:num(form.entry), exit:num(form.exit), stop:num(form.stop), target:num(form.target), netPnl:num(form.netPnl), locked:false }] }));
    setForm(blank);
  };
  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold text-emerald-300">Trade Journal</p><h2 className="text-3xl font-black">Log and score each trade</h2></div>
      <Card className="p-5"><div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {['date','time','instrument','contracts','entry','exit','stop','target','netPnl'].map(k => <div key={k}><label className="label">{k === 'netPnl' ? 'Net P&L' : k}</label><input className="field" type={k==='date'?'date':k==='time'?'time':'text'} value={form[k]} onChange={e=>set(k,e.target.value)} /></div>)}
        <div><label className="label">Direction</label><select className="field" value={form.direction} onChange={e=>set('direction', e.target.value)}><option>Long</option><option>Short</option></select></div>
        <div><label className="label">Setup</label><select className="field" value={form.setup} onChange={e=>set('setup', e.target.value)}><option>Riley EMA Trend</option><option>Supply/Demand Zone</option><option>Reversal</option><option>Breakout</option><option>Imported</option><option>Other</option></select></div>
        <div><label className="label">Timeframe</label><select className="field" value={form.timeframe} onChange={e=>set('timeframe', e.target.value)}><option>15M bias / 5M setup / 1M entry</option><option>5M bias / 1M entry</option><option>15M bias only</option><option>1M entry</option><option>Unknown</option></select></div>
        <div><label className="label">Emotion</label><select className="field" value={form.emotion} onChange={e=>set('emotion', e.target.value)}><option>calm</option><option>confident</option><option>hesitant</option><option>FOMO</option><option>revenge</option><option>greedy</option><option>frustrated</option></select></div>
        <div className="md:col-span-3 lg:col-span-4"><label className="label">Notes</label><textarea className="field min-h-24" value={form.notes} onChange={e=>set('notes', e.target.value)} /></div>
      </div></Card>
      <Card className="p-5"><div className="flex items-center justify-between"><h3 className="font-bold">Rule Score: {ruleScore(form.checklist)}/100</h3><span className={ruleScore(form.checklist)>=state.settings.minimumRuleScore?'text-emerald-300':'text-rose-300'}>{ruleScore(form.checklist)>=state.settings.minimumRuleScore?'Qualified':'Below threshold'}</span></div><div className="mt-4 grid gap-3 md:grid-cols-2">{Object.entries(ruleLabels).map(([k,label])=><label key={k} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-sm"><input type="checkbox" checked={!!form.checklist[k]} onChange={()=>toggleRule(k)} />{label}</label>)}</div></Card>
      <Card className="p-5"><h3 className="font-bold">Mistakes</h3><div className="mt-4 flex flex-wrap gap-2">{mistakes.map(m=><button key={m} className={`btn ${form.mistakes.includes(m)?'bg-rose-500 text-white':'btn-secondary'}`} onClick={()=>toggleMistake(m)}>{m}</button>)}</div></Card>
      <button className="btn btn-primary" onClick={add}>Save Trade</button>
      <RecentTrades trades={state.trades.slice().reverse()} />
    </div>
  );
}

function DailyReview({ state, update }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const trades = state.trades.filter(t => t.date === date);
  const stats = computeStats(trades);
  const review = state.reviews[date] || { well:'', broke:'', worked:'', stop:'', focus:'', locked:false };
  const setReview = (k,v) => update(s => ({ ...s, reviews: { ...s.reviews, [date]: { ...review, [k]: v } } }));
  return <div className="space-y-6"><div><p className="text-sm font-semibold text-emerald-300">Daily Review</p><h2 className="text-3xl font-black">End-of-day accountability</h2></div><Card className="p-5"><label className="label">Select Date</label><input className="field max-w-xs" type="date" value={date} onChange={e=>setDate(e.target.value)} /></Card><div className="grid gap-4 md:grid-cols-4"><StatCard title="Daily Net" value={statFormat(stats.total,'$')} icon={Activity} danger={stats.total<0}/><StatCard title="Trades" value={stats.totalTrades} icon={ClipboardList}/><StatCard title="Win Rate" value={statFormat(stats.winRate,'','%')} icon={Target}/><StatCard title="Rule Avg" value={`${stats.avgRuleScore}/100`} icon={ShieldCheck} danger={stats.avgRuleScore<80}/></div><Card className="p-5"><div className="flex items-center justify-between"><h3 className="font-bold">Journal Prompts</h3>{review.locked && <span className="flex items-center gap-1 text-sm text-emerald-300"><Lock size={14}/> Called it a day</span>}</div><div className="mt-4 grid gap-4 md:grid-cols-2">{[['well','What did I do well?'],['broke','What rule did I break?'],['worked','What setup worked best?'],['stop','Did I stop when I should have?'],['focus','What is tomorrow’s focus?']].map(([k,l])=><div key={k}><label className="label">{l}</label><textarea disabled={review.locked} className="field min-h-28" value={review[k]} onChange={e=>setReview(k,e.target.value)} /></div>)}</div><button className="btn btn-primary mt-4" onClick={()=>setReview('locked', true)}>Call It A Day</button></Card><RecentTrades trades={trades}/></div>;
}

function RulesPage({ state }) {
  return <div className="space-y-6"><div><p className="text-sm font-semibold text-emerald-300">Rules & Protection</p><h2 className="text-3xl font-black">Your pre-trade gate</h2></div><Card className="p-5"><h3 className="font-bold">Before taking a live MES trade</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{['Account balance is above your required margin buffer','ATM/bracket order can be supported by account size','Stop loss will be active immediately','Target is planned before entry','Trade is inside approved window','The setup has minimum rule score','No second contract unless your max contract rule allows it','You are not trying to win back a previous loss'].map(x=><div key={x} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-sm">✓ {x}</div>)}</div></Card><Card className="p-5"><h3 className="font-bold">Active Settings</h3><div className="mt-4 grid gap-3 md:grid-cols-3">{Object.entries(state.settings).map(([k,v])=><div key={k} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">{k}</p><p className="mt-1 font-black">{v}</p></div>)}</div></Card></div>;
}

function MistakeTracker({ trades }) {
  const counts = mistakes.map(m => ({ mistake:m, count: trades.filter(t => t.mistakes?.includes(m)).length })).filter(x=>x.count>0).sort((a,b)=>b.count-a.count);
  return <div className="space-y-6"><div><p className="text-sm font-semibold text-emerald-300">Mistake Tracker</p><h2 className="text-3xl font-black">Pattern detection</h2></div><Card className="p-5"><div className="h-80"><ResponsiveContainer><BarChart data={counts} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/><XAxis type="number" stroke="#64748b"/><YAxis dataKey="mistake" type="category" stroke="#64748b" width={150}/><Tooltip contentStyle={{ background:'#020617', border:'1px solid #1e293b', borderRadius:12 }}/><Bar dataKey="count" fill="#fb7185" radius={[0,8,8,0]} /></BarChart></ResponsiveContainer></div></Card>{counts.length===0 && <p className="text-slate-400">No mistakes logged yet. That is either great discipline or not enough honest tagging.</p>}</div>;
}

function SettingsPage({ state, update }) {
  const set = (k,v) => update(s => ({ ...s, settings:{ ...s.settings, [k]: v } }));
  const clearDemo = () => update(s => ({ ...s, trades: [], reviews:{}, imports:[] }));
  return <div className="space-y-6"><div><p className="text-sm font-semibold text-emerald-300">Settings</p><h2 className="text-3xl font-black">Trading guardrails</h2></div><Card className="p-5"><div className="grid gap-4 md:grid-cols-3">{Object.entries(state.settings).map(([k,v])=><div key={k}><label className="label">{k}</label><input className="field" value={v} onChange={e=>set(k,e.target.value)} /></div>)}</div></Card><Card className="p-5"><h3 className="font-bold text-rose-300">Reset Data</h3><p className="mt-2 text-sm text-slate-400">This clears the local browser data for the app.</p><button className="btn mt-4 bg-rose-500 text-white" onClick={clearDemo}>Clear all trades/imports</button></Card></div>;
}

function App() {
  const [state, update] = useAppState();
  const [tab, setTab] = useState('dashboard');
  const content = useMemo(() => {
    switch(tab){
      case 'import': return <ImportPage state={state} update={update}/>;
      case 'journal': return <TradeForm state={state} update={update}/>;
      case 'review': return <DailyReview state={state} update={update}/>;
      case 'rules': return <RulesPage state={state}/>;
      case 'mistakes': return <MistakeTracker trades={state.trades}/>;
      case 'settings': return <SettingsPage state={state} update={update}/>;
      default: return <Dashboard trades={state.trades}/>;
    }
  }, [tab, state]);
  return <Shell tab={tab} setTab={setTab}>{content}<footer className="mt-10 text-center text-xs text-slate-600">For journaling and education only. Not financial advice.</footer></Shell>;
}

createRoot(document.getElementById('root')).render(<App />);
