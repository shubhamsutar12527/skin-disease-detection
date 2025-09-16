# Create mobile-optimized version with camera flip and better mobile UI
mobile_optimized_app = '''import React, { useState, useRef, useEffect } from 'react';

function App() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('diagnosis');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentCamera, setCurrentCamera] = useState('environment'); // 'environment' = back, 'user' = front
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

  const startCamera = (facingMode = 'environment') => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setIsCameraActive(true);
      setError('');
      
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            setCurrentCamera(facingMode);
          }
        })
        .catch(err => {
          console.error('Camera error:', err);
          setError('Camera access denied. Please allow camera permissions in your browser settings.');
          setIsCameraActive(false);
        });
    } else {
      setError('Camera not supported in this browser. Please use Chrome, Firefox, or Safari.');
    }
  };

  const switchCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      // Stop current camera
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    
    // Switch to opposite camera
    const newCamera = currentCamera === 'environment' ? 'user' : 'environment';
    startCamera(newCamera);
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
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
      setResult(null);
      setError('');
      
      // Stop camera after capture
      stopCamera();
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
            { text: "Analyze this skin image. Provide disease name, confidence score, description, symptoms, and medical disclaimer. Format clearly." },
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
        setError('No analysis received from AI');
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
      const prompt = `You are a helpful skin health assistant. Answer this question: "${userMessage}". Provide helpful, accurate information but always remind users to consult healthcare professionals for serious concerns. Keep responses clear and concise.`;
      
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
        setChatHistory(prev => [...prev, { role: 'bot', text: 'Sorry, I could not process your question. Please try again.' }]);
      }

    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'bot', text: 'I am experiencing technical difficulties. Please try again later.' }]);
    } finally {
      setIsChatting(false);
    }
  };

  const isMobile = window.innerWidth <= 768;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: isMobile ? '10px' : '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: isMobile ? '100%' : '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '20px' : '40px', color: 'white' }}>
          <div style={{ fontSize: isMobile ? '3rem' : '4rem', marginBottom: '10px' }}>🩺</div>
          <h1 style={{ 
            fontSize: isMobile ? '2.2rem' : '3rem', 
            fontWeight: '800', 
            margin: '0 0 15px 0',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }}>
            Arogya Mitra
          </h1>
          <p style={{ 
            fontSize: isMobile ? '1rem' : '1.2rem', 
            opacity: '0.9',
            padding: isMobile ? '0 10px' : '0'
          }}>
            AI-Powered Skin Health Analysis & Assistant
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: '15px',
            padding: '3px',
            backdropFilter: 'blur(10px)',
            width: isMobile ? '100%' : 'auto',
            maxWidth: '400px'
          }}>
            <button
              onClick={() => setActiveTab('diagnosis')}
              style={{
                padding: isMobile ? '10px 15px' : '12px 30px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: activeTab === 'diagnosis' ? 'white' : 'transparent',
                color: activeTab === 'diagnosis' ? '#333' : 'white',
                fontWeight: '600',
                cursor: 'pointer',
                marginRight: '3px',
                fontSize: isMobile ? '0.9rem' : '1rem',
                width: isMobile ? '48%' : 'auto'
              }}
            >
              🔬 Skin Analysis
            </button>
            <button
              onClick={() => setActiveTab('chatbot')}
              style={{
                padding: isMobile ? '10px 15px' : '12px 30px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: activeTab === 'chatbot' ? 'white' : 'transparent',
                color: activeTab === 'chatbot' ? '#333' : 'white',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: isMobile ? '0.9rem' : '1rem',
                width: isMobile ? '48%' : 'auto'
              }}
            >
              🤖 AI Assistant
            </button>
          </div>
        </div>

        {/* Diagnosis Tab */}
        {activeTab === 'diagnosis' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : (image || result || loading || error) ? '1fr 1fr' : '1fr',
            gap: isMobile ? '20px' : '30px'
          }}>
            
            {/* Upload/Camera Section */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              padding: isMobile ? '20px' : '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{
                fontSize: isMobile ? '1.3rem' : '1.5rem',
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: '20px',
                color: '#333'
              }}>
                📸 Upload or Capture Image
              </h2>

              {/* Image/Camera Display Area */}
              <div style={{
                border: '3px dashed #ccc',
                borderRadius: '15px',
                padding: isMobile ? '20px' : '30px',
                textAlign: 'center',
                marginBottom: '20px',
                minHeight: isMobile ? '200px' : '250px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc'
              }}>
                {isCameraActive ? (
                  <div style={{ width: '100%' }}>
                    <video 
                      ref={videoRef} 
                      style={{ 
                        width: '100%', 
                        maxHeight: isMobile ? '200px' : '250px',
                        borderRadius: '10px',
                        objectFit: 'cover'
                      }} 
                      autoPlay 
                      playsInline
                      muted
                    ></video>
                    <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                    
                    {/* Camera Controls */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '10px',
                      marginTop: '15px'
                    }}>
                      <button
                        onClick={capturePhoto}
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          padding: '12px 20px',
                          borderRadius: '25px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.9rem',
                          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                        }}
                      >
                        📸 Capture Photo
                      </button>
                      <button
                        onClick={switchCamera}
                        style={{
                          background: '#8b5cf6',
                          color: 'white',
                          border: 'none',
                          padding: '12px 20px',
                          borderRadius: '25px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.9rem',
                          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                        }}
                      >
                        🔄 Flip Camera
                      </button>
                      <button
                        onClick={stopCamera}
                        style={{
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          padding: '12px 20px',
                          borderRadius: '25px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.9rem'
                        }}
                      >
                        ❌ Close
                      </button>
                    </div>
                  </div>
                ) : image ? (
                  <div style={{ width: '100%' }}>
                    <img 
                      src={image} 
                      alt="Preview" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: isMobile ? '200px' : '250px', 
                        borderRadius: '10px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }} 
                    />
                    <p style={{
                      marginTop: '15px',
                      color: '#10b981',
                      fontWeight: '600',
                      fontSize: '0.95rem'
                    }}>
                      ✅ Image ready for analysis
                    </p>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: isMobile ? '3.5rem' : '4rem', marginBottom: '15px' }}>📷</div>
                    <p style={{ 
                      fontSize: isMobile ? '1rem' : '1.1rem',
                      color: '#6b7280',
                      fontWeight: '500'
                    }}>
                      Upload image or use camera
                    </p>
                    <p style={{
                      fontSize: '0.9rem',
                      color: '#9ca3af',
                      marginTop: '8px'
                    }}>
                      Take a clear photo of the affected skin area
                    </p>
                  </div>
                )}
              </div>

              <input type="file" accept="image/*" onChange={handleFileSelect} ref={fileRef} style={{ display: 'none' }} />

              {/* Action Buttons */}
              {!isCameraActive && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr',
                  gap: '10px',
                  marginBottom: '20px'
                }}>
                  <button
                    onClick={() => fileRef.current && fileRef.current.click()}
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      border: 'none',
                      padding: isMobile ? '14px 12px' : '12px 16px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: isMobile ? '0.9rem' : '1rem',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                      transition: 'transform 0.2s'
                    }}
                  >
                    📁 Upload
                  </button>
                  
                  <button
                    onClick={() => startCamera('environment')}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      color: 'white',
                      border: 'none',
                      padding: isMobile ? '14px 12px' : '12px 16px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: isMobile ? '0.9rem' : '1rem',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                      transition: 'transform 0.2s'
                    }}
                  >
                    📷 Camera
                  </button>

                  {!isMobile && (
                    <button
                      onClick={analyzeImage}
                      disabled={!image || loading}
                      style={{
                        background: loading || !image 
                          ? 'linear-gradient(135deg, #d1d5db, #9ca3af)' 
                          : 'linear-gradient(135deg, #667eea, #764ba2)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        cursor: loading || !image ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem',
                        boxShadow: loading || !image ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.3)',
                        transition: 'transform 0.2s'
                      }}
                    >
                      {loading ? '🔍 Analyzing...' : '🧠 Analyze'}
                    </button>
                  )}
                </div>
              )}

              {/* Mobile Analyze Button */}
              {isMobile && !isCameraActive && (
                <button
                  onClick={analyzeImage}
                  disabled={!image || loading}
                  style={{
                    background: loading || !image 
                      ? 'linear-gradient(135deg, #d1d5db, #9ca3af)' 
                      : 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    border: 'none',
                    padding: '16px',
                    borderRadius: '12px',
                    cursor: loading || !image ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '1.1rem',
                    width: '100%',
                    marginBottom: '20px',
                    boxShadow: loading || !image ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  {loading ? '🔍 Analyzing Image...' : '🧠 Analyze with AI'}
                </button>
              )}

              {/* Tips Section */}
              <div style={{
                padding: '15px',
                backgroundColor: '#fffbeb',
                borderRadius: '12px',
                border: '1px solid #fed7aa'
              }}>
                <h4 style={{
                  color: '#92400e',
                  marginBottom: '10px',
                  fontSize: isMobile ? '0.95rem' : '1rem',
                  fontWeight: '600'
                }}>
                  💡 Photography Tips:
                </h4>
                <ul style={{
                  fontSize: isMobile ? '0.85rem' : '0.9rem',
                  color: '#78350f',
                  paddingLeft: '18px',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  <li>Use natural lighting when possible</li>
                  <li>Keep the affected area clearly visible</li>
                  <li>Hold camera steady for sharp images</li>
                  <li>Fill the frame with the skin area</li>
                </ul>
              </div>
            </div>

            {/* Results Section */}
            {(result || error || loading) && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                padding: isMobile ? '20px' : '30px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
              }}>
                {loading && (
                  <div style={{ textAlign: 'center', padding: isMobile ? '30px 20px' : '50px' }}>
                    <div style={{
                      width: isMobile ? '50px' : '60px',
                      height: isMobile ? '50px' : '60px',
                      border: '4px solid #e5e7eb',
                      borderTop: '4px solid #667eea',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 20px'
                    }}></div>
                    <h3 style={{
                      color: '#667eea',
                      fontSize: isMobile ? '1.1rem' : '1.3rem',
                      fontWeight: '600'
                    }}>
                      🔍 AI is analyzing your image...
                    </h3>
                    <p style={{ 
                      color: '#6b7280', 
                      marginTop: '10px',
                      fontSize: isMobile ? '0.9rem' : '1rem'
                    }}>
                      This may take a few moments
                    </p>
                  </div>
                )}

                {error && (
                  <div style={{
                    backgroundColor: '#fef2f2',
                    border: '2px solid #fecaca',
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: isMobile ? '2.5rem' : '3rem', marginBottom: '15px' }}>❌</div>
                    <h3 style={{
                      color: '#dc2626',
                      fontSize: isMobile ? '1.1rem' : '1.3rem',
                      fontWeight: '600',
                      marginBottom: '10px'
                    }}>
                      Error Occurred
                    </h3>
                    <p style={{ 
                      color: '#7f1d1d',
                      fontSize: isMobile ? '0.9rem' : '1rem',
                      lineHeight: '1.5'
                    }}>
                      {error}
                    </p>
                  </div>
                )}

                {result && (
                  <div>
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                      <div style={{ fontSize: isMobile ? '2.5rem' : '3rem', marginBottom: '10px' }}>📊</div>
                      <h2 style={{
                        color: '#059669',
                        fontSize: isMobile ? '1.3rem' : '1.8rem',
                        fontWeight: '700',
                        margin: 0
                      }}>
                        Analysis Complete
                      </h2>
                    </div>

                    <div style={{
                      backgroundColor: '#f0fdf4',
                      border: '2px solid #bbf7d0',
                      borderRadius: '12px',
                      padding: isMobile ? '15px' : '20px',
                      marginBottom: '15px'
                    }}>
                      <pre style={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'Georgia, serif',
                        fontSize: isMobile ? '0.9rem' : '1rem',
                        lineHeight: '1.6',
                        margin: 0,
                        color: '#374151'
                      }}>
                        {result.analysis}
                      </pre>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: isMobile ? '0.8rem' : '0.9rem',
                      color: '#6b7280',
                      marginBottom: '15px'
                    }}>
                      <span>🕒 {result.timestamp}</span>
                      <span>🤖 Gemini AI</span>
                    </div>

                    <div style={{
                      backgroundColor: '#fef3c7',
                      border: '2px solid #fcd34d',
                      borderRadius: '12px',
                      padding: isMobile ? '15px' : '20px'
                    }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '1.3rem' }}>⚠️</div>
                        <div>
                          <h4 style={{
                            color: '#92400e',
                            fontSize: isMobile ? '1rem' : '1.1rem',
                            fontWeight: '600',
                            margin: '0 0 8px 0'
                          }}>
                            Medical Disclaimer
                          </h4>
                          <p style={{
                            color: '#78350f',
                            fontSize: isMobile ? '0.85rem' : '0.95rem',
                            lineHeight: '1.5',
                            margin: 0
                          }}>
                            This analysis is for educational purposes only. Always consult a qualified healthcare professional for proper diagnosis and treatment.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Chatbot Tab */}
        {activeTab === 'chatbot' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: isMobile ? '20px' : '30px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            maxWidth: isMobile ? '100%' : '800px',
            margin: '0 auto'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: isMobile ? '2.5rem' : '3rem', marginBottom: '10px' }}>🤖</div>
              <h2 style={{
                fontSize: isMobile ? '1.3rem' : '1.8rem',
                fontWeight: '700',
                color: '#333',
                margin: 0
              }}>
                AI Skin Health Assistant
              </h2>
              <p style={{
                color: '#6b7280',
                marginTop: '8px',
                fontSize: isMobile ? '0.9rem' : '1rem'
              }}>
                Ask me about skin conditions, treatments, or skincare advice
              </p>
            </div>

            {/* Chat Container */}
            <div 
              ref={chatRef}
              style={{
                height: isMobile ? '300px' : '400px',
                overflowY: 'auto',
                border: '2px solid #e5e7eb',
                borderRadius: '15px',
                padding: isMobile ? '15px' : '20px',
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
                    maxWidth: isMobile ? '85%' : '80%',
                    padding: isMobile ? '10px 15px' : '12px 18px',
                    borderRadius: '18px',
                    backgroundColor: msg.role === 'user' ? '#667eea' : '#e5e7eb',
                    color: msg.role === 'user' ? 'white' : '#374151',
                    wordWrap: 'break-word',
                    fontSize: isMobile ? '0.9rem' : '0.95rem',
                    lineHeight: '1.4'
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {isChatting && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    padding: isMobile ? '10px 15px' : '12px 18px',
                    borderRadius: '18px',
                    backgroundColor: '#e5e7eb',
                    color: '#374151',
                    fontSize: isMobile ? '0.9rem' : '0.95rem'
                  }}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#667eea',
                        animation: 'bounce 1.4s ease-in-out infinite both'
                      }}></div>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#667eea',
                        animation: 'bounce 1.4s ease-in-out 0.16s infinite both'
                      }}></div>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#667eea',
                        animation: 'bounce 1.4s ease-in-out 0.32s infinite both'
                      }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div style={{
              display: 'flex',
              gap: isMobile ? '10px' : '15px',
              alignItems: 'center'
            }}>
              <input
                type="text"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about skin conditions, treatments..."
                disabled={isChatting}
                style={{
                  flex: 1,
                  padding: isMobile ? '12px 16px' : '15px 20px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '25px',
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
              />
              <button
                onClick={sendMessage}
                disabled={isChatting || userMessage.trim() === ''}
                style={{
                  background: isChatting || userMessage.trim() === '' 
                    ? 'linear-gradient(135deg, #d1d5db, #9ca3af)' 
                    : 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: isMobile ? '45px' : '50px',
                  height: isMobile ? '45px' : '50px',
                  cursor: isChatting || userMessage.trim() === '' ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: isMobile ? '1rem' : '1.2rem',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}
              >
                {isChatting ? '⏳' : '🚀'}
              </button>
            </div>

            {/* Quick Questions */}
            <div style={{
              marginTop: '20px',
              padding: isMobile ? '15px' : '20px',
              backgroundColor: '#f0f9ff',
              borderRadius: '12px',
              border: '1px solid #bae6fd'
            }}>
              <h4 style={{
                color: '#0369a1',
                fontSize: isMobile ? '0.95rem' : '1rem',
                fontWeight: '600',
                marginBottom: '12px'
              }}>
                💬 Quick Questions:
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '8px',
                fontSize: isMobile ? '0.85rem' : '0.9rem'
              }}>
                {[
                  'What causes acne?',
                  'Dry skin care tips?',
                  'Signs of skin cancer?',
                  'Best sunscreen advice?'
                ].map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setUserMessage(question)}
                    style={{
                      padding: isMobile ? '10px 12px' : '8px 12px',
                      backgroundColor: 'white',
                      border: '1px solid #bae6fd',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: '#0369a1',
                      fontSize: isMobile ? '0.85rem' : '0.9rem',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: isMobile ? '30px' : '50px',
          color: 'rgba(255,255,255,0.8)',
          fontSize: isMobile ? '0.8rem' : '0.9rem',
          padding: isMobile ? '0 10px' : '0'
        }}>
          <p>Made with ❤️ using Google Gemini AI • Your Complete Skin Health Companion</p>
        </div>
      </div>

      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-8px); }
          }
          
          button:hover {
            transform: translateY(-1px);
          }
          
          button:active {
            transform: translateY(0px);
          }
          
          @media (max-width: 768px) {
            input:focus {
              border-color: #667eea;
            }
          }
        `
      }}></style>
    </div>
  );
}

export default App;'''

