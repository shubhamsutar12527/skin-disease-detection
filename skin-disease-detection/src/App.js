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
      text: 'Aurora DermaScan ready. Load a sample or ask a skin-health question.'
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
          parts: [{ text: `You are Aurora DermaScan assistant. Answer clearly and simply: "${q}". Add one short safety note if appropriate.` }]
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

  // UI helpers
  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 820 : false;

  return (
    <div style={rootBg}>
      <Scanlines />
      <Vignette />

      {/* Header */}
      <header style={{ paddingTop: 28, textAlign:'center' }}>
        <h1 style={title}>
          Aurora <span style={{color:'#22d3ee', textShadow:'0 0 14px #22d3ee'}}>DermaScan</span>
        </h1>
        <div style={subtitle}>AI Skin Health Interface</div>
        <div style={divider} />
      </header>

      {/* Tabs */}
      <div style={{ display:'flex', justifyContent:'center', margin:'16px 0 22px' }}>
        <div style={{ ...holo({ padding:6, display:'flex', gap:6 }), boxShadow:'0 0 14px rgba(34,197,94,.25)' }}>
          <Tab active={activeTab==='diagnosis'} onClick={()=>setActiveTab('diagnosis')}>🔬 Scan</Tab>
          <Tab active={activeTab==='chatbot'} onClick={()=>setActiveTab('chatbot')}>🤖 Assistant</Tab>
        </div>
      </div>

      {/* Centered Console and Output */}
      {activeTab==='diagnosis' && (
        <main style={centerWrap}>
          {/* Console */}
          <section style={{ ...holo({ padding:18 }), animation:'panelPop .45s ease-out both' }}>
            <PanelHeader icon="📡" text="Central Input Console" />
            <PreviewShell>
              {isCameraActive ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted style={videoStyle} />
                  <canvas ref={canvasRef} style={{ display:'none' }} />
                </>
              ) : image ? (
                <img src={image} alt="preview" style={imageStyle} />
              ) : (
                <EmptyState />
              )}
            </PreviewShell>

            {/* Controls */}
            <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr 1fr':'1fr 1fr 1fr', gap:12, marginTop:14 }}>
              {!isCameraActive ? (
                <>
                  <Btn icon="📁" text="Load" color="#22d3ee" onClick={()=>fileRef.current?.click()} />
                  <Btn icon="🎥" text="Camera" color="#14b8a6" onClick={()=>startCamera('environment')} />
                  {!isMobile && (
                    <Btn icon="🧠" text={loading?'Scanning…':'Analyze'} color="#0ea5e9" onClick={analyzeImage} disabled={!image||loading} />
                  )}
                </>
              ) : (
                <>
                  <Btn icon="📸" text="Capture" color="#ef4444" onClick={capturePhoto} />
                  <Btn icon="🔄" text="Flip" color="#06b6d4" onClick={switchCamera} />
                  <Btn icon="⛔" text="Close" color="#475569" onClick={stopCamera} />
                </>
              )}
            </div>

            {isMobile && !isCameraActive && (
              <Btn wide icon="🧠" text={loading?'Scanning…':'Analyze with AI'} color="#0ea5e9" onClick={analyzeImage} disabled={!image||loading} style={{marginTop:12}} />
            )}

            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display:'none' }} />

            <InfoStrip />
          </section>

          {/* Output below */}
          {(result || error || loading) && (
            <section style={{ ...holo({ padding:18, marginTop:16 }), animation:'fadeUp .45s .05s ease-out both' }}>
              <PanelHeader icon="📊" text="Diagnostic Output" />
              {loading && <Analyzing />}
              {error && <ErrorBox text={error} />}
              {result && <ResultBox result={result} />}
            </section>
          )}

          {/* General Information */}
          <section style={{ ...holo({ padding:18, marginTop:16 }), animation:'fadeUp .45s .1s ease-out both' }}>
            <PanelHeader icon="ℹ️" text="About Aurora DermaScan" />
            <ul style={aboutList}>
              <li><strong>Purpose:</strong> A learning and triage aid that offers AI‑generated explanations for common skin presentations from a photo.</li>
              <li><strong>How it helps:</strong> Summarizes likely conditions, confidence, typical features, and simple care tips in seconds.</li>
              <li><strong>Important:</strong> This is not a diagnosis. For persistent, painful, spreading, or worrisome lesions, consult a licensed clinician.</li>
              <li><strong>Privacy:</strong> Images are analyzed temporarily to generate a response and are not stored by the app.</li>
            </ul>
          </section>
        </main>
      )}

      {/* Assistant */}
      {activeTab==='chatbot' && (
        <div style={centerWrap}>
          <section style={{ ...holo({ padding:18 }), animation:'panelPop .45s ease-out both' }}>
            <PanelHeader icon="🧬" text="Skin Health Assistant" />
            <div ref={chatRef} style={chatBox}>
              {chatHistory.map((m,i)=>(
                <Bubble key={i} me={m.role==='user'}>{m.text}</Bubble>
              ))}
              {isChatting && <div style={{opacity:.8,fontSize:13}}>…linking to medical core</div>}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:12 }}>
              <input
                type="text" value={userMessage}
                onChange={(e)=>setUserMessage(e.target.value)}
                onKeyDown={(e)=> e.key==='Enter' && sendMessage()}
                placeholder="Ask about skin care, symptoms, treatments…"
                style={chatInput}
              />
              <Btn icon="🚀" text="Send" color="#22d3ee" onClick={sendMessage} disabled={isChatting || !userMessage.trim()} />
            </div>
          </section>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: CSS}} />
    </div>
  );
}

