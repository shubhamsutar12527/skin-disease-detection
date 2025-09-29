import React, { useState, useRef } from 'react';

function App() {
  const [activeTab, setActiveTab] = useState('scan');
  const [image, setImage] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [cameraMode, setCameraMode] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [chatHistory, setChatHistory] = useState([
    { role: 'bot', text: 'Welcome to Arogya Mantra! Describe your skin concern or ask me any health questions.' }
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

  const analyzeDescription = async () => {
    if (!description.trim()) {
      setError('Please describe your skin condition to get an analysis.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyClr14CAWBVITR6oi24fKkHxkPBAuc5pEI',
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a knowledgeable health assistant. Based on this skin condition description: "${description.trim()}", provide:

1. **Possible Conditions**: List 2-3 most likely skin conditions
2. **Confidence Level**: Your assessment confidence (Low/Medium/High)
3. **Key Symptoms**: Main symptoms identified
4. **Care Recommendations**: 
   - Immediate care steps
   - When to see a healthcare provider
   - Prevention tips
5. **Medical Disclaimer**: This is educational information only

Provide detailed, helpful information while being clear about limitations.`
              }]
            }]
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const analysisText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (analysisText) {
          setResult({
            text: analysisText,
            timestamp: new Date().toLocaleString(),
            input: description.trim()
          });
        } else {
          setError('No analysis result received. Please try again.');
        }
      } else {
        const errorData = await response.json();
        throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatLoading(true);

    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyClr14CAWBVITR6oi24fKkHxkPBAuc5pEI',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a helpful health assistant. Answer this health question clearly: "${userMessage}". Provide practical, evidence-based information. Always remind users to consult healthcare professionals for serious concerns.`
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
        throw new Error('Chat service temporarily unavailable');
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { 
        role: 'bot', 
        text: 'Sorry, I am having technical difficulties. Please try again in a moment.' 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const clearData = () => {
    setImage(null);
    setDescription('');
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
        <p style={styles.subtitle}>AI-Powered Health Analysis & Assistant</p>
      </header>

      <nav style={styles.tabContainer}>
        <button
          style={activeTab === 'scan' ? {...styles.tab, ...styles.activeTab} : styles.tab}
          onClick={() => setActiveTab('scan')}
        >
          🔬 Skin Analysis
        </button>
        <button
          style={activeTab === 'chat' ? {...styles.tab, ...styles.activeTab} : styles.tab}
          onClick={() => setActiveTab('chat')}
        >
          🤖 Health Assistant
        </button>
        <button
          style={activeTab === 'about' ? {...styles.tab, ...styles.activeTab} : styles.tab}
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
                <h3 style={styles.cardTitle}>📸 Skin Condition Analysis</h3>
                {(image || description) && (
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
                    <img src={image} alt="Skin condition" style={styles.image} />
                    <p style={styles.imageStatus}>✅ Image captured - Now describe what you see</p>
                  </div>
                ) : (
                  <div style={styles.placeholder}>
                    <div style={styles.placeholderIcon}>🖼️</div>
                    <h4>Upload or Capture Image (Optional)</h4>
                    <p>You can upload an image for reference, then describe your skin condition below</p>
                  </div>
                )}
              </div>

              <div style={styles.buttonContainer}>
                {!cameraMode ? (
                  <React.Fragment>
                    <button style={styles.button} onClick={() => fileInputRef.current?.click()}>
                      📁 Upload Image
                    </button>
                    <button style={styles.button} onClick={startCamera}>
                      📷 Camera
                    </button>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <button style={styles.captureButton} onClick={captureImage}>
                      📸 Capture
                    </button>
                    <button style={styles.button} onClick={flipCamera}>
                      🔄 Flip
                    </button>
                    <button style={styles.button} onClick={stopCamera}>
                      ❌ Cancel
                    </button>
                  </React.Fragment>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              <div style={styles.descriptionSection}>
                <h4 style={styles.sectionTitle}>📝 Describe Your Skin Condition</h4>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your skin condition in detail:&#10;&#10;• What does it look like? (color, size, texture)&#10;• Where is it located?&#10;• When did it start?&#10;• Any symptoms? (itching, pain, burning)&#10;• What makes it better or worse?&#10;&#10;Example: 'Red, itchy patches on my arms that appeared 3 days ago. They are about 2cm wide, slightly raised, and get worse when I scratch them.'"
                  style={styles.textarea}
                  rows={6}
                />
                <button 
                  style={(!description.trim() || loading) ? 
                    {...styles.analyzeButton, opacity: 0.6} : 
                    styles.analyzeButton
                  }
                  onClick={analyzeDescription}
                  disabled={!description.trim() || loading}
                >
                  {loading ? '🔄 Analyzing...' : '🧠 Analyze Description'}
                </button>
              </div>

              <div style={styles.tips}>
                <h4>💡 Tips for Better Analysis:</h4>
                <ul>
                  <li><strong>Be specific:</strong> Include color, size, texture, location</li>
                  <li><strong>Mention timing:</strong> When it started, how it has changed</li>
                  <li><strong>Include symptoms:</strong> Pain, itching, burning, etc.</li>
                  <li><strong>Note triggers:</strong> What makes it better or worse</li>
                </ul>
              </div>
            </div>

            {(loading || result || error) && (
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>📊 Analysis Results</h3>
                
                {loading && (
                  <div style={styles.loading}>
                    <div style={styles.spinner}></div>
                    <p>Analyzing your description with AI...</p>
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
                    <div style={styles.inputSummary}>
                      <strong>Your Description:</strong> "{result.input}"
                    </div>
                    <pre style={styles.resultText}>{result.text}</pre>
                    <div style={styles.disclaimer}>
                      <strong>⚕️ Important Disclaimer:</strong> This analysis is based on your description only and is for educational purposes. For accurate diagnosis and treatment, please consult a qualified healthcare professional.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>💬 Health Assistant Chat</h3>
            
            <div style={styles.chatContainer}>
              {chatHistory.map((msg, index) => (
                <div key={index} style={msg.role === 'user' ? 
                  {...styles.chatMessage, ...styles.userMessage} : 
                  {...styles.chatMessage, ...styles.botMessage}
                }>
                  <div style={styles.messageContent}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{...styles.chatMessage, ...styles.botMessage}}>
                  <div style={styles.messageContent}>
                    <span>🤔 Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={sendMessage} style={styles.chatForm}>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about skin conditions, symptoms, treatments, prevention..."
                style={styles.chatInput}
                disabled={chatLoading}
              />
              <button 
                type="submit" 
                style={styles.chatButton} 
                disabled={chatLoading || !message.trim()}
              >
                {chatLoading ? '⏳' : '🚀'} Send
              </button>
            </form>
          </div>
        )}

        {activeTab === 'about' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>ℹ️ About Arogya Mantra</h3>
            <div style={styles.aboutContent}>
              <p><strong>Arogya Mantra</strong> is an AI-powered health analysis tool that helps you understand skin conditions through detailed descriptions.</p>
              
              <h4>🌟 Features:</h4>
              <ul>
                <li><strong>Description-Based Analysis:</strong> AI analyzes your detailed skin condition descriptions</li>
                <li><strong>Health Assistant Chat:</strong> Ask questions about skin health, treatments, and prevention</li>
                <li><strong>Image Reference:</strong> Upload images to help with your descriptions</li>
                <li><strong>Educational Focus:</strong> Provides information to help you understand conditions</li>
                <li><strong>Privacy Focused:</strong> No data stored, secure processing</li>
              </ul>

              <h4>🎯 How It Works:</h4>
              <ol>
                <li>Upload an image (optional) or describe your skin condition in detail</li>
                <li>AI analyzes your description and provides possible conditions</li>
                <li>Get recommendations for care and when to see a doctor</li>
                <li>Use the chat for follow-up questions</li>
              </ol>
              
              <div style={styles.disclaimerBox}>
                <strong>⚠️ Important Medical Disclaimer:</strong>
                <p>This tool provides educational information only based on your descriptions. It cannot replace professional medical examination, diagnosis, or treatment. Always consult qualified healthcare professionals for accurate diagnosis and treatment.</p>
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
    minHeight: '250px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.5rem',
  },
  placeholder: {
    color: '#718096',
  },
  placeholderIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  cameraContainer: {
    width: '100%',
  },
  video: {
    width: '100%',
    maxHeight: '300px',
    borderRadius: '0.5rem',
  },
  imagePreview: {
    textAlign: 'center',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '300px',
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
    marginBottom: '2rem',
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
  captureButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#e53e3e',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    minWidth: '120px',
  },
  descriptionSection: {
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    fontSize: '1.2rem',
    color: '#667eea',
    marginBottom: '1rem',
  },
  textarea: {
    width: '100%',
    minHeight: '150px',
    padding: '1rem',
    borderRadius: '0.5rem',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#ffffff',
    fontSize: '1rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    marginBottom: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  analyzeButton: {
    width: '100%',
    padding: '1rem',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
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
  inputSummary: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
    fontSize: '0.9rem',
    fontStyle: 'italic',
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
