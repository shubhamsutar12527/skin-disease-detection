import React, { useState, useRef, useEffect } from 'react';

function App() {
  // Core state
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('diagnosis');

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentCamera, setCurrentCamera] = useState('environment');

  // Chat state
  const [chatHistory, setChatHistory] = useState([]);
  const [userMessage, setUserMessage] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const chatRef = useRef(null);

  useEffect(() => {
    setChatHistory([{
      role: 'bot',
      text: "Arogya OS is online. Center console ready. Load a sample or query the medical core."
    }]);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatHistory, isChatting]);

  // Upload
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImage(ev.target.result);
      setResult(null);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  // Camera controls
  const startCamera = (facingMode) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Device camera not supported.');
      return;
    }
    setIsCameraActive(true);
    setError('');
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: facingMode || 'environment' },
      audio: false
    }).then(stream => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCurrentCamera(facingMode || 'environment');
      }
    }).catch(() => {
      setError('Camera permission denied.');
      setIsCameraActive(false);
    });
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach(t => t.stop());
    setIsCameraActive(false);
  };

  const switchCamera = () => {
    const next = currentCamera === 'environment' ? 'user' : 'environment';
    stopCamera();
    startCamera(next);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    const shot = canvasRef.current.toDataURL('image/jpeg');
    setImage(shot);
    setResult(null);
    stopCamera();
  };

  // Analysis
  const analyzeImage = async () => {
    if (!image) { setError('Load or capture an image first.'); return; }
    setLoading(true); setError('');
    try {
      const base64 = image.split(',')[1];
      const payload = {
        contents: [{
          role: "user",
          parts: [
            { text: "Analyze this skin image. Return disease name, confidence (0-100), description, and a concise medical disclaimer. Keep output well-structured." },
            { inlineData: { mimeType: "image/jpeg", data: base64 } }
          ]
        }]
      };
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDbVaM34izzzi7I65DbYBsH3ssNIfiSaC0',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );
      const json = await res.json();
      if (json?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const text = json.candidates[0].content.parts[0].text;
        setResult({ analysis: text, timestamp: new Date().toLocaleString() });
      } else {
        setError('No response from AI core.');
      }
    } catch (e) {
      setError('Analysis failed. Network or API issue.');
    } finally { setLoading(false); }
  };

  // Chat
  const sendMessage = async () => {
    if (!userMessage.trim()) return;
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsChatting(true);
    const q = userMessage;
    setUserMessage('');
    try {
      const payload = {
        contents: [{
          role: "user",
          parts: [{ text: `You are Arogya OS (futuristic medical AI). Answer clearly: "${q}". Add one short safety note if appropriate.` }]
        }]
      };
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDbVaM34izzzi7I65DbYBsH3ssNIfiSaC0',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "Subsystem timeout. Try again.";
      setChatHistory(prev => [...prev, { role: 'bot', text }]);
    } catch {
      setChatHistory(prev => [...prev, { role: 'bot', text: 'Link unstable. Retry transmission.' }]);
    } finally { setIsChatting(false); }
  };

  // Styles helpers
  const neon = (c='#60a5fa', s=12) => ({ boxShadow: `0 0 ${s}px ${c}, inset 0 0 ${s}px rgba(0,0,0,0)` });

  const Holo = (extra={}) => ({
    background: 'linear-gradient(135deg, rgba(9,14,24,0.65), rgba(2,6,23,0.65))',
    border: '1px solid rgba(56,189,248,0.35)',
    borderRadius: 16, position: 'relative', ...extra
  });

  const CenterWrap = { maxWidth: 980, margin: '0 auto', padding: '10px 14px 60px' };

  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 820 : false;

  return (
    <div style={RootBG}>
      {/* HUD layers */}
      <Scanlines />
      <Vignette />
      <GridNodes />

      {/* Header */}
      <header style={{ paddingTop: 28, textAlign: 'center' }}>
        <h1 style={Title}>Arogya <span style={{color:'#a78bfa',textShadow:'0 0 12px #8b5cf6'}}>OS</span></h1>
        <div style={Subtitle}>AI Medical Interface • Skin Scanner v2</div>
        <div style={Divider} />
      </header>

      {/* Tabs */}
      <div style={{ display:'flex', justifyContent:'center', margin:'18px 0 24px' }}>
        <div style={{ ...Holo({ padding:6, display:'flex', gap:6 }), ...neon('rgba(125,211,252,0.35)') }}>
          <TabButton active={activeTab==='diagnosis'} label="🔬 Scan Module" onClick={()=>setActiveTab('diagnosis')} />
          <TabButton active={activeTab==='chatbot'} label="🤖 Medical Core" onClick={()=>setActiveTab('chatbot')} />
        </div>
      </div>

      {/* Centered Console + Output stacked */}
      {activeTab==='diagnosis' && (
        <main style={CenterWrap}>
          {/* Console */}
          <section style={{ ...Holo({ padding: 18 }), animation:'panelPop .45s ease-out both', ...neon('rgba(125,211,252,0.25)') }}>
            <PanelHeader icon="🛰" text="Central Input Console" />
            <PreviewBox isCameraActive={isCameraActive} image={image}>
              {isCameraActive ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted style={VideoStyle} />
                  <canvas ref={canvasRef} style={{ display:'none' }} />
                </>
              ) : image ? (
                <img src={image} alt="preview" style={ImageStyle} />
              ) : (
                <EmptyState />
              )}
            </PreviewBox>

            {/* Controls */}
            <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr 1fr':'1fr 1fr 1fr', gap:12, marginTop:14 }}>
              {!isCameraActive ? (
                <>
                  <Button icon="📁" text="Load" color="#22d3ee" onClick={()=>fileRef.current?.click()} />
                  <Button icon="🎥" text="Camera" color="#8b5cf6" onClick={()=>startCamera('environment')} />
                  {!isMobile && (
                    <Button icon="🧠" text={loading?'Scanning…':'Analyze'} color="#10b981" onClick={analyzeImage} disabled={!image||loading} />
                  )}
                </>
              ) : (
                <>
                  <Button icon="📸" text="Capture" color="#ef4444" onClick={capturePhoto} />
                  <Button icon="🔄" text="Flip" color="#a78bfa" onClick={switchCamera} />
                  <Button icon="⛔" text="Close" color="#94a3b8" onClick={stopCamera} />
                </>
              )}
            </div>

            {/* Mobile Analyze */}
            {!isCameraActive && isMobile && (
              <Button wide icon="🧠" text={loading?'Scanning…':'Analyze with AI'} color="#10b981" onClick={analyzeImage} disabled={!image||loading} style={{marginTop:12}} />
            )}

            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display:'none' }} />

            <TipRibbon />
          </section>

          {/* Output below console */}
          {(result || error || loading) && (
            <section style={{ ...Holo({ padding: 18, marginTop: 16 }), animation:'fadeUp .45s .1s ease-out both', ...neon('rgba(168,85,247,0.22)') }}>
              <PanelHeader icon="📊" text="Diagnostic Output" />
              {loading && <AnalyzingBlock />}
              {error && <ErrorBlock text={error} />}
              {result && <ResultBlock result={result} />}
            </section>
          )}
        </main>
      )}

      {/* Chatbot */}
      {activeTab==='chatbot' && (
        <div style={CenterWrap}>
          <section style={{ ...Holo({ padding: 18 }), animation:'panelPop .45s ease-out both' }}>
            <PanelHeader icon="🧬" text="Medical Core Chat" />
            <div ref={chatRef} style={ChatBox}>
              {chatHistory.map((m,i)=>(
                <ChatBubble key={i} role={m.role} text={m.text} />
              ))}
              {isChatting && <div style={{opacity:.8,fontSize:13}}>…linking to medical core</div>}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:12 }}>
              <input
                type="text" value={userMessage}
                onChange={(e)=>setUserMessage(e.target.value)}
                onKeyDown={(e)=> e.key==='Enter' && sendMessage()}
                placeholder="Query the medical core…"
                style={ChatInput}
              />
              <Button icon="🚀" text="Send" color="#60a5fa" onClick={sendMessage} disabled={isChatting || !userMessage.trim()} />
            </div>
          </section>
        </div>
      )}

      {/* Keyframes + Decorations */}
      <style dangerouslySetInnerHTML={{__html: CSS_ANIMS }} />
    </div>
  );
}

