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

  useEffect(function initChat() {
    setChatHistory([{
      role: 'bot',
      text: 'Arogya Mantra is ready. Load a skin image or ask a health question.'
    }]);
  }, []);

  useEffect(function autoscroll() {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatHistory, isChatting]);

  // Upload
  function handleFileSelect(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      setImage(ev.target.result);
      setResult(null);
      setError('');
    };
    reader.readAsDataURL(file);
  }

  // Camera controls
  function startCamera(facingMode) {
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
      setError('Device camera not supported.');
      return;
    }
    setIsCameraActive(true);
    setError('');
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: facingMode || 'environment' },
      audio: false
    }).then(function(stream) {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCurrentCamera(facingMode || 'environment');
      }
    }).catch(function() {
      setError('Camera permission denied.');
      setIsCameraActive(false);
    });
  }
  function stopCamera() {
    var stream = videoRef.current && videoRef.current.srcObject;
    if (stream) {
      var tracks = stream.getTracks();
      for (var i=0;i<tracks.length;i++) tracks[i].stop();
    }
    setIsCameraActive(false);
  }
  function switchCamera() {
    var next = currentCamera === 'environment' ? 'user' : 'environment';
    stopCamera();
    startCamera(next);
  }
  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    var ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    var shot = canvasRef.current.toDataURL('image/jpeg');
    setImage(shot);
    setResult(null);
    stopCamera();
  }

  // Analyze
  async function analyzeImage() {
    if (!image) { setError('Load or capture an image first.'); return; }
    setLoading(true); setError('');
    try {
      var base64 = image.split(',')[1];
      var payload = {
        contents: [{
          role: "user",
          parts: [
            { text: "Analyze this skin image. Return disease name, confidence (0-100), description, and a concise medical disclaimer. Keep output well-structured." },
            { inlineData: { mimeType: "image/jpeg", data: base64 } }
          ]
        }]
      };
      var res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDbVaM34izzzi7I65DbYBsH3ssNIfiSaC0',
        { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }
      );
      var json = await res.json();
      var text = json && json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0] && json.candidates[0].content.parts[0].text;
      if (text) setResult({ analysis: text, timestamp: new Date().toLocaleString() });
      else setError('No response from AI core.');
    } catch (e) {
      setError('Analysis failed. Network or API issue.');
    } finally { setLoading(false); }
  }

  // Chat
  async function sendMessage() {
    if (!userMessage.trim()) return;
    setChatHistory(function(prev){ return prev.concat({ role:'user', text:userMessage }); });
    setIsChatting(true);
    var q = userMessage;
    setUserMessage('');
    try {
      var payload = {
        contents: [{
          role: "user",
          parts: [{ text: 'You are Arogya Mantra assistant. Answer simply and clearly: "' + q + '". Add one short safety note if needed.' }]
        }]
      };
      var res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDbVaM34izzzi7I65DbYBsH3ssNIfiSaC0',
        { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }
      );
      var json = await res.json();
      var text = json && json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0] && json.candidates[0].content.parts[0].text;
      setChatHistory(function(prev){ return prev.concat({ role:'bot', text: text || 'Subsystem timeout. Try again.' }); });
    } catch (e) {
      setChatHistory(function(prev){ return prev.concat({ role:'bot', text:'Link unstable. Retry transmission.' }); });
    } finally { setIsChatting(false); }
  }

  var isMobile = typeof window !== 'undefined' ? window.innerWidth <= 820 : false;

  return (
    <div style={rootBg}>
      <Overlay />
      <header style={{ paddingTop: 28, textAlign:'center' }}>
        <h1 style={title}>
          Arogya <span style={{color:'#22d3ee', textShadow:'0 0 14px #22d3ee'}}>Mantra</span>
        </h1>
        <div style={subtitle}>AI Skin Health Interface</div>
        <div style={divider} />
      </header>

      <div style={{ display:'flex', justifyContent:'center', margin:'16px 0 22px' }}>
        <div style={tabsWrap}>
          <Tab active={activeTab==='diagnosis'} onClick={function(){setActiveTab('diagnosis');}}>🔬 Scan</Tab>
          <Tab active={activeTab==='chatbot'} onClick={function(){setActiveTab('chatbot');}}>🤖 Assistant</Tab>
        </div>
      </div>

      {activeTab==='diagnosis' && (
        <main style={centerWrap}>
          <section style={panel}>
            <PanelHeader icon="📡" text="Central Input Console" />
            <PreviewShell>
              {isCameraActive ? (
                <div>
                  <video ref={videoRef} autoPlay playsInline muted style={videoStyle} />
                  <canvas ref={canvasRef} style={{ display:'none' }} />
                </div>
              ) : image ? (
                <img src={image} alt="preview" style={imageStyle} />
              ) : (
                <EmptyState />
              )}
            </PreviewShell>

            <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr 1fr':'1fr 1fr 1fr', gap:12, marginTop:14 }}>
              {!isCameraActive ? (
                <React.Fragment>
                  <Btn icon="📁" text="Load" color="#38bdf8" onClick={function(){ if (fileRef.current) fileRef.current.click(); }} />
                  <Btn icon="🎥" text="Camera" color="#22d3ee" onClick={function(){ startCamera('environment'); }} />
                  {!isMobile && (
                    <Btn icon="🧠" text={loading?'Scanning…':'Analyze'} color="#06b6d4" onClick={analyzeImage} disabled={!image||loading} />
                  )}
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <Btn icon="📸" text="Capture" color="#ef4444" onClick={capturePhoto} />
                  <Btn icon="🔄" text="Flip" color="#14b8a6" onClick={switchCamera} />
                  <Btn icon="⛔" text="Close" color="#64748b" onClick={stopCamera} />
                </React.Fragment>
              )}
            </div>

            {isMobile && !isCameraActive && (
              <Btn wide icon="🧠" text={loading?'Scanning…':'Analyze with AI'} color="#06b6d4" onClick={analyzeImage} disabled={!image||loading} style={{marginTop:12}} />
            )}

            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display:'none' }} />
            <InfoStrip />
          </section>

          {(result || error || loading) && (
            <section style={panel2}>
              <PanelHeader icon="📊" text="Diagnostic Output" />
              {loading && <Analyzing />}
              {error && <ErrorBox text={error} />}
              {result && <ResultBox result={result} />}
            </section>
          )}

          <section style={panel2}>
            <PanelHeader icon="ℹ️" text="About Arogya Mantra" />
            <ul style={aboutList}>
              <li><strong>Purpose:</strong> A learning and triage aid that offers AI‑generated explanations for common skin presentations from a photo.</li>
              <li><strong>How it helps:</strong> Summarizes likely conditions, confidence, typical features, and simple care tips in seconds.</li>
              <li><strong>Important:</strong> This is not a diagnosis. For persistent, painful, spreading, or worrisome lesions, consult a licensed clinician.</li>
              <li><strong>Privacy:</strong> Images are analyzed temporarily to generate a response and are not stored by the app.</li>
            </ul>
          </section>
        </main>
      )}

      {activeTab==='chatbot' && (
        <div style={centerWrap}>
          <section style={panel}>
            <PanelHeader icon="🧬" text="Skin Health Assistant" />
            <div ref={chatRef} style={chatBox}>
              {chatHistory.map(function(m,i){
                return <Bubble key={i} me={m.role==='user'}>{m.text}</Bubble>;
              })}
              {isChatting && <div style={{opacity:.8,fontSize:13}}>…connecting</div>}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:12 }}>
              <input
                type="text" value={userMessage}
                onChange={function(e){ setUserMessage(e.target.value); }}
                onKeyDown={function(e){ if (e.key==='Enter') sendMessage(); }}
                placeholder="Ask about skin care, symptoms, treatments…"
                style={chatInput}
              />
              <Btn icon="🚀" text="Send" color="#38bdf8" onClick={sendMessage} disabled={isChatting || !userMessage.trim()} />
            </div>
          </section>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: CSS}} />
    </div>
  );
}