/* ——— Theming ——— */
const rootBg = {
  minHeight:'100vh',
  backgroundColor:'#071317',
  color:'#e6fffb',
  overflowX:'hidden',
  background:
   `radial-gradient(circle at 20% 20%, rgba(14,165,233,0.18) 0, transparent 55%),
    radial-gradient(circle at 80% 30%, rgba(13,148,136,0.18) 0, transparent 50%),
    linear-gradient(transparent 98%, rgba(148,163,184,0.12) 98%),
    linear-gradient(90deg, transparent 98%, rgba(148,163,184,0.12) 98%)`,
  backgroundSize:'900px 900px, 900px 900px, 36px 36px, 36px 36px'
};
const centerWrap = { maxWidth:880, margin:'0 auto', padding:'0 14px 60px' };
const title = { fontSize:52, fontWeight:900, letterSpacing:.3, color:'#a7f3d0', textShadow:'0 0 14px #0ea5e9', margin:0 };
const subtitle = { marginTop:6, fontSize:14, opacity:.9, color:'#bff5ec' };
const divider = { height:3, width:240, margin:'16px auto 10px', background:'linear-gradient(90deg,#14b8a6,#22d3ee)', filter:'blur(.3px)', borderRadius:2, boxShadow:'0 0 12px #22d3ee' };

const holo = (extra) => ({
  background:'linear-gradient(135deg, rgba(4,11,14,0.65), rgba(8,11,14,0.65))',
  border:'1px solid rgba(34,211,238,0.35)',
  borderRadius:16, position:'relative', boxShadow:'0 0 14px rgba(14,165,233,.15)', ...extra
});

/* ——— Reusable UI ——— */
function Tab({active, children, onClick}) {
  return (
    <button onClick={onClick} style={{
      padding:'10px 18px', borderRadius:12,
      border:'1px solid rgba(34,211,238,0.35)',
      background: active ? 'linear-gradient(135deg, rgba(13,148,136,0.3), rgba(34,211,238,0.3))' : 'transparent',
      color:'#e6fffb', cursor:'pointer', transition:'all .25s',
      boxShadow: active ? '0 0 12px rgba(34,211,238,.65)' : 'none'
    }}>
      {children}
    </button>
  );
}

function PanelHeader({icon, text}) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:10, marginBottom:10, fontSize:16, opacity:.95}}>
      <span>{icon}</span>
      <span>{text}</span>
      <div style={{flex:1}} />
      <div style={{height:2, width:120, background:'linear-gradient(90deg,#14b8a6,#22d3ee)', boxShadow:'0 0 8px #22d3ee'}} />
    </div>
  );
}

