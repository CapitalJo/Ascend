import React from 'react'
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
function Card({ children, style={} }) {
  return <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px", ...style }}>{children}</div>;
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

  const connectBank = async () => {
    setPlaidLoading(true); setPlaidError(null);
    try {
      // Get link token from our backend
      const ltResp = await fetch("/api/create-link-token", { method:"POST", headers:{"Content-Type":"application/json"} });
      const ltData = await ltResp.json();
      if (!ltResp.ok) throw new Error(ltData.error || "Could not create link token");

      // Load Plaid Link
      await new Promise((res, rej) => {
        if (window.Plaid) return res();
        const s = document.createElement("script");
        s.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });

      // Open Plaid Link
      const handler = window.Plaid.create({
        token: ltData.link_token,
        onSuccess: async (public_token, metadata) => {
          try {
            // Exchange for access token
            const exResp = await fetch("/api/exchange-token", {
              method:"POST", headers:{"Content-Type":"application/json"},
              body: JSON.stringify({ public_token })
            });
            const exData = await exResp.json();
            if (!exResp.ok) throw new Error(exData.error);

            // Get accounts and transactions
            const dataResp = await fetch("/api/get-data", {
              method:"POST", headers:{"Content-Type":"application/json"},
              body: JSON.stringify({ access_token: exData.access_token })
            });
            const bankData = await dataResp.json();
            if (!dataResp.ok) throw new Error(bankData.error);

            // Merge into state
            const existingIds = new Set((state.accounts||[]).map(a=>a.id));
            const newAccounts = bankData.accounts.filter(a=>!existingIds.has(a.id));
            const existingTxnIds = new Set((state.transactions||[]).map(t=>t.id));
            const newTxns = bankData.transactions.filter(t=>!existingTxnIds.has(t.id));

            const ns = {
              ...state,
              accounts:[...(state.accounts||[]),...newAccounts],
              transactions:[...(state.transactions||[]),...newTxns],
              plaidTokens:[...(state.plaidTokens||[]),{ access_token:exData.access_token, institution:metadata.institution?.name||"Bank", item_id:exData.item_id }]
            };
            setState(ns); saveState(ns);
            setPlaidLoading(false);
          } catch(e) { setPlaidError("Error importing data: "+e.message); setPlaidLoading(false); }
        },
        onExit: () => setPlaidLoading(false),
      });
      handler.open();
    } catch(e) { setPlaidError(e.message); setPlaidLoading(false); }
  };

  const refreshBank = async (token) => {
    setPlaidLoading(true);
    try {
      const dataResp = await fetch("/api/get-data", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ access_token: token.access_token })
      });
      const bankData = await dataResp.json();
      // Update balances and add new transactions
      const updatedAccounts = (state.accounts||[]).map(a => {
        const fresh = bankData.accounts.find(b=>b.id===a.id);
        return fresh ? {...a, balance:fresh.balance} : a;
      });
      const existingIds = new Set((state.transactions||[]).map(t=>t.id));
      const newTxns = bankData.transactions.filter(t=>!existingIds.has(t.id));
      const ns = {...state, accounts:updatedAccounts, transactions:[...(state.transactions||[]),...newTxns]};
      setState(ns); saveState(ns);
    } catch(e) { setPlaidError("Refresh failed: "+e.message); }
    setPlaidLoading(false);
  };
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [newAcct, setNewAcct] = useState({name:"",institution:"",balance:"",type:"checking"});
  const [newTxn, setNewTxn] = useState({date:new Date().toISOString().split("T")[0],description:"",amount:"",category:"Other",type:"expense"});
  const [aiQ, setAiQ] = useState("");
  const [aiResp, setAiResp] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [showCsv, setShowCsv] = useState(false);

  const txns = state.transactions || [];
  const accounts = state.accounts || [];
  const subs = state.subscriptions || [];

  const expenses = txns.filter(t=>t.type==="expense"||t.amount<0);
  const income = txns.filter(t=>t.type==="income"||t.amount>0);
  const totalIncome = income.reduce((s,t)=>s+Math.abs(t.amount),0);
  const totalExpenses = expenses.reduce((s,t)=>s+Math.abs(t.amount),0);
  const netFlow = totalIncome - totalExpenses;
  const totalAssets = accounts.filter(a=>a.type!=="credit"&&a.type!=="loan").reduce((s,a)=>s+(a.balance||0),0);
  const totalDebt = accounts.filter(a=>a.type==="credit"||a.type==="loan").reduce((s,a)=>s+(a.balance||0),0);

  // Spending by category
  const byCategory = {};
  expenses.forEach(t => {
    const cat = t.category||"Other";
    byCategory[cat] = (byCategory[cat]||0) + Math.abs(t.amount);
  });
  const pieData = Object.entries(byCategory).map(([name,value])=>({name,value,color:CAT_COLORS[name]||C.muted})).sort((a,b)=>b.value-a.value);

  const addAccount = () => {
    if (!newAcct.name||!newAcct.balance) return;
    const a = {...newAcct,id:Date.now(),balance:parseFloat(newAcct.balance)||0};
    const ns = {...state,accounts:[...accounts,a]};
    setState(ns); saveState(ns);
    setNewAcct({name:"",institution:"",balance:"",type:"checking"});
    setShowAddAcct(false);
  };

  const addTransaction = () => {
    if (!newTxn.description||!newTxn.amount) return;
    const amt = newTxn.type==="expense" ? -Math.abs(parseFloat(newTxn.amount)) : Math.abs(parseFloat(newTxn.amount));
    const t = {...newTxn,id:Date.now(),amount:amt};
    const ns = {...state,transactions:[...txns,t]};
    setState(ns); saveState(ns);
    setNewTxn({date:new Date().toISOString().split("T")[0],description:"",amount:"",category:"Other",type:"expense"});
    setShowAddTxn(false);
  };

  const importCsv = () => {
    const lines = csvText.trim().split("\n").slice(1);
    const newTxns = lines.map(l=>{
      const p = l.split(",");
      const amt = parseFloat(p[2])||0;
      return {id:Date.now()+Math.random(),date:p[0]?.trim(),description:p[1]?.trim(),amount:amt,category:"Other",type:amt>=0?"income":"expense"};
    }).filter(t=>t.description);
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

  const deleteTxn = (id) => {
    const ns = {...state,transactions:txns.filter(t=>t.id!==id)};
    setState(ns); saveState(ns);
  };

  const askAI = async () => {
    if (!aiQ.trim()||!apiKey) return;
    setAiLoading(true);
    try {
      const context = `Monthly income: $${totalIncome.toFixed(0)}. Monthly expenses: $${totalExpenses.toFixed(0)}. Net: $${netFlow.toFixed(0)}. Spending by category: ${JSON.stringify(byCategory)}. Total assets: $${totalAssets.toFixed(0)}. Total debt: $${totalDebt.toFixed(0)}. Subscriptions: ${JSON.stringify(subs)}.`;
      const resp = await callClaude(apiKey,[{role:"user",content:`${context}\n\nUser: ${aiQ}`}],
        "You are a personal finance coach helping someone build wealth and improve their financial life. Be specific, actionable, and encouraging. Mention exact numbers from their data. Keep responses under 200 words.",800);
      setAiResp(resp);
    } catch(e) { setAiResp("Error: "+e.message); }
    setAiLoading(false);
  };

  const subViews = ["overview","spending","transactions","subscriptions","coach"];

  return (
    <div>
      {/* Sub-navigation */}
      <div style={{display:"flex",gap:4,marginBottom:14,overflowX:"auto",paddingBottom:2}}>
        {subViews.map(v=>(
          <button key={v} onClick={()=>setView(v)} style={{
            padding:"6px 12px",borderRadius:20,border:"none",fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",
            background:view===v?C.ink:C.surfaceAlt,color:view===v?"#FFF":C.sub
          }}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {view==="overview" && (
        <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            {[
              {label:"Monthly Income",val:`$${totalIncome.toLocaleString()}`,color:C.pos},
              {label:"Monthly Expenses",val:`$${totalExpenses.toLocaleString()}`,color:C.neg},
              {label:"Net Cash Flow",val:`${netFlow>=0?"+":"-"}$${Math.abs(netFlow).toLocaleString()}`,color:netFlow>=0?C.pos:C.neg},
              {label:"Total Assets",val:`$${totalAssets.toLocaleString()}`,color:C.blue},
            ].map(m=>(
              <Card key={m.label} style={{textAlign:"center",padding:"12px 8px"}}>
                <div style={{fontSize:10,color:C.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>{m.label}</div>
                <div style={{fontSize:22,fontWeight:900,color:m.color}}>{m.val}</div>
              </Card>
            ))}
          </div>

          {/* Bank Linking */}
          <Card style={{marginBottom:12,borderLeft:`3px solid ${C.blue}`}}>
            <div style={{fontWeight:800,fontSize:15,marginBottom:4}}>🏦 Connect Your Bank</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Securely link your bank and credit cards via Plaid. Balances and transactions import automatically.</div>
            {plaidError && <div style={{background:C.negLt,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.neg,marginBottom:10}}>{plaidError}</div>}
            <Btn variant="blue" style={{width:"100%",background:C.blue,color:"#FFF",border:"none"}} onClick={connectBank} disabled={plaidLoading}>
              {plaidLoading ? <><Spinner size={14}/> Connecting…</> : "🔗 Connect Bank or Credit Card"}
            </Btn>
            {(state.plaidTokens||[]).length > 0 && (
              <div style={{marginTop:12}}>
                <div style={{fontSize:12,color:C.muted,marginBottom:6}}>Connected institutions:</div>
                {(state.plaidTokens||[]).map((t,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderTop:`1px solid ${C.border}`}}>
                    <div style={{fontSize:13,fontWeight:600}}>{t.institution}</div>
                    <Btn variant="ghost" size="sm" onClick={()=>refreshBank(t)}>🔄 Refresh</Btn>
                  </div>
                ))}
              </div>
            )}
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
                  <div style={{fontSize:11,color:C.muted}}>{a.institution} · {a.type}</div>
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
                  {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{display:"flex",gap:6}}>
                <Btn variant="primary" size="sm" style={{flex:1}} onClick={addTransaction}>Save</Btn>
                <Btn variant="ghost" size="sm" onClick={()=>setShowAddTxn(false)}>Cancel</Btn>
              </div>
            </div>
          )}

          {txns.length===0 && <div style={{fontSize:13,color:C.muted,textAlign:"center",padding:"20px 0"}}>No transactions yet</div>}
          {[...txns].reverse().slice(0,50).map((t,i)=>(
            <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{t.description}</div>
                <div style={{display:"flex",gap:6,marginTop:2}}>
                  <span style={{fontSize:11,color:C.muted}}>{t.date}</span>
                  <span style={{fontSize:11,background:C.surfaceAlt,borderRadius:4,padding:"1px 6px",color:CAT_COLORS[t.category]||C.muted,fontWeight:600}}>{t.category}</span>
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
        </Card>
      )}

      {/* SUBSCRIPTIONS */}
      {view==="subscriptions" && (
        <Card style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div>
              <div style={{fontWeight:800,fontSize:15}}>📱 Subscriptions</div>
              <div style={{fontSize:12,color:C.muted,marginTop:2}}>
                Active: <strong style={{color:C.neg}}>${subs.filter(s=>s.status==="active").reduce((a,s)=>a+s.amount,0).toFixed(0)}/mo</strong>
              </div>
            </div>
            <Btn variant="primary" size="sm" onClick={addSub}>+ Add</Btn>
          </div>
          {subs.length===0 && <div style={{fontSize:13,color:C.muted,textAlign:"center",padding:"20px 0"}}>No subscriptions tracked yet</div>}
          {subs.map(s=>(
            <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`,opacity:s.status==="cancelled"?.5:1}}>
              <div>
                <div style={{fontWeight:700,fontSize:14}}>{s.name}</div>
                <div style={{fontSize:12,color:C.muted}}>${s.amount}/mo · {s.status==="active"?"Active":"Cancelled"}</div>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{fontWeight:700,fontSize:13,color:C.neg}}>${(s.amount*12).toFixed(0)}/yr</span>
                {s.status==="active" && (
                  <Btn variant="danger" size="sm" onClick={()=>cancelSub(s.id)}>Cancel</Btn>
                )}
              </div>
            </div>
          ))}
          {subs.filter(s=>s.status==="active").length > 0 && (
            <div style={{marginTop:12,background:C.warnLt,borderRadius:10,padding:12}}>
              <div style={{fontWeight:700,fontSize:13,color:C.warn,marginBottom:4}}>💡 Annual Subscription Cost</div>
              <div style={{fontSize:13,color:C.sub}}>
                You're spending <strong>${(subs.filter(s=>s.status==="active").reduce((a,s)=>a+s.amount,0)*12).toFixed(0)}</strong> per year on active subscriptions.
                Cancelling unused ones could save you significant money.
              </div>
            </div>
          )}
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
            {["How can I invest with limited money?","What's the fastest way to pay off debt?","How do I build an emergency fund?","Where am I wasting the most money?"].map(q=>(
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
          {["Per-bureau analysis (Equifax, Experian, TransUnion)","Score gap to target + estimated gain","Delinquent accounts with exact fall-off dates","FCRA dispute letters auto-generated","Card utilization targets (exact amounts)","Dispute tracker with 30-day deadlines","Spending breakdown by category (pie chart)","Subscription manager with cancel tracking","AI financial coach"].map(f=>(
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
const DEFAULT_STATE = {reports:{},accounts:[],transactions:[],subscriptions:[],disputeLog:[]};
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