/* ——— Black theme ——— */
var rootBg = {
  minHeight:'100vh',
  backgroundColor:'#050607',
  color:'#f0fbff',
  overflowX:'hidden',
  background:
   'radial-gradient(circle at 18% 22%, rgba(34,211,238,0.14) 0, transparent 55%),' +
   'radial-gradient(circle at 82% 30%, rgba(56,189,248,0.12) 0, transparent 50%),' +
   'linear-gradient(transparent 98%, rgba(148,163,184,0.10) 98%),' +
   'linear-gradient(90deg, transparent 98%, rgba(148,163,184,0.10) 98%)',
  backgroundSize:'1000px 1000px, 1000px 1000px, 36px 36px, 36px 36px'
};
var centerWrap = { maxWidth:880, margin:'0 auto', padding:'0 14px 60px' };
var title = { fontSize:52, fontWeight:900, letterSpacing:.4, color:'#e2faff', textShadow:'0 0 16px #22d3ee', margin:0 };
var subtitle = { marginTop:6, fontSize:14, opacity:.9, color:'#c7f9ff' };
var divider = { height:3, width:240, margin:'16px auto 10px', background:'linear-gradient(90deg,#22d3ee,#14b8a6)', filter:'blur(.35px)', borderRadius:2, boxShadow:'0 0 14px #22d3ee' };

