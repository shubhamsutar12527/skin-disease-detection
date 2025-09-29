import React, { useState, useRef } from 'react';

// API Configuration with your new details
const GEMINI_API_KEY = 'AIzaSyClr14CAWBVITR6oi24fKkHxkPBAuc5pEI';
const PROJECT_NAME = 'projects/798774183029';
const PROJECT_NUMBER = '798774183029';

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

  // Enhanced analysis function with multiple API attempts
  const analyzeDescription = async () => {
    if (!description.trim()) {
      setError('Please describe your skin condition to get an analysis.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    // Try multiple API endpoints and models
    const apiConfigs = [
      // Try v1beta with gemini-pro first
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        model: 'gemini-pro (v1beta)'
      },
      // Try v1 with gemini-pro
      {
        url: `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        model: 'gemini-pro (v1)'
      },
      // Try with project-specific path
      {
        url: `https://generativelanguage.googleapis.com/v1beta/${PROJECT_NAME}/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        model: 'gemini-pro (project-specific)'
      }
    ];

    for (const config of apiConfigs) {
      try {
        console.log(`Trying: ${config.model}...`);
        
        const response = await fetch(config.url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-goog-user-project': PROJECT_NUMBER
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a knowledgeable health assistant. Based on this skin condition description: "${description.trim()}", provide:

1. **Possible Conditions**: List 2-3 most likely skin conditions that match this description
2. **Confidence Assessment**: Rate your confidence level (Low/Medium/High) and explain why
3. **Key Symptoms**: Identify the main symptoms mentioned
4. **General Care Recommendations**: 
   - Immediate care steps
   - When to see a healthcare provider
   - Prevention tips
5. **Important Disclaimer**: Emphasize this is educational information only

Please provide detailed, helpful information while being clear about the limitations of text-based assessment.`
              }]
            }]
          })
        });

        console.log(`Response status: ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          const analysisText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (analysisText) {
            console.log(`✅ Success with ${config.model}`);
            setResult({
              text: analysisText,
              timestamp: new Date().toLocaleString(),
              input: description.trim(),
              model: config.model
            });
            setLoading(false);
            return;
          }
        } else {
          const errorData = await response.json();
          console.log(`❌ Failed ${config.model}:`, errorData.error?.message || 'Unknown error');
        }
      } catch (err) {
        console.log(`❌ Error with ${config.model}:`, err.message);
      }
    }

    // If all attempts fail
    setError(`Analysis failed: Unable to connect to AI service. Please check your internet connection and try again. 

**Troubleshooting:**
- Verify your API key is active
- Check if the service is available in your region
- Try again in a few minutes`);
    setLoading(false);
  };

  // Enhanced chat function with multiple endpoints
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatLoading(true);

    const apiConfigs = [
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        model: 'gemini-pro (v1beta)'
      },
      {
        url: `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        model: 'gemini-pro (v1)'
      }
    ];

    for (const config of apiConfigs) {
      try {
        const response = await fetch(config.url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-goog-user-project': PROJECT_NUMBER
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a helpful health assistant. Answer this health question clearly and accurately: "${userMessage}". 

Provide practical, evidence-based information. If it's about a specific condition, include:
- Brief explanation
- Common symptoms
- General management tips
- When to seek medical care

Always remind users to consult healthcare professionals for diagnosis and treatment. Keep responses conversational but professional.`
              }]
            }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const botResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not process your request.';
          setChatHistory(prev => [...prev, { role: 'bot', text: botResponse }]);
          setChatLoading(false);
          return;
        }
      } catch (err) {
        console.log(`Chat error with ${config.model}:`, err.message);
      }
    }

    // If all attempts fail
    setChatHistory(prev => [...prev, { 
      role: 'bot', 
      text: 'Sorry, I\'m having technical difficulties connecting to the AI service. Please try again in a moment.' 
    }]);
    setChatLoading(false);
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
        <div style={styles.apiInfo}>
          <small>Powered by Google Gemini AI • Project: {PROJECT_NUMBER}</small>
        </div>
      </header>

      <nav style={styles.tabContainer}>
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
                <h3 style={styles.cardTitle}>📸 Skin Condition Analysis</h3>
                {(image || description) && (
                  <button onClick={clearData} style={styles.clearButton}>
                    🗑️ Clear
                  </button>
                )}
              </div>
              
              {/* Image Upload Section */}
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
                  <>
                    <button style={styles.button} onClick={() => fileInputRef.current?.click()}>
                      📁 Upload Image
                    </button>
                    <button style={styles.button} onClick={startCamera}>
                      📷 Camera
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

              {/* Description Section */}
              <div style={styles.descriptionSection}>
                <h4 style={styles.sectionTitle}>📝 Describe Your Skin Condition</h4>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your skin condition in detail:&#10;&#10;• What does it look like? (color, size, texture)&#10;• Where is it located?&#10;• When did it start?&#10;• Any symptoms? (itching, pain, burning)&#10;• What makes it better or worse?&#10;• Any recent changes?&#10;&#10;Example: 'Red, itchy patches on my arms that appeared 3 days ago. They're about 2cm wide, slightly raised, and get worse when I scratch them.'"
                  style={styles.textarea}
                  rows={6}
                />
                <button 
                  style={{...styles.analyzeButton, opacity: (!description.trim() || loading) ? 0.6 : 1}}
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
                  <li><strong>Mention timing:</strong> When it started, how it's changed</li>
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
                    <small>Trying multiple AI endpoints for best results...</small>
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
                      <div style={styles.resultMeta}>
                        <span style={styles.model}>Model: {result.model}</span>
                        <span style={styles.timestamp}>{result.timestamp}</span>
                      </div>
                    </div>
                    <div style={styles.inputSummary}>
                      <strong>Your Description:</strong> "{result.input}"
                    </div>
                    <pre style={styles.resultText}>{result.text}</pre>
                    <div style={styles.disclaimer}>
                      <strong>⚕️ Important Disclaimer:</strong> This analysis is based on your description only and is for educational purposes. For accurate diagnosis and treatment, please consult a qualified healthcare professional or dermatologist.
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
                <div key={index} style={{...styles.chatMessage, ...(msg.role === 'user' ? styles.userMessage : styles.botMessage)}}>
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
              <button type="submit" style={styles.chatButton} disabled={chatLoading || !message.trim()}>
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

              <h4>🔧 Technical Details:</h4>
              <ul>
                <li><strong>AI Model:</strong> Google Gemini Pro</li>
                <li><strong>API Key:</strong> {GEMINI_API_KEY.substring(0, 20)}...</li>
                <li><strong>Project:</strong> {PROJECT_NUMBER}</li>
                <li><strong>Multiple Endpoints:</strong> Automatic fallback for reliability</li>
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
                <p>This tool provides educational information only based on your descriptions. It cannot replace professional medical examination, diagnosis, or treatment. Always consult qualified healthcare professionals for:</p>
                <ul>
                  <li>Accurate diagnosis of skin conditions</li>
                  <li>Treatment recommendations</li>
                  <li>Persistent or worsening symptoms</li>
                  <li>Any serious health concerns</li>
                </ul>
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
    margin: '0 0 0.5rem 0',
    color: '#a0aec0',
  },
  apiInfo: {
    opacity: 0.6,
    fontSize: '0.85rem',
    color: '#718096',
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
    backgroundColor: '#e53e3e',
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
    padding: '1
