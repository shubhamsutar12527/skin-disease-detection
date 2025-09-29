import React, { useState, useRef } from 'react';

function App() {
  const [activeTab, setActiveTab] = useState('scan');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [cameraMode, setCameraMode] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [chatHistory, setChatHistory] = useState([
    { role: 'bot', text: 'Welcome to Arogya Mantra! Upload a skin image for AI analysis or ask me any health questions.' }
  ]);
  const [message, setMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // File upload handler
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result);
        setResult(null);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  // Camera functions
  const startCamera = async () => {
    try {
      setCameraMode(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Camera access denied or not available');
      setCameraMode(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraMode(false);
  };

  const flipCamera = () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setTimeout(startCamera, 100);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');
      setImage(imageData);
      setResult(null);
      setError('');
      stopCamera();
    }
  };

  // CORRECTED AI Analysis function with the right model name
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
      
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: "Analyze this skin condition image. Provide: 1) Possible skin condition name 2) Confidence level (0-100%) 3) Brief description of what you observe 4) General care recommendations 5) Medical disclaimer about consulting healthcare professionals"
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }
        ]
      };

      console.log('Sending request to Gemini API...');

      // FIXED: Using the correct model name - gemini-pro-vision
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=AIzaSyDHCEaLhGNsVgcbomKHetHRSC-y7nKIHXo',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      const analysisText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (analysisText) {
        setResult({
          text: analysisText,
          timestamp: new Date().toLocaleString()
        });
      } else {
        setError('No analysis result received. Please try again with a different image.');
      }

    } catch (err) {
      console.error('Analysis error:', err);
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Chat function with correct model
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatLoading(true);

    try {
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: `You are a helpful health assistant. Answer this question clearly: "${userMessage}". Always remind users to consult healthcare professionals for serious concerns.`
              }
            ]
          }
        ]
      };

      // FIXED: Using gemini-pro for text-only chat
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyDHCEaLhGNsVgcbomKHetHRSC-y7nKIHXo',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      const data = await response.json();
      const botResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not process your request.';
      
      setChatHistory(prev => [...prev, { role: 'bot', text: botResponse }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'bot', text: 'Sorry, there was an error processing your message.' }]);
    } finally {
      setChatLoading(false);
    }
  };

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
        <h1 style={styles.title}>
          <span style={styles.titlePrimary}>Arogya</span>{' '}
          <span style={styles.titleSecondary}>Mantra</span>
        </h1>
        <p style={styles.subtitle}>Advanced AI-Powered Skin Health Analysis & Medical Assistant</p>
        <div style={styles.divider}></div>
      </header>

      {/* Navigation */}
      <nav style={styles.tabContainer}>
        <button
          style={{...styles.tab, ...(activeTab === 'scan' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('scan')}
        >
          🔬 Skin Scanner
        </button>
        <button
          style={{...styles.tab, ...(activeTab === 'chat' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('chat')}
        >
          🤖 Health Assistant
        </button>
        <button
          style={{...styles.tab, ...(activeTab === 'about' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('about')}
        >
          ℹ️ About
        </button>
      </nav>

      {/* Content */}
      <main style={styles.content}>
        {/* Scan Tab */}
        {activeTab === 'scan' && (
          <div>
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
                  <div style={styles.cameraContainer}>
                    <video ref={videoRef} autoPlay playsInline style={styles.video} />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                  </div>
                ) : image ? (
                  <div style={styles.imagePreview}>
                    <img src={image} alt="Preview" style={styles.image} />
                    <p style={styles.imageStatus}>✅ Ready for AI analysis</p>
                  </div>
                ) : (
                  <div style={styles.placeholder}>
                    <div style={styles.placeholderIcon}>🖼️</div>
                    <h4>Upload or Capture Image</h4>
                    <p>Select a clear image of the skin area for analysis</p>
                  </div>
                )}
              </div>

              <div style={styles.buttonContainer}>
                {!cameraMode ? (
                  <>
                    <button style={styles.button} onClick={() => fileInputRef.current?.click()}>
                      📁 Upload Image
                    </button>
                    <button style={styles.button} onClick={startCamera}>
                      🎥 Use Camera
                    </button>
                    <button 
                      style={{...styles.analyzeButton, opacity: (!image || loading) ? 0.6 : 1}}
                      onClick={analyzeImage}
                      disabled={!image || loading}
                    >
                      {loading ? '🔄 Analyzing...' : '🧠 Analyze with AI'}
                    </button>
                  </>
                ) : (
                  <>
                    <button style={styles.captureButton} onClick={captureImage}>
                      📸 Capture Photo
                    </button>
                    <button style={styles.button} onClick={flipCamera}>
                      🔄 Flip Camera
                    </button>
                    <button style={styles.button} onClick={stopCamera}>
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

            {/* Results */}
            {(loading || result || error) && (
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>📊 Analysis Results</h3>
                
                {loading && (
                  <div style={styles.loading}>
                    <div style={styles.spinner}></div>
                    <p>Analyzing your image with AI...</p>
                  </div>
                )}

                {error && (
                  <div style={styles.error}>
                    <p>⚠️ {error}</p>
                  </div>
                )}

                {result && (
                  <div style={styles.result}>
                    <div style={styles.resultHeader}>
                      <span>✅ Analysis Complete</span>
                      <span style={styles.timestamp}>{result.timestamp}</span>
                    </div>
                    <pre style={styles.resultText}>{result.text}</pre>
                    <div style={styles.disclaimer}>
                      <strong>⚕️ Medical Disclaimer:</strong> This analysis is for educational purposes only. Always consult with a qualified healthcare provider for medical concerns.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>💬 Health Assistant Chat</h3>
            
            <div style={styles.chatContainer}>
              {chatHistory.map((msg, index) => (
                <div key={index} style={{...styles.chatMessage, ...(msg.role === 'user' ? styles.userMessage : styles.botMessage)}}>
                  <div style={styles.messageContent}>
                    {msg.text}
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
            </div>

            <form onSubmit={sendMessage} style={styles.chatForm}>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about skin health, symptoms, treatments..."
                style={styles.chatInput}
                disabled={chatLoading}
              />
              <button type="submit" style={styles.chatButton} disabled={chatLoading || !message.trim()}>
                {chatLoading ? '⏳' : '🚀'} Send
              </button>
            </form>
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>ℹ️ About Arogya Mantra</h3>
            <div style={styles.aboutContent}>
              <h4>🎯 Purpose</h4>
              <p>AI-powered tool to help identify common skin conditions and provide health information through advanced image analysis.</p>
              
              <h4>✨ Features</h4>
              <ul>
                <li>Advanced AI skin condition analysis</li>
                <li>Intelligent health assistant chat</li>
                <li>Camera integration with flip functionality</li>
                <li>Privacy-focused processing</li>
                <li>Mobile-responsive design</li>
              </ul>
              
              <h4>🔒 Privacy</h4>
              <p>Images are processed temporarily for analysis only. No personal data is stored permanently on our servers.</p>
              
              <div style={styles.disclaimerBox}>
                <strong>⚕️ Important Disclaimer:</strong>
                <p>This tool provides educational information only and should not replace professional medical advice, diagnosis, or treatment. Always consult healthcare professionals for medical concerns.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Styles (same as before)
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0a0b0d',
    color: '#ffffff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    textAlign: 'center',
    padding: '2rem 1rem',
    background: 'linear-gradient(135deg, #1a1d23 0%, #2d3748 100%)',
  },
  title: {
    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
    fontWeight: '900',
    margin: '0 0 0.5rem 0',
  },
  titlePrimary: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  titleSecondary: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '1.1rem',
    opacity: 0.9,
    margin: '0 0 1.5rem 0',
    color: '#a0aec0',
  },
  divider: {
    height: '3px',
    width: '150px',
    background: 'linear-gradient(90deg, #667eea, #f093fb)',
    margin: '0 auto',
    borderRadius: '2px',
  },
  tabContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '1rem',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '0.75rem 1.5rem',
    border: '2px solid #2d3748',
    borderRadius: '25px',
    backgroundColor: 'transparent',
    color: '#a0aec0',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  activeTab: {
    borderColor: '#667eea',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    color: '#667eea',
    boxShadow: '0 0 20px rgba(102, 126, 234, 0.3)',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '1rem',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '1rem',
    padding: '1.5rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
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
    margin: '0',
    color: '#667eea',
  },
  clearButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#e53e3e',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
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
  },
  placeholder: {
    color: '#718096',
  },
  placeholderIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  cameraContainer: {
    width: '100%',
  },
  video: {
    width: '100%',
    maxHeight: '400px',
    borderRadius: '0.5rem',
  },
  imagePreview: {
    textAlign: 'center',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '400px',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
  },
  imageStatus: {
    color: '#48bb78',
    fontWeight: '600',
  },
  buttonContainer: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '1.5rem',
  },
  button: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#4a5568',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    minWidth: '120px',
  },
  analyzeButton: {
    backgroundColor: '#f5576c',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  captureButton: {
    backgroundColor: '#e53e3e',
  },
  tips: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: '0.5rem',
    padding: '1rem',
    fontSize: '0.875rem',
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
  error: {
    backgroundColor: 'rgba(229, 62, 62, 0.1)',
    border: '1px solid rgba(229, 62, 62, 0.3)',
    borderRadius: '0.5rem',
    padding: '1rem',
    color: '#feb2b2',
  },
  result: {
    backgroundColor: 'rgba(72, 187, 120, 0.1)',
    border: '1px solid rgba(72, 187, 120, 0.3)',
    borderRadius: '0.5rem',
    padding: '1.5rem',
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    color: '#9ae6b4',
    fontWeight: '600',
  },
  timestamp: {
    fontSize: '0.875rem',
    opacity: 0.8,
  },
  resultText: {
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
    fontSize: '1rem',
    lineHeight: '1.6',
    margin: '0 0 1rem 0',
    color: '#e2e8f0',
  },
  disclaimer: {
    backgroundColor: 'rgba(237, 137, 54, 0.1)',
    border: '1px solid rgba(237, 137, 54, 0.3)',
    borderRadius: '0.5rem',
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#fbb74d',
  },
  // Chat styles
  chatContainer: {
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
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  botMessage: {
    justifyContent: 'flex-start',
  },
  messageContent: {
    maxWidth: '80%',
    padding: '0.75rem 1rem',
    borderRadius: '1rem',
    backgroundColor: '#667eea',
    wordWrap: 'break-word',
  },
  typingIndicator: {
    display: 'flex',
    gap: '0.25rem',
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
  },
  chatButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  // About styles
  aboutContent: {
    lineHeight: '1.7',
  },
  disclaimerBox: {
    backgroundColor: 'rgba(237, 137, 54, 0.1)',
    border: '1px solid rgba(237, 137, 54, 0.3)',
    borderRadius: '0.5rem',
    padding: '1rem',
    marginTop: '1rem',
    fontSize: '0.9rem',
    color: '#fbb74d',
  },
};

export default App;