/* ————— Components ————— */

const RootBG = {
  minHeight: '100vh',
  backgroundColor: '#030712',
  color: '#e6f7ff',
  overflowX: 'hidden',
  background:
    `radial-gradient(circle at 15% 20%, rgba(59,130,246,0.18) 0, transparent 55%),
     radial-gradient(circle at 80% 30%, rgba(20,184,166,0.18) 0, transparent 50%),
     linear-gradient(transparent 98%, rgba(148,163,184,0.14) 98%),
     linear-gradient(90deg, transparent 98%, rgba(148,163,184,0.14) 98%)`,
  backgroundSize: '900px 900px, 900px 900px, 36px 36px, 36px 36px'
};

const Title = { fontSize: 54, fontWeight: 900, letterSpacing: .5, textShadow:'0 0 14px #38bdf8', margin:0 };
const Subtitle = { marginTop: 6, fontSize: 14, opacity:.85 };
const Divider = { height:3, width:240, margin:'16px auto 10px', background:'linear-gradient(90deg,#22d3ee,#8b5cf6)', filter:'blur(.4px)', borderRadius:2, boxShadow:'0 0 12px #22d3ee' };

function TabButton({active,label,onClick}) {
  return (
    <button onClick={onClick} style={{
      padding:'10px 18px', borderRadius:12,
      border:'1px solid rgba(56,189,248,0.35)',
      background: active? 'linear-gradient(135deg, rgba(34,211,238,0.25), rgba(139,92,246,0.25))' : 'transparent',
      color:'#c7d2fe', cursor:'pointer', transition:'all .25s',
      boxShadow: active ? '0 0 12px rgba(96,165,250,.8)' : 'none'
    }}>
      {label}
    </button>
  );
}