function PreviewShell({children}) {
  return (
    <div style={{
      position:'relative',
      border:'1px dashed rgba(34,211,238,0.35)',
      borderRadius:16, minHeight:260,
      display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg, rgba(5,15,18,0.12), rgba(12,18,20,0.38))',
      boxShadow:'0 0 18px rgba(34,211,238,0.18)',
      animation:'neonPulse 2.4s ease-in-out infinite'
    }}>
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
      <div style={{position:'relative', zIndex:1, width:'100%'}}>
        {children}
      </div>
      <div style={{
        position:'absolute', inset:0,
        background: 'linear-gradient(120deg, transparent 20%, rgba(34,211,238,0.07) 45%, transparent 70%)',
        transform:'translateX(-120%)',
        animation:'sweep 3.2s ease-in-out infinite'
      }} />
    </div>
  );
}

const videoStyle = { width:'100%', maxHeight:340, borderRadius:12, objectFit:'cover', outline:'1px solid rgba(34,211,238,0.25)' };
const imageStyle = { maxWidth:'100%', maxHeight:340, borderRadius:12, outline:'1px solid rgba(34,211,238,0.25)' };

function EmptyState(){ return (
  <div style={{ textAlign:'center', opacity:.9, padding:'28px 0'}}>
    <div style={{ fontSize:46, marginBottom:8 }}>📷</div>
    <div>Load image or activate camera</div>
  </div>
);}

function Btn({icon, text, color, onClick, disabled, wide, style}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: wide?'14px 16px':'12px 14px',
      borderRadius:12,
      border:'1px solid rgba(34,211,238,0.35)',
      background:`linear-gradient(135deg, ${rgba(color,.30)}, ${rgba(shade(color),.30)})`,
      color:'#e6fffb', cursor:disabled?'not-allowed':'pointer',
      transition:'transform .15s ease, box-shadow .2s ease, filter .2s ease',
      width: wide?'100%':'auto',
      filter: disabled ? 'grayscale(.2) opacity(.8)' : 'none',
      boxShadow:'0 0 12px rgba(34,211,238,.18)',
      ...style
    }}>
      <span style={{marginRight:8}}>{icon}</span>{text}
    </button>
  );
}

function InfoStrip(){ return (
  <div style={{
    marginTop:12, padding:'10px 12px',
    borderRadius:10,
    background:'linear-gradient(90deg, rgba(13,148,136,0.15), rgba(34,211,238,0.15))',
    border:'1px solid rgba(13,148,136,0.28)', fontSize:13
  }}>
    Tip: Use diffused light; keep the lesion in focus; fill the frame for best inference.
  </div>
);}

function Analyzing(){ return (
  <div style={{ position:'relative', padding:'28px 14px', textAlign:'center' }}>
    <div style={{
      width:120, height:120, borderRadius:'50%', margin:'0 auto 12px',
      border:'3px solid rgba(34,211,238,0.25)', position:'relative',
      boxShadow:'0 0 16px rgba(14,165,233,0.25)'
    }}>
      <div style={{
        position:'absolute', inset:8, borderRadius:'50%',
        background:'conic-gradient(from 0deg, rgba(34,211,238,.45), rgba(14,165,233,.0) 40%)',
        filter:'blur(1px)', animation:'spin 1.6s linear infinite'
      }} />
      <div style={{
        position:'absolute', inset:0, borderRadius:'50%',
        border:'2px dashed rgba(34,211,238,0.35)', animation:'spin 6s linear infinite reverse'
      }} />
    </div>
    <div>Analyzing dermal pattern…</div>
  </div>
);}

function ErrorBox({text}){ return (
  <div style={{
    border:'1px solid rgba(248,113,113,0.35)',
    background:'linear-gradient(135deg, rgba(127,29,29,0.35), rgba(69,10,10,0.35))',
    padding:14, borderRadius:12
  }}>
    ❌ {text}
  </div>
);}

