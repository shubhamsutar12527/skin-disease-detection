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

  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 820 : false;

  // Welcome bot message
  useEffect(() => {
    setChatHistory([{
      role: 'bot',
      text: "Greetings, explorer. I'm Arogya OS v2. Scan a skin sample or query the medical core."
    }]);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatHistory, isChatting]);

  // File upload
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
      setError('Device camera not supported. Try Chrome or Firefox.');
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
      setError('Camera permission denied. Enable camera in browser settings.');
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
            { text: "Analyze this skin image. Return disease name, confidence (0-100), description, and a medical disclaimer. Keep the text structured." },
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

  // Chatbot
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
          parts: [{ text: `You are Arogya OS (futuristic medical AI). Answer simply and clearly: "${q}". Add one short safety note if needed.` }]
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

  // Sci‑Fi styles
  const neon = (c1, c2='rgba(0,0,0,0)') => ({
    boxShadow: `0 0 12px ${c1}, inset 0 0 12px ${c2}`
  });

  const holoPanel = {
    background: 'linear-gradient(135deg, rgba(15,23,42,0.65), rgba(2,6,23,0.65))',
    border: '1px solid rgba(56,189,248,0.35)',
    backdropFilter: 'blur(8px)',
    borderRadius: 16,
    position: 'relative'
  };

  const gridBg = {
    background:
      `radial-gradient(circle at 10% 10%, rgba(59,130,246,0.18) 0, transparent 50%),
       radial-gradient(circle at 90% 20%, rgba(20,184,166,0.18) 0, transparent 45%),
       linear-gradient(transparent 98%, rgba(148,163,184,0.15) 98%),
       linear-gradient(90deg, transparent 98%, rgba(148,163,184,0.15) 98%)`,
    backgroundSize: '600px 600px, 600px 600px, 32px 32px, 32px 32px'
  };

  return (
    <div style={{
      minHeight: '100vh',
      overflowX: 'hidden',
      color: '#e6f7ff',
      ...gridBg,
      backgroundColor: '#030712'
    }}>
      {/* Scanlines + vignette */}
      <div style={{
        pointerEvents: 'none',
        position: 'fixed', inset: 0,
        background:
          'repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 4px)',
        mixBlendMode: 'overlay',
        opacity: 0.35
      }} />
      <div style={{
        pointerEvents: 'none',
        position: 'fixed', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.6) 100%)'
      }} />

      {/* Header */}
      <header style={{ padding: '32px 16px 8px', textAlign: 'center' }}>
        <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: 1 }}>
          <span style={{ color: '#7dd3fc', textShadow: '0 0 12px #38bdf8' }}>Arogya</span>
          <span style={{ color: '#a78bfa', textShadow: '0 0 12px #8b5cf6' }}> OS</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 14, opacity: 0.85 }}>
          AI Medical Interface • Skin Scanner v2
        </div>
        <div style={{ height: 3, margin: '18px auto 0', width: 220,
          background: 'linear-gradient(90deg, #22d3ee, #8b5cf6)',
          filter: 'blur(0.4px)', borderRadius: 2, ...neon('#22d3ee') }} />
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '18px 12px 26px' }}>
        <div style={{
          ...holoPanel, padding: 6, display: 'flex', gap: 6,
          width: isMobile ? '92%' : 'auto', ...neon('rgba(125,211,252,0.35)')
        }}>
          <button
            onClick={() => setActiveTab('diagnosis')}
            style={{
              padding: '10px 18px',
              borderRadius: 12,
              border: '1px solid rgba(56,189,248,0.35)',
              background: activeTab === 'diagnosis'
                ? 'linear-gradient(135deg, rgba(34,211,238,0.25), rgba(139,92,246,0.25))'
                : 'transparent',
              color: '#c7d2fe',
              cursor: 'pointer',
              transition: 'all .25s',
              ...neon(activeTab === 'diagnosis' ? '#60a5fa' : 'transparent')
            }}
          >
            🔬 Scan Module
          </button>
          <button
            onClick={() => setActiveTab('chatbot')}
            style={{
              padding: '10px 18px',
              borderRadius: 12,
              border: '1px solid rgba(56,189,248,0.35)',
              background: activeTab === 'chatbot'
                ? 'linear-gradient(135deg, rgba(34,211,238,0.25), rgba(139,92,246,0.25))'
                : 'transparent',
              color: '#c7d2fe',
              cursor: 'pointer',
              transition: 'all .25s',
              ...neon(activeTab === 'chatbot' ? '#60a5fa' : 'transparent')
            }}
          >
            🤖 Medical Core
          </button>
        </div>
      </div>

      {/* Panels */}
      {activeTab === 'diagnosis' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 18, padding: '0 14px 40px', maxWidth: 1200, margin: '0 auto'
        }}>
          {/* Left: Capture/Upload */}
          <section style={{ ...holoPanel, padding: 18 }}>
            <div style={{ fontSize: 16, marginBottom: 12, opacity: 0.9 }}>
              📡 Input Console
            </div>

            <div style={{
              border: '1px dashed rgba(125,211,252,0.35)',
              borderRadius: 14,
              minHeight: 240,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              background: 'linear-gradient(135deg, rgba(2,6,23,0.1), rgba(15,23,42,0.35))',
              ...neon('rgba(125,211,252,0.25)')
            }}>
              {/* corner brackets */}
              {['tl','tr','bl','br'].map((k,i)=>(
                <div key={i} style={{
                  position: 'absolute',
                  width: 28, height: 28,
                  borderTop: i<2?'2px solid #22d3ee':'none',
                  borderLeft: i%2===0?'2px solid #22d3ee':'none',
                  borderRight: i%2===1?'2px solid #22d3ee':'none',
                  borderBottom: i>=2?'2px solid #22d3ee':'none',
                  top: i<2?8:'auto', bottom: i>=2?8:'auto',
                  left: i%2===0?8:'auto', right: i%2===1?8:'auto',
                  filter: 'drop-shadow(0 0 6px #22d3ee)'
                }} />
              ))}

              {isCameraActive ? (
                <div style={{ width: '100%' }}>
                  <video
                    ref={videoRef}
                    autoPlay playsInline muted
                    style={{
                      width: '100%', maxHeight: 320, borderRadius: 10,
                      objectFit: 'cover', outline: '1px solid rgba(125,211,252,0.25)'
                    }}
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
              ) : image ? (
                <img
                  src={image} alt="preview"
                  style={{
                    maxWidth: '100%', maxHeight: 320, borderRadius: 10,
                    outline: '1px solid rgba(125,211,252,0.25)'
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', opacity: 0.9 }}>
                  <div style={{ fontSize: 44, marginBottom: 8 }}>📷</div>
                  <div>Load image or activate camera</div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : (isCameraActive ? '1fr 1fr 1fr' : '1fr 1fr 1fr'),
              gap: 10, marginTop: 14
            }}>
              {!isCameraActive && (
                <>
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={buttonStyle('#22d3ee', '#0ea5e9')}
                  >
                    📁 Load
                  </button>
                  <button
                    onClick={() => startCamera('environment')}
                    style={buttonStyle('#8b5cf6', '#7c3aed')}
                  >
                    🎥 Camera
                  </button>
                </>
              )}
              {isCameraActive && (
                <>
                  <button onClick={capturePhoto} style={buttonStyle('#ef4444', '#dc2626')}>📸 Capture</button>
                  <button onClick={switchCamera} style={buttonStyle('#a78bfa', '#8b5cf6')}>🔄 Flip</button>
                  <button onClick={stopCamera} style={buttonStyle('#94a3b8', '#64748b')}>⛔ Close</button>
                </>
              )}
              {!isCameraActive && (
                <button
                  onClick={analyzeImage}
                  disabled={!image || loading}
                  style={{
                    ...buttonStyle('#34d399', '#10b981'),
                    opacity: (!image || loading) ? 0.6 : 1,
                    cursor: (!image || loading) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? '🔎 Scanning…' : '🧠 Analyze'}
                </button>
              )}
            </div>

            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />

            {/* Tips ribbon */}
            <div style={{
              marginTop: 14, padding: '10px 12px',
              borderRadius: 10,
              background: 'linear-gradient(90deg, rgba(34,197,94,0.12), rgba(59,130,246,0.12))',
              border: '1px solid rgba(34,197,94,0.25)',
              fontSize: 13
            }}>
              ⓘ Tip: Use bright, diffused light; keep the lesion in focus; fill the frame for best inference.
            </div>
          </section>

          {/* Right: Result */}
          {(result || error || loading) && (
            <section style={{ ...holoPanel, padding: 18, ...neon('rgba(168,85,247,0.25)') }}>
              <div style={{ fontSize: 16, marginBottom: 12, opacity: 0.9 }}>📊 Diagnostic Output</div>

              {loading && (
                <div style={{ textAlign: 'center', padding: '32px 12px' }}>
                  <div style={{
                    width: 64, height: 64, margin: '0 auto 14px',
                    borderRadius: '50%',
                    border: '3px solid rgba(125,211,252,0.25)',
                    borderTopColor: '#22d3ee',
                    animation: 'spin 1s linear infinite',
                    filter: 'drop-shadow(0 0 6px #22d3ee)'
                  }} />
                  <div>Scanning the dermal matrix…</div>
                </div>
              )}

              {error && (
                <div style={{
                  border: '1px solid rgba(248,113,113,0.35)',
                  background: 'linear-gradient(135deg, rgba(127,29,29,0.35), rgba(69,10,10,0.35))',
                  padding: 14, borderRadius: 12
                }}>
                  ❌ {error}
                </div>
              )}

              {result && (
                <div>
                  <div style={{
                    border: '1px solid rgba(34,197,94,0.35)',
                    background: 'linear-gradient(135deg, rgba(6,78,59,0.35), rgba(21,128,61,0.25))',
                    padding: 14, borderRadius: 12, marginBottom: 12
                  }}>
                    <pre style={{
                      margin: 0, whiteSpace: 'pre-wrap',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      lineHeight: 1.6, color: '#d1fae5'
                    }}>
{result.analysis}
                    </pre>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8, textAlign: 'right' }}>⏱ {result.timestamp}</div>
                  <div style={{
                    marginTop: 10, padding: 10, fontSize: 12, borderRadius: 10,
                    border: '1px solid rgba(250,204,21,0.35)',
                    background: 'linear-gradient(135deg, rgba(113,63,18,0.35), rgba(180,83,9,0.25))'
                  }}>
                    ⚠️ Educational tool only. For diagnosis/treatment, consult a licensed clinician.
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Chat core */}
      {activeTab === 'chatbot' && (
        <div style={{ padding: '0 14px 40px', maxWidth: 1000, margin: '0 auto' }}>
          <section style={{ ...holoPanel, padding: 18 }}>
            <div style={{ fontSize: 16, marginBottom: 12, opacity: 0.9 }}>🧬 Medical Core Chat</div>
            <div
              ref={chatRef}
              style={{
                height: isMobile ? 360 : 420,
                overflowY: 'auto',
                border: '1px solid rgba(56,189,248,0.3)',
                borderRadius: 14,
                padding: 14,
                background: 'linear-gradient(135deg, rgba(2,6,23,0.55), rgba(15,23,42,0.45))',
                ...neon('rgba(125,211,252,0.2)')
              }}
            >
              {chatHistory.map((m, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 10
                }}>
                  <div style={{
                    maxWidth: '78%',
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: '1px solid rgba(56,189,248,0.25)',
                    background: m.role === 'user'
                      ? 'linear-gradient(135deg, rgba(59,130,246,0.35), rgba(139,92,246,0.35))'
                      : 'linear-gradient(135deg, rgba(2,6,23,0.65), rgba(15,23,42,0.65))',
                    fontSize: 14,
                    lineHeight: 1.5
                  }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isChatting && (
                <div style={{ opacity: 0.8, fontSize: 13 }}>…linking to medical core</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                type="text"
                value={userMessage}
                onChange={(e)=>setUserMessage(e.target.value)}
                onKeyDown={(e)=> e.key==='Enter' && sendMessage()}
                placeholder="Query the medical core…"
                style={{
                  flex: 1, padding: '12px 14px', borderRadius: 12,
                  border: '1px solid rgba(56,189,248,0.35)',
                  background: 'rgba(2,6,23,0.5)', color: '#e6f7ff',
                  outline: 'none'
                }}
              />
              <button
                onClick={sendMessage}
                disabled={isChatting || !userMessage.trim()}
                style={{
                  padding: '12px 16px', borderRadius: 12, cursor: isChatting || !userMessage.trim() ? 'not-allowed' : 'pointer',
                  border: '1px solid rgba(56,189,248,0.35)',
                  background: 'linear-gradient(135deg, rgba(34,211,238,0.25), rgba(139,92,246,0.25))',
                  ...neon('#60a5fa')
                }}
              >
                🚀 Send
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Keyframes */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
      `}} />
    </div>
  );

  function buttonStyle(c1, c2) {
    return {
      padding: '10px 14px',
      borderRadius: 12,
      border: '1px solid rgba(56,189,248,0.35)',
      background: `linear-gradient(135deg, ${hexToRgba(c1,0.28)}, ${hexToRgba(c2,0.28)})`,
      color: '#e6f7ff',
      cursor: 'pointer',
      transition: 'transform .15s ease, box-shadow .2s ease',
      ...neon('rgba(125,211,252,0.25)')
    };
  }

  function hexToRgba(hex, a=1) {
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
    const c = hex.replace('#','');
    const bigint = parseInt(c,16);
    const r = (bigint>>16)&255, g=(bigint>>8)&255, b=bigint&255;
    return `rgba(${r},${g},${b},${a})`;
  }
}

export default App;