var tabsWrap = {
  padding:6, display:'flex', gap:6,
  background:'linear-gradient(135deg, rgba(8,10,12,0.8), rgba(12,14,16,0.8))',
  border:'1px solid rgba(56,189,248,0.35)',
  borderRadius:16, boxShadow:'0 0 18px rgba(34,211,238,.18)'
};

function Overlay(){
  return (
    <div>
      <div style={{
        pointerEvents:'none', position:'fixed', inset:0,
        background:'repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 4px)',
        mixBlendMode:'overlay', opacity:.20
      }} />
      <div style={{
        pointerEvents:'none', position:'fixed', inset:0,
        background:'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.62) 100%)'
      }} />
    </div>
  );
}

function Tab(props){
  return (
    <button onClick={props.onClick} style={{
      padding:'10px 18px', borderRadius:12,
      border:'1px solid rgba(56,189,248,0.35)',
      background: props.active ? 'linear-gradient(135deg, rgba(56,189,248,0.28), rgba(34,211,238,0.28))' : 'transparent',
      color:'#e6faff', cursor:'pointer', transition:'all .25s',
      boxShadow: props.active ? '0 0 14px rgba(34,211,238,.6)' : 'none'
    }}>
      {props.children}
    </button>
  );
}

var panel = {
  background:'linear-gradient(135deg, rgba(9,11,13,0.9), rgba(13,16,19,0.9))',
  border:'1px solid rgba(56,189,248,0.28)',
  borderRadius:16, position:'relative', boxShadow:'0 0 18px rgba(34,211,238,.14)',
  padding:18, animation:'panelPop .45s ease-out both'
};
var panel2 = {
  background:'linear-gradient(135deg, rgba(9,11,13,0.9), rgba(13,16,19,0.9))',
  border:'1px solid rgba(56,189,248,0.28)',
  borderRadius:16, position:'relative', boxShadow:'0 0 18px rgba(34,211,238,.14)',
  padding:18, marginTop:16
};

function PanelHeader(props){
  return (
    <div style={{display:'flex',alignItems:'center',gap:10, marginBottom:10, fontSize:16, opacity:.98}}>
      <span>{props.icon}</span>
      <span>{props.text}</span>
      <div style={{flex:1}} />
      <div style={{height:2, width:120, background:'linear-gradient(90deg,#22d3ee,#14b8a6)', boxShadow:'0 0 10px #22d3ee'}} />
    </div>
  );
}

