import React, { useState, useRef, useEffect } from 'react';

function App() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('diagnosis');
  const [isCameraActive, setIsCameraActive] = useState(false);
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
      text: 'Hello! I am your AI skin health assistant. Ask me about skin conditions, treatments, or skincare advice!'
    }]);
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target.result);
        setResult(null);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setIsCameraActive(true);
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch(err => {
          setError('Camera access denied. Please allow camera permissions.');
          setIsCameraActive(false);
        });
    } else {
      setError('Camera not supported in this browser.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      const capturedImage = canvasRef.current.toDataURL('image/jpeg');
      setImage(capturedImage);
      
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const analyzeImage = async () => {
    if (!image) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const base64 = image.split(',')[1];
      
      const data = {
        contents: [{
          role: "user",
          parts: [
            { text: "Analyze this skin image. Provide disease name, confidence score, description, and medical disclaimer." },
            { inlineData: { mimeType: "image/jpeg", data: base64 } }
          ]
        }]
      };

      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDbVaM34izzzi7I65DbYBsH3ssNIfiSaC0',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }
      );

      const json = await response.json();
      
      if (json.candidates && json.candidates[0]) {
        const text = json.candidates[0].content.parts[0].text;
        setResult({ analysis: text, timestamp: new Date().toLocaleString() });
      } else {
        setError('No analysis received');
      }

    } catch (err) {
      setError('Analysis failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (userMessage.trim() === '') return;

    const newMessage = { role: 'user', text: userMessage };
    setChatHistory(prev => [...prev, newMessage]);
    setUserMessage('');
    setIsChatting(true);

    try {
      const prompt = `You are a helpful skin health assistant. Answer this question: "${userMessage}". Provide helpful information but remind users to consult healthcare professionals for serious concerns.`;
      
      const data = {
        contents: [{
          role: "user",
          parts: [{ text: prompt }]
        }]
      };

      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDbVaM34izzzi7I65DbYBsH3ssNIfiSaC0',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }
      );

      const json = await response.json();
      
      if (json.candidates && json.candidates[0]) {
        const botMessage = json.candidates[0].content.parts[0].text;
        setChatHistory(prev => [...prev, { role: 'bot', text: botMessage }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'bot', text: 'Sorry, I could not process your question.' }]);
      }

    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'bot', text: 'I am experiencing technical difficulties.' }]);
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '40px', color: 'white' }}>
          <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🩺</div>
          <h1 style={{ fontSize: '3rem', fontWeight: '800', margin: '0 0 15px 0' }}>
            Arogya Mitra
          </h1>
          <p style={{ fontSize: '1.2rem', opacity: '0.9' }}>
            AI-Powered Skin Health Analysis & Assistant
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '15px', padding: '5px' }}>
            <button
              onClick={() => setActiveTab('diagnosis')}
              style={{
                padding: '12px 30px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: activeTab === 'diagnosis' ? 'white' : 'transparent',
                color: activeTab === 'diagnosis' ? '#333' : 'white',
                fontWeight: '600',
                cursor: 'pointer',
                marginRight: '5px'
              }}
            >
              🔬 Skin Analysis
            </button>
            <button
              onClick={() => setActiveTab('chatbot')}
              style={{
                padding: '12px 30px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: activeTab === 'chatbot' ? 'white' : 'transparent',
                color: activeTab === 'chatbot' ? '#333' : 'white',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🤖 AI Assistant
            </button>
          </div>
        </div>

        {activeTab === 'diagnosis' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            
            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '30px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', textAlign: 'center', marginBottom: '20px' }}>
                📸 Upload or Capture Image
              </h2>

              <div style={{
                border: '3px dashed #ccc',
                borderRadius: '15px',
                padding: '30px',
                textAlign: 'center',
                marginBottom: '20px',
                minHeight: '250px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {isCameraActive ? (
                  <div style={{ width: '100%' }}>
                    <video ref={videoRef} style={{ width: '100%', borderRadius: '10px' }} autoPlay></video>
                    <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                  </div>
                ) : image ? (
                  <img src={image} alt="Preview" style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '10px' }} />
                ) : (
                  <div>
                    <div style={{ fontSize: '4rem', marginBottom: '15px' }}>📷</div>
                    <p>Upload image or use camera</p>
                  </div>
                )}
              </div>

              <input type="file" accept="image/*" onChange={handleFileSelect} ref={fileRef} style={{ display: 'none' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <button
                  onClick={() => fileRef.current.click()}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  📁 Upload
                </button>
                
                {!isCameraActive ? (
                  <button
                    onClick={startCamera}
                    style={{
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    📷 Camera
                  </button>
                ) : (
                  <button
                    onClick={capturePhoto}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    📸 Capture
                  </button>
                )}

                <button
                  onClick={analyzeImage}
                  disabled={!image || loading}
                  style={{
                    background: loading || !image ? '#ccc' : '#667eea',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '10px',
                    cursor: loading || !image ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {loading ? '🔍 Analyzing...' : '🧠 Analyze'}
                </button>
              </div>

              <div style={{ padding: '15px', backgroundColor: '#fffbeb', borderRadius: '10px' }}>
                <h4 style={{ color: '#92400e', marginBottom: '10px' }}>💡 Tips:</h4>
                <ul style={{ fontSize: '0.9rem', color: '#78350f', paddingLeft: '20px' }}>
                  <li>Use good lighting</li>
                  <li>Keep image clear and focused</li>
                  <li>Show affected area clearly</li>
                </ul>
              </div>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '30px' }}>
              {loading && (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔍</div>
                  <h3>AI is analyzing your image...</h3>
                </div>
              )}

              {error && (
                <div style={{ backgroundColor: '#fef2f2', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '15px' }}>❌</div>
                  <h3 style={{ color: '#dc2626' }}>Error</h3>
                  <p style={{ color: '#7f1d1d' }}>{error}</p>
                </div>
              )}

              {result && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📊</div>
                    <h2 style={{ color: '#059669' }}>Analysis Complete</h2>
                  </div>

                  <div style={{ backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '10px', marginBottom: '15px' }}>
                    <pre style={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'Georgia, serif',
                      fontSize: '1rem',
                      lineHeight: '1.6',
                      margin: 0
                    }}>
                      {result.analysis}
                    </pre>
                  </div>

                  <div style={{ fontSize: '0.9rem', color: '#666', textAlign: 'right' }}>
                    🕒 {result.timestamp}
                  </div>

                  <div style={{ backgroundColor: '#fef3c7', padding: '15px', borderRadius: '10px', marginTop: '15px' }}>
                    <h4 style={{ color: '#92400e' }}>⚠️ Medical Disclaimer</h4>
                    <p style={{ color: '#78350f', fontSize: '0.9rem' }}>
                      This analysis is for educational purposes only. Always consult a healthcare professional.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'chatbot' && (
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '30px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🤖</div>
              <h2>AI Skin Health Assistant</h2>
              <p style={{ color: '#666' }}>Ask me about skin conditions, treatments, or skincare advice</p>
            </div>

            <div 
              ref={chatRef}
              style={{
                height: '400px',
                overflowY: 'auto',
                border: '2px solid #e5e7eb',
                borderRadius: '15px',
                padding: '20px',
                marginBottom: '20px',
                backgroundColor: '#f9fafb'
              }}
            >
              {chatHistory.map((msg, index) => (
                <div 
                  key={index} 
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: '15px'
                  }}
                >
                  <div style={{
                    maxWidth: '80%',
                    padding: '12px 18px',
                    borderRadius: '18px',
                    backgroundColor: msg.role === 'user' ? '#667eea' : '#e5e7eb',
                    color: msg.role === 'user' ? 'white' : '#374151',
                    wordWrap: 'break-word'
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {isChatting && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    padding: '12px 18px',
                    borderRadius: '18px',
                    backgroundColor: '#e5e7eb',
                    color: '#374151'
                  }}>
                    Typing...
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <input
                type="text"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about skin conditions, treatments, or care tips..."
                disabled={isChatting}
                style={{
                  flex: 1,
                  padding: '15px 20px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
              <button
                onClick={sendMessage}
                disabled={isChatting || userMessage.trim() === ''}
                style={{
                  background: isChatting || userMessage.trim() === '' ? '#ccc' : '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  cursor: isChatting || userMessage.trim() === '' ? 'not-allowed' : 'pointer',
                  fontSize: '1.2rem'
                }}
              >
                🚀
              </button>
            </div>

            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '10px' }}>
              <h4 style={{ color: '#0369a1', marginBottom: '10px' }}>💬 Try asking:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  onClick={() => setUserMessage('What causes acne?')}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'white',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: '#0369a1',
                    textAlign: 'left'
                  }}
                >
                  What causes acne?
                </button>
                <button
                  onClick={() => setUserMessage('How to care for dry skin?')}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'white',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: '#0369a1',
                    textAlign: 'left'
                  }}
                >
                  Dry skin care tips?
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '50px', color: 'rgba(255,255,255,0.8)' }}>
          <p>Made with ❤️ using Google Gemini AI</p>
        </div>
      </div>
    </div>
  );
}

export default App;
