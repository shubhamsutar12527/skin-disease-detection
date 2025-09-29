import React, { useState, useRef, useEffect } from 'react';

function App() {
  const [activeTab, setActiveTab] = useState('scan');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [cameraMode, setCameraMode] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [chatHistory, setChatHistory] = useState([
    { role: 'bot', text: 'Arogya Mantra is ready! Upload a skin image or ask me any health question.' }
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

  // AI Analysis function with your NEW API key
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
        contents: [{
          parts: [
            { text: 'Analyze this skin image for potential conditions. Provide: 1) Possible condition name 2) Confidence level (0-100%) 3) Brief description 4) Recommended actions. Always include medical disclaimer.' },
            { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
          ]
        }]
      };

      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyAndhAs2KngwAb1-Obid8R5FgXKF1gpfns',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }
      );

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
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
        setError('No analysis result received. Please try again.');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Chat function with your NEW API key
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatLoading(true);

    try {
      const requestBody = {
        contents: [{
          parts: [{ text: `You are a helpful health assistant. Answer this question clearly and concisely: "${userMessage}". Always remind users to consult healthcare professionals for serious concerns.` }]
        }]
      };

      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyAndhAs2KngwAb1-Obid8R5FgXKF1gpfns',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>
          <span style={styles.titlePrimary}>Arogya</span>{' '}
          <span style={styles.titleSecondary}>Mantra</span>
        </h1>
        <p style={styles.subtitle}>AI-Powered Skin Health Analysis & Assistant</p>
      </header>

      {/* Tab Navigation */}
      <div style={styles.tabContainer}>
        <button
          style={{...styles.tab, ...(activeTab === 'scan' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('scan')}
        >
          🔬 Skin Analysis
        </button>
        <button
          style={{...styles.tab, ...(activeTab === 'chat' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('chat')}
        >
          🤖 AI Assistant
        </button>
      </div>

      {/* Scan Tab */}
      {activeTab === 'scan' && (
        <div style={styles.content}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📸 Upload or Capture Image</h3>
            
            {/* Image Preview */}
            <div style={styles.imageContainer}>
              {cameraMode ? (
                <div style={styles.cameraContainer}>
                  <video ref={videoRef} autoPlay playsInline style={styles.video} />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
              ) : image ? (
                <div style={styles.imagePreview}>
                  <img src={image} alt="Preview" style={styles.image} />
                  <p style={styles.imageStatus}>✅ Image ready for analysis</p>
                </div>
              ) : (
                <div style={styles.placeholder}>
                  <div style={styles.placeholderIcon}>📷</div>
                  <p>Click "Upload Image" or "Camera" to get started</p>
                </div>
              )}
            </div>

            {/* Control Buttons */}
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
                    style={{...styles.button, ...styles.analyzeButton}} 
                    onClick={analyzeImage}
                    disabled={!image || loading}
                  >
                    {loading ? '🔄 Analyzing...' : '🧠 Analyze'}
                  </button>
                </>
              ) : (
                <>
                  <button style={styles.button} onClick={captureImage}>
                    📸 Capture
                  </button>
                  <button style={styles.button} onClick={flipCamera}>
                    🔄 Flip Camera
                  </button>
                  <button style={styles.button} onClick={stopCamera}>
                    ❌ Close Camera
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

            {/* Tips */}
            <div style={styles.tips}>
              <p><strong>💡 Tips:</strong> Use good lighting, focus on the affected area, and ensure the image is clear for best results.</p>
            </div>
          </div>

          {/* Results */}
          {(result || error || loading) && (
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
                  <p>❌ {error}</p>
                </div>
              )}
              {result && (
                <div style={styles.result}>
                  <pre style={styles.resultText}>{result.text}</pre>
                  <p style={styles.timestamp}>Generated: {result.timestamp}</p>
                  <div style={styles.disclaimer}>
                    ⚠️ <strong>Important:</strong> This is for educational purposes only. Always consult a healthcare professional for proper diagnosis and treatment.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* About Section */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>ℹ️ About Arogya Mantra</h3>
            <div style={styles.aboutContent}>
              <p><strong>Purpose:</strong> AI-powered tool to help identify common skin conditions and provide health information.</p>
              <p><strong>Features:</strong> Image analysis, health chatbot, educational content, and quick screening.</p>
              <p><strong>Privacy:</strong> Images are processed securely and not stored on our servers.</p>
              <p><strong>Disclaimer:</strong> This tool provides educational information only and should not replace professional medical advice.</p>
            </div>
          </div>
        </div>
      )}

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div style={styles.content}>
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
                placeholder="Ask me about health, skincare, symptoms..."
                style={styles.chatInput}
                disabled={chatLoading}
              />
              <button type="submit" style={styles.chatButton} disabled={chatLoading || !message.trim()}>
                {chatLoading ? '⏳' : '🚀'} Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles object
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f1419',
    color: '#ffffff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '48px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
  },
  titlePrimary: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 20px rgba(102, 126, 234, 0.5)',
  },
  titleSecondary: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 20px rgba(240, 147, 251, 0.5)',
  },
  subtitle: {
    fontSize: '18px',
    opacity: 0.8,
    margin: 0,
  },
  tabContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '30px',
  },
  tab: {
    padding: '12px 24px',
    border: '2px solid #333',
    borderRadius: '25px',
    backgroundColor: 'transparent',
    color: '#ffffff',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  activeTab: {
    borderColor: '#667eea',
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    boxShadow: '0 0 20px rgba(102, 126, 234, 0.3)',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '15px',
    padding: '25px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
  },
  cardTitle: {
    fontSize: '24px',
    marginBottom: '20px',
    color: '#667eea',
  },
  imageContainer: {
    border: '2px dashed #667eea',
    borderRadius: '15px',
    padding: '20px',
    textAlign: 'center',
    minHeight: '300px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  placeholder: {
    color: '#888',
  },
  placeholderIcon: {
    fontSize: '60px',
    marginBottom: '10px',
  },
  imagePreview: {
    textAlign: 'center',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '300px',
    borderRadius: '10px',
    marginBottom: '10px',
  },
  imageStatus: {
    color: '#4ade80',
    fontWeight: 'bold',
  },
  cameraContainer: {
    width: '100%',
  },
  video: {
    width: '100%',
    maxHeight: '300px',
    borderRadius: '10px',
  },
  buttonContainer: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '20px',
  },
  button: {
    padding: '12px 20px',
    border: 'none',
    borderRadius: '25px',
    backgroundColor: '#667eea',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minWidth: '120px',
  },
  analyzeButton: {
    backgroundColor: '#f5576c',
  },
  tips: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: '10px',
    padding: '15px',
    fontSize: '14px',
  },
  loading: {
    textAlign: 'center',
    padding: '30px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #333',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    padding: '15px',
    color: '#fca5a5',
  },
  result: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: '10px',
    padding: '20px',
  },
  resultText: {
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
    fontSize: '16px',
    lineHeight: '1.6',
    margin: '0 0 15px 0',
  },
  timestamp: {
    fontSize: '12px',
    opacity: 0.7,
    textAlign: 'right',
    margin: '10px 0',
  },
  disclaimer: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '15px',
    fontSize: '14px',
    color: '#fbbf24',
  },
  aboutContent: {
    lineHeight: '1.8',
  },
  chatContainer: {
    height: '400px',
    overflowY: 'auto',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  chatMessage: {
    marginBottom: '15px',
    display: 'flex',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  botMessage: {
    justifyContent: 'flex-start',
  },
  messageContent: {
    maxWidth: '70%',
    padding: '12px 16px',
    borderRadius: '18px',
    backgroundColor: '#667eea',
    wordWrap: 'break-word',
  },
  chatForm: {
    display: 'flex',
    gap: '10px',
  },
  chatInput: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '25px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    fontSize: '16px',
    outline: 'none',
  },
  chatButton: {
    padding: '12px 20px',
    border: 'none',
    borderRadius: '25px',
    backgroundColor: '#f5576c',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  typingIndicator: {
    display: 'flex',
    gap: '4px',
  },
};

export default App;