function PanelHeader({icon, text}) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:10, marginBottom:10, fontSize:16, opacity:.9}}>
      <span>{icon}</span>
      <span>{text}</span>
      <div style={{flex:1}} />
      <div style={{height:2, width:120, background:'linear-gradient(90deg,#22d3ee,#8b5cf6)', boxShadow:'0 0 8px #22d3ee'}} />
    </div>
  );
}

function PreviewBox({children, isCameraActive, image}) {
  return (
    <div style={{
      position:'relative',
      border:'1px dashed rgba(125,211,252,0.35)',
      borderRadius:16, minHeight:260,
      display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg, rgba(2,6,23,0.12), rgba(15,23,42,0.38))',
      boxShadow:'0 0 18px rgba(125,211,252,0.18)',
      animation:'neonPulse 2.4s ease-in-out infinite'
    }}>
      {/* Reticle corners */}
      {['tl','tr','bl','br'].map((k,i)=>(
        <div key={i} style={{
          position:'absolute', width:30, height:30,
          borderTop: i<2?'2px solid #22d3ee':'none',
          borderLeft: i%2===0?'2px solid #22d3ee':'none',
          borderRight: i%2===1?'2px solid #22d3ee':'none',
          borderBottom: i>=2?'2px solid #22d3ee':'none',
          top: i<2?10:'auto', bottom:i>=2?10:'auto',
          left:i%2===0?10:'auto', right:i%2===1?10:'auto',
          filter:'drop-shadow(0 0 6px #22d3ee)',
          animation:'cornerPulse 1.8s ease-in-out infinite'
        }} />
      ))}

      {/* Holo sweep */}
      <div style={{
        position:'absolute', inset:0,
        background: 'linear-gradient(120deg, transparent 20%, rgba(34,211,238,0.06) 40%, transparent 60%)',
        transform:'translateX(-100%)',
        animation:'sweep 3.2s ease-in-out infinite'
      }} />

      {/* Content */}
      <div style={{position:'relative', zIndex:1, width:'100%'}}>
        {children}
      </div>
    </div>
  );
}