function PreviewShell(props){
  return (
    <div style={{
      position:'relative',
      border:'1px dashed rgba(56,189,248,0.35)',
      borderRadius:16, minHeight:260,
      display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg, rgba(12,14,16,0.35), rgba(16,18,20,0.55))',
      boxShadow:'0 0 22px rgba(56,189,248,0.20)',
      animation:'neonPulse 2.4s ease-in-out infinite'
    }}>
      {['tl','tr','bl','br'].map(function(_,i){
        return (
          <div key={i} style={{
            position:'absolute', width:30, height:30,
            borderTop: i<2?'2px solid #22d3ee':'none',
            borderLeft: i%2===0?'2px solid #22d3ee':'none',
            borderRight: i%2===1?'2px solid #22d3ee':'none',
            borderBottom: i>=2?'2px solid #22d3ee':'none',
            top: i<2?10:'auto', bottom:i>=2?10:'auto',
            left:i%2===0?10:'auto', right:i%2===1?10:'auto',
            filter:'drop-shadow(0 0 8px #22d3ee)',
            animation:'cornerPulse 1.8s ease-in-out infinite'
          }} />
        );
      })}
      <div style={{position:'relative', zIndex:1, width:'100%'}}>
        {props.children}
      </div>
      <div style={{
        position:'absolute', inset:0,
        background:'linear-gradient(120deg, transparent 20%, rgba(34,211,238,0.09) 45%, transparent 70%)',
        transform:'translateX(-120%)',
        animation:'sweep 3.2s ease-in-out infinite'
      }} />
    </div>
  );
}

var videoStyle = { width:'100%', maxHeight:340, borderRadius:12, objectFit:'cover', outline:'1px solid rgba(56,189,248,0.28)' };
var imageStyle = { maxWidth:'100%', maxHeight:340, borderRadius:12, outline:'1px solid rgba(56,189,248,0.28)' };

function EmptyState(){
  return (
    <div style={{ textAlign:'center', opacity:.9, padding:'28px 0'}}>
      <div style={{ fontSize:46, marginBottom:8 }}>📷</div>
      <div>Load image or activate camera</div>
    </div>
  );
}

function Btn(props){
  return (
    <button onClick={props.onClick} disabled={props.disabled} style={{
      padding: props.wide?'14px 16px':'12px 14px',
      borderRadius:12,
      border:'1px solid rgba(56,189,248,0.35)',
      background:'linear-gradient(135deg, ' + toRGBA(props.color,.34) + ', ' + toRGBA(shade(props.color),.34) + ')',
      color:'#eafcff', cursor:props.disabled?'not-allowed':'pointer',
      transition:'transform .15s ease, box-shadow .2s ease, filter .2s ease',
      width: props.wide?'100%':'auto',
      filter: props.disabled ? 'grayscale(.2) opacity(.8)' : 'none',
      boxShadow:'0 0 16px rgba(34,211,238,.20)',
      ...(props.style || {})
    }}>
      <span style={{marginRight:8}}>{props.icon}</span>{props.text}
    </button>
  );
}

function InfoStrip(){
  return (
    <div style={{
      marginTop:12, padding:'10px 12px',
      borderRadius:10,
      background:'linear-gradient(90deg, rgba(2,132,199,0.18), rgba(13,148,136,0.18))',
      border:'1px solid rgba(56,189,248,0.30)', fontSize:13
    }}>
      Tip: Use diffused light; keep the lesion in focus; fill the frame for best inference.
    </div>
  );
}

function Analyzing(){
  return (
    <div style={{ position:'relative', padding:'28px 14px', textAlign:'center' }}>
      <div style={{
        width:120, height:120, borderRadius:'50%', margin:'0 auto 12px',
        border:'3px solid rgba(56,189,248,0.28)', position:'relative',
        boxShadow:'0 0 18px rgba(34,211,238,0.28)'
      }}>
        <div style={{
          position:'absolute', inset:8, borderRadius:'50%',
          background:'conic-gradient(from 0deg, rgba(34,211,238,.55), rgba(14,165,233,.0) 40%)',
          filter:'blur(1px)', animation:'spin 1.6s linear infinite'
        }} />
        <div style={{
          position:'absolute', inset:0, borderRadius:'50%',
          border:'2px dashed rgba(56,189,248,0.35)', animation:'spin 6s linear infinite reverse'
        }} />
      </div>
      <div>Analyzing dermal pattern…</div>
    </div>
  );
}

function ErrorBox(props){
  return (
    <div style={{
      border:'1px solid rgba(248,113,113,0.35)',
      background:'linear-gradient(135deg, rgba(127,29,29,0.35), rgba(69,10,10,0.35))',
      padding:14, borderRadius:12
    }}>
      ❌ {props.text}
    </div>
  );
}

