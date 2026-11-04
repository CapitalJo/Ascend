import React, { useState, useEffect, useRef } from "react";

// ─── STORAGE ──────────────────────────────────────────────────
const SK = "ascend_v4";
function loadState() { try { const r = localStorage.getItem(SK); if (r) return JSON.parse(r); } catch(e) {} return null; }
function saveState(d) { try { localStorage.setItem(SK, JSON.stringify(d)); } catch(e) {} }
function loadKey() { try { return localStorage.getItem("ascend_key") || ""; } catch(e) { return ""; } }
function saveKey(k) { try { localStorage.setItem("ascend_key", k); } catch(e) {} }

// ─── DESIGN ───────────────────────────────────────────────────
const C = {
  bg:"#F7F8FA", surface:"#FFFFFF", surfaceAlt:"#F0F2F5",
  border:"#E2E6EC", ink:"#0F1923", sub:"#3D5166", muted:"#7A90A4",
  gold:"#C8941A", goldLt:"#FFF8E8",
  pos:"#1A7A4A", posLt:"#E8F7EE",
  neg:"#C0392B", negLt:"#FDECEA",
  warn:"#C87A1A", warnLt:"#FFF3E0",
  blue:"#1A5FA8", blueLt:"#E8F0FB",
  purple:"#6B3FA0", purpleLt:"#F3EEFF",
  teal:"#1A7A6E", tealLt:"#E8F7F5",
};
const BUREAU = {
  Equifax:   { color:"#C8001E", light:"#FFF0F2", icon:"EQ" },
  Experian:  { color:"#003DA5", light:"#EEF3FF", icon:"EX" },
  TransUnion:{ color:"#3D1152", light:"#F5EEFF", icon:"TU" },
};
const CAT_COLORS = {
  "Housing":"#1A5FA8", "Transportation":"#C8941A", "Dining":"#C0392B",
  "Groceries":"#1A7A4A", "Subscriptions":"#6B3FA0", "Healthcare":"#1A7A6E",
  "Entertainment":"#C87A1A", "Income":"#1A7A4A", "Transfer":"#7A90A4", "Other":"#7A90A4"
};
const CATS = ["Housing","Transportation","Dining","Groceries","Subscriptions","Healthcare","Entertainment","Income","Transfer","Other"];

// ─── HELPERS ──────────────────────────────────────────────────
function Spinner({ size=18, color="#FFF" }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", border:`2px solid rgba(255,255,255,.25)`, borderTopColor:color, animation:"spin .7s linear infinite", display:"inline-block", flexShrink:0 }}/>;
}
function Card({ children, style={}, onClick }) {
  return <div onClick={onClick} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px", ...style }}>{children}</div>;
}
function Btn({ children, onClick, variant="primary", size="md", style={}, disabled=false }) {
  const sz = size==="sm" ? {fontSize:12,padding:"6px 12px"} : {fontSize:14,padding:"11px 20px"};
  const v = {
    primary:{background:C.ink,color:"#FFF",border:"none"},
    gold:{background:C.gold,color:"#FFF",border:"none"},
    ghost:{background:"transparent",color:C.ink,border:`1px solid ${C.border}`},
    danger:{background:C.neg,color:"#FFF",border:"none"},
    success:{background:C.pos,color:"#FFF",border:"none"},
    purple:{background:C.purple,color:"#FFF",border:"none"},
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...v[variant],...sz, borderRadius:10, fontWeight:700, cursor:disabled?"not-allowed":"pointer", opacity:disabled?.5:1, display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:"inherit", ...style }}>{children}</button>;
}
function Badge({ children, color=C.ink, bg=C.surfaceAlt, style={} }) {
  return <span style={{ background:bg, color, fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:20, display:"inline-block", ...style }}>{children}</span>;
}

// ─── API ──────────────────────────────────────────────────────
async function callClaude(apiKey, messages, system, maxTokens=4000) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "x-api-key":apiKey, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
    body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:maxTokens, system:system||undefined, messages })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || "API error");
  return data.content.map(b=>b.text||"").join("");
}

// ─── SCORE GAUGE ──────────────────────────────────────────────
function ScoreGauge({ score, target=750 }) {
  if (!score) return null;
  const pct = Math.min(Math.max((score-300)/550,0),1);
  const color = score>=740?C.pos:score>=670?C.gold:C.neg;
  const gap = target - score;
  const label = score>=740?"Excellent":score>=670?"Good":score>=580?"Fair":"Poor";
  return (
    <div style={{ textAlign:"center", padding:"16px 0 8px" }}>
      <div style={{ fontSize:56, fontWeight:900, color, letterSpacing:"-2px", lineHeight:1 }}>{score}</div>
      <div style={{ fontSize:12, color:C.muted, marginTop:4, marginBottom:12 }}>{label} · Target: <strong style={{color:C.gold}}>{target}</strong></div>
      <div style={{ background:C.surfaceAlt, borderRadius:99, height:10, overflow:"hidden", maxWidth:260, margin:"0 auto", position:"relative" }}>
        <div style={{ width:`${pct*100}%`, height:"100%", background:`linear-gradient(90deg, ${C.neg}, ${C.gold}, ${C.pos})`, borderRadius:99 }}/>
        <div style={{ position:"absolute", top:-2, left:`${((target-300)/550)*100}%`, width:2, height:14, background:C.gold, borderRadius:1 }}/>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", maxWidth:260, margin:"4px auto 0", fontSize:10, color:C.muted }}>
        <span>300</span><span>850</span>
      </div>
      {gap > 0 && (
        <div style={{ marginTop:12, background:C.goldLt, border:`1px solid ${C.gold}`, borderRadius:10, padding:"8px 14px", display:"inline-block", fontSize:13 }}>
          <strong style={{color:C.gold}}>+{gap} points needed</strong> to reach {target}
        </div>
      )}
    </div>
  );
}

// ─── DISPUTE MODAL ────────────────────────────────────────────
function DisputeModal({ letter, item, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(letter); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
      <Card style={{ width:"100%", maxWidth:560, maxHeight:"85vh", display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:16 }}>📨 Dispute Letter</div>
            {item && <div style={{ fontSize:12, color:C.muted }}>{item.creditor} · FCRA §605, §611</div>}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:C.muted }}>✕</button>
        </div>
        <div style={{ flex:1, overflow:"auto", background:C.surfaceAlt, borderRadius:10, padding:14, fontSize:12, lineHeight:1.9, fontFamily:"monospace", whiteSpace:"pre-wrap", color:C.ink }}>
          {letter}
        </div>
        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          <Btn variant="primary" style={{flex:1}} onClick={copy}>{copied?"✓ Copied!":"📋 Copy Letter"}</Btn>
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
        </div>
      </Card>
    </div>
  );
}

