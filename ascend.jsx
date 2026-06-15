import { useState, useEffect, useRef, useCallback } from "react";

// ─── STORAGE ──────────────────────────────────────────────────
const SK = "ascend_v3";
function loadState() {
  try { const r = localStorage.getItem(SK); if (r) return JSON.parse(r); } catch(e) {}
  return null;
}
function saveState(d) { try { localStorage.setItem(SK, JSON.stringify(d)); } catch(e) {} }
function loadKey() { try { return localStorage.getItem("ascend_key") || ""; } catch(e) { return ""; } }
function saveKey(k) { try { localStorage.setItem("ascend_key", k); } catch(e) {} }

// ─── DESIGN TOKENS ────────────────────────────────────────────
const C = {
  bg:"#F7F8FA", surface:"#FFFFFF", surfaceAlt:"#F0F2F5",
  border:"#E2E6EC", ink:"#0F1923", sub:"#3D5166", muted:"#7A90A4",
  gold:"#C8941A", goldLt:"#FFF8E8",
  pos:"#1A7A4A", posLt:"#E8F7EE",
  neg:"#C0392B", negLt:"#FDECEA",
  warn:"#C87A1A", warnLt:"#FFF3E0",
  blue:"#1A5FA8", blueLt:"#E8F0FB",
  purple:"#6B3FA0", purpleLt:"#F3EEFF",
};
const BUREAU = {
  Equifax:   { color:"#C8001E", light:"#FFF0F2", icon:"EQ" },
  Experian:  { color:"#003DA5", light:"#EEF3FF", icon:"EX" },
  TransUnion:{ color:"#3D1152", light:"#F5EEFF", icon:"TU" },
};

// ─── HELPERS ──────────────────────────────────────────────────
function Spinner({ size=18, color="#FFF" }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", border:`2px solid rgba(255,255,255,.25)`, borderTopColor:color, animation:"spin .7s linear infinite", display:"inline-block", flexShrink:0 }}/>;
}

function Btn({ children, onClick, variant="primary", size="md", style={}, disabled=false }) {
  const sz = size === "sm" ? { fontSize:13, padding:"7px 14px" } : { fontSize:14, padding:"11px 20px" };
  const variants = {
    primary:{ background:C.ink, color:"#FFF", border:"none" },
    gold:{ background:C.gold, color:"#FFF", border:"none" },
    ghost:{ background:"transparent", color:C.ink, border:`1px solid ${C.border}` },
    danger:{ background:C.neg, color:"#FFF", border:"none" },
    success:{ background:C.pos, color:"#FFF", border:"none" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...variants[variant], ...sz, borderRadius:10, fontWeight:700,
      cursor:disabled?"not-allowed":"pointer", opacity:disabled?.5:1,
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      gap:6, fontFamily:"inherit", ...style
    }}>{children}</button>
  );
}

function Card({ children, style={} }) {
  return <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px", ...style }}>{children}</div>;
}

function Badge({ children, color=C.ink, bg=C.surfaceAlt }) {
  return <span style={{ background:bg, color, fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:20, display:"inline-block" }}>{children}</span>;
}

function ScoreMeter({ score }) {
  if (!score) return null;
  const pct = Math.min(Math.max((score - 300) / 550, 0), 1);
  const color = score >= 740 ? C.pos : score >= 670 ? C.gold : C.neg;
  const label = score >= 740 ? "Excellent" : score >= 670 ? "Good" : score >= 580 ? "Fair" : "Poor";
  return (
    <div style={{ textAlign:"center", padding:"20px 0 12px" }}>
      <div style={{ fontSize:52, fontWeight:900, color, letterSpacing:"-2px" }}>{score}</div>
      <div style={{ fontSize:13, color:C.sub, marginBottom:12 }}>{label}</div>
      <div style={{ background:C.surfaceAlt, borderRadius:99, height:8, overflow:"hidden", maxWidth:280, margin:"0 auto" }}>
        <div style={{ width:`${pct*100}%`, height:"100%", background:color, borderRadius:99, transition:"width .6s ease" }}/>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", maxWidth:280, margin:"4px auto 0", fontSize:10, color:C.muted }}>
        <span>300</span><span>850</span>
      </div>
    </div>
  );
}

