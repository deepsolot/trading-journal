"use client";
import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from "recharts";

/* ─── CONSTANTS ─── */
const EMOTIONS = ["Calm","Confident","Disciplined","Neutral","Anxious","Fearful","Greedy","Revenge","FOMO","Impulsive","Bored","Excited"];
const STRATEGIES = ["Breakout","Trend Follow","Reversal","Support/Resistance","Gap Fill","Scalping","News Play","VWAP","EMA Cross","Other"];
const MISTAKES = ["No stop-loss","Moved SL","Overleveraged","Chased entry","Averaged down","Revenge trade","Overtraded","Early exit","Late exit","Broke rules","Ignored signal","FOMO entry"];
const RULES = ["Entry based on strategy","Stop-loss set before entry","Risk ≤ 1% of capital","Max 3 trades today","No revenge trading","Followed my trade plan","No trading during news","Respected SL — no moving it","Reviewed yesterday's trades","Logged reason before entry"];
const INSTRUMENTS = ["NIFTY","BANKNIFTY","FINNIFTY","SENSEX","MIDCAP SELECT","Equity Stock","Forex","Crypto","Commodity","Other"];

/* ─── HELPERS ─── */
const fmt = (n, dec=0) => n === null || n === undefined ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(dec)}`;
const fmtRs = (n, dec=0) => n === null || n === undefined ? "—" : `${n >= 0 ? "+" : "−"}₹${Math.abs(n).toFixed(dec)}`;
const today = () => new Date().toISOString().split("T")[0];
const dayName = d => new Date(d+"T12:00:00").toLocaleDateString("en-IN",{weekday:"short"});
const fullDay = d => new Date(d+"T12:00:00").toLocaleDateString("en-IN",{weekday:"long"});
const shortDate = d => new Date(d+"T12:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short"});
const emptyTrade = () => ({ id: Date.now()+Math.random(), instrument:"", direction:"Long", strategy:"", reason:"", pnl:"", emotions:[], rules:[], mistakes:[], notes:"", entryValid:null, outcome:"Win", qty:"", entry:"", exit:"" });
const emptyDay = d => ({ date:d, trades:[emptyTrade()], notes:"", done:false });

/* ─── STYLES ─── */
const S = {
  root: { fontFamily:"'DM Sans',system-ui,sans-serif", background:"#0d0d14", minHeight:"100vh", color:"#e2e2f0", display:"flex", flexDirection:"column" },
  sidebar: { width:220, background:"#111120", borderRight:"1px solid #1e1e35", display:"flex", flexDirection:"column", padding:"0 0 20px" },
  main: { flex:1, display:"flex", minHeight:"100vh" },
  content: { flex:1, padding:"28px 28px 40px", overflowY:"auto", maxWidth:960 },
  card: { background:"#13131f", border:"1px solid #1e1e35", borderRadius:14, padding:"20px 22px" },
  cardSm: { background:"#13131f", border:"1px solid #1e1e35", borderRadius:12, padding:"16px 18px" },
  badge: (color) => ({ fontSize:11, fontWeight:600, padding:"2px 9px", borderRadius:20, background: color==="green"?"#0d2518":color==="red"?"#200f0f":color==="purple"?"#1a1030":color==="yellow"?"#1f1a07":"#111", color:color==="green"?"#4ade80":color==="red"?"#f87171":color==="purple"?"#a78bfa":color==="yellow"?"#fbbf24":"#888", border:`1px solid ${color==="green"?"#1a4a30":color==="red"?"#3a1515":color==="purple"?"#2e1f50":color==="yellow"?"#3a2e07":"#222"}` }),
  pill: (on,color="purple") => ({ padding:"4px 14px", borderRadius:20, fontSize:12, fontWeight:500, cursor:"pointer", border: on?`1px solid ${color==="purple"?"#7c3aed":color==="red"?"#dc2626":color==="yellow"?"#d97706":color==="green"?"#16a34a":"#7c3aed"}`:"1px solid #1e1e35", background: on?color==="purple"?"#2d1c6b":color==="red"?"#3a0f0f":color==="yellow"?"#2a1f07":color==="green"?"#0d2518":"#2d1c6b":"transparent", color: on?color==="purple"?"#c4b5fd":color==="red"?"#fca5a5":color==="yellow"?"#fcd34d":color==="green"?"#86efac":"#c4b5fd":"#555" }),
  input: { background:"#0d0d14", border:"1px solid #1e1e35", borderRadius:8, padding:"8px 12px", fontSize:13, color:"#e2e2f0", width:"100%", boxSizing:"border-box", outline:"none" },
  textarea: { background:"#0d0d14", border:"1px solid #1e1e35", borderRadius:8, padding:"10px 12px", fontSize:13, color:"#e2e2f0", width:"100%", boxSizing:"border-box", resize:"vertical", outline:"none", lineHeight:1.6 },
  select: { background:"#0d0d14", border:"1px solid #1e1e35", borderRadius:8, padding:"8px 12px", fontSize:13, color:"#e2e2f0", width:"100%", boxSizing:"border-box", outline:"none" },
  btn: (variant="ghost") => ({ padding:"8px 18px", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer", border: variant==="primary"?"none":"1px solid #2a2a45", background: variant==="primary"?"linear-gradient(135deg,#7c3aed,#5b21b6)":variant==="success"?"#0d2518":"transparent", color: variant==="primary"?"#fff":variant==="success"?"#4ade80":"#aaa" }),
  label: { fontSize:12, color:"#666", marginBottom:5, display:"block", fontWeight:500, letterSpacing:"0.03em", textTransform:"uppercase" },
  sectionTitle: { fontSize:20, fontWeight:600, color:"#e2e2f0", marginBottom:4 },
  muted: { color:"#555", fontSize:13 },
};

/* ─── STORAGE (localStorage — works on Vercel) ─── */
function load() {
  try {
    const raw = localStorage.getItem("tdpro-v2");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function save(data) {
  try { localStorage.setItem("tdpro-v2", JSON.stringify(data)); } catch {}
}

/* ─── MAIN APP ─── */
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [allData, setAllData] = useState({});
  const [selDate, setSelDate] = useState(today());
  const [loading, setLoading] = useState(true);

  useEffect(() => { const d = load(); setAllData(d); setLoading(false); }, []);

  const updateDay = (date, day) => {
    const next = { ...allData, [date]: day };
    setAllData(next);
    save(next);
  };

  const getDay = d => allData[d] || emptyDay(d);

  const allTrades = Object.values(allData).flatMap(d => (d.trades||[]).filter(t=>t.instrument));
  const totalPnl = allTrades.reduce((s,t) => s+(parseFloat(t.pnl)||0), 0);
  const wins = allTrades.filter(t=>t.outcome==="Win");
  const losses = allTrades.filter(t=>t.outcome==="Loss");
  const winRate = allTrades.length ? ((wins.length/allTrades.length)*100) : 0;

  if (loading) return (
    <div style={{ ...S.root, alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:"#7c3aed", fontSize:15 }}>Loading your journal...</div>
    </div>
  );

  const nav = [
    { id:"dashboard", icon:"📊", label:"Dashboard" },
    { id:"log",       icon:"✏️",  label:"Log Trade" },
    { id:"journal",   icon:"📅",  label:"Journal" },
    { id:"analytics", icon:"📈",  label:"Analytics" },
    { id:"rules",     icon:"📋",  label:"My Rules" },
  ];

  return (
    <div style={S.root}>
      {/* Top bar */}
      <div style={{ background:"#0d0d14", borderBottom:"1px solid #1a1a2e", padding:"0 24px", display:"flex", alignItems:"center", height:52, gap:24, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#7c3aed,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>📓</div>
          <span style={{ fontWeight:700, fontSize:16, color:"#e2e2f0", letterSpacing:"-0.02em" }}>Trade<span style={{color:"#7c3aed"}}>Diary</span></span>
        </div>
        <div style={{ display:"flex", gap:4, flex:1 }}>
          {nav.map(n => (
            <button key={n.id} onClick={()=>setPage(n.id)} style={{ padding:"6px 14px", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer", background:page===n.id?"#1e1e35":"transparent", color:page===n.id?"#c4b5fd":"#666", border:"none" }}>
              {n.icon} {n.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize:13, color:"#555" }}>
          {shortDate(today())}
        </div>
      </div>

      {/* Page content */}
      <div style={{ padding:"28px 24px 48px", maxWidth:980, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>
        {page==="dashboard" && <Dashboard allData={allData} allTrades={allTrades} totalPnl={totalPnl} wins={wins} losses={losses} winRate={winRate} setPage={setPage} setSelDate={setSelDate} />}
        {page==="log"       && <LogPage selDate={selDate} setSelDate={setSelDate} getDay={getDay} updateDay={updateDay} />}
        {page==="journal"   && <JournalPage allData={allData} setSelDate={setSelDate} setPage={setPage} />}
        {page==="analytics" && <AnalyticsPage allData={allData} allTrades={allTrades} wins={wins} losses={losses} winRate={winRate} />}
        {page==="rules"     && <RulesPage />}
      </div>
    </div>
  );
}

/* ─── DASHBOARD ─── */
function Dashboard({ allData, allTrades, totalPnl, wins, losses, winRate, setPage, setSelDate }) {
  const sortedDays = Object.keys(allData).sort((a,b)=>a.localeCompare(b));
  const equityData = (() => {
    let running = 0;
    return sortedDays.map(d => {
      const dayPnl = (allData[d].trades||[]).reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);
      running += dayPnl;
      return { date: shortDate(d), pnl: parseFloat(running.toFixed(0)) };
    });
  })();

  const last7 = sortedDays.slice(-7).map(d => ({
    date: dayName(d),
    pnl: parseFloat(((allData[d].trades||[]).reduce((s,t)=>s+(parseFloat(t.pnl)||0),0)).toFixed(0))
  }));

  const avgWin = wins.length ? wins.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0)/wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0)/losses.length) : 0;
  const profitFactor = avgLoss > 0 ? (avgWin/avgLoss).toFixed(2) : "∞";
  const recent = Object.keys(allData).sort((a,b)=>b.localeCompare(a)).slice(0,5);

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <div style={S.sectionTitle}>Good morning, Trader 👋</div>
        <div style={S.muted}>Here's your performance overview</div>
      </div>

      {/* Stat cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Total P&L", value:fmtRs(totalPnl), sub:"All time", color: totalPnl>=0?"#4ade80":"#f87171" },
          { label:"Win Rate",  value:`${winRate.toFixed(1)}%`, sub:`${wins.length}W / ${losses.length}L`, color: winRate>=50?"#4ade80":"#f87171" },
          { label:"Total Trades", value:allTrades.length, sub:"Logged", color:"#a78bfa" },
          { label:"Profit Factor", value:profitFactor, sub:"Avg win / avg loss", color:"#60a5fa" },
        ].map(c => (
          <div key={c.label} style={{ ...S.cardSm, display:"flex", flexDirection:"column", gap:6 }}>
            <div style={{ fontSize:12, color:"#555", fontWeight:500, letterSpacing:"0.04em", textTransform:"uppercase" }}>{c.label}</div>
            <div style={{ fontSize:26, fontWeight:700, color:c.color, letterSpacing:"-0.02em" }}>{c.value}</div>
            <div style={{ fontSize:12, color:"#444" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1.6fr 1fr", gap:16, marginBottom:16 }}>
        {/* Equity curve */}
        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:16, color:"#aaa" }}>Equity Curve</div>
          {equityData.length < 2 ? (
            <div style={{ height:160, display:"flex", alignItems:"center", justifyContent:"center", color:"#333", fontSize:13 }}>Log trades to see your equity curve</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={equityData}>
                <defs><linearGradient id="eq" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3}/><stop offset="100%" stopColor="#7c3aed" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="date" tick={{fontSize:10,fill:"#444"}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:10,fill:"#444"}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{background:"#13131f",border:"1px solid #2a2a45",borderRadius:8,fontSize:12}} formatter={v=>[`₹${v}`,""]} />
                <Area type="monotone" dataKey="pnl" stroke="#7c3aed" fill="url(#eq)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Last 7 days bar */}
        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:16, color:"#aaa" }}>Last 7 Sessions</div>
          {last7.length === 0 ? (
            <div style={{ height:160, display:"flex", alignItems:"center", justifyContent:"center", color:"#333", fontSize:13 }}>No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={last7} barSize={18}>
                <XAxis dataKey="date" tick={{fontSize:10,fill:"#444"}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:10,fill:"#444"}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{background:"#13131f",border:"1px solid #2a2a45",borderRadius:8,fontSize:12}} formatter={v=>[`₹${v}`,""]} />
                <Bar dataKey="pnl" radius={[4,4,0,0]}>
                  {last7.map((e,i)=><Cell key={i} fill={e.pnl>=0?"#4ade80":"#f87171"} opacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent sessions */}
      <div style={S.card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:600, color:"#aaa" }}>Recent Sessions</div>
          <button onClick={()=>setPage("journal")} style={{ ...S.btn(), fontSize:12 }}>View all →</button>
        </div>
        {recent.length===0 && <div style={{ color:"#444", fontSize:13, padding:"12px 0" }}>No sessions logged yet. Start by logging your first trade!</div>}
        {recent.map(d => {
          const day = allData[d];
          const trades = (day.trades||[]).filter(t=>t.instrument);
          const pnl = trades.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);
          const mistakes = trades.flatMap(t=>t.mistakes||[]).length;
          return (
            <div key={d} onClick={()=>{ setSelDate(d); setPage("log"); }} style={{ display:"flex", alignItems:"center", gap:16, padding:"11px 0", borderBottom:"1px solid #1a1a2e", cursor:"pointer" }}>
              <div style={{ width:40, height:40, borderRadius:10, background:"#1a1a2e", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                <div style={{ fontSize:15, fontWeight:700, color:"#aaa" }}>{new Date(d+"T12:00:00").getDate()}</div>
                <div style={{ fontSize:9, color:"#444", textTransform:"uppercase" }}>{new Date(d+"T12:00:00").toLocaleDateString("en-IN",{month:"short"})}</div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#ccc" }}>{fullDay(d)}</div>
                <div style={{ fontSize:12, color:"#555", marginTop:2 }}>{trades.length} trades · {mistakes} mistake{mistakes!==1?"s":""}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:16, fontWeight:700, color:pnl>=0?"#4ade80":"#f87171" }}>{fmtRs(pnl)}</div>
                <div style={{ fontSize:11, color:"#444" }}>{trades.filter(t=>t.outcome==="Win").length}W / {trades.filter(t=>t.outcome==="Loss").length}L</div>
              </div>
              <div style={{ ...S.badge(day.done?"green":""), fontSize:11 }}>{day.done?"Done":"Open"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── LOG TRADE ─── */
function LogPage({ selDate, setSelDate, getDay, updateDay }) {
  const day = getDay(selDate);
  const trades = day.trades || [emptyTrade()];
  const totalPnl = trades.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);
  const tradeCount = trades.filter(t=>t.instrument).length;

  const upd = (date, d) => updateDay(date, d);

  const updTrade = (idx, field, val) => {
    const next = trades.map((t,i)=>i===idx?{...t,[field]:val}:t);
    upd(selDate, {...day, trades:next});
  };

  const toggle = (idx, field, val) => {
    const arr = trades[idx][field]||[];
    updTrade(idx, field, arr.includes(val)?arr.filter(v=>v!==val):[...arr,val]);
  };

  const addTrade = () => {
    if (trades.length >= 3) return;
    upd(selDate, {...day, trades:[...trades, emptyTrade()]});
  };

  const removeTrade = idx => {
    const next = trades.filter((_,i)=>i!==idx);
    upd(selDate, {...day, trades: next.length?next:[emptyTrade()]});
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={S.sectionTitle}>Log Trade</div>
          <div style={S.muted}>{fullDay(selDate)}, {shortDate(selDate)}</div>
        </div>
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)} style={{ ...S.input, width:"auto" }} />
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11, color:"#555", textTransform:"uppercase", letterSpacing:"0.05em" }}>Day P&L</div>
            <div style={{ fontSize:22, fontWeight:700, color:totalPnl>=0?"#4ade80":"#f87171" }}>{fmtRs(totalPnl)}</div>
          </div>
        </div>
      </div>

      {tradeCount >= 3 && (
        <div style={{ background:"#1f1010", border:"1px solid #3a1515", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#f87171", display:"flex", gap:8, alignItems:"center" }}>
          ⚠️ Rule alert: You've reached the max 3 trades/day limit. More trading today may be against your rules.
        </div>
      )}

      {/* Trade count pills */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ padding:"5px 14px", borderRadius:8, fontSize:12, background:trades[i]?"#1a1a2e":"transparent", border:trades[i]?"1px solid #2a2a45":"1px dashed #1e1e35", color:trades[i]?"#7c3aed":"#333" }}>
            Trade {i+1} {trades[i]?.instrument ? `· ${trades[i].instrument}` : ""}
          </div>
        ))}
      </div>

      {trades.map((trade, idx) => (
        <TradeCard key={trade.id} trade={trade} idx={idx} updTrade={updTrade} toggle={toggle} removeTrade={removeTrade} />
      ))}

      {trades.length < 3 && (
        <button onClick={addTrade} style={{ width:"100%", padding:14, borderRadius:12, border:"1px dashed #2a2a45", background:"transparent", cursor:"pointer", fontSize:13, color:"#555", marginBottom:16, letterSpacing:"0.02em" }}>
          + Add Trade {trades.length+1}
        </button>
      )}

      {/* Day reflection */}
      <div style={{ ...S.card, marginTop:8 }}>
        <div style={{ fontSize:14, fontWeight:600, color:"#aaa", marginBottom:14 }}>📝 Day Reflection</div>
        <textarea value={day.notes||""} onChange={e=>upd(selDate,{...day,notes:e.target.value})}
          placeholder="What did you learn today? What will you do differently tomorrow? Overall market observations..."
          style={{ ...S.textarea, minHeight:80 }} />
        <label style={{ display:"flex", alignItems:"center", gap:10, marginTop:12, cursor:"pointer" }}>
          <input type="checkbox" checked={!!day.done} onChange={e=>upd(selDate,{...day,done:e.target.checked})} style={{ accentColor:"#7c3aed", width:16, height:16 }} />
          <span style={{ fontSize:13, color:"#777" }}>Mark this session as complete — I'm done trading today</span>
        </label>
      </div>
    </div>
  );
}

function TradeCard({ trade, idx, updTrade, toggle, removeTrade }) {
  const [open, setOpen] = useState(true);
  const pnl = parseFloat(trade.pnl)||0;
  const rulesScore = trade.rules?.length || 0;
  const mistakesCount = trade.mistakes?.length || 0;

  return (
    <div style={{ ...S.card, marginBottom:14, border: open?"1px solid #2a2a45":"1px solid #1e1e35" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={()=>setOpen(o=>!o)}>
        <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#7c3aed,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", flexShrink:0 }}>{idx+1}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:600, color:"#ddd" }}>
            {trade.instrument||"New Trade"} <span style={{ color:"#555", fontWeight:400 }}>{trade.direction && `· ${trade.direction}`}</span>
          </div>
          {trade.strategy && <div style={{ fontSize:12, color:"#555" }}>{trade.strategy}</div>}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {trade.pnl !== "" && <span style={{ fontSize:16, fontWeight:700, color:pnl>=0?"#4ade80":"#f87171" }}>{fmtRs(pnl)}</span>}
          {trade.entryValid===true && <span style={S.badge("green")}>✓ Valid</span>}
          {trade.entryValid===false && <span style={S.badge("red")}>✗ Broke rules</span>}
          {idx>0 && <button onClick={e=>{e.stopPropagation();removeTrade(idx);}} style={{ background:"transparent",border:"none",cursor:"pointer",color:"#f87171",fontSize:14,padding:"0 4px" }}>✕</button>}
          <span style={{ color:"#333", fontSize:18 }}>{open?"↑":"↓"}</span>
        </div>
      </div>

      {open && (
        <div style={{ marginTop:20, display:"flex", flexDirection:"column", gap:18 }}>
          {/* Row 1 */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
            <div><label style={S.label}>Instrument</label>
              <select value={trade.instrument} onChange={e=>updTrade(idx,"instrument",e.target.value)} style={S.select}>
                <option value="">Select...</option>{INSTRUMENTS.map(i=><option key={i}>{i}</option>)}
              </select>
            </div>
            <div><label style={S.label}>Direction</label>
              <select value={trade.direction} onChange={e=>updTrade(idx,"direction",e.target.value)} style={S.select}>
                <option>Long</option><option>Short</option>
              </select>
            </div>
            <div><label style={S.label}>Outcome</label>
              <select value={trade.outcome} onChange={e=>updTrade(idx,"outcome",e.target.value)} style={S.select}>
                <option>Win</option><option>Loss</option><option>Breakeven</option>
              </select>
            </div>
            <div><label style={S.label}>P&L (₹)</label>
              <input type="number" value={trade.pnl} onChange={e=>updTrade(idx,"pnl",e.target.value)} placeholder="e.g. 2500" style={S.input} />
            </div>
          </div>

          {/* Row 2 */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
            <div><label style={S.label}>Qty / Lots</label><input value={trade.qty} onChange={e=>updTrade(idx,"qty",e.target.value)} placeholder="e.g. 1" style={S.input} /></div>
            <div><label style={S.label}>Entry price</label><input type="number" value={trade.entry} onChange={e=>updTrade(idx,"entry",e.target.value)} placeholder="e.g. 45200" style={S.input} /></div>
            <div><label style={S.label}>Exit price</label><input type="number" value={trade.exit} onChange={e=>updTrade(idx,"exit",e.target.value)} placeholder="e.g. 45600" style={S.input} /></div>
          </div>

          {/* Strategy */}
          <div>
            <label style={S.label}>Strategy</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {STRATEGIES.map(s=>(
                <button key={s} onClick={()=>updTrade(idx,"strategy",trade.strategy===s?"":s)} style={S.pill(trade.strategy===s,"purple")}>{s}</button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label style={S.label}>Why I took this trade</label>
            <textarea value={trade.reason} onChange={e=>updTrade(idx,"reason",e.target.value)}
              placeholder="Describe the setup — what pattern, signal, or confluence triggered your entry?" style={{ ...S.textarea, minHeight:60 }} />
          </div>

          {/* Entry valid */}
          <div>
            <label style={S.label}>Was entry based on your rules?</label>
            <div style={{ display:"flex", gap:10 }}>
              {[true,false].map(v=>(
                <button key={String(v)} onClick={()=>updTrade(idx,"entryValid",v)} style={{ padding:"8px 20px", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer", border: trade.entryValid===v? v?"1px solid #16a34a":"1px solid #dc2626":"1px solid #2a2a45", background: trade.entryValid===v? v?"#0d2518":"#1f1010":"transparent", color: trade.entryValid===v? v?"#4ade80":"#f87171":"#555" }}>
                  {v ? "✓ Yes — rule-based entry" : "✗ No — impulse / off-rules"}
                </button>
              ))}
            </div>
          </div>

          {/* Emotions */}
          <div>
            <label style={S.label}>Emotions during trade</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {EMOTIONS.map(e=>{
                const isPositive = ["Calm","Confident","Disciplined","Neutral"].includes(e);
                return <button key={e} onClick={()=>toggle(idx,"emotions",e)} style={S.pill((trade.emotions||[]).includes(e), isPositive?"green":"yellow")}>{e}</button>;
              })}
            </div>
          </div>

          {/* Rules checklist */}
          <div>
            <label style={S.label}>Rules checklist ({rulesScore}/{RULES.length} followed)</label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
              {RULES.map(r=>{
                const on = (trade.rules||[]).includes(r);
                return (
                  <label key={r} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"7px 10px", borderRadius:8, border:on?"1px solid #1a4a30":"1px solid #1e1e35", background:on?"#0a1f14":"transparent" }}>
                    <input type="checkbox" checked={on} onChange={()=>toggle(idx,"rules",r)} style={{ accentColor:"#4ade80", width:14, height:14, flexShrink:0 }} />
                    <span style={{ fontSize:12, color:on?"#86efac":"#555" }}>{r}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Mistakes */}
          <div>
            <label style={S.label}>Mistakes made {mistakesCount>0 && <span style={{ color:"#f87171" }}>({mistakesCount})</span>}</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {MISTAKES.map(m=>(
                <button key={m} onClick={()=>toggle(idx,"mistakes",m)} style={S.pill((trade.mistakes||[]).includes(m),"red")}>{m}</button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={S.label}>Trade notes</label>
            <textarea value={trade.notes} onChange={e=>updTrade(idx,"notes",e.target.value)}
              placeholder="Exit reasoning, what worked, what you'd do differently..." style={{ ...S.textarea, minHeight:50 }} />
          </div>

          {/* Scorecard */}
          <div style={{ background:"#0d0d14", borderRadius:10, padding:"12px 16px", display:"flex", gap:24, flexWrap:"wrap" }}>
            <ScoreChip label="Rules score" val={`${rulesScore}/${RULES.length}`} color={rulesScore/RULES.length>=0.7?"#4ade80":rulesScore/RULES.length>=0.4?"#fbbf24":"#f87171"} />
            <ScoreChip label="Valid entry" val={trade.entryValid===true?"✓ Yes":trade.entryValid===false?"✗ No":"—"} color={trade.entryValid===true?"#4ade80":trade.entryValid===false?"#f87171":"#555"} />
            <ScoreChip label="Emotions" val={trade.emotions?.includes("Calm")||trade.emotions?.includes("Disciplined")?"Controlled":"Mixed"} color={trade.emotions?.includes("Calm")||trade.emotions?.includes("Disciplined")?"#4ade80":"#fbbf24"} />
            <ScoreChip label="Mistakes" val={mistakesCount===0?"None":mistakesCount} color={mistakesCount===0?"#4ade80":"#f87171"} />
            <ScoreChip label="P&L" val={fmtRs(pnl)} color={pnl>=0?"#4ade80":"#f87171"} />
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreChip({ label, val, color }) {
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{ fontSize:16, fontWeight:700, color }}>{val}</div>
      <div style={{ fontSize:11, color:"#444", textTransform:"uppercase", letterSpacing:"0.05em", marginTop:2 }}>{label}</div>
    </div>
  );
}

/* ─── JOURNAL (calendar view) ─── */
function JournalPage({ allData, setSelDate, setPage }) {
  const all = Object.keys(allData).sort((a,b)=>b.localeCompare(a));
  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <div style={S.sectionTitle}>Journal</div>
        <div style={S.muted}>All trading sessions</div>
      </div>
      {all.length===0 && <div style={{ ...S.card, textAlign:"center", padding:"40px", color:"#444" }}>No sessions yet. Log your first trade!</div>}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {all.map(d=>{
          const day=allData[d];
          const trades=(day.trades||[]).filter(t=>t.instrument);
          const pnl=trades.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);
          const mistakes=trades.flatMap(t=>t.mistakes||[]);
          const emotions=[...new Set(trades.flatMap(t=>t.emotions||[]))];
          const rulesAvg=trades.length?Math.round(trades.reduce((s,t)=>s+(t.rules?.length||0),0)/(trades.length*RULES.length)*100):null;
          return (
            <div key={d} style={{ ...S.card, cursor:"pointer" }} onClick={()=>{setSelDate(d);setPage("log");}}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                <div style={{ width:48, flexShrink:0, textAlign:"center", background:"#1a1a2e", borderRadius:10, padding:"8px 0" }}>
                  <div style={{ fontSize:20, fontWeight:700, color:"#aaa" }}>{new Date(d+"T12:00:00").getDate()}</div>
                  <div style={{ fontSize:10, color:"#555", textTransform:"uppercase" }}>{new Date(d+"T12:00:00").toLocaleDateString("en-IN",{month:"short"})}</div>
                  <div style={{ fontSize:9, color:"#444", marginTop:2 }}>{new Date(d+"T12:00:00").toLocaleDateString("en-IN",{weekday:"short"})}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:8 }}>
                    <span style={{ fontSize:14, fontWeight:600, color:"#ccc" }}>{fullDay(d)}</span>
                    <span style={S.badge("purple")}>{trades.length} trade{trades.length!==1?"s":""}</span>
                    {day.done && <span style={S.badge("green")}>Complete</span>}
                    {rulesAvg!==null && <span style={S.badge(rulesAvg>=70?"green":rulesAvg>=40?"yellow":"red")}>{rulesAvg}% rules</span>}
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:day.notes?8:0 }}>
                    {mistakes.slice(0,4).map((m,i)=><span key={i} style={S.badge("red")}>{m}</span>)}
                    {emotions.slice(0,3).map((e,i)=><span key={i} style={S.badge("yellow")}>{e}</span>)}
                  </div>
                  {day.notes && <div style={{ fontSize:12, color:"#555", fontStyle:"italic", marginTop:4 }}>"{day.notes.slice(0,120)}{day.notes.length>120?"...":""}"</div>}
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:20, fontWeight:700, color:pnl>=0?"#4ade80":"#f87171" }}>{fmtRs(pnl)}</div>
                  <div style={{ fontSize:12, color:"#444", marginTop:2 }}>
                    {trades.filter(t=>t.outcome==="Win").length}W / {trades.filter(t=>t.outcome==="Loss").length}L
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── ANALYTICS ─── */
function AnalyticsPage({ allData, allTrades, wins, losses, winRate }) {
  const avgWin = wins.length ? wins.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0)/wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0)/losses.length) : 0;
  const profitFactor = avgLoss>0?(avgWin/avgLoss):0;
  const expectancy = allTrades.length ? ((winRate/100)*avgWin - (1-winRate/100)*avgLoss) : 0;

  const mistakeCounts = {};
  allTrades.forEach(t=>(t.mistakes||[]).forEach(m=>{mistakeCounts[m]=(mistakeCounts[m]||0)+1;}));
  const topMistakes = Object.entries(mistakeCounts).sort((a,b)=>b[1]-a[1]).slice(0,6);

  const emotionCounts = {};
  allTrades.forEach(t=>(t.emotions||[]).forEach(e=>{emotionCounts[e]=(emotionCounts[e]||0)+1;}));
  const topEmotions = Object.entries(emotionCounts).sort((a,b)=>b[1]-a[1]);

  const strategyStats = {};
  allTrades.forEach(t=>{ if(t.strategy){ if(!strategyStats[t.strategy]) strategyStats[t.strategy]={wins:0,losses:0,pnl:0}; if(t.outcome==="Win") strategyStats[t.strategy].wins++; if(t.outcome==="Loss") strategyStats[t.strategy].losses++; strategyStats[t.strategy].pnl+=parseFloat(t.pnl)||0; }});

  const ruleBreaks = {};
  allTrades.forEach(t=>{ RULES.forEach(r=>{ if(!(t.rules||[]).includes(r)) ruleBreaks[r]=(ruleBreaks[r]||0)+1; }); });
  const topBroken = Object.entries(ruleBreaks).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const invalidPnl = allTrades.filter(t=>t.entryValid===false).reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);
  const validPnl = allTrades.filter(t=>t.entryValid===true).reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);

  if (allTrades.length===0) return (
    <div style={{ textAlign:"center", padding:"60px 0", color:"#444" }}>
      <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
      <div>Log trades to unlock analytics</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <div style={S.sectionTitle}>Analytics</div>
        <div style={S.muted}>Deep performance insights</div>
      </div>

      {/* Key stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Win Rate",      value:`${winRate.toFixed(1)}%`,     color: winRate>=50?"#4ade80":"#f87171" },
          { label:"Avg Win",       value:fmtRs(avgWin),                color:"#4ade80" },
          { label:"Avg Loss",      value:`−₹${avgLoss.toFixed(0)}`,    color:"#f87171" },
          { label:"Profit Factor", value:profitFactor.toFixed(2),       color: profitFactor>=1?"#a78bfa":"#f87171" },
          { label:"Expectancy/trade", value:fmtRs(expectancy),          color: expectancy>=0?"#60a5fa":"#f87171" },
          { label:"Rule-based P&L",value:fmtRs(validPnl),              color: validPnl>=0?"#4ade80":"#f87171" },
          { label:"Impulse P&L",   value:fmtRs(invalidPnl),            color: invalidPnl>=0?"#4ade80":"#f87171" },
          { label:"Total sessions",value:Object.keys(allData).length,   color:"#aaa" },
        ].map(c=>(
          <div key={c.label} style={S.cardSm}>
            <div style={{ fontSize:11, color:"#555", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>{c.label}</div>
            <div style={{ fontSize:20, fontWeight:700, color:c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        {/* Mistakes */}
        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:600, color:"#aaa", marginBottom:14 }}>🔴 Top Mistakes</div>
          {topMistakes.length===0 && <div style={S.muted}>None recorded</div>}
          {topMistakes.map(([name,count])=>(
            <div key={name} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <div style={{ flex:1, fontSize:13, color:"#ccc" }}>{name}</div>
              <div style={{ height:6, borderRadius:3, background:"#f87171", opacity:0.7, width:`${Math.min(count*20,100)}%`, maxWidth:80 }} />
              <div style={{ fontSize:12, color:"#f87171", minWidth:20 }}>{count}×</div>
            </div>
          ))}
        </div>

        {/* Most broken rules */}
        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:600, color:"#aaa", marginBottom:14 }}>📋 Rules Broken Most</div>
          {topBroken.length===0 && <div style={S.muted}>No rule breaks — great discipline!</div>}
          {topBroken.map(([rule,count])=>(
            <div key={rule} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <div style={{ flex:1, fontSize:12, color:"#888" }}>{rule}</div>
              <div style={{ fontSize:12, color:"#fbbf24", minWidth:20 }}>{count}×</div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy breakdown */}
      <div style={S.card}>
        <div style={{ fontSize:14, fontWeight:600, color:"#aaa", marginBottom:14 }}>⚡ Strategy Breakdown</div>
        {Object.keys(strategyStats).length===0 && <div style={S.muted}>No strategy data yet</div>}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {Object.entries(strategyStats).sort((a,b)=>b[1].pnl-a[1].pnl).map(([name,s])=>{
            const wr = s.wins+s.losses>0?((s.wins/(s.wins+s.losses))*100):0;
            return (
              <div key={name} style={{ display:"flex", alignItems:"center", gap:16, padding:"10px 12px", background:"#0d0d14", borderRadius:8 }}>
                <div style={{ flex:1, fontSize:13, fontWeight:600, color:"#ccc" }}>{name}</div>
                <div style={{ fontSize:12, color:"#555" }}>{s.wins+s.losses} trades</div>
                <div style={{ fontSize:12, color:wr>=50?"#4ade80":"#f87171" }}>{wr.toFixed(0)}% WR</div>
                <div style={{ fontSize:14, fontWeight:700, color:s.pnl>=0?"#4ade80":"#f87171", minWidth:80, textAlign:"right" }}>{fmtRs(s.pnl)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Emotion frequencies */}
      {topEmotions.length>0 && (
        <div style={{ ...S.card, marginTop:16 }}>
          <div style={{ fontSize:14, fontWeight:600, color:"#aaa", marginBottom:14 }}>🧠 Emotion Frequency</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {topEmotions.map(([e,c])=>{
              const positive = ["Calm","Confident","Disciplined","Neutral"].includes(e);
              return <span key={e} style={{ ...S.badge(positive?"green":"yellow"), fontSize:12, padding:"4px 12px" }}>{e} ({c})</span>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── RULES ─── */
function RulesPage() {
  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <div style={S.sectionTitle}>My Trading Rules</div>
        <div style={S.muted}>The non-negotiable rules you follow every day</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {RULES.map((r,i)=>(
          <div key={r} style={{ ...S.cardSm, display:"flex", gap:12, alignItems:"flex-start" }}>
            <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#7c3aed,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", flexShrink:0 }}>{i+1}</div>
            <div style={{ fontSize:13, color:"#ccc", lineHeight:1.5 }}>{r}</div>
          </div>
        ))}
      </div>
      <div style={{ ...S.card, marginTop:20, borderColor:"#2a1a50" }}>
        <div style={{ fontSize:13, color:"#7c3aed", fontWeight:600, marginBottom:8 }}>💡 The Golden Rule</div>
        <div style={{ fontSize:14, color:"#888", lineHeight:1.6 }}>
          A trade that doesn't follow your rules is not a trade — it's a gamble. Every rule break you let slide makes the next one easier. Protect your process.
        </div>
      </div>
    </div>
  );
}