function ResultBox(props){
  return (
    <div style={{ animation:'fadeUp .4s ease-out both' }}>
      <div style={{
        border:'1px solid rgba(14,165,233,0.35)',
        background:'linear-gradient(135deg, rgba(2,20,30,0.55), rgba(6,37,46,0.45))',
        padding:14, borderRadius:12, marginBottom:12
      }}>
        <pre style={{
          margin:0, whiteSpace:'pre-wrap',
          fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',
          lineHeight:1.6, color:'#d1faff'
        }}>{props.result.analysis}</pre>
      </div>
      <div style={{ fontSize:12, opacity:.9, textAlign:'right' }}>⏱ {props.result.timestamp}</div>
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

function Bubble(props){
  return (
    <div style={{
      display:'flex', justifyContent: props.me?'flex-end':'flex-start',
      marginBottom:10, animation: props.me?'slideInRight .35s ease-out both':'slideInLeft .35s ease-out both'
    }}>
      <div style={{
        maxWidth:'78%', padding:'10px 14px', borderRadius:12,
        border:'1px solid rgba(56,189,248,0.30)',
        background: props.me
          ? 'linear-gradient(135deg, rgba(56,189,248,0.35), rgba(34,211,238,0.35))'
          : 'linear-gradient(135deg, rgba(12,14,16,0.85), rgba(16,18,20,0.85))',
        fontSize:14, lineHeight:1.5
      }}>
        {props.children}
      </div>
    </div>
  );
}

var chatBox = {
  height: 420, overflowY:'auto', border:'1px solid rgba(56,189,248,0.32)',
  borderRadius:14, padding:14,
  background:'linear-gradient(135deg, rgba(12,14,16,0.75), rgba(16,18,20,0.65))',
  boxShadow:'0 0 22px rgba(34,211,238,0.20)'
};
var chatInput = {
  flex:1, padding:'12px 14px', borderRadius:12,
  border:'1px solid rgba(56,189,248,0.35)',
  background:'rgba(12,14,16,0.6)', color:'#eafcff', outline:'none'
};

/* helpers */
function toRGBA(hexColor, a){
  if (hexColor.indexOf('rgb')===0) return hexColor;
  var c = hexColor.replace('#','');
  var n = parseInt(c,16);
  var r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  var alpha = typeof a==='number' ? a : 1;
  return 'rgba('+r+','+g+','+b+','+alpha+')';
}
function shade(hexColor){
  var c = hexColor.replace('#','');
  var n = parseInt(c,16);
  var r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  function s(v){ return Math.max(0, v-28); }
  return '#'+[s(r),s(g),s(b)].map(function(x){return x.toString(16).padStart(2,'0');}).join('');
}

var aboutList = {
  margin:0, paddingLeft:18, lineHeight:1.65, color:'#d7fbff', fontSize:14
};

/* Keyframes */
var CSS = "\
@keyframes spin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }\
@keyframes sweep { 0%{transform:translateX(-120%)} 60%{transform:translateX(20%)} 100%{transform:translateX(120%)} }\
@keyframes neonPulse { 0%,100%{box-shadow:0 0 16px rgba(34,211,238,.20)} 50%{box-shadow:0 0 26px rgba(34,211,238,.36)} }\
@keyframes cornerPulse { 0%,100%{filter:drop-shadow(0 0 7px #22d3ee)} 50%{filter:drop-shadow(0 0 12px #22d3ee)} }\
@keyframes fadeUp { 0%{opacity:0; transform:translateY(8px)} 100%{opacity:1; transform:translateY(0)} }\
@keyframes panelPop { 0%{opacity:.0; transform:scale(.985)} 100%{opacity:1; transform:scale(1)} }\
@keyframes slideInLeft { 0%{opacity:.0; transform:translateX(-10px)} 100%{opacity:1; transform:translateX(0)} }\
@keyframes slideInRight { 0%{opacity:.0; transform:translateX(10px)} 100%{opacity:1; transform:translateX(0)} }\
";

export default App;