// ─── API CALL ─────────────────────────────────────────────────
async function callClaude(apiKey, messages, systemPrompt) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "x-api-key":apiKey, "anthropic-version":"2023-06-01" },
    body:JSON.stringify({
      model:"claude-sonnet-4-6", max_tokens:4000,
      system: systemPrompt || undefined,
      messages
    })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || "API error");
  return data.content.map(b => b.text || "").join("");
}

// ─── GATEWAY ──────────────────────────────────────────────────
function Gateway({ onEnter }) {
  const [input, setInput] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState(null);

  const save = () => {
    const k = input.trim();
    if (!k.startsWith("sk-ant-")) { setStatus("invalid"); return; }
    saveKey(k); setStatus("ok");
    setTimeout(() => onEnter(k), 300);
  };

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(160deg, ${C.ink} 0%, #1A2F45 60%, #0F1923 100%)`, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:52, marginBottom:10 }}>⬆️</div>
          <div style={{ color:"#FFF", fontSize:34, fontWeight:900, letterSpacing:"-1px" }}>ASCEND</div>
          <div style={{ color:"rgba(255,255,255,.4)", fontSize:13, marginTop:8, lineHeight:1.7 }}>
            Upload your credit reports. Get your exact plan.<br/>Dispute everything hurting your score.
          </div>
        </div>
        <Card style={{ background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)" }}>
          <div style={{ color:"rgba(255,255,255,.6)", fontSize:12, marginBottom:8 }}>Anthropic API Key</div>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <input
              value={input} onChange={e => setInput(e.target.value)}
              type={show ? "text" : "password"}
              placeholder="sk-ant-api03-…"
              onKeyDown={e => e.key==="Enter" && save()}
              style={{ flex:1, background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.2)", borderRadius:10, padding:"10px 14px", fontSize:14, color:"#FFF", outline:"none", fontFamily:"inherit" }}
            />
            <button onClick={() => setShow(s=>!s)} style={{ background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.2)", borderRadius:10, color:"#FFF", padding:"0 12px", cursor:"pointer", fontSize:16 }}>
              {show ? "🙈" : "👁"}
            </button>
          </div>
          {status==="invalid" && <div style={{ color:"#FF7A7A", fontSize:12, marginBottom:8 }}>Key must start with sk-ant-</div>}
          <Btn variant="gold" style={{ width:"100%" }} onClick={save} disabled={!input.trim()}>
            {status==="ok" ? "✓ Entering ASCEND…" : "Enter ASCEND →"}
          </Btn>
          <div style={{ color:"rgba(255,255,255,.35)", fontSize:11, marginTop:12, textAlign:"center", lineHeight:1.6 }}>
            Your key is stored only on this device.<br/>Get one free at console.anthropic.com
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── BUREAU UPLOAD CARD ───────────────────────────────────────
function BureauUploadCard({ bureau, report, onAnalyze, loading }) {
  const { color, light } = BUREAU[bureau];
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const base64 = e.target.result.split(",")[1];
      const mediaType = file.type || "application/pdf";
      onAnalyze(bureau, base64, mediaType);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card style={{ borderTop:`3px solid ${color}`, position:"relative" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <div style={{ width:36, height:36, borderRadius:8, background:color, display:"flex", alignItems:"center", justifyContent:"center", color:"#FFF", fontWeight:900, fontSize:13 }}>
          {BUREAU[bureau].icon}
        </div>
        <div>
          <div style={{ fontWeight:800, fontSize:15 }}>{bureau}</div>
          <div style={{ fontSize:11, color:C.muted }}>
            {report ? `Score: ${report.score || "N/A"} · ${report.items?.length || 0} items found` : "No report uploaded yet"}
          </div>
        </div>
        {report && <Badge color={C.pos} bg={C.posLt} style={{ marginLeft:"auto" }}>✓ Analyzed</Badge>}
      </div>

      {report ? (
        <div style={{ fontSize:12, color:C.sub, marginBottom:10, lineHeight:1.6 }}>
          {report.summary?.slice(0, 120)}…
          <button onClick={() => fileRef.current?.click()} style={{ background:"none", border:"none", color:C.blue, cursor:"pointer", fontSize:12, marginLeft:6 }}>Re-upload</button>
        </div>
      ) : (
        <div
          onClick={() => !loading && fileRef.current?.click()}
          style={{ border:`2px dashed ${loading ? color : C.border}`, borderRadius:10, padding:"20px", textAlign:"center", cursor:loading?"wait":"pointer", background:loading ? light : "transparent", transition:"all .2s" }}
        >
          {loading ? (
            <div style={{ color, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <Spinner size={14} color={color} /> Analyzing your {bureau} report…
            </div>
          ) : (
            <>
              <div style={{ fontSize:24, marginBottom:6 }}>📄</div>
              <div style={{ fontSize:13, fontWeight:700, color }}>Upload {bureau} Report</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>PDF or screenshot · annualcreditreport.com</div>
            </>
          )}
        </div>
      )}
      <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display:"none" }} onChange={e => handleFile(e.target.files[0])} />
    </Card>
  );
}

// ─── DISPUTE LETTER MODAL ─────────────────────────────────────
function DisputeModal({ letter, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(letter);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
      <Card style={{ width:"100%", maxWidth:540, maxHeight:"80vh", display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontWeight:800, fontSize:16 }}>📨 Dispute Letter</div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:C.muted }}>✕</button>
        </div>
        <div style={{ flex:1, overflow:"auto", background:C.surfaceAlt, borderRadius:10, padding:14, fontSize:13, lineHeight:1.8, fontFamily:"monospace", whiteSpace:"pre-wrap", color:C.ink }}>
          {letter}
        </div>
        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          <Btn variant="primary" style={{ flex:1 }} onClick={copy}>{copied ? "✓ Copied!" : "Copy Letter"}</Btn>
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
        </div>
      </Card>
    </div>
  );
}

// ─── ANALYSIS VIEW ────────────────────────────────────────────
function AnalysisView({ reports, apiKey, onGenerateLetter }) {
  const bureaus = Object.keys(reports);
  const [activeBureau, setActiveBureau] = useState(bureaus[0]);
  const report = reports[activeBureau];

  if (!report) return null;

  const delinquent = report.items?.filter(i => i.status === "delinquent" || i.type === "delinquent") || [];
  const shouldHaveFallenOff = report.items?.filter(i => i.shouldHaveFallenOff) || [];
  const authUsers = report.items?.filter(i => i.type === "authorized_user") || [];
  const cards = report.items?.filter(i => i.type === "credit_card" || i.type === "revolving") || [];

  return (
    <div>
      {/* Bureau tabs */}
      {bureaus.length > 1 && (
        <div style={{ display:"flex", gap:8, marginBottom:16, overflowX:"auto" }}>
          {bureaus.map(b => (
            <button key={b} onClick={() => setActiveBureau(b)} style={{
              padding:"8px 16px", borderRadius:20, fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap",
              background: activeBureau===b ? BUREAU[b]?.color || C.ink : C.surfaceAlt,
              color: activeBureau===b ? "#FFF" : C.sub,
              border:"none"
            }}>{b}</button>
          ))}
        </div>
      )}

      {/* Score */}
      <Card style={{ marginBottom:12, textAlign:"center" }}>
        <ScoreMeter score={report.score} />
        <div style={{ fontSize:13, color:C.sub, marginTop:4 }}>Target: <strong>700–800</strong></div>
      </Card>

      {/* Action Plan */}
      {report.actionPlan?.length > 0 && (
        <Card style={{ marginBottom:12 }}>
          <div style={{ fontWeight:800, fontSize:15, marginBottom:12 }}>🎯 Your Action Plan</div>
          {report.actionPlan.map((step, i) => (
            <div key={i} style={{ display:"flex", gap:10, marginBottom:10 }}>
              <div style={{ width:24, height:24, borderRadius:12, background:C.gold, color:"#FFF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, flexShrink:0 }}>{i+1}</div>
              <div style={{ fontSize:13, color:C.ink, lineHeight:1.6 }}>{step}</div>
            </div>
          ))}
        </Card>
      )}

      {/* Delinquent Accounts */}
      {delinquent.length > 0 && (
        <Card style={{ marginBottom:12 }}>
          <div style={{ fontWeight:800, fontSize:15, marginBottom:12 }}>⚠️ Delinquent Accounts ({delinquent.length})</div>
          {delinquent.map((item, i) => (
            <div key={i} style={{ borderRadius:10, background:item.shouldHaveFallenOff ? C.negLt : C.warnLt, padding:"12px", marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                <div style={{ fontWeight:700, fontSize:14 }}>{item.creditor || item.name}</div>
                {item.shouldHaveFallenOff
                  ? <Badge color={C.neg} bg="#FFD7D7">Should be removed!</Badge>
                  : <Badge color={C.warn} bg="#FFE5B4">Active</Badge>
                }
              </div>
              <div style={{ fontSize:12, color:C.sub, lineHeight:1.7 }}>
                {item.amount && <span>Amount: <strong>${item.amount}</strong> · </span>}
                {item.openedDate && <span>Opened: {item.openedDate} · </span>}
                {item.fallOffDate && <span>Falls off: <strong>{item.fallOffDate}</strong></span>}
                {item.shouldHaveFallenOff && <div style={{ color:C.neg, fontWeight:700, marginTop:4 }}>🚨 This account should have already been removed from your report!</div>}
              </div>
              <Btn variant={item.shouldHaveFallenOff ? "danger" : "ghost"} size="sm" style={{ marginTop:8 }}
                onClick={() => onGenerateLetter(activeBureau, item)}>
                {item.shouldHaveFallenOff ? "Generate Dispute Letter (FCRA)" : "Generate Dispute Letter"}
              </Btn>
            </div>
          ))}
        </Card>
      )}

      {/* Accounts that should have fallen off but weren't caught above */}
      {shouldHaveFallenOff.filter(i => i.status !== "delinquent").length > 0 && (
        <Card style={{ marginBottom:12, borderLeft:`3px solid ${C.neg}` }}>
          <div style={{ fontWeight:800, fontSize:15, marginBottom:8, color:C.neg }}>🚨 Illegally Remaining on Your Report</div>
          <div style={{ fontSize:12, color:C.sub, marginBottom:12 }}>These accounts are past the 7-year FCRA limit and must be removed.</div>
          {shouldHaveFallenOff.filter(i => i.status !== "delinquent").map((item, i) => (
            <div key={i} style={{ background:C.negLt, borderRadius:10, padding:"12px", marginBottom:8 }}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{item.creditor || item.name}</div>
              <div style={{ fontSize:12, color:C.sub }}>{item.reason}</div>
              <Btn variant="danger" size="sm" style={{ marginTop:8 }} onClick={() => onGenerateLetter(activeBureau, item)}>
                Dispute — FCRA §605
              </Btn>
            </div>
          ))}
        </Card>
      )}

      {/* Credit Card Utilization Targets */}
      {cards.length > 0 && (
        <Card style={{ marginBottom:12 }}>
          <div style={{ fontWeight:800, fontSize:15, marginBottom:4 }}>💳 Card Utilization Targets</div>
          <div style={{ fontSize:12, color:C.sub, marginBottom:12 }}>Pay to these exact amounts for the best score boost. Keep a small balance — don't zero out.</div>
          {cards.map((card, i) => (
            <div key={i} style={{ borderRadius:10, border:`1px solid ${C.border}`, padding:"12px", marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <div style={{ fontWeight:700, fontSize:14 }}>{card.creditor || card.name}</div>
                <div style={{ fontSize:12, color:C.sub }}>Limit: ${card.limit?.toLocaleString() || "N/A"}</div>
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <div style={{ background:C.negLt, borderRadius:8, padding:"6px 10px", fontSize:12 }}>
                  Current: <strong style={{ color:C.neg }}>${card.currentBalance?.toLocaleString() || "N/A"}</strong>
                </div>
                <div style={{ background:C.posLt, borderRadius:8, padding:"6px 10px", fontSize:12 }}>
                  Pay to: <strong style={{ color:C.pos }}>${card.targetBalance?.toLocaleString() || "N/A"}</strong>
                </div>
                {card.utilizationPct && (
                  <div style={{ background:C.blueLt, borderRadius:8, padding:"6px 10px", fontSize:12 }}>
                    Target: <strong style={{ color:C.blue }}>{card.utilizationPct}% utilization</strong>
                  </div>
                )}
              </div>
              {card.note && <div style={{ fontSize:11, color:C.muted, marginTop:6 }}>{card.note}</div>}
            </div>
          ))}
        </Card>
      )}

      {/* Authorized User Accounts */}
      {authUsers.length > 0 && (
        <Card style={{ marginBottom:12 }}>
          <div style={{ fontWeight:800, fontSize:15, marginBottom:12 }}>👤 Authorized User Accounts</div>
          {authUsers.map((au, i) => (
            <div key={i} style={{ borderRadius:10, background: au.harmful ? C.negLt : C.posLt, padding:"12px", marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <div style={{ fontWeight:700, fontSize:14 }}>{au.creditor || au.name}</div>
                <Badge color={au.harmful ? C.neg : C.pos} bg={au.harmful ? "#FFD7D7" : "#C8F0D8"}>
                  {au.harmful ? "Remove" : "Keep"}
                </Badge>
              </div>
              <div style={{ fontSize:12, color:C.sub, lineHeight:1.6 }}>{au.reason}</div>
            </div>
          ))}
        </Card>
      )}

      {/* Raw AI Summary */}
      {report.fullAnalysis && (
        <Card style={{ marginBottom:12 }}>
          <div style={{ fontWeight:800, fontSize:15, marginBottom:8 }}>📋 Full AI Analysis</div>
          <div style={{ fontSize:12, color:C.sub, lineHeight:1.8, whiteSpace:"pre-wrap" }}>{report.fullAnalysis}</div>
        </Card>
      )}
    </div>
  );
}

// ─── MONEY TAB ────────────────────────────────────────────────
function MoneyTab({ state, setState, apiKey }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newAcct, setNewAcct] = useState({ name:"", institution:"", balance:"", type:"checking" });
  const [aiQ, setAiQ] = useState("");
  const [aiResp, setAiResp] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [showCsv, setShowCsv] = useState(false);

  const addAccount = () => {
    if (!newAcct.name || !newAcct.balance) return;
    const accts = [...(state.accounts || []), { ...newAcct, id: Date.now(), balance: parseFloat(newAcct.balance) || 0 }];
    const ns = { ...state, accounts: accts };
    setState(ns); saveState(ns);
    setNewAcct({ name:"", institution:"", balance:"", type:"checking" });
    setShowAdd(false);
  };

  const importCsv = () => {
    const lines = csvText.trim().split("\n").slice(1);
    const txns = lines.map(l => {
      const parts = l.split(",");
      return { date: parts[0]?.trim(), description: parts[1]?.trim(), amount: parseFloat(parts[2]) || 0, id: Date.now() + Math.random() };
    }).filter(t => t.description);
    const ns = { ...state, transactions: [...(state.transactions || []), ...txns] };
    setState(ns); saveState(ns);
    setCsvText(""); setShowCsv(false);
  };

  const askAI = async () => {
    if (!aiQ.trim() || !apiKey) return;
    setAiLoading(true);
    try {
      const context = `Accounts: ${JSON.stringify(state.accounts || [])}. Transactions: ${JSON.stringify((state.transactions || []).slice(-20))}.`;
      const resp = await callClaude(apiKey, [{ role:"user", content: `${context}\n\nUser question: ${aiQ}` }],
        "You are a personal finance coach for someone building credit and improving their financial life. Be direct, specific, and encouraging. Keep responses concise.");
      setAiResp(resp);
    } catch(e) { setAiResp("Error: " + e.message); }
    setAiLoading(false);
  };

  const totalAssets = (state.accounts || []).filter(a => a.type !== "credit").reduce((s, a) => s + (a.balance || 0), 0);
  const totalDebt = (state.accounts || []).filter(a => a.type === "credit").reduce((s, a) => s + (a.balance || 0), 0);

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        <Card style={{ textAlign:"center" }}>
          <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Cash & Savings</div>
          <div style={{ fontSize:24, fontWeight:900, color:C.pos }}>${totalAssets.toLocaleString()}</div>
        </Card>
        <Card style={{ textAlign:"center" }}>
          <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Total Debt</div>
          <div style={{ fontSize:24, fontWeight:900, color:C.neg }}>${totalDebt.toLocaleString()}</div>
        </Card>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <Btn variant="primary" size="sm" onClick={() => setShowAdd(s=>!s)} style={{ flex:1 }}>+ Add Account</Btn>
        <Btn variant="ghost" size="sm" onClick={() => setShowCsv(s=>!s)} style={{ flex:1 }}>📥 Import CSV</Btn>
      </div>

      {showAdd && (
        <Card style={{ marginBottom:12 }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:10 }}>Add Account</div>
          {[
            { key:"name", placeholder:"Account name (e.g. Chase Checking)" },
            { key:"institution", placeholder:"Bank / Institution" },
            { key:"balance", placeholder:"Current balance ($)", type:"number" },
          ].map(f => (
            <input key={f.key} type={f.type||"text"} value={newAcct[f.key]} onChange={e => setNewAcct(n=>({...n,[f.key]:e.target.value}))}
              placeholder={f.placeholder}
              style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", fontSize:14, fontFamily:"inherit", outline:"none", boxSizing:"border-box", marginBottom:8, background:C.surfaceAlt }}
            />
          ))}
          <select value={newAcct.type} onChange={e => setNewAcct(n=>({...n,type:e.target.value}))}
            style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", fontSize:14, fontFamily:"inherit", outline:"none", boxSizing:"border-box", marginBottom:10, background:C.surfaceAlt }}>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="credit">Credit Card</option>
            <option value="loan">Loan</option>
          </select>
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="primary" size="sm" style={{ flex:1 }} onClick={addAccount}>Save Account</Btn>
            <Btn variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      {showCsv && (
        <Card style={{ marginBottom:12 }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>Import Transactions (CSV)</div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>Paste CSV from your bank. Format: Date, Description, Amount</div>
          <textarea value={csvText} onChange={e => setCsvText(e.target.value)} rows={5}
            placeholder={"2024-01-15,Grocery Store,-45.23\n2024-01-16,Paycheck,2500.00"}
            style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", fontSize:12, fontFamily:"monospace", outline:"none", boxSizing:"border-box", marginBottom:8, resize:"vertical" }}
          />
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="primary" size="sm" style={{ flex:1 }} onClick={importCsv}>Import</Btn>
            <Btn variant="ghost" size="sm" onClick={() => setShowCsv(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      {(state.accounts || []).map(acct => (
        <Card key={acct.id} style={{ marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontWeight:700, fontSize:14 }}>{acct.name}</div>
            <div style={{ fontSize:12, color:C.muted }}>{acct.institution} · {acct.type}</div>
          </div>
          <div style={{ fontWeight:800, fontSize:16, color: acct.type==="credit" ? C.neg : C.pos }}>
            {acct.type==="credit" ? "-" : ""}${(acct.balance||0).toLocaleString()}
          </div>
        </Card>
      ))}

      {/* AI Coach */}
      <Card style={{ marginTop:16 }}>
        <div style={{ fontWeight:800, fontSize:15, marginBottom:8 }}>🤖 Financial Coach</div>
        <div style={{ display:"flex", gap:8 }}>
          <input value={aiQ} onChange={e => setAiQ(e.target.value)} onKeyDown={e => e.key==="Enter" && askAI()}
            placeholder="Ask anything — budgeting, debt payoff, credit..."
            style={{ flex:1, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", fontSize:14, fontFamily:"inherit", outline:"none", background:C.surfaceAlt }}
          />
          <Btn variant="primary" size="sm" onClick={askAI} disabled={aiLoading || !aiQ.trim()}>
            {aiLoading ? <Spinner size={14}/> : "Ask"}
          </Btn>
        </div>
        {aiResp && (
          <div style={{ marginTop:12, fontSize:13, color:C.ink, lineHeight:1.8, background:C.surfaceAlt, borderRadius:10, padding:"12px" }}>
            {aiResp}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── SETTINGS TAB ─────────────────────────────────────────────
function SettingsTab({ apiKey, onReset, onKeyUpdate }) {
  const [newKey, setNewKey] = useState("");
  const [saved, setSaved] = useState(false);

  const saveNewKey = () => {
    if (!newKey.trim().startsWith("sk-ant-")) return;
    saveKey(newKey.trim()); onKeyUpdate(newKey.trim());
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    setNewKey("");
  };

  return (
    <div>
      <Card style={{ marginBottom:12 }}>
        <div style={{ fontWeight:700, fontSize:15, marginBottom:8 }}>🔑 API Key</div>
        <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>
          Current: {apiKey ? `${apiKey.slice(0,16)}…${apiKey.slice(-4)}` : "Not set"}
        </div>
        <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="sk-ant-api03-…"
          style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", fontSize:14, fontFamily:"inherit", outline:"none", boxSizing:"border-box", background:C.surfaceAlt, marginBottom:10 }}
        />
        <Btn variant="primary" style={{ width:"100%" }} onClick={saveNewKey}>{saved ? "✓ Saved!" : "Update Key"}</Btn>
      </Card>

      <Card style={{ marginBottom:12 }}>
        <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>ℹ️ About ASCEND</div>
        <div style={{ fontSize:13, color:C.sub, lineHeight:1.7 }}>
          Your personal AI credit repair and money system. Upload reports from all 3 bureaus, get your exact action plan, auto-generate dispute letters with FCRA codes, and track your money — all on your device.
        </div>
        <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:6 }}>
          {[
            "Per-bureau analysis (Equifax, Experian, TransUnion)",
            "Delinquent accounts + exact fall-off dates",
            "FCRA dispute letters auto-generated",
            "Card utilization targets (exact amounts)",
            "Authorized user account analysis",
            "Financial coaching & money tracking"
          ].map(f => <div key={f} style={{ fontSize:12, color:C.pos }}>✓ {f}</div>)}
        </div>
      </Card>

      <Card style={{ marginBottom:12 }}>
        <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>📱 Keep ASCEND Updated</div>
        <div style={{ fontSize:12, color:C.sub, lineHeight:1.7 }}>
          To get updates on your phone: open this artifact, tap ⋯ → Publish → Share Link. Open in Safari → Share → Add to Home Screen. Your data stays saved between updates.
        </div>
      </Card>

      <Btn variant="danger" style={{ width:"100%" }} onClick={onReset}>⚠️ Reset All Data</Btn>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────
const DEFAULT_STATE = { reports:{}, accounts:[], transactions:[], disputes:[] };
const TABS = ["Credit", "Money", "Settings"];

export default function App() {
  const [apiKey, setApiKey] = useState(() => loadKey());
  const [state, setState] = useState(() => loadState() || DEFAULT_STATE);
  const [tab, setTab] = useState("Credit");
  const [loadingBureau, setLoadingBureau] = useState(null);
  const [disputeLetter, setDisputeLetter] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { saveState(state); }, [state]);

  if (!apiKey) return <Gateway onEnter={k => { saveKey(k); setApiKey(k); }} />;

  const analyzeBureau = async (bureau, base64, mediaType) => {
    setLoadingBureau(bureau);
    setError(null);
    try {
      const prompt = `You are analyzing a ${bureau} credit report. Extract and return a JSON object with this exact structure:
{
  "score": <number or null>,
  "summary": "<2-sentence overview>",
  "actionPlan": ["<step 1>", "<step 2>", ...],
  "items": [
    {
      "type": "delinquent" | "credit_card" | "authorized_user" | "collection" | "inquiry" | "positive",
      "creditor": "<name>",
      "name": "<account name>",
      "status": "delinquent" | "current" | "closed" | "collection",
      "amount": <number or null>,
      "limit": <credit limit or null>,
      "currentBalance": <current balance or null>,
      "targetBalance": <exact dollar amount to pay to, for optimal score — for credit cards, calculate 8% utilization, always keep $1+ balance, never zero>,
      "utilizationPct": 8,
      "openedDate": "<date string or null>",
      "delinquencyDate": "<date of first delinquency or null>",
      "fallOffDate": "<7 years from first delinquency, formatted as Month YYYY, or null>",
      "shouldHaveFallenOff": <true if 7 years have passed since delinquency date>,
      "harmful": <true if authorized user account is hurting score>,
      "reason": "<explanation for authorized user or items that should have fallen off>",
      "fcraCodes": ["<relevant FCRA section codes>"]
    }
  ],
  "fullAnalysis": "<detailed analysis paragraph>"
}

For shouldHaveFallenOff: today's date is ${new Date().toLocaleDateString()}. If delinquency date + 7 years is before today, set shouldHaveFallenOff to true.
For targetBalance on credit cards: if limit exists, target = Math.max(1, Math.round(limit * 0.08)). Never recommend zero balance.
For authorized_user items: assess if the primary account holder's utilization or payment history is hurting the user.
Return ONLY valid JSON, no other text.`;

      const resp = await callClaude(apiKey, [{
        role:"user",
        content:[
          { type:"document", source:{ type:"base64", media_type: mediaType.includes("pdf") ? "application/pdf" : mediaType, data:base64 } },
          { type:"text", text:prompt }
        ]
      }]);

      let parsed;
      try {
        const clean = resp.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(clean);
      } catch(e) {
        parsed = { score:null, summary:"Analysis complete.", actionPlan:[], items:[], fullAnalysis:resp };
      }

      setState(s => ({ ...s, reports:{ ...s.reports, [bureau]: parsed } }));
    } catch(e) {
      setError(`Error analyzing ${bureau}: ${e.message}`);
    }
    setLoadingBureau(null);
  };

  const generateDisputeLetter = async (bureau, item) => {
    setError(null);
    try {
      const today = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
      const prompt = `Generate a formal credit dispute letter for the following item on a ${bureau} credit report.
Item: ${JSON.stringify(item)}
Today's date: ${today}

The letter must:
1. Be addressed to ${bureau} credit bureau
2. Cite specific FCRA sections (§605, §611, §623 as applicable)
3. Demand removal or correction of the item
4. Include a 30-day response deadline
5. Be firm but professional
6. If shouldHaveFallenOff is true, specifically cite that the 7-year reporting limit has been exceeded
7. Include "[YOUR NAME]", "[YOUR ADDRESS]", "[YOUR SSN LAST 4]" placeholders
8. End with a certified mail notice

Return only the letter text, ready to send.`;

      const letter = await callClaude(apiKey, [{ role:"user", content:prompt }],
        "You are a consumer rights attorney drafting credit dispute letters. Be precise, cite specific laws, and be firm.");
      setDisputeLetter(letter);
    } catch(e) {
      setError("Could not generate letter: " + e.message);
    }
  };

  const reset = () => {
    if (window.confirm("Reset all ASCEND data? This cannot be undone.")) {
      localStorage.removeItem(SK); localStorage.removeItem("ascend_key");
      setApiKey(""); setState(DEFAULT_STATE);
    }
  };

  const hasReports = Object.keys(state.reports).length > 0;

  return (
    <div style={{ fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background:C.bg, minHeight:"100vh" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} * { box-sizing:border-box; }`}</style>

      {/* Header */}
      <div style={{ background:C.ink, padding:"16px 20px", position:"sticky", top:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ color:"#FFF", fontWeight:900, fontSize:20, letterSpacing:"-0.5px" }}>⬆️ ASCEND</div>
        <div style={{ display:"flex", gap:4 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding:"6px 14px", borderRadius:20, border:"none", fontWeight:700, fontSize:12, cursor:"pointer",
              background: tab===t ? C.gold : "rgba(255,255,255,.1)",
              color: "#FFF"
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"16px 16px 80px", maxWidth:600, margin:"0 auto" }}>
        {error && (
          <div style={{ background:C.negLt, border:`1px solid ${C.neg}`, borderRadius:10, padding:"12px", marginBottom:12, fontSize:13, color:C.neg }}>
            {error}
            <button onClick={() => setError(null)} style={{ background:"none", border:"none", color:C.neg, cursor:"pointer", float:"right" }}>✕</button>
          </div>
        )}

        {/* CREDIT TAB */}
        {tab === "Credit" && (
          <>
            {/* Upload Section */}
            <Card style={{ marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:16, marginBottom:4 }}>📊 Upload Your Reports</div>
              <div style={{ fontSize:12, color:C.muted, marginBottom:16 }}>
                Get all 3 free at <span style={{ color:C.blue }}>annualcreditreport.com</span> · Upload one bureau at a time
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.keys(BUREAU).map(bureau => (
                  <BureauUploadCard
                    key={bureau}
                    bureau={bureau}
                    report={state.reports[bureau]}
                    onAnalyze={analyzeBureau}
                    loading={loadingBureau === bureau}
                  />
                ))}
              </div>
            </Card>

            {/* Analysis */}
            {hasReports && (
              <AnalysisView
                reports={state.reports}
                apiKey={apiKey}
                onGenerateLetter={generateDisputeLetter}
              />
            )}

            {!hasReports && (
              <Card style={{ textAlign:"center", padding:"40px 20px" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
                <div style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>Upload a report to get started</div>
                <div style={{ fontSize:13, color:C.muted, lineHeight:1.7 }}>
                  ASCEND will analyze your report, find what's hurting your score, show you exactly what to pay down and what to dispute, and generate ready-to-send letters.
                </div>
              </Card>
            )}
          </>
        )}

        {tab === "Money" && (
          <MoneyTab state={state} setState={setState} apiKey={apiKey} />
        )}

        {tab === "Settings" && (
          <SettingsTab apiKey={apiKey} onReset={reset} onKeyUpdate={setApiKey} />
        )}
      </div>

      {disputeLetter && (
        <DisputeModal letter={disputeLetter} onClose={() => setDisputeLetter(null)} />
      )}
    </div>
  );
}