const VideoStyle = { width:'100%', maxHeight:340, borderRadius:12, objectFit:'cover', outline:'1px solid rgba(125,211,252,0.25)' };
const ImageStyle = { maxWidth:'100%', maxHeight:340, borderRadius:12, outline:'1px solid rgba(125,211,252,0.25)' };

function EmptyState() {
  return (
    <div style={{ textAlign:'center', opacity:.9, padding:'28px 0'}}>
      <div style={{ fontSize:46, marginBottom:8 }}>📷</div>
      <div>Load image or activate camera</div>
    </div>
  );
}

function Button({icon, text, color, onClick, disabled, wide, style}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: wide?'14px 16px':'12px 14px',
      borderRadius:12,
      border:'1px solid rgba(56,189,248,0.35)',
      background:`linear-gradient(135deg, ${hex(color,.28)}, ${hex(shade(color),.28)})`,
      color:'#e6f7ff', cursor:disabled?'not-allowed':'pointer',
      transition:'transform .15s ease, box-shadow .2s ease, filter .2s ease',
      width: wide?'100%':'auto',
      filter: disabled ? 'grayscale(.2) opacity(.8)' : 'none',
      boxShadow:'0 0 12px rgba(125,211,252,.18)',
      ...style
    }}>
      <span style={{marginRight:8}}>{icon}</span>{text}
    </button>
  );
}

function TipRibbon() {
  return (
    <div style={{
      marginTop:12, padding:'10px 12px',
      borderRadius:10,
      background:'linear-gradient(90deg, rgba(34,197,94,0.12), rgba(59,130,246,0.12))',
      border:'1px solid rgba(34,197,94,0.25)', fontSize:13
    }}>
      Tip: Use diffused light; keep the lesion in focus; fill the frame for best inference.
    </div>
  );
}

function AnalyzingBlock() {
  return (
    <div style={{ position:'relative', padding:'28px 14px', textAlign:'center' }}>
      <div style={{
        width:120, height:120, borderRadius:'50%', margin:'0 auto 12px',
        border:'3px solid rgba(125,211,252,0.25)', position:'relative',
        boxShadow:'0 0 16px rgba(96,165,250,0.25)'
      }}>
        <div style={{
          position:'absolute', inset:8, borderRadius:'50%',
          background:'conic-gradient(from 0deg, rgba(34,211,238,.45), rgba(139,92,246,.0) 40%)',
          filter:'blur(1px)', animation:'spin 1.6s linear infinite'
        }} />
        <div style={{
          position:'absolute', inset:0, borderRadius:'50%',
          border:'2px dashed rgba(125,211,252,0.35)', animation:'spin 6s linear infinite reverse'
        }} />
      </div>
      <div>Analyzing dermal pattern…</div>
    </div>
  );
}

function ErrorBlock({text}) {
  return (
    <div style={{
      border:'1px solid rgba(248,113,113,0.35)',
      background:'linear-gradient(135deg, rgba(127,29,29,0.35), rgba(69,10,10,0.35))',
      padding:14, borderRadius:12
    }}>
      ❌ {text}
    </div>
  );
}

function ResultBlock({result}) {
  return (
    <div style={{ animation:'fadeUp .4s ease-out both' }}>
      <div style={{
        border:'1px solid rgba(34,197,94,0.35)',
        background:'linear-gradient(135deg, rgba(6,78,59,0.35), rgba(21,128,61,0.25))',
        padding:14, borderRadius:12, marginBottom:12
      }}>
        <pre style={{
          margin:0, whiteSpace:'pre-wrap',
          fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',
          lineHeight:1.6, color:'#d1fae5'
        }}>{result.analysis}</pre>
      </div>
      <div style={{ fontSize:12, opacity:.8, textAlign:'right' }}>⏱ {result.timestamp}</div>
      <div style={{
        marginTop:10, padding:10, fontSize:12, borderRadius:10,
        border:'1px solid rgba(250,204,21,0.35)',
        background:'linear-gradient(135deg, rgba(113,63,18,0.35), rgba(180,83,9,0.25))'
      }}>
        ⚠️ Educational tool only. For diagnosis/treatment, consult a licensed clinician.
      </div>
    </div>
  );
}

