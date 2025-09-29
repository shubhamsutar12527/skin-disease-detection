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

  // WORKING Analysis function - tries multiple model endpoints
  const analyzeImage = async () => {
    if (!image) {
      setError('Please select or capture an image first.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    const base64Image = image.split(',')[1];
    
    // List of models to try in order (most compatible first)
    const modelsToTry = [
      'gemini-pro-vision',
      'gemini-1.5-pro',
      'gemini-pro',
      'models/gemini-pro-vision'
    ];

    const apiVersions = ['v1beta', 'v1'];

    for (const apiVersion of apiVersions) {
      for (const model of modelsToTry) {
        try {
          console.log(`Trying ${apiVersion} with ${model}...`);
          
          const payload = {
            contents: [{
              parts: [
                {
                  text: "Analyze this skin image and provide: 1) Possible skin condition 2) Confidence level 3) Description 4) Recommendations 5) Medical disclaimer"
                },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Image
                  }
                }
              ]
            }]
          };

          const response = await fetch(
            `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=AIzaSyDHCEaLhGNsVgcbomKHetHRSC-y7nKIHXo`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            }
          );

          if (response.ok) {
            const data = await response.json();
            const analysisText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (analysisText) {
              console.log(`✅ Success with ${apiVersion}/${model}`);
              setResult({
                text: analysisText,
                timestamp: new Date().toLocaleString(),
                model: `${apiVersion}/${model}`
              });
              setLoading(false);
              return;
            }
          } else {
            const errorData = await response.json();
            console.log(`❌ Failed ${apiVersion}/${model}:`, errorData.error?.message);
          }
        } catch (err) {
          console.log(`❌ Error with ${apiVersion}/${model}:`, err.message);
        }
      }
    }

    // If all models fail, try text-only analysis
    try {
      console.log('Trying text-only analysis...');
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyDHCEaLhGNsVgcbomKHetHRSC-y7nKIHXo`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: "I'm unable to analyze the uploaded image directly, but I can provide general information about skin health. For accurate skin condition assessment, please consult a dermatologist. Common skin conditions include acne, eczema, dermatitis, and various types of rashes. Proper diagnosis requires professional medical examination."
              }]
            }]
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const analysisText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        setResult({
          text: `⚠️ Image analysis unavailable. Using text-only response:\n\n${analysisText}`,
          timestamp: new Date().toLocaleString(),
          model: 'text-only-fallback'
        });
      } else {
        throw new Error('All analysis methods failed');
      }
    } catch (err) {
      setError('Analysis failed: Unable to access AI models. Please check your API key or try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Chat function with fallback
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatLoading(true);

    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyDHCEaLhGNsVgcbomKHetHRSC-y7nKIHXo',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a helpful health assistant. Answer this question: "${userMessage}". Provide accurate information and always recommend consulting healthcare professionals for serious concerns.`
              }]
            }]
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const botResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not process your request.';
        setChatHistory(prev => [...prev, { role: 'bot', text: botResponse }]);
      } else {
        const errorData = await response.json();
        setChatHistory(prev => [...prev, { 
          role: 'bot', 
          text: `Sorry, I'm having technical difficulties: ${errorData.error?.message || 'API Error'}. Please try again later.` 
        }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { 
        role: 'bot', 
        text: 'Sorry, there was a connection error. Please try again later.' 
      }]);
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
      <header style={styles.header}>
        <h1 style={styles.title}>
          <span style={styles.titlePrimary}>Arogya</span>{' '}
          <span style={styles.titleSecondary}>Mantra</span>
        </h1>
        <p style={styles.subtitle}>AI-Powered Skin Health Analysis</p>
      </header>

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

      <main style={styles.content}>
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
                      📷 Camera
                    </button>
                    <button 
                      style={{...styles.analyzeButton, opacity: (!image || loading) ? 0.6 : 1}}
                      onClick={analyzeImage}
                      disabled={!image || loading}
                    >
                      {loading ? '🔄 Analyzing...' : '🧠 Analyze'}
                    </button>
                  </>
                ) : (
                  <>
                    <button style={styles.captureButton} onClick={captureImage}>
                      📸 Capture
                    </button>
                    <button style={styles.button} onClick={flipCamera}>
                      🔄 Flip
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
                <h4>💡 Tips:</h4>
                <ul>
                  <li>Use good lighting</li>
                  <li>Focus on the affected area</li>
                  <li>Keep the image clear and steady</li>
                </ul>
              </div>
            </div>

            {(loading || result || error) && (
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>📊 Results</h3>
                
                {loading && (
                  <div style={styles.loading}>
                    <div style={styles.spinner}></div>
                    <p>Trying multiple AI models...</p>
                    <small>This may take a moment</small>
                  </div>
                )}

                {error && (
                  <div style={styles.error}>
                    <p>⚠️ {error}</p>
                    <p><strong>💡 Troubleshooting:</strong></p>
                    <ul>
                      <li>Check your API key has proper permissions</li>
                      <li>Verify your account has access to vision models</li>
                      <li>Try again in a few minutes</li>
                    </ul>
                  </div>
                )}

                {result && (
                  <div style={styles.result}>
                    <div style={styles.resultHeader}>
                      <span>✅ Analysis Complete</span>
                      <div>
                        <span style={styles.model}>Model: {result.model}</span>
                        <span style={styles.timestamp}>{result.timestamp}</span>
                      </div>
                    </div>
                    <pre style={styles.resultText}>{result.text}</pre>
                    <div style={styles.disclaimer}>
                      <strong>⚕️ Disclaimer:</strong> This is for educational purposes only. Always consult healthcare professionals for medical concerns.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>💬 Health Chat</h3>
            
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
                    <span>Typing...</span>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={sendMessage} style={styles.chatForm}>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about health..."
                style={styles.chatInput}
                disabled={chatLoading}
              />
              <button type="submit" style={styles.chatButton} disabled={chatLoading || !message.trim()}>
                {chatLoading ? '⏳' : '🚀'} Send
              </button>
            </form>
          </div>
        )}

        {activeTab === 'about' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>ℹ️ About</h3>
            <div style={styles.aboutContent}>
              <p><strong>Arogya Mantra</strong> is an AI-powered skin health analysis tool.</p>
              <p><strong>Features:</strong></p>
              <ul>
                <li>AI image analysis (when available)</li>
                <li>Health assistant chat</li>
                <li>Camera integration</li>
                <li>Privacy-focused processing</li>
              </ul>
              <div style={styles.disclaimerBox}>
                <strong>⚠️ Important:</strong> This tool is for educational purposes only. Always consult healthcare professionals for medical advice.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

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
    margin: '0',
    color: '#a0aec0',
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
  model: {
    fontSize: '0.75rem',
    opacity: 0.7,
    marginRight: '1rem',
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
