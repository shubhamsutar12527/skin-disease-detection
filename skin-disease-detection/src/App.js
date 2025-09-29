import React, { useState, useRef, useEffect } from 'react';

// API Configuration
const GEMINI_API_KEY = 'AIzaSyDHCEaLhGNsVgcbomKHetHRSC-y7nKIHXo';
const GEMINI_MODEL = 'gemini-1.5-flash';
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function App() {
  // State management
  const [activeTab, setActiveTab] = useState('scan');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  
  // Camera states
  const [cameraMode, setCameraMode] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [stream, setStream] = useState(null);
  
  // Chat states
  const [chatHistory, setChatHistory] = useState([
    { role: 'bot', text: 'Welcome to Arogya Mantra! 🏥 I can analyze skin images and answer your health questions. Upload an image to get started!', timestamp: new Date().toLocaleTimeString() }
  ]);
  const [message, setMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Refs
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, chatLoading]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // File upload handler
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (JPG, PNG, etc.)');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image file too large. Please select an image smaller than 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result);
        setResult(null);
        setError('');
      };
      reader.onerror = () => {
        setError('Error reading file. Please try again.');
      };
      reader.readAsDataURL(file);
    }
  };

  // Camera functions
  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      setCameraMode(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera access denied or not available. Please check your browser permissions.');
      setCameraMode(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraMode(false);
  };

  const flipCamera = () => {
    stopCamera();
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    setTimeout(startCamera, 100);
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera not ready. Please try again.');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setImage(imageData);
    setResult(null);
    setError('');
    stopCamera();
  };

  // Enhanced API call with better error handling
  const callGeminiAPI = async (payload, retries = 2) => {
    const url = `${API_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'Arogya-Mantra/1.0'
          },
          body: JSON.stringify(payload)
        });

        console.log(`API attempt ${attempt + 1}, Status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          
          if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please wait a moment and try again.');
          } else if (response.status === 403) {
            throw new Error('API key invalid or quota exceeded.');
          } else if (response.status === 400) {
            throw new Error('Invalid request format. Please try with a different image.');
          }
          
          throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('API Response:', data);

        // Enhanced response validation
        if (data.error) {
          throw new Error(data.error.message || 'API returned an error');
        }

        if (!data.candidates || data.candidates.length === 0) {
          throw new Error('No response generated. The content may have been filtered.');
        }

        const candidate = data.candidates[0];
        if (candidate.finishReason === 'SAFETY') {
          throw new Error('Content was filtered for safety reasons. Please try with a different image.');
        }

        const text = candidate.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error('Empty response from AI. Please try again.');
        }

        return text;

      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        
        if (attempt === retries) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  };

  // AI Analysis function
  const analyzeImage = async () => {
    if (!image) {
      setError('Please select or capture an image first.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const base64Image = image.split(',')[1];
      
      // Check image size
      if (base64Image.length > 4 * 1024 * 1024) { // ~3MB limit for base64
        setError('Image too large for analysis. Please use a smaller image.');
        setLoading(false);
        return;
      }

      const payload = {
        contents: [{
          parts: [
            { 
              text: `As a medical AI assistant, analyze this skin image and provide:

1. **Primary Assessment**: Most likely skin condition
2. **Confidence Level**: Your confidence (0-100%)
3. **Visual Description**: What you observe in the image
4. **Possible Causes**: Common causes for this condition
5. **Recommendations**: 
   - Immediate care steps
   - When to see a doctor
   - Prevention tips
6. **Medical Disclaimer**: Clear statement about consulting healthcare professionals

Please be thorough but concise. Format your response clearly with the numbered sections above.` 
            },
            { 
              inline_data: { 
                mime_type: 'image/jpeg', 
                data: base64Image 
              } 
            }
          ]
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_MEDICAL',
            threshold: 'BLOCK_ONLY_HIGH'
          }
        ]
      };

      const analysisText = await callGeminiAPI(payload);
      
      setResult({
        text: analysisText,
        timestamp: new Date().toLocaleString(),
        imageProcessed: true
      });

    } catch (err) {
      console.error('Analysis error:', err);
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Chat function
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || chatLoading) return;

    const userMessage = message.trim();
    setMessage('');
    
    const userEntry = {
      role: 'user',
      text: userMessage,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setChatHistory(prev => [...prev, userEntry]);
    setChatLoading(true);

    try {
      const payload = {
        contents: [{
          parts: [{
            text: `You are Arogya Mantra, a helpful and knowledgeable health assistant. 

User Question: "${userMessage}"

Please provide a clear, helpful, and medically accurate response. Include:
- Direct answer to their question
- Any relevant health advice
- Important safety considerations
- Clear reminder to consult healthcare professionals for serious concerns

Keep your response conversational but professional, and always prioritize user safety.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 512,
        }
      };

      const botResponse = await callGeminiAPI(payload);
      
      const botEntry = {
        role: 'bot',
        text: botResponse,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setChatHistory(prev => [...prev, botEntry]);

    } catch (err) {
      console.error('Chat error:', err);
      const errorEntry = {
        role: 'bot',
        text: `Sorry, I encountered an error: ${err.message}. Please try asking your question again.`,
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      };
      setChatHistory(prev => [...prev, errorEntry]);
    } finally {
      setChatLoading(false);
    }
  };

  // Helper function to clear all data
  const clearData = () => {
    setImage(null);
    setResult(null);
    setError('');
    stopCamera();
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>
            <span style={styles.titlePrimary}>Arogya</span>
            <span style={styles.titleSecondary}> Mantra</span>
          </h1>
          <p style={styles.subtitle}>Advanced AI-Powered Skin Health Analysis & Medical Assistant</p>
          <div style={styles.headerDivider}></div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav style={styles.tabContainer}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'scan' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('scan')}
        >
          🔬 Skin Scanner
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'chat' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('chat')}
        >
          🤖 Health Assistant
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'info' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('info')}
        >
          ℹ️ About
        </button>
      </nav>

      <main style={styles.content}>
        {/* Scan Tab */}
        {activeTab === 'scan' && (
          <div style={styles.scanContainer}>
            {/* Upload/Camera Section */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>📸 Image Analysis</h3>
                {image && (
                  <button onClick={clearData} style={styles.clearButton}>
                    🗑️ Clear
                  </button>
                )}
              </div>
              
              <div style={styles.imageContainer}>
                {cameraMode ? (
                  <div style={styles.cameraView}>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      style={styles.video}
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    <div style={styles.cameraOverlay}>
                      <div style={styles.cameraFrame}></div>
                    </div>
                  </div>
                ) : image ? (
                  <div style={styles.imagePreview}>
                    <img src={image} alt="Selected for analysis" style={styles.previewImage} />
                    <div style={styles.imageStatus}>
                      <span style={styles.statusIcon}>✅</span>
                      <span>Ready for AI analysis</span>
                    </div>
                  </div>
                ) : (
                  <div style={styles.placeholder}>
                    <div style={styles.placeholderIcon}>🖼️</div>
                    <h4>Upload or Capture Image</h4>
                    <p>Select an image of the skin area you'd like analyzed</p>
                  </div>
                )}
              </div>

              <div style={styles.controls}>
                {!cameraMode ? (
                  <>
                    <button 
                      style={styles.primaryButton}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      📁 Upload Image
                    </button>
                    <button 
                      style={styles.secondaryButton}
                      onClick={startCamera}
                    >
                      📷 Use Camera
                    </button>
                    <button 
                      style={{
                        ...styles.analyzeButton,
                        opacity: (!image || loading) ? 0.6 : 1,
                        cursor: (!image || loading) ? 'not-allowed' : 'pointer'
                      }}
                      onClick={analyzeImage}
                      disabled={!image || loading}
                    >
                      {loading ? (
                        <>🔄 Analyzing...</>
                      ) : (
                        <>🧠 Analyze with AI</>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button style={styles.captureButton} onClick={captureImage}>
                      📸 Capture Photo
                    </button>
                    <button style={styles.secondaryButton} onClick={flipCamera}>
                      🔄 Flip Camera
                    </button>
                    <button style={styles.dangerButton} onClick={stopCamera}>
                      ❌ Cancel
                    </button>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              <div style={styles.tips}>
                <h4>📋 Tips for Best Results:</h4>
                <ul>
                  <li>Use good lighting (natural light preferred)</li>
                  <li>Focus clearly on the affected area</li>
                  <li>Avoid shadows or reflections</li>
                  <li>Keep the camera steady</li>
                  <li>Image should be clear and well-focused</li>
                </ul>
              </div>
            </div>

            {/* Results Section */}
            {(loading || result || error) && (
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>📊 Analysis Results</h3>
                
                {loading && (
                  <div style={styles.loading}>
                    <div style={styles.spinner}></div>
                    <p>Analyzing your image with advanced AI...</p>
                    <small>This may take a few seconds</small>
                  </div>
                )}

                {error && (
                  <div style={styles.errorBox}>
                    <div style={styles.errorIcon}>⚠️</div>
                    <div>
                      <strong>Analysis Error</strong>
                      <p>{error}</p>
                    </div>
                  </div>
                )}

                {result && (
                  <div style={styles.resultBox}>
                    <div style={styles.resultHeader}>
                      <span style={styles.successIcon}>✅</span>
                      <span>Analysis Complete</span>
                      <span style={styles.timestamp}>{result.timestamp}</span>
                    </div>
                    <div style={styles.resultContent}>
                      <pre style={styles.resultText}>{result.text}</pre>
                    </div>
                    <div style={styles.disclaimer}>
                      <strong>⚕️ Medical Disclaimer:</strong> This analysis is for educational purposes only and should not replace professional medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider for medical concerns.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div style={styles.chatContainer}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>💬 Health Assistant Chat</h3>
              
              <div style={styles.chatMessages}>
                {chatHistory.map((msg, index) => (
                  <div 
                    key={index} 
                    style={{
                      ...styles.chatMessage,
                      ...(msg.role === 'user' ? styles.userMessage : styles.botMessage),
                      ...(msg.isError ? styles.errorMessage : {})
                    }}
                  >
                    <div style={styles.messageContent}>
                      <div style={styles.messageText}>{msg.text}</div>
                      <div style={styles.messageTime}>{msg.timestamp}</div>
                    </div>
                  </div>
                ))}
                
                {chatLoading && (
                  <div style={{...styles.chatMessage, ...styles.botMessage}}>
                    <div style={styles.messageContent}>
                      <div style={styles.typingIndicator}>
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={sendMessage} style={styles.chatForm}>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask me about skin health, symptoms, treatments, prevention..."
                  style={styles.chatInput}
                  disabled={chatLoading}
                  maxLength={500}
                />
                <button 
                  type="submit" 
                  style={{
                    ...styles.chatSendButton,
                    opacity: (chatLoading || !message.trim()) ? 0.6 : 1,
                    cursor: (chatLoading || !message.trim()) ? 'not-allowed' : 'pointer'
                  }}
                  disabled={chatLoading || !message.trim()}
                >
                  {chatLoading ? '⏳' : '🚀'} Send
                </button>
              </form>
            </div>
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'info' && (
          <div style={styles.aboutContainer}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>ℹ️ About Arogya Mantra</h3>
              <div style={styles.aboutContent}>
                
                <div style={styles.aboutSection}>
                  <h4>🎯 Purpose</h4>
                  <p>Arogya Mantra is an advanced AI-powered health assistant designed to help users understand common skin conditions through image analysis and provide reliable health information through our intelligent chatbot.</p>
                </div>

                <div style={styles.aboutSection}>
                  <h4>✨ Key Features</h4>
                  <ul>
                    <li><strong>AI Skin Analysis:</strong> Upload or capture images for instant AI-powered analysis</li>
                    <li><strong>Smart Health Chat:</strong> Ask questions and get evidence-based health information</li>
                    <li><strong>Camera Integration:</strong> Built-in camera with front/back switching</li>
                    <li><strong>Privacy First:</strong> Images processed securely, not stored permanently</li>
                    <li><strong>Mobile Optimized:</strong> Works seamlessly on all devices</li>
                  </ul>
                </div>

                <div style={styles.aboutSection}>
                  <h4>🔒 Privacy & Security</h4>
                  <ul>
                    <li>Images are processed temporarily for analysis only</li>
                    <li>No personal data is stored on our servers</li>
                    <li>All communications are encrypted</li>
                    <li>Compliant with healthcare privacy standards</li>
                  </ul>
                </div>

                <div style={styles.aboutSection}>
                  <h4>⚕️ Medical Disclaimer</h4>
                  <div style={styles.disclaimerBox}>
                    <p><strong>Important:</strong> Arogya Mantra is an educational tool and should not be used as a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of qualified healthcare providers with any questions you may have regarding a medical condition.</p>
                    <p>In case of medical emergencies, contact your local emergency services immediately.</p>
                  </div>
                </div>

                <div style={styles.aboutSection}>
                  <h4>🚀 Technology</h4>
                  <p>Powered by Google's Gemini AI, providing state-of-the-art image analysis and natural language processing capabilities for accurate and helpful health insights.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Comprehensive styles
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0a0b0d',
    color: '#ffffff',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    lineHeight: 1.6,
  },
  
  header: {
    background: 'linear-gradient(135deg, #1a1d23 0%, #2d3748 100%)',
    borderBottom: '1px solid #2d3748',
    paddingBottom: '2rem',
  },
  
  headerContent: {
    textAlign: 'center',
    padding: '2rem 1rem',
    maxWidth: '800px',
    margin: '0 auto',
  },
  
  title: {
    fontSize: 'clamp(2.5rem, 5vw, 4rem)',
    fontWeight: '900',
    margin: '0 0 0.5rem 0',
    letterSpacing: '-0.02em',
  },
  
  titlePrimary: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 30px rgba(102, 126, 234, 0.5)',
  },
  
  titleSecondary: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 30px rgba(240, 147, 251, 0.5)',
  },
  
  subtitle: {
    fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
    opacity: 0.9,
    margin: '0',
    color: '#a0aec0',
  },
  
  headerDivider: {
    height: '3px',
    width: '200px',
    background: 'linear-gradient(90deg, #667eea, #f093fb)',
    margin: '1.5rem auto 0',
    borderRadius: '2px',
    boxShadow: '0 0 20px rgba(102, 126, 234, 0.5)',
  },
  
  tabContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '1rem',
    maxWidth: '600px',
    margin: '0 auto',
    flexWrap: 'wrap',
  },
  
  tab: {
    padding: '0.75rem 1.5rem',
    border: '2px solid #2d3748',
    borderRadius: '50px',
    backgroundColor: 'transparent',
    color: '#a0aec0',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap',
  },
  
  activeTab: {
    borderColor: '#667eea',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    color: '#667eea',
    boxShadow: '0 0 20px rgba(102, 126, 234, 0.3)',
    transform: 'translateY(-2px)',
  },
  
  content: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '1rem',
  },
  
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '1rem',
    padding: '1.5rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    marginBottom: '1.5rem',
  },
  
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  
  cardTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: '0 0 1rem 0',
    color: '#667eea',
  },
  
  clearButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#e53e3e',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  
  imageContainer: {
    border: '2px dashed #4a5568',
    borderRadius: '1rem',
    padding: '2rem',
    textAlign: 'center',
    minHeight: '300px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.5rem',
    transition: 'all 0.3s ease',
    position: 'relative',
  },
  
  placeholder: {
    color: '#718096',
  },
  
  placeholderIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
    opacity: 0.7,
  },
  
  cameraView: {
    width: '100%',
    position: 'relative',
    borderRadius: '0.5rem',
    overflow: 'hidden',
  },
  
  video: {
    width: '100%',
    height: 'auto',
    maxHeight: '400px',
    borderRadius: '0.5rem',
    objectFit: 'cover',
  },
  
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  
  cameraFrame: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '200px',
    height: '200px',
    border: '3px solid #667eea',
    borderRadius: '1rem',
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)',
  },
  
  imagePreview: {
    textAlign: 'center',
  },
  
  previewImage: {
    maxWidth: '100%',
    maxHeight: '400px',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  
  imageStatus: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    color: '#48bb78',
    fontWeight: '600',
  },
  
  statusIcon: {
    fontSize: '1.25rem',
  },
  
  controls: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '1.5rem',
  },
  
  primaryButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '140px',
  },
  
  secondaryButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#4a5568',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '140px',
  },
  
  analyzeButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '140px',
    boxShadow: '0 4px 15px rgba(240, 147, 251, 0.3)',
  },
  
  captureButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#e53e3e',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '140px',
  },
  
  dangerButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '140px',
  },
  
  tips: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    border: '1px solid rgba(102, 126, 234, 0.2)',
    borderRadius: '0.5rem',
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#cbd5e0',
  },
  
  loading: {
    textAlign: 'center',
    padding: '2rem',
  },
  
  spinner: {
    width: '3rem',
    height: '3rem',
    border: '4px solid #2d3748',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem',
  },
  
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    backgroundColor: 'rgba(229, 62, 62, 0.1)',
    border: '1px solid rgba(229, 62, 62, 0.2)',
    borderRadius: '0.5rem',
    padding: '1rem',
    color: '#feb2b2',
  },
  
  errorIcon: {
    fontSize: '1.5rem',
    flexShrink: 0,
  },
  
  resultBox: {
    backgroundColor: 'rgba(72, 187, 120, 0.1)',
    border: '1px solid rgba(72, 187, 120, 0.2)',
    borderRadius: '0.5rem',
    padding: '1.5rem',
  },
  
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#9ae6b4',
  },
  
  successIcon: {
    fontSize: '1.25rem',
  },
  
  timestamp: {
    marginLeft: 'auto',
    fontSize: '0.875rem',
    opacity: 0.8,
  },
  
  resultContent: {
    marginBottom: '1rem',
  },
  
  resultText: {
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
    fontSize: '1rem',
    lineHeight: '1.6',
    margin: '0',
    color: '#e2e8f0',
  },
  
  disclaimer: {
    backgroundColor: 'rgba(237, 137, 54, 0.1)',
    border: '1px solid rgba(237, 137, 54, 0.2)',
    borderRadius: '0.5rem',
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#fbb74d',
  },
  
  // Chat styles
  chatContainer: {
    maxWidth: '700px',
    margin: '0 auto',
  },
  
  chatMessages: {
    height: '400px',
    overflowY: 'auto',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '0.5rem',
    padding: '1rem',
    marginBottom: '1rem',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  
  chatMessage: {
    marginBottom: '1rem',
    display: 'flex',
    animation: 'fadeIn 0.3s ease-in',
  },
  
  userMessage: {
    justifyContent: 'flex-end',
  },
  
  botMessage: {
    justifyContent: 'flex-start',
  },
  
  errorMessage: {
    opacity: 0.8,
  },
  
  messageContent: {
    maxWidth: '80%',
    padding: '0.75rem 1rem',
    borderRadius: '1rem',
    backgroundColor: '#667eea',
    wordWrap: 'break-word',
    position: 'relative',
  },
  
  messageText: {
    fontSize: '0.95rem',
    lineHeight: '1.4',
    marginBottom: '0.25rem',
  },
  
  messageTime: {
    fontSize: '0.75rem',
    opacity: 0.7,
    textAlign: 'right',
  },
  
  typingIndicator: {
    display: 'flex',
    gap: '0.25rem',
    alignItems: 'center',
  },
  
  chatForm: {
    display: 'flex',
    gap: '0.75rem',
  },
  
  chatInput: {
    flex: 1,
    padding: '0.75rem 1rem',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '0.5rem',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#ffffff',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  
  chatSendButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },
  
  // About styles
  aboutContainer: {
    maxWidth: '700px',
    margin: '0 auto',
  },
  
  aboutContent: {
    fontSize: '1rem',
    lineHeight: '1.7',
  },
  
  aboutSection: {
    marginBottom: '2rem',
  },
  
  disclaimerBox: {
    backgroundColor: 'rgba(237, 137, 54, 0.1)',
    border: '1px solid rgba(237, 137, 54, 0.2)',
    borderRadius: '0.5rem',
    padding: '1rem',
    fontSize: '0.9rem',
    color: '#fbb74d',
  },
  
  // Responsive and other utilities
  scanContainer: {
    maxWidth: '700px',
    margin: '0 auto',
  },
};

// Add CSS animations
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes fadeIn {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  
  .typing-indicator span {
    height: 8px;
    width: 8px;
    border-radius: 50%;
    background-color: #667eea;
    display: inline-block;
    animation: typing 1.4s infinite ease-in-out;
  }
  
  .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
  .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
  .typing-indicator span:nth-child(3) { animation-delay: 0s; }
  
  @keyframes typing {
    0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
    40% { transform: scale(1); opacity: 1; }
  }
`;
document.head.appendChild(styleSheet);

export default App;
