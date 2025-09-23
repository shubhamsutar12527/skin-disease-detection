import React, { useRef, useState } from "react";

function App() {
  // Tabs
  const [tab, setTab] = useState("scan");

  // Scan states
  const [image, setImage] = useState(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  // Camera
  const [cameraOn, setCameraOn] = useState(false);
  const [facing, setFacing] = useState("environment");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);

  // Chat
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState([
    { from: "bot", text: "Arogya Mantra is online. Ask a question or scan an image." }
  ]);

  // Pick file
  function pickFile() {
    if (fileRef.current) fileRef.current.value = "";
    fileRef.current.click();
  }
  function onFileChange(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setImage(ev.target.result); setResult(""); };
    reader.readAsDataURL(f);
  }

  // Camera
  function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Camera not supported in this browser.");
      return;
    }
    setCameraOn(true);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        alert("Camera permission denied.");
        setCameraOn(false);
      });
  }
  function stopCamera() {
    setCameraOn(false);
    const s = videoRef.current && videoRef.current.srcObject;
    if (s) s.getTracks().forEach(t => t.stop());
  }
  function flipCamera() {
    stopCamera();
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    setTimeout(startCamera, 150);
  }
  function capture() {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    const data = c.toDataURL("image/jpeg");
    setImage(data);
    setResult("");
    stopCamera();
  }

  // Analyze with Gemini
  async function analyze() {
    if (!image) return;
    setLoading(true); setResult("");
    try {
      const base64 = image.split(",")[1];
      const payload = {
        contents: [{
          role: "user",
          parts: [
            { text: "Analyze this skin image and return: disease name, confidence (0-100), description, and short medical disclaimer." },
            { inlineData: { mimeType: "image/jpeg", data: base64 } }
          ]
        }]
      };
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDbVaM34izzzi7I65DbYBsH3ssNIfiSaC0",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      const json = await res.json();
      const text = json && json.candidates && json.candidates[0] && json.candidates[0].content &&
                   json.candidates[0].content.parts && json.candidates[0].content.parts[0] &&
                   json.candidates[0].content.parts[0].text;
      setResult(text || "No analysis returned. Try another image.");
    } catch (e) {
      setResult("Error contacting AI. Try again.");
    }
    setLoading(false);
  }

  // Chat
  async function send(e) {
    e && e.preventDefault();
    const t = msg.trim();
    if (!t) return;
    setChat((c) => c.concat({ from: "user", text: t }));
    setMsg("");
    try {
      const payload = { contents: [{ role: "user", parts: [{ text: "Q: " + t + "\nA:" }] }] };
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDbVaM34izzzi7I65DbYBsH3ssNIfiSaC0",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      const json = await res.json();
      const text = json && json.candidates && json.candidates[0] &&
                   json.candidates[0].content && json.candidates[0].content.parts &&
                   json.candidates[0].content.parts[0] && json.candidates[0].content.parts[0].text;
      setChat((c) => c.concat({ from: "bot", text: text || "Sorry, no response." }));
    } catch {
      setChat((c) => c.concat({ from: "bot", text: "Network error." }));
    }
  }

  // UI helpers
  const Wrap = (p) => <div style={{maxWidth:880,margin:"0 auto",padding:16}} {...p} />;
  const Card = (p) => <section style={{
    background:"#12161b", border:"1px solid #263340", borderRadius:14,
    padding:18, boxShadow:"0 0 22px #0b0f14", ...p.style
  }}>{p.children}</section>;

  return (
    <div style={{ minHeight:"100vh", background:"#07090c", color:"#e9fbff", fontFamily:"Inter,system-ui,Segoe UI,Arial,sans-serif" }}>
      <Wrap>
        {/* Header */}
        <header style={{textAlign:"center", margin:"34px 0 20px"}}>
          <div style={{fontSize:44,fontWeight:900,letterSpacing:.6}}>
            <span style={{color:"#ffffff",textShadow:"0 0 10px #fff"}}>Arogya</span>{" "}
            <span style={{color:"#2ef4a6",textShadow:"0 0 16px #19ffd1,0 0 30px rgba(25,255,209,.6)"}}>Mantra</span>
          </div>
          <div style={{opacity:.85}}>AI Skin Health Interface</div>
          <div style={{height:2,width:180,margin:"16px auto 0",background:"linear-gradient(90deg,#22d3ee,#2ef4a6)",boxShadow:"0 0 14px #22d3ee"}} />
        </header>

        {/* Tabs */}
        <div style={{display:"flex",justifyContent:"center",gap:10,margin:"22px 0"}}>
          <button onClick={()=>setTab("scan")} style={tabBtn(tab==="scan")}>🔬 Scan</button>
          <button onClick={()=>setTab("chat")} style={tabBtn(tab==="chat")}>🤖 Assistant</button>
        </div>

        {/* Scan tab */}
        {tab==="scan" && (
          <div>
            <Card style={{maxWidth:520, margin:"0 auto 14px"}}>
              <div style={{border:"2px dashed #2ef4a6",borderRadius:12,minHeight:220,background:"#0e1216",
                           display:"flex",alignItems:"center",justifyContent:"center", padding:8}}>
                {cameraOn ? (
                  <div style={{width:"100%"}}>
                    <video ref={videoRef} autoPlay playsInline muted style={{width:"100%",borderRadius:10}} />
                    <canvas ref={canvasRef} style={{display:"none"}} />
                  </div>
                ) : image ? (
                  <img src={image} alt="preview" style={{maxWidth:"100%",maxHeight:260,borderRadius:10}} />
                ) : (
                  <div style={{opacity:.9,textAlign:"center"}}>
                    <div style={{fontSize:38,marginBottom:10}}>📷</div>
                    <div>Upload image or use camera</div>
                  </div>
                )}
              </div>

              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:14}}>
                {!cameraOn ? (
                  <>
                    <button onClick={pickFile} style={actionBtn("#38bdf8")}>📁 Load</button>
                    <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} style={{display:"none"}} />
                    <button onClick={startCamera} style={actionBtn("#2ef4a6")}>🎥 Camera</button>
                    <button onClick={analyze} disabled={!image||loading}
                            style={{...actionBtn("#0ea5e9"),opacity:(!image||loading)?0.6:1,cursor:(!image||loading)?"not-allowed":"pointer"}}>
                      {loading ? "Analyzing..." : "🧠 Analyze"}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={capture} style={actionBtn("#ef4444")}>📸 Capture</button>
                    <button onClick={flipCamera} style={actionBtn("#22d3ee")}>🔄 Flip</button>
                    <button onClick={stopCamera} style={actionBtn("#64748b")}>⛔ Close</button>
                  </>
                )}
              </div>

              <div style={{marginTop:10,fontSize:13,background:"#161a20",padding:"8px 12px",borderRadius:8,color:"#9afae7"}}>
                Tip: Bright, soft light and a steady close shot improve results.
              </div>
            </Card>

            {result && (
              <Card style={{maxWidth:520, margin:"0 auto 14px", color:"#bffdf4"}}>
                <div style={{fontWeight:700, marginBottom:6}}>Analysis</div>
                <pre style={{whiteSpace:"pre-wrap", margin:0, fontFamily:"inherit"}}>{result}</pre>
              </Card>
            )}

            <Card style={{maxWidth:520, margin:"0 auto 18px", background:"#12161b"}}>
              <div style={{fontWeight:700, marginBottom:6}}>About</div>
              <ul style={{margin:0,paddingLeft:18,opacity:.95}}>
                <li>Helps understand common skin conditions from a photo.</li>
                <li>Educational support only; not a medical diagnosis.</li>
                <li>No images are stored by the app.</li>
                <li>See a clinician for serious or uncertain cases.</li>
              </ul>
            </Card>
          </div>
        )}

        {/* Chat tab */}
        {tab==="chat" && (
          <Card style={{maxWidth:560, margin:"0 auto"}}>
            <div style={{fontWeight:700, marginBottom:8}}>Skin Health Assistant</div>
            <div style={{minHeight:200,maxHeight:320,overflowY:"auto",background:"#0f1318",borderRadius:8,padding:"8px 6px", marginBottom:10}}>
              {chat.map((m,i)=>(
                <div key={i} style={{textAlign:m.from==="user"?"right":"left",margin:"8px 0"}}>
                  <span style={{
                    display:"inline-block", maxWidth:"78%", wordBreak:"break-word",
                    background: m.from==="user" ? "linear-gradient(90deg,#2ef4a6,#22d3ee 70%)" : "#1c222a",
                    color: m.from==="user" ? "#0b1511" : "#c9fff6",
                    padding:"8px 12px", borderRadius:8, boxShadow: m.from==="user" ? "0 0 10px #18f8c8" : "0 0 8px #0b1116"
                  }}>{m.text}</span>
                </div>
              ))}
            </div>
            <form onSubmit={send} style={{display:"flex",gap:8}}>
              <input value={msg} onChange={(e)=>setMsg(e.target.value)} placeholder="Ask about symptoms, care, sunscreen..."
                     style={{flex:1,padding:"10px 12px",borderRadius:8,border:"2px solid #22d3ee"}} />
              <button type="submit" style={{padding:"0 18px",borderRadius:8,border:"none",
                background:"linear-gradient(90deg,#2ef4a6,#22d3ee 70%)", color:"#081412", fontWeight:800, cursor:"pointer"}}>Send</button>
            </form>
          </Card>
        )}
      </Wrap>
    </div>
  );
}

/* Styles helpers */
function tabBtn(active) {
  return {
    background: active ? "#141921" : "#22252a",
    color: active ? "#2ef4a6" : "#e4fdfe",
    border: active ? "2px solid #2ef4a6" : "2px solid #222a2e",
    fontWeight:800, fontSize:16, padding:"10px 18px", borderRadius:8,
    boxShadow: active ? "0 0 12px #27f6c4" : undefined,
    cursor:"pointer"
  };
}
function actionBtn(color) {
  return {
    background: "linear-gradient(100deg,"+color+",#0f2021 88%)",
    color:"#f5fefc", fontWeight:700, borderRadius:8, border:"none",
    boxShadow:"0 0 10px "+color, padding:"12px 16px", fontSize:15, cursor:"pointer"
  };
}

export default App;