// ─── PIE CHART ────────────────────────────────────────────────
function PieChart({ data, size=160 }) {
  if (!data || !data.length) return null;
  const total = data.reduce((s,d)=>s+d.value,0);
  if (!total) return null;
  let cumulative = 0;
  const slices = data.map(d => {
    const pct = d.value / total;
    const start = cumulative;
    cumulative += pct;
    return { ...d, pct, start };
  });
  const r = size/2 - 8;
  const cx = size/2, cy = size/2;
  const toXY = (pct) => {
    const angle = pct * 2 * Math.PI - Math.PI/2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };
  return (
    <svg width={size} height={size} style={{display:"block",margin:"0 auto"}}>
      {slices.map((s,i) => {
        if (s.pct < 0.001) return null;
        const [x1,y1] = toXY(s.start);
        const [x2,y2] = toXY(s.start+s.pct);
        const large = s.pct > 0.5 ? 1 : 0;
        return (
          <path key={i}
            d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`}
            fill={s.color} stroke="#FFF" strokeWidth={2}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r*0.45} fill="#FFF"/>
    </svg>
  );
}

// ─── CREDIT TAB ───────────────────────────────────────────────
function CreditTab({ state, setState, apiKey }) {
  const [loadingBureau, setLoadingBureau] = useState(null);
  const [activeBureau, setActiveBureau] = useState(null);
  const [disputeLetter, setDisputeLetter] = useState(null);
  const [disputeItem, setDisputeItem] = useState(null);
  const [generatingLetter, setGeneratingLetter] = useState(null);
  const [error, setError] = useState(null);
  const fileRefs = { Equifax: useRef(), Experian: useRef(), TransUnion: useRef() };

  const bureauKeys = Object.keys(state.reports||{});
  useEffect(() => { if (!activeBureau && bureauKeys.length) setActiveBureau(bureauKeys[0]); }, [bureauKeys.length]);

  const analyzeBureau = async (bureau, file) => {
    setLoadingBureau(bureau); setError(null);
    try {
      const base64 = await new Promise((res,rej) => {
        const r = new FileReader();
        r.onload = e => res(e.target.result.split(",")[1]);
        r.onerror = () => rej(new Error("Read failed"));
        r.readAsDataURL(file);
      });
      const mediaType = file.type.includes("pdf") ? "application/pdf" : file.type||"image/jpeg";
      const today = new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
      const prompt = `Analyze this ${bureau} credit report. Today is ${today}. Return ONLY valid JSON:
{
  "score": <number|null>,
  "summary": "<2 sentence overview>",
  "actionPlan": [
    {"step":"<action>","impact":"high|medium|low","timeframe":"<e.g. 30 days>","detail":"<specific instruction>"}
  ],
  "disputeTimeline": [
    {"month":1,"action":"<what to do>","expectedResult":"<outcome>"},
    {"month":2,"action":"<what to do>","expectedResult":"<outcome>"},
    {"month":3,"action":"<what to do>","expectedResult":"<outcome>"}
  ],
  "delinquent": [
    {
      "creditor":"<name>","amount":<number|null>,"openedDate":"<date>",
      "delinquencyDate":"<date of first delinquency>",
      "fallOffDate":"<7 years from delinquency, e.g. March 2026>",
      "shouldHaveFallenOff":<true if 7 years have passed>,"status":"<collection|charge-off|late>",
      "fcraCodes":["605","611"],"reason":"<why disputable>"
    }
  ],
  "cards": [
    {
      "creditor":"<name>","limit":<number|null>,"currentBalance":<number|null>,
      "targetBalance":<8% of limit, minimum $1, never 0>,"utilizationCurrent":<pct>,"utilizationTarget":8,
      "scoreImpact":"<estimated point gain if paid to target>"
    }
  ],
  "authorizedUsers": [
    {"creditor":"<name>","primaryHolder":"<relationship>","limit":<number>,"balance":<number>,"utilization":<pct>,"recommendation":"keep|remove","reason":"<why>"}
  ],
  "positives": ["<positive factor 1>","<positive factor 2>"],
  "estimatedScoreGain": <total estimated points gain if all actions taken>,
  "fullAnalysis": "<3-4 sentence detailed analysis>"
}
For shouldHaveFallenOff: if delinquency date + 7 years is before ${today}, set true.
For targetBalance: limit * 0.08, round to nearest dollar, minimum $1.
Return ONLY JSON, no markdown.`;

      const resp = await callClaude(apiKey, [{
        role:"user",
        content:[
          {type:"document",source:{type:"base64",media_type:mediaType,data:base64}},
          {type:"text",text:prompt}
        ]
      }]);
      let parsed;
      try { parsed = JSON.parse(resp.replace(/```json|```/g,"").trim()); }
      catch(e) { parsed = {score:null,summary:"Analysis complete.",actionPlan:[],disputeTimeline:[],delinquent:[],cards:[],authorizedUsers:[],positives:[],estimatedScoreGain:0,fullAnalysis:resp}; }
      const newReports = {...(state.reports||{}), [bureau]:parsed};
      const ns = {...state, reports:newReports};
      setState(ns); saveState(ns);
      setActiveBureau(bureau);
    } catch(e) { setError(`Error analyzing ${bureau}: ${e.message}`); }
    setLoadingBureau(null);
  };

  const generateLetter = async (bureau, item) => {
    setGeneratingLetter(item.creditor); setError(null);
    try {
      const today = new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
      const letter = await callClaude(apiKey, [{role:"user",content:`Write a formal credit dispute letter to ${bureau} for this item: ${JSON.stringify(item)}. Today: ${today}.
Requirements:
- Address to ${bureau} credit bureau dispute department
- Cite FCRA §605 (7-year limit) if shouldHaveFallenOff is true, also cite §611 (right to dispute) and §623 (furnisher responsibility)
- Demand removal or correction
- State 30-day investigation deadline
- Use placeholders: [YOUR FULL NAME], [YOUR ADDRESS], [YOUR CITY STATE ZIP], [YOUR SSN LAST 4], [YOUR DATE OF BIRTH]
- Include "Sent via Certified Mail, Return Receipt Requested"
- Professional firm tone
Return only the letter text, ready to print and mail.`}],
        "You are a consumer rights attorney. Write precise, legally-grounded dispute letters.");
      setDisputeLetter(letter);
      setDisputeItem(item);
      // Save to dispute log
      const log = [...(state.disputeLog||[]), {
        id:Date.now(), bureau, creditor:item.creditor, date:new Date().toLocaleDateString(),
        status:"Ready to Send", letter, dueDate:new Date(Date.now()+30*86400000).toLocaleDateString()
      }];
      const ns = {...state, disputeLog:log};
      setState(ns); saveState(ns);
    } catch(e) { setError("Could not generate letter: "+e.message); }
    setGeneratingLetter(null);
  };

  const report = activeBureau ? (state.reports||{})[activeBureau] : null;

  return (
    <div>
      {error && (
        <div style={{background:C.negLt,border:`1px solid ${C.neg}`,borderRadius:10,padding:12,marginBottom:12,fontSize:13,color:C.neg,display:"flex",justifyContent:"space-between"}}>
          {error}<button onClick={()=>setError(null)} style={{background:"none",border:"none",color:C.neg,cursor:"pointer",fontSize:16}}>✕</button>
        </div>
      )}

      {/* Upload Section */}
      <Card style={{marginBottom:14}}>
        <div style={{fontWeight:800,fontSize:15,marginBottom:4}}>📊 Upload Credit Reports</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Get all 3 free at <span style={{color:C.blue}}>annualcreditreport.com</span> · Upload one at a time</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {Object.entries(BUREAU).map(([bureau,{color,light,icon}]) => {
            const hasReport = !!(state.reports||{})[bureau];
            const isLoading = loadingBureau===bureau;
            return (
              <div key={bureau} style={{border:`1px solid ${hasReport?color:C.border}`,borderLeft:`3px solid ${color}`,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10,cursor:isLoading?"wait":"pointer",background:hasReport?light:"transparent"}}
                onClick={()=>!isLoading&&fileRefs[bureau].current?.click()}>
                <div style={{width:32,height:32,borderRadius:8,background:color,display:"flex",alignItems:"center",justifyContent:"center",color:"#FFF",fontWeight:900,fontSize:12,flexShrink:0}}>{icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13}}>{bureau}</div>
                  <div style={{fontSize:11,color:C.muted}}>
                    {isLoading ? "Analyzing…" : hasReport ? `Score: ${(state.reports||{})[bureau]?.score||"N/A"} · Tap to re-upload` : "Tap to upload PDF or screenshot"}
                  </div>
                </div>
                {isLoading ? <Spinner size={16} color={color}/> : hasReport ? <span style={{color:C.pos,fontSize:16}}>✓</span> : <span style={{color:C.muted,fontSize:18}}>+</span>}
                <input ref={fileRefs[bureau]} type="file" accept=".pdf,image/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&analyzeBureau(bureau,e.target.files[0])}/>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Bureau Tabs */}
      {bureauKeys.length > 0 && (
        <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto"}}>
          {bureauKeys.map(b=>(
            <button key={b} onClick={()=>setActiveBureau(b)} style={{
              padding:"7px 14px",borderRadius:20,fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",border:"none",
              background:activeBureau===b?BUREAU[b]?.color||C.ink:C.surfaceAlt,
              color:activeBureau===b?"#FFF":C.sub
            }}>{b}</button>
          ))}
        </div>
      )}

      {/* Report Analysis */}
      {report && (
        <>
          {/* Score */}
          <Card style={{marginBottom:12,textAlign:"center"}}>
            <ScoreGauge score={report.score} target={750}/>
            {report.estimatedScoreGain > 0 && (
              <div style={{marginTop:8,fontSize:13,color:C.pos,fontWeight:700}}>
                📈 Potential gain: +{report.estimatedScoreGain} points by following your plan
              </div>
            )}
            {report.summary && <div style={{fontSize:13,color:C.sub,marginTop:10,lineHeight:1.7,textAlign:"left"}}>{report.summary}</div>}
          </Card>

          {/* Action Plan */}
          {report.actionPlan?.length > 0 && (
            <Card style={{marginBottom:12}}>
              <div style={{fontWeight:800,fontSize:15,marginBottom:12}}>🎯 Your Action Plan</div>
              {report.actionPlan.map((step,i)=>(
                <div key={i} style={{display:"flex",gap:10,marginBottom:12,paddingBottom:12,borderBottom:i<report.actionPlan.length-1?`1px solid ${C.border}`:"none"}}>
                  <div style={{width:26,height:26,borderRadius:13,background:step.impact==="high"?C.neg:step.impact==="medium"?C.gold:C.pos,color:"#FFF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{i+1}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{step.step}</div>
                    <div style={{fontSize:12,color:C.sub,marginBottom:4,lineHeight:1.6}}>{step.detail}</div>
                    <div style={{display:"flex",gap:6}}>
                      <Badge color={step.impact==="high"?C.neg:step.impact==="medium"?C.warn:C.pos} bg={step.impact==="high"?C.negLt:step.impact==="medium"?C.warnLt:C.posLt}>{step.impact} impact</Badge>
                      {step.timeframe && <Badge color={C.blue} bg={C.blueLt}>{step.timeframe}</Badge>}
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* Dispute Timeline */}
          {report.disputeTimeline?.length > 0 && (
            <Card style={{marginBottom:12}}>
              <div style={{fontWeight:800,fontSize:15,marginBottom:12}}>📅 Dispute Timeline</div>
              {report.disputeTimeline.map((t,i)=>(
                <div key={i} style={{display:"flex",gap:10,marginBottom:10}}>
                  <div style={{width:32,height:32,borderRadius:8,background:C.purple,color:"#FFF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>M{t.month}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:13}}>{t.action}</div>
                    <div style={{fontSize:12,color:C.pos}}>{t.expectedResult}</div>
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* Delinquent Accounts */}
          {report.delinquent?.length > 0 && (
            <Card style={{marginBottom:12}}>
              <div style={{fontWeight:800,fontSize:15,marginBottom:12}}>⚠️ Delinquent Accounts ({report.delinquent.length})</div>
              {report.delinquent.map((item,i)=>(
                <div key={i} style={{background:item.shouldHaveFallenOff?C.negLt:C.warnLt,borderRadius:10,padding:12,marginBottom:8,border:`1px solid ${item.shouldHaveFallenOff?C.neg:C.warn}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div style={{fontWeight:700,fontSize:14}}>{item.creditor}</div>
                    {item.shouldHaveFallenOff
                      ? <Badge color={C.neg} bg="#FFD7D7">🚨 Must Be Removed</Badge>
                      : <Badge color={C.warn} bg="#FFE5B4">{item.status}</Badge>
                    }
                  </div>
                  <div style={{fontSize:12,color:C.sub,lineHeight:1.8}}>
                    {item.amount && <span>Amount: <strong>${item.amount.toLocaleString()}</strong> · </span>}
                    {item.openedDate && <span>Opened: {item.openedDate} · </span>}
                    {item.delinquencyDate && <span>Delinquent: {item.delinquencyDate} · </span>}
                    {item.fallOffDate && <span>Falls off: <strong>{item.fallOffDate}</strong></span>}
                  </div>
                  {item.shouldHaveFallenOff && (
                    <div style={{color:C.neg,fontWeight:700,fontSize:12,marginTop:4}}>
                      This account exceeded the 7-year FCRA reporting limit and must be removed immediately.
                    </div>
                  )}
                  {item.reason && <div style={{fontSize:12,color:C.sub,marginTop:4}}>{item.reason}</div>}
                  <Btn variant={item.shouldHaveFallenOff?"danger":"ghost"} size="sm" style={{marginTop:8}}
                    disabled={generatingLetter===item.creditor}
                    onClick={()=>generateLetter(activeBureau,item)}>
                    {generatingLetter===item.creditor ? <><Spinner size={12}/> Generating…</> : `Generate ${item.shouldHaveFallenOff?"FCRA §605 ":""}Dispute Letter`}
                  </Btn>
                </div>
              ))}
            </Card>
          )}

          {/* Card Utilization */}
          {report.cards?.length > 0 && (
            <Card style={{marginBottom:12}}>
              <div style={{fontWeight:800,fontSize:15,marginBottom:4}}>💳 Card Payoff Targets</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Pay to these exact amounts. Keep a small balance — never zero.</div>
              {report.cards.map((card,i)=>(
                <div key={i} style={{border:`1px solid ${C.border}`,borderRadius:10,padding:12,marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <div style={{fontWeight:700,fontSize:14}}>{card.creditor}</div>
                    <div style={{fontSize:12,color:C.muted}}>Limit: ${(card.limit||0).toLocaleString()}</div>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
                    <div style={{background:C.negLt,borderRadius:8,padding:"6px 10px",fontSize:12}}>
                      Now: <strong style={{color:C.neg}}>${(card.currentBalance||0).toLocaleString()}</strong> ({card.utilizationCurrent}%)
                    </div>
                    <div style={{fontSize:16,color:C.muted,alignSelf:"center"}}>→</div>
                    <div style={{background:C.posLt,borderRadius:8,padding:"6px 10px",fontSize:12}}>
                      Target: <strong style={{color:C.pos}}>${(card.targetBalance||0).toLocaleString()}</strong> (8%)
                    </div>
                  </div>
                  {card.scoreImpact && <div style={{fontSize:12,color:C.pos}}>📈 {card.scoreImpact}</div>}
                </div>
              ))}
            </Card>
          )}

          {/* Authorized Users */}
          {report.authorizedUsers?.length > 0 && (
            <Card style={{marginBottom:12}}>
              <div style={{fontWeight:800,fontSize:15,marginBottom:12}}>👤 Authorized User Accounts</div>
              {report.authorizedUsers.map((au,i)=>(
                <div key={i} style={{background:au.recommendation==="remove"?C.negLt:C.posLt,borderRadius:10,padding:12,marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <div style={{fontWeight:700,fontSize:14}}>{au.creditor}</div>
                    <Badge color={au.recommendation==="remove"?C.neg:C.pos} bg={au.recommendation==="remove"?"#FFD7D7":"#C8F0D8"}>
                      {au.recommendation==="remove"?"Remove":"Keep"}
                    </Badge>
                  </div>
                  <div style={{fontSize:12,color:C.sub,marginBottom:4}}>Utilization: {au.utilization}% · Balance: ${(au.balance||0).toLocaleString()}</div>
                  <div style={{fontSize:12,color:C.sub}}>{au.reason}</div>
                </div>
              ))}
            </Card>
          )}

          {/* Positives */}
          {report.positives?.length > 0 && (
            <Card style={{marginBottom:12}}>
              <div style={{fontWeight:800,fontSize:15,marginBottom:8}}>✅ What's Helping Your Score</div>
              {report.positives.map((p,i)=><div key={i} style={{fontSize:13,color:C.pos,marginBottom:4}}>✓ {p}</div>)}
            </Card>
          )}
        </>
      )}

      {/* Dispute Log */}
      {(state.disputeLog||[]).length > 0 && (
        <Card style={{marginBottom:12}}>
          <div style={{fontWeight:800,fontSize:15,marginBottom:12}}>📬 Dispute Tracker</div>
          {(state.disputeLog||[]).map((d,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<state.disputeLog.length-1?`1px solid ${C.border}`:"none"}}>
              <div>
                <div style={{fontWeight:700,fontSize:13}}>{d.creditor}</div>
                <div style={{fontSize:11,color:C.muted}}>{d.bureau} · Sent {d.date} · Due {d.dueDate}</div>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <Badge color={C.blue} bg={C.blueLt}>{d.status}</Badge>
                <button onClick={()=>{setDisputeLetter(d.letter);setDisputeItem({creditor:d.creditor});}} style={{background:"none",border:"none",color:C.blue,cursor:"pointer",fontSize:11,fontWeight:700}}>View</button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {!bureauKeys.length && (
        <Card style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{fontSize:40,marginBottom:12}}>📋</div>
          <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>Upload a report to get started</div>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>ASCEND will find every issue, show you exactly what to do, and generate dispute letters ready to mail.</div>
        </Card>
      )}

      {disputeLetter && <DisputeModal letter={disputeLetter} item={disputeItem} onClose={()=>{setDisputeLetter(null);setDisputeItem(null);}}/>}
    </div>
  );
}

// ─── MONEY TAB ────────────────────────────────────────────────
function MoneyTab({ state, setState, apiKey }) {
  const [view, setView] = useState("overview");
  const [showAddAcct, setShowAddAcct] = useState(false);
  const [plaidLoading, setPlaidLoading] = useState(false);
  const [plaidError, setPlaidError] = useState(null);

  const update = fn => setState(s => ({...s, ...fn(s)}));
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const post = async (url, body) => {
    const r = await fetch(url, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body||{}) });
    const d = await r.json().catch(()=>({}));
    if (!r.ok) { const e = new Error(d.error||"Request failed"); e.code = d.code; throw e; }
    return d;
  };

  // Merge fresh bank data. Values the bank provides win; manual entries stay where the bank has none.
  const mergeBank = (s, bankData, token) => {
    const rules = s.rules||{};
    const clean = o => Object.fromEntries(Object.entries(o).filter(([,v])=>v!==null&&v!==undefined));
    const fresh = Object.fromEntries(bankData.accounts.map(a=>[a.id,clean(a)]));
    const tag = a => ({...a, linked:true, itemId:token.item_id, syncedAt:bankData.syncedAt, bankFields:Object.keys(a)});
    const known = new Set((s.accounts||[]).map(a=>a.id));
    const accounts = [
      ...(s.accounts||[]).map(a=>fresh[a.id] ? {...a, ...tag(fresh[a.id])} : a),
      ...Object.values(fresh).filter(a=>!known.has(a.id)).map(tag),
    ];
    const txnIds = new Set((s.transactions||[]).map(t=>t.id));
    const newTxns = bankData.transactions.filter(t=>!txnIds.has(t.id)).map(t=>{ const r=rules[merchantKey(t.description)]; return r?{...t,category:r}:t; });
    const plaidTokens = (s.plaidTokens||[]).map(t=>t.item_id===token.item_id ? {...t, syncedAt:bankData.syncedAt, liabilities:bankData.liabilities, error:null} : t);
    return { accounts, transactions:[...(s.transactions||[]),...newTxns], plaidTokens };
  };

  const syncOne = async token => {
    try {
      const data = await post("/api/get-data", { access_token:token.access_token });
      update(s=>mergeBank(s, data, token));
    } catch(e) {
      const msg = e.code==="ITEM_LOGIN_REQUIRED" ? "Your bank needs you to sign in again" : e.message;
      update(s=>({plaidTokens:(s.plaidTokens||[]).map(t=>t.item_id===token.item_id?{...t,error:msg,syncedAt:new Date().toISOString()}:t)}));
    }
  };

  const syncAll = async () => {
    const tokens = state.plaidTokens||[];
    if (!tokens.length || syncingRef.current) return;
    syncingRef.current = true; setSyncing(true);
    for (const t of tokens) await syncOne(t);
    syncingRef.current = false; setSyncing(false);
  };

  // Live updates: sync on open, when you come back to the app, and every 30 minutes while it's open
  const autoSync = useRef();
  autoSync.current = () => {
    const stale = (state.plaidTokens||[]).some(t=>!t.syncedAt || Date.now()-new Date(t.syncedAt).getTime() > 15*60000);
    if (stale) syncAll();
  };
  useEffect(()=>{
    autoSync.current();
    const id = setInterval(()=>autoSync.current(), 30*60000);
    const onVis = () => document.visibilityState==="visible" && autoSync.current();
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  // Opens Plaid Link. With an access token it re-opens an existing connection (sign in again / allow card details).
  const openLink = async (existing) => {
    setPlaidLoading(true); setPlaidError(null);
    try {
      const lt = await post("/api/create-link-token", existing ? { access_token:existing.access_token } : {});
      await new Promise((res, rej) => {
        if (window.Plaid) return res();
        const sc = document.createElement("script");
        sc.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
        sc.onload = res; sc.onerror = rej;
        document.head.appendChild(sc);
      });
      window.Plaid.create({
        token: lt.link_token,
        onSuccess: async (public_token, metadata) => {
          try {
            let token = existing;
            if (!existing) {
              const ex = await post("/api/exchange-token", { public_token });
              token = { access_token:ex.access_token, item_id:ex.item_id, institution:metadata.institution?.name||"Bank" };
              update(s=>({plaidTokens:[...(s.plaidTokens||[]), token]}));
            }
            await syncOne(token);
          } catch(e) { setPlaidError("Error importing data: "+e.message); }
          setPlaidLoading(false);
        },
        onExit: () => setPlaidLoading(false),
      }).open();
    } catch(e) { setPlaidError(e.message); setPlaidLoading(false); }
  };
  const disconnect = t => {
    if (!window.confirm(`Disconnect ${t.institution}? Its accounts stay in Ascend but stop updating.`)) return;
    update(s=>({
      plaidTokens:(s.plaidTokens||[]).filter(x=>x.item_id!==t.item_id),
      accounts:(s.accounts||[]).map(a=>a.itemId===t.item_id?{...a,linked:false,bankFields:[]}:a),
    }));
  };
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [newAcct, setNewAcct] = useState({name:"",institution:"",balance:"",limit:"",type:"checking"});
  const [newTxn, setNewTxn] = useState({date:new Date().toISOString().split("T")[0],description:"",amount:"",category:"",type:"expense"});
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [allMonths, setAllMonths] = useState(false);
  const [ruleNote, setRuleNote] = useState(null);
  const [aiQ, setAiQ] = useState("");
  const [aiResp, setAiResp] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [showCsv, setShowCsv] = useState(false);

  const txns = state.transactions || [];
  const accounts = state.accounts || [];
  const subs = state.subscriptions || [];

  const monthsWithData = [...new Set(txns.map(t=>monthKey(t.date)).filter(m=>/^\d{4}-\d{2}$/.test(m)))];
  const monthOptions = [...new Set([thisMonth(), ...monthsWithData])].sort().reverse();
  const [month, setMonth] = useState(()=>monthsWithData.includes(thisMonth())||!monthsWithData.length ? thisMonth() : monthsWithData.sort().pop());

  const { income:totalIncome, expenses:totalExpenses, net:netFlow, byCat:byCategory } = monthTotals(txns, month);
  const totalAssets = accounts.filter(a=>!isDebt(a)).reduce((s,a)=>s+(a.balance||0),0);
  const totalDebt = accounts.filter(isDebt).reduce((s,a)=>s+(a.balance||0),0);
  const netWorth = totalAssets - totalDebt;
  const util = utilization(accounts);
  const budgets = state.budgets||{};
  const budgetTotal = SPEND_CATS.reduce((s,c)=>s+(budgets[c]||0),0);
  const budgetSpent = SPEND_CATS.reduce((s,c)=>s+(byCategory[c]||0),0);
  const pieData = Object.entries(byCategory).map(([name,value])=>({name,value,color:CAT_COLORS[name]||C.muted})).sort((a,b)=>b.value-a.value);

  const addAccount = () => {
    if (!newAcct.name||!newAcct.balance) return;
    const a = {...newAcct,id:Date.now(),balance:parseFloat(newAcct.balance)||0,limit:parseFloat(newAcct.limit)||null};
    const ns = {...state,accounts:[...accounts,a]};
    setState(ns); saveState(ns);
    setNewAcct({name:"",institution:"",balance:"",limit:"",type:"checking"});
    setShowAddAcct(false);
  };

  const addTransaction = () => {
    if (!newTxn.description||!newTxn.amount) return;
    const amt = newTxn.type==="expense" ? -Math.abs(parseFloat(newTxn.amount)) : Math.abs(parseFloat(newTxn.amount));
    const t = {...newTxn,id:Date.now(),amount:amt,category:newTxn.category||autoCategorize(newTxn.description,amt,state.rules)};
    const ns = {...state,transactions:[...txns,t]};
    setState(ns); saveState(ns);
    setNewTxn({date:new Date().toISOString().split("T")[0],description:"",amount:"",category:"",type:"expense"});
    setShowAddTxn(false);
  };

  const importCsv = () => {
    const lines = csvText.trim().split(/\r?\n/).filter(l=>l.trim());
    if (lines.length && !/\d/.test(parseCsvLine(lines[0])[2]||"")) lines.shift(); // header row
    const newTxns = lines.map(l=>{
      const p = parseCsvLine(l);
      const amt = parseAmount(p[2]);
      return {id:Date.now()+Math.random(),date:normDate(p[0]||""),description:p[1],amount:amt,category:autoCategorize(p[1],amt,state.rules),type:amt>=0?"income":"expense"};
    }).filter(t=>t.description&&t.amount);
    const ns = {...state,transactions:[...txns,...newTxns]};
    setState(ns); saveState(ns);
    setCsvText(""); setShowCsv(false);
  };

  const addSub = () => {
    const name = prompt("Subscription name?");
    const amount = parseFloat(prompt("Monthly cost ($)?"));
    if (!name||isNaN(amount)) return;
    const ns = {...state,subscriptions:[...subs,{id:Date.now(),name,amount,status:"active",nextDate:""}]};
    setState(ns); saveState(ns);
  };

  const cancelSub = (id) => {
    const ns = {...state,subscriptions:subs.map(s=>s.id===id?{...s,status:"cancelled"}:s)};
    setState(ns); saveState(ns);
  };

  const recategorize = (t, category) => {
    const key = merchantKey(t.description);
    let others = 0;
    update(s=>({
      rules: {...(s.rules||{}), [key]:category},
      transactions: (s.transactions||[]).map(x=>{
        if (x.id===t.id) return {...x,category};
        if (merchantKey(x.description)===key && x.category!==category) { others++; return {...x,category}; }
        return x;
      }),
    }));
    setRuleNote(`"${t.description}" will always be ${category}${others?` — updated ${others} other transaction${others>1?"s":""}`:""}.`);
    setTimeout(()=>setRuleNote(null),4000);
  };

  const deleteTxn = (id) => {
    const ns = {...state,transactions:txns.filter(t=>t.id!==id)};
    setState(ns); saveState(ns);
  };

  const askAI = async () => {
    if (!aiQ.trim()||!apiKey) return;
    setAiLoading(true);
    try {
      const debtInfo = accounts.filter(isDebt).map(a=>({name:a.name,type:a.type,balance:a.balance,limit:a.limit,apr:a.apr,minPayment:a.minPayment}));
      const scores = Object.entries(state.reports||{}).map(([b,r])=>`${b}: ${r.score??"n/a"}`).join(", ");
      const context = `Month: ${monthLabel(month)}. Income: $${totalIncome.toFixed(0)}. Expenses: $${totalExpenses.toFixed(0)}. Net: $${netFlow.toFixed(0)}. Spending by category: ${JSON.stringify(byCategory)}. Budgets: ${JSON.stringify(budgets)}. Total assets: $${totalAssets.toFixed(0)}. Total debt: $${totalDebt.toFixed(0)}. Overall credit utilization: ${util.pct==null?"unknown":util.pct.toFixed(0)+"%"}. Debts: ${JSON.stringify(debtInfo)}. Credit scores: ${scores||"none uploaded"}. Goals: ${JSON.stringify(state.goals||[])}. Subscriptions: ${JSON.stringify(subs.filter(s=>s.status==="active"))}.`;
      const resp = await callClaude(apiKey,[{role:"user",content:`${context}\n\nUser: ${aiQ}`}],
        "You are a personal finance and credit coach helping someone control spending, raise their credit score, and build wealth. Be specific, actionable, and encouraging. Mention exact numbers from their data. Keep responses under 200 words.",800);
      setAiResp(resp);
    } catch(e) { setAiResp("Error: "+e.message); }
    setAiLoading(false);
  };

  const subViews = [["overview","Overview"],["budget","Budget"],["spending","Spending"],["cashflow","Cash Flow"],["transactions","Transactions"],["recurring","Recurring"],["debt","Credit & Debt"],["goals","Goals"],["coach","Coach"]];
  const monthViews = ["overview","budget","spending","cashflow","transactions"];

  return (
    <div>
      {/* Sub-navigation */}
      <div style={{display:"flex",gap:4,marginBottom:14,overflowX:"auto",paddingBottom:2}}>
        {subViews.map(([v,label])=>(
          <button key={v} onClick={()=>setView(v)} style={{
            padding:"6px 12px",borderRadius:20,border:"none",fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",
            background:view===v?C.ink:C.surfaceAlt,color:view===v?"#FFF":C.sub
          }}>{label}</button>
        ))}
      </div>

      {monthViews.includes(view) && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:12}}>
          <button onClick={()=>setMonth(m=>shiftMonth(m,-1))} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:14}}>‹</button>
          <select value={month} onChange={e=>setMonth(e.target.value)} style={{...inp,width:"auto",fontWeight:700,textAlign:"center"}}>
            {[...new Set([month,...monthOptions])].sort().reverse().map(m=><option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
          <button onClick={()=>setMonth(m=>shiftMonth(m,1))} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:14}}>›</button>
        </div>
      )}

      {view==="budget" && <BudgetView state={state} update={update} month={month}/>}
      {view==="cashflow" && <CashFlowView state={state} month={month}/>}
      {view==="recurring" && <RecurringView state={state} update={update}/>}
      {view==="goals" && <GoalsView state={state} update={update}/>}
      {view==="debt" && <DebtView state={state} update={update}/>}

      {/* OVERVIEW */}
      {view==="overview" && (
        <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            {[
              {label:"Income",val:money(totalIncome),color:C.pos,go:"cashflow"},
              {label:"Spending",val:money(totalExpenses),color:C.neg,go:"spending"},
              {label:"Net Cash Flow",val:`${netFlow>=0?"+":""}${money(netFlow)}`,color:netFlow>=0?C.pos:C.neg,go:"cashflow"},
              {label:"Net Worth",val:money(netWorth),color:netWorth>=0?C.blue:C.neg},
              {label:"Budget Left",val:budgetTotal?money(budgetTotal-budgetSpent):"Set up →",color:budgetTotal-budgetSpent>=0?C.pos:C.neg,go:"budget"},
              {label:"Credit Utilization",val:util.pct==null?"Add limits →":`${util.pct.toFixed(0)}%`,color:utilColor(util.pct),go:"debt"},
            ].map(m=>(
              <Card key={m.label} style={{textAlign:"center",padding:"12px 8px",cursor:m.go?"pointer":"default"}} onClick={m.go?()=>setView(m.go):undefined}>
                <div style={{fontSize:10,color:C.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>{m.label}</div>
                <div style={{fontSize:22,fontWeight:900,color:m.color}}>{m.val}</div>
              </Card>
            ))}
          </div>

          {/* Bank Linking */}
          <Card style={{marginBottom:12,borderLeft:`3px solid ${C.blue}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
              <div>
                <div style={{fontWeight:800,fontSize:15,marginBottom:4}}>🏦 Linked Banks & Cards</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Link through Plaid. Balances, limits, APRs, minimum payments, and statement & due dates update automatically.</div>
              </div>
              {(state.plaidTokens||[]).length>0 && <Btn variant="ghost" size="sm" onClick={syncAll} disabled={syncing}>{syncing?<><Spinner size={12} color={C.ink}/> Syncing</>:"🔄 Sync"}</Btn>}
            </div>
            {plaidError && <div style={{background:C.negLt,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.neg,marginBottom:10}}>{plaidError}</div>}
            {(state.plaidTokens||[]).map(t=>{
              const liab = t.liabilities;
              return (
                <div key={t.item_id||t.access_token} style={{padding:"8px 0",borderTop:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700}}>{t.institution}</div>
                      <div style={{fontSize:11,color:t.error?C.neg:C.muted}}>{t.error ? `⚠️ ${t.error}` : t.syncedAt ? `Synced ${timeAgo(t.syncedAt)}` : "Not synced yet"}</div>
                    </div>
                    <div style={{display:"flex",gap:4}}>
                      {t.error && <Btn variant="primary" size="sm" onClick={()=>openLink(t)}>Reconnect</Btn>}
                      <button onClick={()=>disconnect(t)} title="Disconnect" style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14}}>✕</button>
                    </div>
                  </div>
                  {!t.error && liab && liab!=="ok" && (
                    ["PRODUCTS_NOT_SUPPORTED","NO_LIABILITY_ACCOUNTS"].includes(liab)
                      ? <div style={{fontSize:11,color:C.muted,marginTop:4}}>This bank doesn't share card details, so enter APR and due day under Credit & Debt.</div>
                      : liab==="PRODUCT_NOT_READY"
                        ? <div style={{fontSize:11,color:C.muted,marginTop:4}}>Card details are still loading from your bank. They'll appear on the next sync.</div>
                        : <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginTop:6,background:C.goldLt,borderRadius:8,padding:"6px 10px"}}>
                            <span style={{fontSize:11,color:C.sub}}>Allow Ascend to read card limits, APRs & due dates</span>
                            <Btn variant="gold" size="sm" onClick={()=>openLink(t)}>Allow</Btn>
                          </div>
                  )}
                </div>
              );
            })}
            <Btn variant="blue" style={{width:"100%",background:C.blue,color:"#FFF",border:"none",marginTop:(state.plaidTokens||[]).length?8:0}} onClick={()=>openLink()} disabled={plaidLoading}>
              {plaidLoading ? <><Spinner size={14}/> Connecting…</> : "🔗 Link a Bank or Credit Card"}
            </Btn>
          </Card>

          {/* Accounts */}
          <Card style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontWeight:800,fontSize:15}}>💳 Accounts</div>
              <Btn variant="ghost" size="sm" onClick={()=>setShowAddAcct(s=>!s)}>+ Manual</Btn>
            </div>
            {showAddAcct && (
              <div style={{background:C.surfaceAlt,borderRadius:10,padding:12,marginBottom:10}}>
                {[{k:"name",p:"Account name"},{k:"institution",p:"Bank name"},{k:"balance",p:"Balance ($)",t:"number"}].map(f=>(
                  <input key={f.k} type={f.t||"text"} value={newAcct[f.k]} onChange={e=>setNewAcct(n=>({...n,[f.k]:e.target.value}))}
                    placeholder={f.p} style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:6,background:"#FFF"}}/>
                ))}
                <select value={newAcct.type} onChange={e=>setNewAcct(n=>({...n,type:e.target.value}))}
                  style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:8}}>
                  <option value="checking">Checking</option><option value="savings">Savings</option>
                  <option value="credit">Credit Card</option><option value="loan">Loan</option><option value="investment">Investment</option>
                </select>
                {newAcct.type==="credit" && (
                  <input type="number" value={newAcct.limit} onChange={e=>setNewAcct(n=>({...n,limit:e.target.value}))} placeholder="Credit limit ($) — needed for utilization" style={{...inp,marginBottom:8}}/>
                )}
                <div style={{display:"flex",gap:6}}>
                  <Btn variant="primary" size="sm" style={{flex:1}} onClick={addAccount}>Save</Btn>
                  <Btn variant="ghost" size="sm" onClick={()=>setShowAddAcct(false)}>Cancel</Btn>
                </div>
              </div>
            )}
            {accounts.length===0 && <div style={{fontSize:13,color:C.muted,textAlign:"center",padding:"12px 0"}}>No accounts yet — add your first account above</div>}
            {accounts.map(a=>(
              <div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>{a.name}</div>
                  <div style={{fontSize:11,color:C.muted}}>{a.institution} · {a.type}{a.linked?" · 🔗 live":""}</div>
                </div>
                <div style={{fontWeight:800,fontSize:15,color:a.type==="credit"||a.type==="loan"?C.neg:C.pos}}>
                  {a.type==="credit"||a.type==="loan"?"-":""}${(a.balance||0).toLocaleString()}
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* SPENDING */}
      {view==="spending" && (
        <>
          <Card style={{marginBottom:12,textAlign:"center"}}>
            <div style={{fontWeight:800,fontSize:15,marginBottom:12}}>Spending Breakdown</div>
            {pieData.length > 0 ? (
              <>
                <PieChart data={pieData} size={180}/>
                <div style={{marginTop:12}}>
                  {pieData.map((d,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:i<pieData.length-1?`1px solid ${C.border}`:"none"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:10,height:10,borderRadius:2,background:d.color}}/>
                        <span style={{fontSize:13}}>{d.name}</span>
                      </div>
                      <div style={{display:"flex",gap:12}}>
                        <span style={{fontSize:13,color:C.muted}}>{((d.value/totalExpenses)*100).toFixed(1)}%</span>
                        <span style={{fontSize:13,fontWeight:700}}>${d.value.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{fontSize:13,color:C.muted,padding:"20px 0"}}>Add transactions to see your spending breakdown</div>
            )}
          </Card>

          {/* Income vs Expenses */}
          <Card style={{marginBottom:12}}>
            <div style={{fontWeight:800,fontSize:15,marginBottom:12}}>💰 Income vs Expenses</div>
            {[
              {label:"Total Income",val:totalIncome,color:C.pos,pct:100},
              {label:"Total Expenses",val:totalExpenses,color:C.neg,pct:totalIncome>0?(totalExpenses/totalIncome)*100:0},
              {label:"Net Savings",val:netFlow,color:netFlow>=0?C.pos:C.neg,pct:totalIncome>0?(Math.abs(netFlow)/totalIncome)*100:0},
            ].map(r=>(
              <div key={r.label} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13}}>{r.label}</span>
                  <span style={{fontSize:13,fontWeight:700,color:r.color}}>${r.val.toLocaleString()}</span>
                </div>
                <div style={{background:C.surfaceAlt,borderRadius:99,height:6,overflow:"hidden"}}>
                  <div style={{width:`${Math.min(r.pct,100)}%`,height:"100%",background:r.color,borderRadius:99}}/>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* TRANSACTIONS */}
      {view==="transactions" && (
        <Card style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontWeight:800,fontSize:15}}>Transactions</div>
            <div style={{display:"flex",gap:6}}>
              <Btn variant="ghost" size="sm" onClick={()=>setShowCsv(s=>!s)}>📥 CSV</Btn>
              <Btn variant="primary" size="sm" onClick={()=>setShowAddTxn(s=>!s)}>+ Add</Btn>
            </div>
          </div>

          {showCsv && (
            <div style={{background:C.surfaceAlt,borderRadius:10,padding:12,marginBottom:10}}>
              <div style={{fontSize:12,color:C.muted,marginBottom:6}}>Paste CSV: Date, Description, Amount</div>
              <textarea value={csvText} onChange={e=>setCsvText(e.target.value)} rows={4}
                placeholder={"2024-01-15,Grocery Store,-45.23\n2024-01-16,Paycheck,2500.00"}
                style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",fontSize:12,fontFamily:"monospace",outline:"none",boxSizing:"border-box",marginBottom:8,resize:"vertical"}}/>
              <div style={{display:"flex",gap:6}}>
                <Btn variant="primary" size="sm" style={{flex:1}} onClick={importCsv}>Import</Btn>
                <Btn variant="ghost" size="sm" onClick={()=>setShowCsv(false)}>Cancel</Btn>
              </div>
            </div>
          )}

          {showAddTxn && (
            <div style={{background:C.surfaceAlt,borderRadius:10,padding:12,marginBottom:10}}>
              <input type="date" value={newTxn.date} onChange={e=>setNewTxn(n=>({...n,date:e.target.value}))}
                style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:6}}/>
              <input type="text" value={newTxn.description} onChange={e=>setNewTxn(n=>({...n,description:e.target.value}))}
                placeholder="Description" style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:6}}/>
              <input type="number" value={newTxn.amount} onChange={e=>setNewTxn(n=>({...n,amount:e.target.value}))}
                placeholder="Amount" style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:6}}/>
              <div style={{display:"flex",gap:6,marginBottom:6}}>
                <select value={newTxn.type} onChange={e=>setNewTxn(n=>({...n,type:e.target.value}))}
                  style={{flex:1,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"inherit",outline:"none"}}>
                  <option value="expense">Expense</option><option value="income">Income</option>
                </select>
                <select value={newTxn.category} onChange={e=>setNewTxn(n=>({...n,category:e.target.value}))}
                  style={{flex:2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"inherit",outline:"none"}}>
                  <option value="">Auto-detect category</option>
                  {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{display:"flex",gap:6}}>
                <Btn variant="primary" size="sm" style={{flex:1}} onClick={addTransaction}>Save</Btn>
                <Btn variant="ghost" size="sm" onClick={()=>setShowAddTxn(false)}>Cancel</Btn>
              </div>
            </div>
          )}

          <div style={{display:"flex",gap:6,marginBottom:6}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search" style={{...inp,flex:2}}/>
            <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{...inp,flex:1}}>
              <option value="">All categories</option>
              {CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.sub,marginBottom:8}}>
            <input type="checkbox" checked={allMonths} onChange={e=>setAllMonths(e.target.checked)}/> Show all months
          </label>
          {ruleNote && <div style={{background:C.posLt,color:C.pos,borderRadius:8,padding:"8px 12px",fontSize:12,marginBottom:8}}>✓ {ruleNote}</div>}
          {(()=>{
            const shown = txns
              .filter(t=>allMonths||monthKey(t.date)===month)
              .filter(t=>!catFilter||t.category===catFilter)
              .filter(t=>!search||(t.description||"").toLowerCase().includes(search.toLowerCase()))
              .sort((a,b)=>(b.date||"").localeCompare(a.date||""));
            const total = shown.reduce((s,t)=>s+t.amount,0);
            return (<>
              {txns.length===0 && <div style={{fontSize:13,color:C.muted,textAlign:"center",padding:"20px 0"}}>No transactions yet</div>}
              {txns.length>0 && <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{shown.length} transactions · net {money(total,2)} · change a category to teach Ascend that merchant</div>}
              {shown.slice(0,200).map(t=>(
            <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{t.description}</div>
                <div style={{display:"flex",gap:6,marginTop:2}}>
                  <span style={{fontSize:11,color:C.muted}}>{t.date}</span>
                  <select value={t.category||"Other"} onChange={e=>recategorize(t,e.target.value)}
                    style={{fontSize:11,background:C.surfaceAlt,border:"none",borderRadius:4,padding:"1px 4px",color:CAT_COLORS[t.category]||C.muted,fontWeight:600,fontFamily:"inherit",cursor:"pointer"}}>
                    {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontWeight:700,fontSize:14,color:t.amount>=0?C.pos:C.neg}}>
                  {t.amount>=0?"+":"-"}${Math.abs(t.amount).toLocaleString()}
                </span>
                <button onClick={()=>deleteTxn(t.id)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14}}>✕</button>
              </div>
            </div>
              ))}
            </>);
          })()}
        </Card>
      )}

      {/* AI COACH */}
      {view==="coach" && (
        <Card style={{marginBottom:12}}>
          <div style={{fontWeight:800,fontSize:15,marginBottom:4}}>🤖 Financial Coach</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Ask about budgeting, investing, debt payoff, or how to make your money work harder</div>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <input value={aiQ} onChange={e=>setAiQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!aiLoading&&askAI()}
              placeholder="e.g. How should I use my extra $200/month?"
              style={{flex:1,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",fontSize:14,fontFamily:"inherit",outline:"none",background:C.surfaceAlt}}/>
            <Btn variant="gold" size="sm" onClick={askAI} disabled={aiLoading||!aiQ.trim()}>
              {aiLoading?<Spinner size={14}/>:"Ask"}
            </Btn>
          </div>
          {aiResp && (
            <div style={{background:C.surfaceAlt,borderRadius:10,padding:14,fontSize:13,color:C.ink,lineHeight:1.8}}>
              {aiResp}
            </div>
          )}
          <div style={{marginTop:12,display:"flex",flexWrap:"wrap",gap:6}}>
            {["Where am I wasting the most money?","How do I raise my credit score fastest?","Which card should I pay off first?","Is my budget realistic?"].map(q=>(
              <button key={q} onClick={()=>{setAiQ(q);}} style={{background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:20,padding:"6px 12px",fontSize:12,cursor:"pointer",color:C.sub,fontFamily:"inherit"}}>
                {q}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── MONEY HELPERS ────────────────────────────────────────────
const SPEND_CATS = CATS.filter(c=>c!=="Income"&&c!=="Transfer");
const inp = {width:"100%",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",background:"#FFF"};
const money = (n, d=0) => `${n<0?"-":""}$${Math.abs(n||0).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d})}`;
const pad2 = n => String(n).padStart(2,"0");
const ordinal = n => { const sfx=["th","st","nd","rd"], v=n%100; return n+(sfx[(v-20)%10]||sfx[v]||sfx[0]); };
const thisMonth = () => { const d=new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}`; };
const monthKey = d => (d||"").slice(0,7);
const monthLabel = k => { const [y,m]=k.split("-").map(Number); return new Date(y,m-1,1).toLocaleDateString("en-US",{month:"short",year:"numeric"}); };
const shiftMonth = (k, n) => { const [y,m]=k.split("-").map(Number); const d=new Date(y,m-1+n,1); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}`; };
const timeAgo = iso => { const m=Math.round((Date.now()-new Date(iso).getTime())/60000); return m<1?"just now":m<60?`${m} min ago`:m<1440?`${Math.round(m/60)} hr ago`:`${Math.round(m/1440)} days ago`; };
const daysUntilDate = iso => { if (!iso) return null; const [y,m,d]=iso.split("-").map(Number); const now=new Date(); return Math.round((new Date(y,m-1,d)-new Date(now.getFullYear(),now.getMonth(),now.getDate()))/86400000); };
const shortDate = iso => { const [y,m,d]=iso.split("-").map(Number); return new Date(y,m-1,d).toLocaleDateString("en-US",{month:"short",day:"numeric"}); };
const isExpense = t => t.amount<0 && t.category!=="Transfer";
const isIncome = t => t.amount>0 && t.category!=="Transfer";
const isDebt = a => a.type==="credit"||a.type==="loan";
const merchantKey = s => (s||"").toLowerCase().replace(/[0-9#*]+/g," ").replace(/\s+/g," ").trim();
const KEYWORDS = [
  ["Transfer",/transfer|zelle|venmo|cash app|payment thank|autopay|card payment/],
  ["Dining",/restaurant|cafe|coffee|starbucks|mcdonald|chipotle|pizza|burger|doordash|uber eats|grubhub|taco|dunkin|chick-fil|wendy|subway/],
  ["Groceries",/grocer|safeway|kroger|whole foods|trader joe|aldi|publix|wegmans|costco|sprouts|food lion|walmart/],
  ["Subscriptions",/netflix|spotify|hulu|disney|apple\.com|icloud|prime video|youtube|hbo|patreon|adobe|subscription/],
  ["Transportation",/uber|lyft|shell|chevron|exxon|sunoco|fuel|gas station|parking|toll|transit|metro/],
  ["Housing",/rent|mortgage|hoa|apartment|electric|water|utility|comcast|xfinity|verizon|at&t|t-mobile|spectrum/],
  ["Healthcare",/pharmacy|cvs|walgreens|doctor|dental|medical|clinic|hospital/],
  ["Entertainment",/movie|cinema|theater|ticket|steam|playstation|xbox|concert/],
  ["Income",/payroll|direct dep|salary|paycheck/],
];
function autoCategorize(desc, amount, rules={}) {
  const k = merchantKey(desc);
  if (rules[k]) return rules[k];
  for (const [cat,re] of KEYWORDS) {
    if (!re.test(k)) continue;
    if (cat==="Income" && amount<0) continue;
    return cat;
  }
  return amount>0 ? "Income" : "Other";
}
function parseCsvLine(line) {
  const out=[]; let cur="", q=false;
  for (const ch of line) { if (ch==='"') q=!q; else if (ch===","&&!q) { out.push(cur); cur=""; } else cur+=ch; }
  out.push(cur); return out.map(s=>s.trim());
}
function normDate(s) {
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  const d = new Date(s); return isNaN(d) ? s : `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function parseAmount(s) {
  const neg = /^\(.*\)$/.test(s||"");
  const n = parseFloat((s||"").replace(/[$,()\s]/g,""));
  return isNaN(n) ? 0 : (neg ? -Math.abs(n) : n);
}
function monthTotals(txns, month) {
  const inM = txns.filter(t=>monthKey(t.date)===month);
  const income = inM.filter(isIncome).reduce((s,t)=>s+t.amount,0);
  const expenses = inM.filter(isExpense).reduce((s,t)=>s+Math.abs(t.amount),0);
  const byCat = {};
  inM.filter(isExpense).forEach(t=>{ const c=t.category||"Other"; byCat[c]=(byCat[c]||0)+Math.abs(t.amount); });
  return { income, expenses, net:income-expenses, byCat };
}
function utilization(accounts) {
  const cards = accounts.filter(a=>a.type==="credit"&&a.limit>0);
  const bal = cards.reduce((s,a)=>s+Math.max(a.balance||0,0),0);
  const lim = cards.reduce((s,a)=>s+a.limit,0);
  return { cards, bal, lim, pct: lim ? bal/lim*100 : null };
}
const utilColor = p => p==null?C.muted : p<10?C.pos : p<30?C.gold : C.neg;
function daysUntilDay(day) {
  if (!day) return null;
  const now = new Date(); const today = new Date(now.getFullYear(),now.getMonth(),now.getDate());
  let d = new Date(now.getFullYear(), now.getMonth(), Math.min(day,28));
  if (d < today) d = new Date(now.getFullYear(), now.getMonth()+1, Math.min(day,28));
  return Math.round((d-today)/86400000);
}
function simulatePayoff(debts, extra, strategy) {
  const ds = debts.map(d=>({...d, bal:d.balance}));
  let month=0, interest=0; const order=[];
  while (ds.some(d=>d.bal>0.01) && month<600) {
    month++;
    ds.forEach(d=>{ if (d.bal>0) { const i=d.bal*(d.apr||0)/1200; d.bal+=i; interest+=i; } });
    let pool = extra;
    ds.forEach(d=>{ if (d.bal>0) { const p=Math.min(d.bal,d.min); d.bal-=p; pool+=d.min-p; } else pool+=d.min; });
    const targets = ds.filter(d=>d.bal>0.01).sort(strategy==="avalanche" ? (a,b)=>(b.apr||0)-(a.apr||0) : (a,b)=>a.bal-b.bal);
    for (const t of targets) { if (pool<=0) break; const p=Math.min(pool,t.bal); t.bal-=p; pool-=p; }
    ds.forEach(d=>{ if (d.bal<=0.01 && !order.find(o=>o.id===d.id)) { d.bal=0; order.push({id:d.id,name:d.name,month}); } });
  }
  return { months:month, interest, order, never: ds.some(d=>d.bal>0.01) };
}
function detectRecurring(txns, subs) {
  const groups = {};
  txns.filter(isExpense).forEach(t=>{ const k=merchantKey(t.description); if (k) (groups[k]=groups[k]||[]).push(t); });
  const existing = new Set(subs.map(s=>merchantKey(s.name)));
  return Object.entries(groups).map(([key,ts])=>{
    const months = new Set(ts.map(t=>monthKey(t.date)));
    const amts = ts.map(t=>Math.abs(t.amount));
    const avg = amts.reduce((a,b)=>a+b,0)/amts.length;
    const consistent = amts.every(a=>Math.abs(a-avg)<=Math.max(2,avg*0.15));
    const last = ts.map(t=>t.date).sort().pop()||"";
    return { key, name:ts[0].description, avg, months:months.size, consistent, dueDay:parseInt(last.slice(8,10))||1 };
  }).filter(g=>g.months>=2&&g.consistent&&!existing.has(g.key)).sort((a,b)=>b.avg-a.avg).slice(0,8);
}
function Bar({ pct, color, height=8, marks=[] }) {
  return (
    <div style={{background:C.surfaceAlt,borderRadius:99,height,overflow:"hidden",position:"relative"}}>
      <div style={{width:`${Math.min(Math.max(pct,0),100)}%`,height:"100%",background:color,borderRadius:99}}/>
      {marks.map(m=><div key={m} style={{position:"absolute",top:0,left:`${m}%`,width:1.5,height:"100%",background:C.sub,opacity:.5}}/>)}
    </div>
  );
}
function SectionTitle({ children, sub }) {
  return <div style={{marginBottom:12}}><div style={{fontWeight:800,fontSize:15}}>{children}</div>{sub&&<div style={{fontSize:12,color:C.muted,marginTop:2}}>{sub}</div>}</div>;
}

// ─── BUDGET VIEW ──────────────────────────────────────────────
function BudgetView({ state, update, month }) {
  const budgets = state.budgets || {};
  const txns = state.transactions || [];
  const { income, byCat } = monthTotals(txns, month);
  const totalBudget = SPEND_CATS.reduce((s,c)=>s+(budgets[c]||0),0);
  const totalSpent = SPEND_CATS.reduce((s,c)=>s+(byCat[c]||0),0);
  const left = totalBudget - totalSpent;
  const isCurrent = month===thisMonth();
  const now = new Date();
  const daysLeft = isCurrent ? new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-now.getDate()+1 : 0;

  const setBudget = (cat, val) => update(s=>({budgets:{...(s.budgets||{}),[cat]:Math.max(parseFloat(val)||0,0)}}));
  const suggest = () => {
    const prev = [1,2,3].map(n=>monthTotals(txns, shiftMonth(month,-n))).filter(m=>m.expenses>0);
    if (!prev.length) { alert("Need at least one earlier month of transactions to suggest budgets."); return; }
    const b = {};
    SPEND_CATS.forEach(c=>{ const avg=prev.reduce((s,m)=>s+(m.byCat[c]||0),0)/prev.length; if (avg>0) b[c]=Math.ceil(avg/10)*10; });
    update(()=>({budgets:b}));
  };

  return (
    <>
      <Card style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:".5px"}}>Left to spend · {monthLabel(month)}</div>
            <div style={{fontSize:32,fontWeight:900,color:left>=0?C.pos:C.neg,letterSpacing:"-1px"}}>{money(left)}</div>
            <div style={{fontSize:12,color:C.sub}}>{money(totalSpent)} spent of {money(totalBudget)} budgeted</div>
            {isCurrent && left>0 && <div style={{fontSize:12,color:C.blue,marginTop:4}}>≈ {money(left/daysLeft)}/day for the next {daysLeft} days</div>}
          </div>
          <Btn variant="ghost" size="sm" onClick={suggest}>✨ Suggest</Btn>
        </div>
        <div style={{marginTop:12}}><Bar pct={totalBudget?totalSpent/totalBudget*100:0} color={totalSpent>totalBudget?C.neg:C.pos} height={10}/></div>
        {income>0 && (
          <div style={{fontSize:12,color:C.sub,marginTop:10}}>
            Income this month: <strong style={{color:C.pos}}>{money(income)}</strong> ·
            {income-totalBudget>=0
              ? <> <strong>{money(income-totalBudget)}</strong> unbudgeted — give it a job (savings, debt, goals)</>
              : <span style={{color:C.neg}}> budget exceeds income by <strong>{money(totalBudget-income)}</strong></span>}
          </div>
        )}
      </Card>
      <Card style={{marginBottom:12}}>
        <SectionTitle sub="Set a monthly limit for each category. Tap ✨ Suggest to fill from your last 3 months.">📋 Category Budgets</SectionTitle>
        {SPEND_CATS.map(c=>{
          const spent = byCat[c]||0, b = budgets[c]||0;
          const pct = b ? spent/b*100 : (spent?100:0);
          const color = !b ? C.muted : pct>100 ? C.neg : pct>80 ? C.gold : C.pos;
          return (
            <div key={c} style={{padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                  <div style={{width:10,height:10,borderRadius:2,background:CAT_COLORS[c]}}/>
                  <span style={{fontSize:13,fontWeight:600}}>{c}</span>
                </div>
                <span style={{fontSize:12,color:pct>100?C.neg:C.sub}}>{money(spent)} /</span>
                <input type="number" inputMode="decimal" defaultValue={b||""} key={`${c}-${b}`} placeholder="0" onBlur={e=>setBudget(c,e.target.value)}
                  style={{...inp,width:84,padding:"5px 8px",textAlign:"right"}}/>
              </div>
              <Bar pct={pct} color={color} height={6}/>
              {b>0 && pct>100 && <div style={{fontSize:11,color:C.neg,marginTop:4}}>Over by {money(spent-b)}</div>}
            </div>
          );
        })}
      </Card>
    </>
  );
}

// ─── CASH FLOW VIEW ───────────────────────────────────────────
function CashFlowView({ state, month }) {
  const txns = state.transactions || [];
  const months = [-5,-4,-3,-2,-1,0].map(n=>shiftMonth(month,n));
  const data = months.map(m=>({ m, ...monthTotals(txns,m) }));
  const max = Math.max(1, ...data.map(d=>Math.max(d.income,d.expenses)));
  const withData = data.filter(d=>d.income||d.expenses);
  const avgIncome = withData.length ? withData.reduce((s,d)=>s+d.income,0)/withData.length : 0;
  const avgExp = withData.length ? withData.reduce((s,d)=>s+d.expenses,0)/withData.length : 0;
  const rate = avgIncome ? (avgIncome-avgExp)/avgIncome*100 : null;
  return (
    <>
      <Card style={{marginBottom:12}}>
        <SectionTitle sub="Last 6 months · transfers excluded">📈 Cash Flow</SectionTitle>
        <div style={{display:"flex",alignItems:"flex-end",gap:6,height:150,marginBottom:6}}>
          {data.map(d=>(
            <div key={d.m} style={{flex:1,display:"flex",alignItems:"flex-end",justifyContent:"center",gap:2,height:"100%"}}>
              <div title={`Income ${money(d.income)}`} style={{width:"40%",height:`${d.income/max*100}%`,background:C.pos,borderRadius:"4px 4px 0 0",minHeight:d.income?2:0}}/>
              <div title={`Expenses ${money(d.expenses)}`} style={{width:"40%",height:`${d.expenses/max*100}%`,background:C.neg,borderRadius:"4px 4px 0 0",minHeight:d.expenses?2:0}}/>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:6}}>
          {data.map(d=><div key={d.m} style={{flex:1,textAlign:"center",fontSize:10,color:d.m===month?C.ink:C.muted,fontWeight:d.m===month?800:400}}>{monthLabel(d.m).split(" ")[0]}</div>)}
        </div>
        <div style={{display:"flex",gap:14,justifyContent:"center",marginTop:10,fontSize:11,color:C.sub}}>
          <span><span style={{display:"inline-block",width:8,height:8,background:C.pos,borderRadius:2,marginRight:4}}/>Income</span>
          <span><span style={{display:"inline-block",width:8,height:8,background:C.neg,borderRadius:2,marginRight:4}}/>Expenses</span>
        </div>
      </Card>
      <Card style={{marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center",marginBottom:12}}>
          <div><div style={{fontSize:10,color:C.muted}}>AVG INCOME</div><div style={{fontWeight:800,color:C.pos}}>{money(avgIncome)}</div></div>
          <div><div style={{fontSize:10,color:C.muted}}>AVG SPEND</div><div style={{fontWeight:800,color:C.neg}}>{money(avgExp)}</div></div>
          <div><div style={{fontSize:10,color:C.muted}}>SAVINGS RATE</div><div style={{fontWeight:800,color:rate==null?C.muted:rate>=20?C.pos:rate>=0?C.gold:C.neg}}>{rate==null?"—":`${rate.toFixed(0)}%`}</div></div>
        </div>
        {[...data].reverse().map(d=>(
          <div key={d.m} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderTop:`1px solid ${C.border}`,fontSize:13}}>
            <span style={{fontWeight:600}}>{monthLabel(d.m)}</span>
            <span style={{color:C.muted}}>{money(d.income)} in · {money(d.expenses)} out</span>
            <span style={{fontWeight:800,color:d.net>=0?C.pos:C.neg}}>{d.net>=0?"+":""}{money(d.net)}</span>
          </div>
        ))}
      </Card>
    </>
  );
}

// ─── RECURRING VIEW ───────────────────────────────────────────
function RecurringView({ state, update }) {
  const subs = state.subscriptions || [];
  const [form, setForm] = useState(null);
  const detected = detectRecurring(state.transactions||[], subs);
  const active = subs.filter(s=>s.status==="active");
  const monthly = active.reduce((a,s)=>a+s.amount,0);
  const cardDue = (state.accounts||[]).filter(a=>isDebt(a)&&a.nextDueDate&&daysUntilDate(a.nextDueDate)>=0)
    .map(a=>({id:`acct-${a.id}`,name:`💳 ${a.name} payment`,amount:a.minPayment||0,days:daysUntilDate(a.nextDueDate)}));
  const upcoming = [...active.filter(s=>s.dueDay).map(s=>({...s,days:daysUntilDay(s.dueDay)})), ...cardDue].sort((a,b)=>a.days-b.days);
  const add = s => update(st=>({subscriptions:[...(st.subscriptions||[]),{id:Date.now()+Math.random(),status:"active",...s}]}));
  const setStatus = (id,status) => update(st=>({subscriptions:(st.subscriptions||[]).map(s=>s.id===id?{...s,status}:s)}));
  const remove = id => update(st=>({subscriptions:(st.subscriptions||[]).filter(s=>s.id!==id)}));
  const save = () => {
    const amount = parseFloat(form.amount);
    if (!form.name || isNaN(amount)) return;
    add({ name:form.name, amount, dueDay:parseInt(form.dueDay)||null });
    setForm(null);
  };
  return (
    <>
      <Card style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <SectionTitle sub={<>Active: <strong style={{color:C.neg}}>{money(monthly)}/mo</strong> · {money(monthly*12)}/yr</>}>🔁 Bills & Subscriptions</SectionTitle>
          <Btn variant="primary" size="sm" onClick={()=>setForm(form?null:{name:"",amount:"",dueDay:""})}>+ Add</Btn>
        </div>
        {form && (
          <div style={{background:C.surfaceAlt,borderRadius:10,padding:12,marginBottom:10}}>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name (e.g. Netflix, Car insurance)" style={{...inp,marginBottom:6}}/>
            <div style={{display:"flex",gap:6,marginBottom:8}}>
              <input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="Monthly $" style={inp}/>
              <input type="number" min="1" max="31" value={form.dueDay} onChange={e=>setForm({...form,dueDay:e.target.value})} placeholder="Due day (1-31)" style={inp}/>
            </div>
            <div style={{display:"flex",gap:6}}>
              <Btn variant="primary" size="sm" style={{flex:1}} onClick={save}>Save</Btn>
              <Btn variant="ghost" size="sm" onClick={()=>setForm(null)}>Cancel</Btn>
            </div>
          </div>
        )}
        {subs.length===0 && <div style={{fontSize:13,color:C.muted,textAlign:"center",padding:"16px 0"}}>Nothing tracked yet</div>}
        {subs.map(s=>(
          <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`,opacity:s.status==="cancelled"?.5:1}}>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>{s.name}</div>
              <div style={{fontSize:12,color:C.muted}}>{money(s.amount,2)}/mo{s.dueDay?` · due on the ${ordinal(s.dueDay)}`:""} · {s.status==="active"?"Active":"Cancelled"}</div>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {s.status==="active"
                ? <Btn variant="danger" size="sm" onClick={()=>setStatus(s.id,"cancelled")}>Cancel</Btn>
                : <Btn variant="ghost" size="sm" onClick={()=>remove(s.id)}>Remove</Btn>}
            </div>
          </div>
        ))}
      </Card>

      {upcoming.length>0 && (
        <Card style={{marginBottom:12}}>
          <SectionTitle sub="Paying on time is 35% of your FICO score — never miss one.">📅 Coming Up</SectionTitle>
          {upcoming.slice(0,6).map(s=>(
            <div key={s.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:13}}>
              <span>{s.name}</span>
              <span style={{color:s.days<=3?C.neg:C.sub,fontWeight:s.days<=3?700:400}}>{s.days===0?"Today":s.days===1?"Tomorrow":`in ${s.days} days`} · {money(s.amount,2)}</span>
            </div>
          ))}
        </Card>
      )}

      {detected.length>0 && (
        <Card style={{marginBottom:12,borderLeft:`3px solid ${C.purple}`}}>
          <SectionTitle sub="These charges repeat month after month in your transactions.">🔍 Found Recurring Charges</SectionTitle>
          {detected.map(d=>(
            <div key={d.key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{d.name}</div>
                <div style={{fontSize:11,color:C.muted}}>~{money(d.avg,2)} · seen in {d.months} months</div>
              </div>
              <Btn variant="ghost" size="sm" onClick={()=>add({name:d.name,amount:Math.round(d.avg*100)/100,dueDay:d.dueDay})}>+ Track</Btn>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}

// ─── GOALS VIEW ───────────────────────────────────────────────
function GoalsView({ state, update }) {
  const goals = state.goals || [];
  const [form, setForm] = useState(null);
  const save = () => {
    const target = parseFloat(form.target);
    if (!form.name || !target) return;
    update(s=>({goals:[...(s.goals||[]),{id:Date.now(),name:form.name,target,saved:parseFloat(form.saved)||0,date:form.date||""}]}));
    setForm(null);
  };
  const contribute = g => {
    const amt = parseFloat(prompt(`Add how much to "${g.name}"? (negative to withdraw)`));
    if (isNaN(amt)) return;
    update(s=>({goals:(s.goals||[]).map(x=>x.id===g.id?{...x,saved:Math.max(0,x.saved+amt)}:x)}));
  };
  const remove = id => { if (window.confirm("Delete this goal?")) update(s=>({goals:(s.goals||[]).filter(g=>g.id!==id)})); };
  const presets = [
    {name:"Emergency fund (1 month)",target:1000},
    {name:"Pay off a credit card",target:500},
    {name:"Secured card deposit",target:300},
  ];
  return (
    <Card style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <SectionTitle sub="Save toward what matters. An emergency fund keeps you from missing payments.">🎯 Goals</SectionTitle>
        <Btn variant="primary" size="sm" onClick={()=>setForm(form?null:{name:"",target:"",saved:"",date:""})}>+ Add</Btn>
      </div>
      {form && (
        <div style={{background:C.surfaceAlt,borderRadius:10,padding:12,marginBottom:10}}>
          <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Goal name" style={{...inp,marginBottom:6}}/>
          <div style={{display:"flex",gap:6,marginBottom:6}}>
            <input type="number" value={form.target} onChange={e=>setForm({...form,target:e.target.value})} placeholder="Target $" style={inp}/>
            <input type="number" value={form.saved} onChange={e=>setForm({...form,saved:e.target.value})} placeholder="Saved so far $" style={inp}/>
          </div>
          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Target date (optional)</div>
          <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={{...inp,marginBottom:8}}/>
          <div style={{display:"flex",gap:6}}>
            <Btn variant="primary" size="sm" style={{flex:1}} onClick={save}>Save</Btn>
            <Btn variant="ghost" size="sm" onClick={()=>setForm(null)}>Cancel</Btn>
          </div>
        </div>
      )}
      {goals.length===0 && !form && (
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {presets.map(p=>(
            <button key={p.name} onClick={()=>setForm({name:p.name,target:String(p.target),saved:"",date:""})}
              style={{background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:20,padding:"6px 12px",fontSize:12,cursor:"pointer",color:C.sub,fontFamily:"inherit"}}>+ {p.name}</button>
          ))}
        </div>
      )}
      {goals.map(g=>{
        const pct = g.target ? g.saved/g.target*100 : 0;
        let perMonth = null;
        if (g.date && g.saved<g.target) {
          const months = Math.max(1, Math.round((new Date(g.date)-new Date())/(30.44*86400000)));
          perMonth = (g.target-g.saved)/months;
        }
        return (
          <div key={g.id} style={{padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontWeight:700,fontSize:14}}>{pct>=100?"🎉 ":""}{g.name}</div>
              <div style={{display:"flex",gap:6}}>
                <Btn variant="ghost" size="sm" onClick={()=>contribute(g)}>+ $</Btn>
                <button onClick={()=>remove(g.id)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer"}}>✕</button>
              </div>
            </div>
            <Bar pct={pct} color={pct>=100?C.pos:C.blue} height={8}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.sub,marginTop:4}}>
              <span>{money(g.saved)} of {money(g.target)} ({Math.min(pct,100).toFixed(0)}%)</span>
              {perMonth!=null && <span style={{color:C.blue}}>{money(perMonth)}/mo to hit {new Date(g.date+"T00:00").toLocaleDateString("en-US",{month:"short",year:"numeric"})}</span>}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

// ─── DEBT & UTILIZATION VIEW ──────────────────────────────────
function DebtView({ state, update }) {
  const accounts = state.accounts || [];
  const debts = accounts.filter(isDebt);
  const [extra, setExtra] = useState(state.extraPayment||100);
  const [strategy, setStrategy] = useState("avalanche");
  const u = utilization(accounts);
  const setField = (id, field, val) => update(s=>({accounts:(s.accounts||[]).map(a=>a.id===id?{...a,[field]:val===""?null:parseFloat(val)}:a)}));

  const simDebts = debts.filter(d=>(d.balance||0)>0).map(d=>({id:d.id,name:d.name,balance:d.balance,apr:d.apr||0,min:d.minPayment||Math.max(25,Math.round(d.balance*0.02))}));
  const plan = simDebts.length ? simulatePayoff(simDebts, parseFloat(extra)||0, strategy) : null;
  const base = simDebts.length ? simulatePayoff(simDebts, 0, strategy) : null;
  const totalMin = simDebts.reduce((s,d)=>s+d.min,0);
  const freeDate = m => { const d=new Date(); d.setMonth(d.getMonth()+m); return d.toLocaleDateString("en-US",{month:"short",year:"numeric"}); };

  return (
    <>
      <Card style={{marginBottom:12}}>
        <SectionTitle sub="Credit utilization is ~30% of your score. Under 30% is good, under 10% is best.">💳 Credit Utilization</SectionTitle>
        {u.cards.length===0 ? (
          <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>Add a credit card account with its <strong>credit limit</strong> below (or connect your bank) to track utilization.</div>
        ) : (
          <>
            <div style={{textAlign:"center",marginBottom:10}}>
              <div style={{fontSize:44,fontWeight:900,color:utilColor(u.pct),letterSpacing:"-1px"}}>{u.pct.toFixed(0)}%</div>
              <div style={{fontSize:12,color:C.sub}}>{money(u.bal)} used of {money(u.lim)} total limit</div>
            </div>
            <Bar pct={u.pct} color={utilColor(u.pct)} height={10} marks={[10,30]}/>
            <div style={{position:"relative",height:14,fontSize:10,color:C.muted,marginTop:3}}><span style={{position:"absolute",left:0}}>0%</span><span style={{position:"absolute",left:"10%",transform:"translateX(-50%)"}}>10%</span><span style={{position:"absolute",left:"30%",transform:"translateX(-50%)"}}>30%</span><span style={{position:"absolute",right:0}}>100%</span></div>
            {u.pct>=10 && (
              <div style={{background:C.goldLt,border:`1px solid ${C.gold}`,borderRadius:10,padding:"10px 12px",fontSize:12,marginTop:10,lineHeight:1.6}}>
                Pay down <strong>{money(u.bal-u.lim*0.08)}</strong> total to reach 8% overall
                {u.pct>=30 && <> (or <strong>{money(u.bal-u.lim*0.29)}</strong> to get under 30%)</>}. Pay <em>before the statement closes</em> — that's the balance the bureaus see.
              </div>
            )}
          </>
        )}
      </Card>

      <Card style={{marginBottom:12}}>
        <SectionTitle sub="Linked cards fill in automatically. For anything else, enter the limit, APR, minimum payment and statement-close day.">🧾 Your Debts</SectionTitle>
        {debts.length===0 && <div style={{fontSize:13,color:C.muted}}>No credit cards or loans yet. Add them in Overview → Accounts.</div>}
        {debts.map(a=>{
          const p = a.type==="credit"&&a.limit>0 ? (a.balance||0)/a.limit*100 : null;
          const days = daysUntilDay(a.closeDay);
          const target = a.limit ? Math.max(1,Math.round(a.limit*0.08)) : null;
          return (
            <div key={a.id} style={{border:`1px solid ${C.border}`,borderRadius:10,padding:12,marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <div><div style={{fontWeight:700,fontSize:14}}>{a.name}</div><div style={{fontSize:11,color:C.muted}}>{a.institution} · {a.type}</div></div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:800,color:C.neg}}>{money(a.balance||0)}</div>
                  {p!=null && <div style={{fontSize:11,fontWeight:700,color:utilColor(p)}}>{p.toFixed(0)}% used</div>}
                </div>
              </div>
              {p!=null && <div style={{marginBottom:8}}><Bar pct={p} color={utilColor(p)} height={6} marks={[10,30]}/></div>}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                {[
                  a.type==="credit" && {f:"limit",l:"Limit $"},
                  {f:"apr",l:"APR %"},
                  {f:"minPayment",l:"Min $"},
                  a.type==="credit" && {f:"closeDay",l:"Closes day"},
                ].filter(Boolean).map(x=>(
                  (a.bankFields||[]).includes(x.f)
                    ? <div key={x.f} style={{fontSize:10,color:C.muted}}>{x.l} 🔗
                        <div style={{...inp,padding:"5px 6px",marginTop:2,background:C.surfaceAlt,fontWeight:700,color:C.ink}}>{a[x.f]}</div>
                      </div>
                    : <label key={x.f} style={{fontSize:10,color:C.muted}}>{x.l}
                        <input type="number" inputMode="decimal" key={`${a.id}-${x.f}-${a[x.f]}`} defaultValue={a[x.f]??""} onBlur={e=>setField(a.id,x.f,e.target.value)} style={{...inp,padding:"5px 6px",marginTop:2}}/>
                      </label>
                ))}
              </div>
              {a.isOverdue && <div style={{fontSize:12,color:C.neg,fontWeight:700,marginTop:8}}>🚨 This account is past due. Pay at least the minimum now to avoid a late mark on your report.</div>}
              {a.nextDueDate && (()=>{ const dd=daysUntilDate(a.nextDueDate); return (
                <div style={{fontSize:12,color:C.sub,marginTop:8}}>
                  📅 Payment due <strong style={{color:dd!=null&&dd<=5?C.neg:C.ink}}>{shortDate(a.nextDueDate)}{dd!=null&&dd>=0?` (${dd===0?"today":`in ${dd} days`})`:""}</strong>
                  {a.minPayment!=null && <> · min {money(a.minPayment,2)}</>}
                  {a.lastStatementBalance!=null && <> · last statement {money(a.lastStatementBalance,2)}</>}
                </div>); })()}
              {a.linked && <div style={{fontSize:10,color:C.muted,marginTop:6}}>🔗 Fields marked 🔗 update automatically from your bank</div>}
              {p!=null && p>8 && (
                <div style={{fontSize:12,color:C.sub,marginTop:8}}>
                  🎯 Pay <strong style={{color:C.pos}}>{money((a.balance||0)-target)}</strong> to leave {money(target)} (8%)
                  {days!=null && <> · statement closes <strong style={{color:days<=5?C.neg:C.ink}}>{days===0?"today":`in ${days} days`}</strong></>}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      {plan && (
        <Card style={{marginBottom:12}}>
          <SectionTitle sub="Avalanche (highest APR first) saves the most interest. Snowball (smallest balance first) gives quicker wins.">🏁 Debt-Free Plan</SectionTitle>
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {["avalanche","snowball"].map(s=>(
              <button key={s} onClick={()=>setStrategy(s)} style={{flex:1,padding:"8px",borderRadius:8,border:"none",fontWeight:700,fontSize:12,cursor:"pointer",background:strategy===s?C.ink:C.surfaceAlt,color:strategy===s?"#FFF":C.sub,fontFamily:"inherit"}}>{s[0].toUpperCase()+s.slice(1)}</button>
            ))}
          </div>
          <label style={{fontSize:12,color:C.sub}}>Extra per month on top of minimums ({money(totalMin)})
            <input type="number" value={extra} onChange={e=>setExtra(e.target.value)} onBlur={()=>update(()=>({extraPayment:parseFloat(extra)||0}))} style={{...inp,marginTop:4,marginBottom:12}}/>
          </label>
          {plan.never ? (
            <div style={{color:C.neg,fontSize:13,fontWeight:700}}>At this payment the balances never get paid off — interest is outpacing payments. Increase the extra amount.</div>
          ) : (
            <>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <div style={{background:C.posLt,borderRadius:10,padding:10,textAlign:"center"}}>
                  <div style={{fontSize:10,color:C.muted}}>DEBT-FREE BY</div>
                  <div style={{fontWeight:900,fontSize:18,color:C.pos}}>{freeDate(plan.months)}</div>
                  <div style={{fontSize:11,color:C.sub}}>{plan.months} months</div>
                </div>
                <div style={{background:C.surfaceAlt,borderRadius:10,padding:10,textAlign:"center"}}>
                  <div style={{fontSize:10,color:C.muted}}>TOTAL INTEREST</div>
                  <div style={{fontWeight:900,fontSize:18}}>{money(plan.interest)}</div>
                  {base && !base.never && base.interest>plan.interest && <div style={{fontSize:11,color:C.pos}}>saves {money(base.interest-plan.interest)} · {base.months-plan.months} mo sooner</div>}
                </div>
              </div>
              <div style={{fontSize:12,fontWeight:700,marginBottom:4}}>Payoff order</div>
              {plan.order.map((o,i)=>(
                <div key={o.id} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"5px 0",borderTop:`1px solid ${C.border}`}}>
                  <span>{i+1}. {o.name}</span><span style={{color:C.muted}}>{freeDate(o.month)}</span>
                </div>
              ))}
              {simDebts.some(d=>!d.apr) && <div style={{fontSize:11,color:C.warn,marginTop:8}}>Some debts have no APR entered — add it above for an accurate plan.</div>}
            </>
          )}
        </Card>
      )}
    </>
  );
}

// ─── SETTINGS TAB ─────────────────────────────────────────────
function SettingsTab({ apiKey, onReset, onKeyUpdate }) {
  const [newKey, setNewKey] = useState("");
  const [saved, setSaved] = useState(false);
  const saveNewKey = () => {
    if (!newKey.trim().startsWith("sk-ant-")) return;
    saveKey(newKey.trim()); onKeyUpdate(newKey.trim());
    setSaved(true); setTimeout(()=>setSaved(false),2000); setNewKey("");
  };
  return (
    <div>
      <Card style={{marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>🔑 API Key</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:8}}>Current: {apiKey?`${apiKey.slice(0,16)}…${apiKey.slice(-4)}`:"Not set"}</div>
        <input value={newKey} onChange={e=>setNewKey(e.target.value)} placeholder="sk-ant-api03-…"
          style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",background:C.surfaceAlt,marginBottom:10}}/>
        <Btn variant="primary" style={{width:"100%"}} onClick={saveNewKey}>{saved?"✓ Saved!":"Update Key"}</Btn>
      </Card>
      <Card style={{marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>📱 Keep ASCEND Updated</div>
        <div style={{fontSize:12,color:C.sub,lineHeight:1.7}}>
          When updates are made: go to <strong>github.com/CapitalJo/Ascend</strong> → Ascend App → src → App.jsx → pencil icon → paste new code → commit. Vercel auto-updates within 60 seconds.
        </div>
      </Card>
      <Card style={{marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>ℹ️ About ASCEND</div>
        <div style={{fontSize:12,color:C.sub,lineHeight:1.7}}>Your personal AI credit repair and money system. Everything lives on your device — nothing stored on any server.</div>
        <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:5}}>
          {["Per-bureau analysis (Equifax, Experian, TransUnion)","Score gap to target + estimated gain","Delinquent accounts with exact fall-off dates","FCRA dispute letters auto-generated","Card utilization targets (exact amounts)","Dispute tracker with 30-day deadlines","Monthly budgets with left-to-spend","Spending breakdown by category (pie chart)","6-month cash flow & savings rate","Auto-categorized transactions that learn from you","Recurring bill detection & due-date reminders","Credit utilization tracker with statement-date targets","Debt payoff planner (avalanche / snowball)","Savings goals","AI financial & credit coach"].map(f=>(
            <div key={f} style={{fontSize:12,color:C.pos}}>✓ {f}</div>
          ))}
        </div>
      </Card>
      <Btn variant="danger" style={{width:"100%"}} onClick={onReset}>⚠️ Reset All Data</Btn>
    </div>
  );
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
    setTimeout(()=>onEnter(k),300);
  };
  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.ink} 0%,#1A2F45 60%,#0F1923 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontSize:52,marginBottom:10}}>⬆️</div>
          <div style={{color:"#FFF",fontSize:34,fontWeight:900,letterSpacing:"-1px"}}>ASCEND</div>
          <div style={{color:"rgba(255,255,255,.4)",fontSize:13,marginTop:8,lineHeight:1.7}}>
            Upload your credit reports. Get your exact plan.<br/>Dispute everything. Track your money.
          </div>
        </div>
        <div style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",borderRadius:14,padding:20}}>
          <div style={{color:"rgba(255,255,255,.6)",fontSize:12,marginBottom:8}}>Anthropic API Key</div>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <input value={input} onChange={e=>setInput(e.target.value)} type={show?"text":"password"}
              placeholder="sk-ant-api03-…" onKeyDown={e=>e.key==="Enter"&&save()}
              style={{flex:1,background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.2)",borderRadius:10,padding:"10px 14px",fontSize:14,color:"#FFF",outline:"none",fontFamily:"inherit"}}/>
            <button onClick={()=>setShow(s=>!s)} style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",borderRadius:10,color:"#FFF",padding:"0 12px",cursor:"pointer",fontSize:16}}>
              {show?"🙈":"👁"}
            </button>
          </div>
          {status==="invalid"&&<div style={{color:"#FF7A7A",fontSize:12,marginBottom:8}}>Key must start with sk-ant-</div>}
          <Btn variant="gold" style={{width:"100%"}} onClick={save} disabled={!input.trim()}>
            {status==="ok"?"✓ Entering ASCEND…":"Enter ASCEND →"}
          </Btn>
          <div style={{color:"rgba(255,255,255,.35)",fontSize:11,marginTop:12,textAlign:"center",lineHeight:1.6}}>
            Your key stays on this device only.<br/>Get one free at console.anthropic.com
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────
const DEFAULT_STATE = {reports:{},accounts:[],transactions:[],subscriptions:[],disputeLog:[],budgets:{},goals:[],rules:{}};
const TABS = ["Credit","Money","Settings"];

export default function App() {
  const [apiKey, setApiKey] = useState(()=>loadKey());
  const [state, setState] = useState(()=>loadState()||DEFAULT_STATE);
  const [tab, setTab] = useState("Credit");

  useEffect(()=>{ saveState(state); },[state]);

  if (!apiKey) return <Gateway onEnter={k=>{saveKey(k);setApiKey(k);}}/>;

  const reset = () => {
    if (window.confirm("Reset all ASCEND data? This cannot be undone.")) {
      localStorage.removeItem(SK); localStorage.removeItem("ascend_key");
      setApiKey(""); setState(DEFAULT_STATE);
    }
  };

  return (
    <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",background:C.bg,minHeight:"100vh"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>
      <div style={{background:C.ink,padding:"14px 16px",position:"sticky",top:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{color:"#FFF",fontWeight:900,fontSize:20,letterSpacing:"-0.5px"}}>⬆️ ASCEND</div>
        <div style={{display:"flex",gap:4}}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:"6px 12px",borderRadius:20,border:"none",fontWeight:700,fontSize:12,cursor:"pointer",
              background:tab===t?C.gold:"rgba(255,255,255,.1)",color:"#FFF"
            }}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{padding:"14px 14px 80px",maxWidth:640,margin:"0 auto"}}>
        {tab==="Credit" && <CreditTab state={state} setState={setState} apiKey={apiKey}/>}
        {tab==="Money" && <MoneyTab state={state} setState={setState} apiKey={apiKey}/>}
        {tab==="Settings" && <SettingsTab apiKey={apiKey} onReset={reset} onKeyUpdate={setApiKey}/>}
      </div>
    </div>
  );
}