function ResultBox({result}){ return (
  <div style={{ animation:'fadeUp .4s ease-out both' }}>
    <div style={{
      border:'1px solid rgba(13,148,136,0.35)',
      background:'linear-gradient(135deg, rgba(2,44,34,0.45), rgba(12,74,61,0.35))',
      padding:14, borderRadius:12, marginBottom:12
    }}>
      <pre style={{
        margin:0, whiteSpace:'pre-wrap',
        fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',
        lineHeight:1.6, color:'#d1fae5'
      }}>{result.analysis}</pre>
    </div>
    <div style={{ fontSize:12, opacity:.85, textAlign:'right' }}>⏱ {result.timestamp}</div>
    <div style={{
      marginTop:10, padding:10, fontSize:12, borderRadius:10,
      border:'1px solid rgba(250,204,21,0.35)',
      background:'linear-gradient(135deg, rgba(113,63,18,0.35), rgba(180,83,9,0.25))'
    }}>
      ⚠️ Educational tool only. For diagnosis/treatment, consult a licensed clinician.
    </div>
  </div>
);}

function Bubble({me, children}) {
  return (
    <div style={{
      display:'flex', justifyContent: me?'flex-end':'flex-start',
      marginBottom:10, animation: me?'slideInRight .35s ease-out both':'slideInLeft .35s ease-out both'
    }}>
      <div style={{
        maxWidth:'78%', padding:'10px 14px', borderRadius:12,
        border:'1px solid rgba(34,211,238,0.28)',
        background: me
          ? 'linear-gradient(135deg, rgba(14,165,233,0.35), rgba(34,211,238,0.35))'
          : 'linear-gradient(135deg, rgba(4,11,14,0.7), rgba(8,11,14,0.7))',
        fontSize:14, lineHeight:1.5
      }}>
        {children}
      </div>
    </div>
  );
}

/* HUD layers */
function Scanlines(){ return <div style={{
  pointerEvents:'none', position:'fixed', inset:0,
  background:'repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 4px)',
  mixBlendMode:'overlay', opacity:.28
}} />; }
function Vignette(){ return <div style={{
  pointerEvents:'none', position:'fixed', inset:0,
  background:'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.55) 100%)'
}} />; }

/* Chat styles */
const chatBox = {
  height: 420, overflowY:'auto', border:'1px solid rgba(34,211,238,0.32)',
  borderRadius:14, padding:14,
  background:'linear-gradient(135deg, rgba(4,11,14,0.55), rgba(8,11,14,0.45))',
  boxShadow:'0 0 18px rgba(34,211,238,0.18)'
};
const chatInput = {
  flex:1, padding:'12px 14px', borderRadius:12,
  border:'1px solid rgba(34,211,238,0.35)',
  background:'rgba(4,11,14,0.5)', color:'#e6fffb', outline:'none'
};

/* Utils */
function rgba(hexColor, a=1){
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
const CSS = `
@keyframes spin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
@keyframes sweep { 0%{transform:translateX(-120%)} 60%{transform:translateX(20%)} 100%{transform:translateX(120%)} }
@keyframes neonPulse { 0%,100%{box-shadow:0 0 14px rgba(34,211,238,.18)} 50%{box-shadow:0 0 22px rgba(34,211,238,.32)} }
@keyframes cornerPulse { 0%,100%{filter:drop-shadow(0 0 5px #22d3ee)} 50%{filter:drop-shadow(0 0 10px #22d3ee)} }
@keyframes fadeUp { 0%{opacity:0; transform:translateY(8px)} 100%{opacity:1; transform:translateY(0)} }
@keyframes panelPop { 0%{opacity:.0; transform:scale(.985)} 100%{opacity:1; transform:scale(1)} }
@keyframes slideInLeft { 0%{opacity:.0; transform:translateX(-10px)} 100%{opacity:1; transform:translateX(0)} }
@keyframes slideInRight { 0%{opacity:.0; transform:translateX(10px)} 100%{opacity:1; transform:translateX(0)} }
`;

export default App;