function ChatBubble({role, text}) {
  const isUser = role==='user';
  return (
    <div style={{
      display:'flex', justifyContent: isUser?'flex-end':'flex-start',
      marginBottom:10, animation: isUser?'slideInRight .35s ease-out both':'slideInLeft .35s ease-out both'
    }}>
      <div style={{
        maxWidth:'78%', padding:'10px 14px', borderRadius:12,
        border:'1px solid rgba(56,189,248,0.25)',
        background: isUser
          ? 'linear-gradient(135deg, rgba(59,130,246,0.35), rgba(139,92,246,0.35))'
          : 'linear-gradient(135deg, rgba(2,6,23,0.65), rgba(15,23,42,0.65))',
        fontSize:14, lineHeight:1.5
      }}>
        {text}
      </div>
    </div>
  );
}

/* HUD layers */
function Scanlines(){
  return <div style={{
    pointerEvents:'none', position:'fixed', inset:0,
    background:'repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 4px)',
    mixBlendMode:'overlay', opacity:.35
  }} />;
}
function Vignette(){
  return <div style={{ pointerEvents:'none', position:'fixed', inset:0,
    background:'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.6) 100%)' }} />;
}
function GridNodes(){
  // subtle animated nodes
  return (
    <div style={{pointerEvents:'none', position:'fixed', inset:0, overflow:'hidden'}}>
      {[...Array(18)].map((_,i)=>(
        <div key={i} style={{
          position:'absolute',
          top: `${Math.random()*100}%`,
          left:`${Math.random()*100}%`,
          width:6, height:6, borderRadius:'50%',
          background:'radial-gradient(circle, #22d3ee 20%, transparent 70%)',
          boxShadow:'0 0 10px #22d3ee',
          animation:'floatY 6s ease-in-out infinite',
          animationDelay:`${Math.random()*2}s`,
          opacity:.5
        }} />
      ))}
    </div>
  );
}

/* Styles */
const ChatBox = {
  height: 420, overflowY:'auto', border:'1px solid rgba(56,189,248,0.3)',
  borderRadius:14, padding:14,
  background:'linear-gradient(135deg, rgba(2,6,23,0.55), rgba(15,23,42,0.45))',
  boxShadow:'0 0 18px rgba(125,211,252,0.18)'
};
const ChatInput = {
  flex:1, padding:'12px 14px', borderRadius:12,
  border:'1px solid rgba(56,189,248,0.35)',
  background:'rgba(2,6,23,0.5)', color:'#e6f7ff', outline:'none'
};

/* Utilities */
function hex(hexColor, a=1){
  if (hexColor.startsWith('rgb')) return hexColor;
  const c = hexColor.replace('#','');
  const n = parseInt(c,16);
  const r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  return `rgba(${r},${g},${b},${a})`;
}
function shade(hexColor){
  const c = hexColor.replace('#','');
  const n = parseInt(c,16);
  const r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  const s=(v)=>Math.max(0,v-28);
  return `#${[s(r),s(g),s(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}`;
}

/* Keyframes */
const CSS_ANIMS = `
@keyframes spin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
@keyframes sweep { 0%{transform:translateX(-120%)} 60%{transform:translateX(20%)} 100%{transform:translateX(120%)} }
@keyframes neonPulse { 0%,100%{box-shadow:0 0 14px rgba(125,211,252,.18)} 50%{box-shadow:0 0 22px rgba(125,211,252,.32)} }
@keyframes cornerPulse { 0%,100%{filter:drop-shadow(0 0 5px #22d3ee)} 50%{filter:drop-shadow(0 0 10px #22d3ee)} }
@keyframes fadeUp { 0%{opacity:0; transform:translateY(8px)} 100%{opacity:1; transform:translateY(0)} }
@keyframes panelPop { 0%{opacity:.0; transform:scale(.985)} 100%{opacity:1; transform:scale(1)} }
@keyframes slideInLeft { 0%{opacity:.0; transform:translateX(-10px)} 100%{opacity:1; transform:translateX(0)} }
@keyframes slideInRight { 0%{opacity:.0; transform:translateX(10px)} 100%{opacity:1; transform:translateX(0)} }
@keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
`;

export default App;