# Save the mobile-optimized app
with open('MobileOptimizedApp.js', 'w', encoding='utf-8') as f:
    f.write(mobile_optimized_app)

print("📱 MOBILE-OPTIMIZED APP WITH CAMERA FLIP CREATED!")
print("\n🎉 NEW FEATURES ADDED:")
print("• 🔄 CAMERA FLIP BUTTON - Switch between front/back camera")
print("• 📱 MOBILE RESPONSIVE - Perfect for phones and tablets")
print("• 📷 ENHANCED CAMERA CONTROLS - Capture, Flip, Close buttons")
print("• 🎨 MOBILE-FIRST DESIGN - Optimized layouts for small screens")
print("• 📏 ADAPTIVE UI - Different layouts for mobile vs desktop")
print("• 💫 SMOOTH ANIMATIONS - Better mobile performance")
print("• 📊 MOBILE ANALYSIS - Full-width analyze button on mobile")
print("• 💬 MOBILE CHAT - Optimized chat interface")
print("\n🔧 Camera Features:")
print("• 📸 Capture Photo - Take instant photos")
print("• 🔄 Flip Camera - Switch front/back cameras")
print("• ❌ Close Camera - Stop camera and return to upload")
print("• 📱 Mobile Optimized - Perfect camera experience on phones")
print("\n📁 File: MobileOptimizedApp.js")
print("🚀 Perfect for mobile users!")
