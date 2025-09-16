# Create the complete advanced version with camera and chatbot
advanced_app_js = '''import React, { useState, useRef, useEffect } from 'react';

function App() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState('diagnosis');
  
  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentCamera, setCurrentCamera] = useState('environment');
  
  // Chatbot states
  const [chatHistory, setChatHistory] = useState([]);
  const [userMessage, setUserMessage] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Initialize chatbot with welcome message
  useEffect(() => {
    setChatHistory([{
      role: 'bot',
      text: 'Hello! I'm your AI skin health assistant. Ask me about skin conditions, symptoms, treatments, or general skin care advice. How can I help you today?'
    }]);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isChatting]);

  const uploadImage = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target.result);
        setResult(null);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e) => {
    uploadImage(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    uploadImage(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Camera functions
  const startCamera = (facingMode) => {
    setError('');
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setIsCameraActive(true);
      navigator.mediaDevices.getUserMedia({ 
        video: { facingMode }, 
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
          console.error("Error accessing camera: ", err);
          setError('Camera access denied. Please allow camera permissions in your browser.');
          setIsCameraActive(false);
        });
    } else {
      setError('Camera not supported in this browser. Please use Chrome or Firefox.');
    }
  };

  const handleTakePhoto = () => {
    startCamera('environment');
  };

  const switchCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    const newCamera = currentCamera === 'environment' ? 'user' : 'environment';
    startCamera(newCamera);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      const capturedImage = canvasRef.current.toDataURL('image/jpeg');
      setImage(capturedImage);
      setResult(null);
      
      // Stop camera
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
            { text: "Analyze this skin image for potential conditions. Provide: Disease Name, Confidence Score (0-100%), Description, Symptoms, Recommended Actions, and Medical Disclaimer. Format as clear sections." },
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
        setResult({
          analysis: text,
          timestamp: new Date().toLocaleString()
        });
      } else {
        setError('No analysis received');
      }

    } catch (err) {
      setError('Analysis failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Chatbot function
  const handleSendMessage = async () => {
    if (userMessage.trim() === '') return;

    const newUserMessage = { role: 'user', text: userMessage };
    const newChatHistory = [...chatHistory, newUserMessage];
    setChatHistory(newChatHistory);
    setUserMessage('');
    setIsChatting(true);

    try {
      const prompt = `You are a helpful AI skin health assistant. Answer this question about skin health, conditions, or general wellness: "${userMessage}". Provide helpful, accurate information but always remind users to consult healthcare professionals for serious concerns. Keep responses conversational and easy to understand.`;
      
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
        setChatHistory(prevChat => [...prevChat, { role: 'bot', text: botMessage }]);
      } else {
        setChatHistory(prevChat => [...prevChat, { role: 'bot', text: 'Sorry, I couldn\\'t process your question. Please try again.' }]);
      }

    } catch (err) {
      setChatHistory(prevChat => [...prevChat, { role: 'bot', text: 'I\\'m experiencing technical difficulties. Please try again later.' }]);
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
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
          color: 'white'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🩺</div>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: '800',
            margin: '0 0 15px 0',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }}>
            Arogya Mitra
          </h1>
          <p style={{
            fontSize: '1.3rem',
            opacity: '0.9',
            fontWeight: '300'
          }}>
            Advanced AI-Powered Skin Health Analysis & Assistant
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '30px'
        }}>
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: '15px',
            padding: '5px',
            backdropFilter: 'blur(10px)'
          }}>
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
                transition: 'all 0.3s ease',
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
                cursor: 'pointer',
                transition: 'all 0.3s ease'
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
            gridTemplateColumns: image || isCameraActive ? '1fr 1fr' : '1fr',
            gap: '30px',
            alignItems: 'start'
          }}>
            
            {/* Upload/Camera Section */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{
                fontSize: '1.8rem',
                fontWeight: '700',
                color: '#333',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                📸 Capture or Upload Image
              </h2>

              {/* Image/Camera Display Area */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                style={{
                  border: isDragging ? '3px dashed #667eea' : '3px dashed #e2e8f0',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  backgroundColor: isDragging ? '#f0f4ff' : '#f8fafc',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  marginBottom: '25px',
                  minHeight: '300px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={() => !isCameraActive && fileRef.current && fileRef.current.click()}
              >
                {isCameraActive ? (
                  <div style={{ width: '100%' }}>
                    <video 
                      ref={videoRef} 
                      style={{
                        width: '100%',
                        maxHeight: '300px',
                        borderRadius: '12px',
                        objectFit: 'cover'
                      }}
                      autoPlay 
                      playsInline 
                      muted
                    ></video>
                    <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                  </div>
                ) : image ? (
                  <div>
                    <img 
                      src={image} 
                      alt="Uploaded" 
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        borderRadius: '12px',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                      }}
                    />
                    <p style={{
                      marginTop: '15px',
                      color: '#10b981',
                      fontWeight: '600'
                    }}>
                      ✅ Image ready for analysis
                    </p>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '5rem', marginBottom: '20px' }}>📷</div>
                    <p style={{
                      fontSize: '1.2rem',
                      color: '#6b7280',
                      marginBottom: '10px',
                      fontWeight: '500'
                    }}>
                      Drag & drop image or use camera
                    </p>
                    <p style={{
                      color: '#9ca3af',
                      fontSize: '0.95rem'
                    }}>
                      Click to browse files or use buttons below
                    </p>
                  </div>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                ref={fileRef}
                style={{ display: 'none' }}
              />

              {/* Action Buttons */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isCameraActive ? '1fr 1fr' : '1fr 1fr 1fr',
                gap: '10px',
                marginBottom: '20px'
              }}>
                {!isCameraActive && (
                  <>
                    <button
                      onClick={() => fileRef.current && fileRef.current.click()}
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 20px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      📁 Upload
                    </button>
                    <button
                      onClick={handleTakePhoto}
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 20px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      📷 Camera
                    </button>
                  </>
                )}
                
                {isCameraActive ? (
                  <>
                    <button
                      onClick={capturePhoto}
                      style={{
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 20px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      📸 Capture
                    </button>
                    <button
                      onClick={switchCamera}
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 20px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      🔄 Switch
                    </button>
                  </>
                ) : (
                  <button
                    onClick={analyzeImage}
                    disabled={!image || loading}
                    style={{
                      background: loading || !image 
                        ? 'linear-gradient(135deg, #d1d5db, #9ca3af)' 
                        : 'linear-gradient(135deg, #667eea, #764ba2)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 20px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      borderRadius: '12px',
                      cursor: loading || !image ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {loading ? '🔍 Analyzing...' : '🧠 Analyze'}
                  </button>
                )}
              </div>

              {/* Tips Section */}
              <div style={{
                padding: '20px',
                backgroundColor: '#fffbeb',
                borderRadius: '12px',
                border: '1px solid #fed7aa'
              }}>
                <h4 style={{
                  color: '#92400e',
                  fontSize: '1rem',
                  fontWeight: '600',
                  marginBottom: '12px'
                }}>
                  💡 Photography Tips
                </h4>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  color: '#78350f',
                  fontSize: '0.9rem'
                }}>
                  <li style={{ marginBottom: '6px' }}>✨ Use natural lighting when possible</li>
                  <li style={{ marginBottom: '6px' }}>📏 Keep affected area clearly visible</li>
                  <li style={{ marginBottom: '6px' }}>🔍 Focus on the skin condition</li>
                  <li>📱 Hold camera steady for clear shots</li>
                </ul>
              </div>
            </div>

            {/* Results Section */}
            {(result || error || loading) && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                padding: '30px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
              }}>
                {loading && (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px'
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      border: '4px solid #e5e7eb',
                      borderTop: '4px solid #667eea',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 20px'
                    }}></div>
                    <h3 style={{
                      color: '#667eea',
                      fontSize: '1.3rem',
                      fontWeight: '600'
                    }}>
                      🔍 AI is analyzing your image...
                    </h3>
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
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>❌</div>
                    <h3 style={{
                      color: '#dc2626',
                      fontSize: '1.3rem',
                      fontWeight: '600',
                      marginBottom: '10px'
                    }}>
                      Error
                    </h3>
                    <p style={{ color: '#7f1d1d' }}>{error}</p>
                  </div>
                )}

                {result && (
                  <div>
                    <div style={{
                      textAlign: 'center',
                      marginBottom: '25px'
                    }}>
                      <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📊</div>
                      <h2 style={{
                        fontSize: '2rem',
                        fontWeight: '700',
                        color: '#059669',
                        margin: 0
                      }}>
                        Analysis Complete
                      </h2>
                    </div>

                    <div style={{
                      backgroundColor: '#f0fdf4',
                      border: '2px solid #bbf7d0',
                      borderRadius: '15px',
                      padding: '25px',
                      marginBottom: '20px'
                    }}>
                      <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '10px',
                        marginBottom: '15px'
                      }}>
                        <pre style={{
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'Georgia, serif',
                          fontSize: '1rem',
                          lineHeight: '1.7',
                          margin: 0,
                          color: '#374151'
                        }}>
                          {result.analysis}
                        </pre>
                      </div>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.9rem',
                        color: '#6b7280'
                      }}>
                        <span>🕒 {result.timestamp}</span>
                        <span>🤖 Arogya Mantra AI</span>
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: '#fef3c7',
                      border: '2px solid #fcd34d',
                      borderRadius: '12px',
                      padding: '20px'
                    }}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ fontSize: '1.5rem' }}>⚠️</div>
                        <div>
                          <h4 style={{
                            color: '#92400e',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            margin: '0 0 8px 0'
                          }}>
                            Medical Disclaimer
                          </h4>
                          <p style={{
                            color: '#78350f',
                            fontSize: '0.95rem',
                            lineHeight: '1.5',
                            margin: 0
                          }}>
                            This analysis is for educational purposes only. Always consult a healthcare professional for proper diagnosis and treatment.
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
            padding: '30px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            maxWidth: '1000px',
            margin: '0 auto'
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '25px'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🤖</div>
              <h2 style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: '#333',
                margin: 0
              }}>
                AI Skin Health Assistant
              </h2>
              <p style={{
                color: '#6b7280',
                marginTop: '8px'
              }}>
                Ask me about skin conditions, treatments, or general skin care advice
              </p>
            </div>

            {/* Chat Container */}
            <div 
              ref={chatContainerRef}
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
                    fontSize: '0.95rem',
                    lineHeight: '1.5',
                    wordWrap: 'break-word'
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {isChatting && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  marginBottom: '15px'
                }}>
                  <div style={{
                    padding: '12px 18px',
                    borderRadius: '18px',
                    backgroundColor: '#e5e7eb',
                    color: '#374151'
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '4px',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#667eea',
                        animation: 'bounce 1.4s ease-in-out infinite both'
                      }}></div>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#667eea',
                        animation: 'bounce 1.4s ease-in-out 0.16s infinite both'
                      }}></div>
                      <div style={{
                        width: '8px',
                        height: '8px',
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
              gap: '15px',
              alignItems: 'center'
            }}>
              <input
                type="text"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about skin conditions, treatments, or care tips..."
                disabled={isChatting}
                style={{
                  flex: 1,
                  padding: '15px 20px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={isChatting || userMessage.trim() === ''}
                style={{
                  background: isChatting || userMessage.trim() === '' 
                    ? 'linear-gradient(135deg, #d1d5db, #9ca3af)' 
                    : 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  cursor: isChatting || userMessage.trim() === '' ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: '1.2rem'
                }}
              >
                {isChatting ? '⏳' : '🚀'}
              </button>
            </div>

            {/* Quick Questions */}
            <div style={{
              marginTop: '20px',
              padding: '20px',
              backgroundColor: '#f0f9ff',
              borderRadius: '12px',
              border: '1px solid #bae6fd'
            }}>
              <h4 style={{
                color: '#0369a1',
                fontSize: '1rem',
                fontWeight: '600',
                marginBottom: '12px'
              }}>
                💬 Quick Questions to Try:
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '10px',
                fontSize: '0.9rem'
              }}>
                <button
                  onClick={() => setUserMessage('What causes acne and how to prevent it?')}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'white',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#0369a1'
                  }}
                >
                  What causes acne?
                </button>
                <button
                  onClick={() => setUserMessage('How to take care of dry skin?')}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'white',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#0369a1'
                  }}
                >
                  Dry skin care tips?
                </button>
                <button
                  onClick={() => setUserMessage('What are signs of skin cancer?')}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'white',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#0369a1'
                  }}
                >
                  Signs of skin cancer?
                </button>
                <button
                  onClick={() => setUserMessage('Best sunscreen for daily use?')}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'white',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#0369a1'
                  }}
                >
                  Best sunscreen tips?
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '50px',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '0.9rem'
        }}>
          <p>Made with ❤️ using Google AI and Machine Learining • Your Complete Skin Health Companion</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
          }
        `
      }}></style>
    </div>
  );
}

export default App;'''

# Save the advanced app
with open('AdvancedApp.js', 'w', encoding='utf-8') as f:
    f.write(advanced_app_js)

print("🚀 ADVANCED APP WITH CAMERA + CHATBOT CREATED!")
print("\n✨ NEW FEATURES ADDED:")
print("• 📷 LIVE CAMERA CAPTURE - Take photos directly from camera")
print("• 🔄 CAMERA SWITCHING - Switch between front/back camera")
print("• 🤖 AI CHATBOT - Interactive skin health assistant")
print("• 💬 REAL-TIME CHAT - Ask questions and get AI responses")
print("• 🏷️ TAB NAVIGATION - Switch between Analysis & Chatbot")
print("• 📱 MOBILE FRIENDLY - Works on phones and tablets")
print("• 💡 QUICK QUESTIONS - Pre-made questions to try")
print("• 🎨 BEAUTIFUL CHAT UI - Modern messaging interface")
print("\n🎯 How it works:")
print("1. 🔬 Skin Analysis Tab: Upload/Camera → AI Analysis")
print("2. 🤖 AI Assistant Tab: Chat with AI about skin health")
print("\n📁 File: AdvancedApp.js")
print("🔥 This is now a COMPLETE medical app!")
