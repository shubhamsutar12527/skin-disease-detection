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
      // Check file size (max 4MB for better processing)
      if (file.size > 4 * 1024 * 1024) {
        setError('Image too large! Please select an image smaller than 4MB.');
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

  const startCamera = async () => {
    try {
      setCameraMode(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
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
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setImage(imageData);
      setResult(null);
      setError('');
      stopCamera();
    }
  };

  // REAL IMAGE ANALYSIS with Vision API
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
      
      // Vision models to try (in order of preference)
      const visionModels = [
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro-vision'
      ];

      const apiVersions = ['v1beta', 'v1'];
      
      let analysisResult = null;
      let successModel = '';

      // Try different combinations of API version and model
      for (const apiVersion of apiVersions) {
        for (const model of visionModels) {
          try {
            console.log(`Trying ${apiVersion}/${model}...`);

            const response = await fetch(
              `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=AIzaSyClr14CAWBVITR6oi24fKkHxkPBAuc5pEI`,
              {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'x-goog-user-project': '798774183029'
                },
                body: JSON.stringify({
                  contents: [{
                    parts: [
                      {
                        text: `As an expert dermatology AI assistant, analyze this skin image and provide:

**CLINICAL ASSESSMENT:**
1. **Primary Observation**: What do you see in the image?
2. **Possible Skin Conditions**: List 2-3 most likely conditions
3. **Confidence Level**: Rate your assessment confidence (High/Medium/Low)
4. **Key Visual Features**: Color, texture, size, distribution, borders

**MEDICAL ANALYSIS:**
5. **Differential Diagnosis**: Consider alternative possibilities
6. **Severity Assessment**: Mild/Moderate/Severe (if applicable)
7. **Risk Factors**: What might contribute to this condition?

**RECOMMENDATIONS:**
8. **Immediate Care**: First-aid and immediate steps
9. **Professional Consultation**: When to see a dermatologist
10. **Prevention**: How to prevent recurrence or worsening

**IMPORTANT MEDICAL DISCLAIMER:**
This AI analysis is for educational purposes only and cannot replace professional medical diagnosis. Always consult a qualified dermatologist or healthcare provider for accurate diagnosis and treatment.

Please provide a detailed, professional analysis based on what you observe in the image.`
                      },
                      {
                        inlineData: {
                          mimeType: "image/jpeg",
                          data: base64Image
                        }
                      }
                    ]
                  }],
                  generationConfig: {
                    temperature: 0.4,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 2048,
                  },
                  safetySettings: [
                    {
                      category: 'HARM_CATEGORY_MEDICAL',
                      threshold: 'BLOCK_ONLY_HIGH'
                    }
                  ]
                })
              }
            );

            console.log(`Response status for ${model}:`, response.status);

            if (response.ok) {
              const data = await response.json();
              const analysisText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              
              if (analysisText && !analysisText.includes('cannot analyze') && !analysisText.includes('cannot identify')) {
                analysisResult = analysisText;
                successModel = `${apiVersion}/${model}`;
                console.log(`✅ Success with ${successModel}`);
                break;
              }
            } else {
              const errorData = await response.json();
              console.log(`❌ ${model} failed:`, errorData.error?.message || 'Unknown error');
            }
          } catch (err) {
            console.log(`❌ Error with ${model}:`, err.message);
          }
        }
        
        if (analysisResult) break;
      }

      if (analysisResult) {
        setResult({
          text: analysisResult,
          timestamp: new Date().toLocaleString(),
          model: successModel,
          imageAnalyzed: true
        });
      } else {
        setError(`Unable to analyze image. This could be due to:
        
• Image quality issues (try a clearer, well-lit photo)
• Content filtering (image may not be suitable for analysis)
• API limitations (try again in a moment)

Please try:
1. Taking a clearer photo with better lighting
2. Ensuring the skin area is clearly visible
3. Using a different angle or distance`);
      }

    } catch (err) {
      console.error('Analysis error:', err);
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced chat function
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatLoading(true);

    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyClr14CAWBVITR6oi24fKkHxkPBAuc5pEI',
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-goog-user-project': '798774183029'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are Arogya Mantra, an expert health assistant specializing in dermatology and general health guidance.

User Question: "${userMessage}"

Provide a comprehensive, medically accurate response that includes:
- Direct answer to their question
- Relevant medical information
- Prevention tips (if applicable)
- When to seek professional care
- Clear disclaimer about consulting healthcare providers

Keep the tone professional yet approachable, and always prioritize user safety.`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            }
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
        <p style={styles.subtitle}>Professional AI-Powered Skin Disease Detection & Analysis</p>
        <div style={styles.badge}>
          <span>🔬 Vision AI Enabled</span>
          <span>⚕️ Medical Grade Analysis</span>
        </div>
      </header>

      <nav style={styles.tabContainer}>
        <button
          style={activeTab === 'scan' ? {...styles.tab, ...styles.activeTab} : styles.tab}
          onClick={() => setActiveTab('scan')}
        >
          🔬 Image Analysis
        </button>
        <button
          style={activeTab === 'chat' ? {...styles.tab, ...styles.activeTab} : styles.tab}
          onClick={() => setActiveTab('chat')}
        >
          🤖 AI Assistant
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
                <h3 style={styles.cardTitle}>📸 Professional Skin Image Analysis</h3>
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
                    <div style={styles.cameraOverlay}>
                      <div style={styles.cameraFrame}></div>
                      <p style={styles.cameraInstructions}>Position the skin area within the frame</p>
                    </div>
                  </div>
                ) : image ? (
                  <div style={styles.imagePreview}>
                    <img src={image} alt="Skin for analysis" style={styles.image} />
                    <p style={styles.imageStatus}>✅ Ready for professional AI analysis</p>
                  </div>
                ) : (
                  <div style={styles.placeholder}>
                    <div style={styles.placeholderIcon}>🔬</div>
                    <h4>Upload or Capture Skin Image</h4>
                    <p>Get instant professional-grade skin condition analysis</p>
                    <div style={styles.supportedFormats}>
                      <small>Supports: JPG, PNG • Max size: 4MB • Best quality: Clear, well-lit photos</small>
                    </div>
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
                      📷 Use Camera
                    </button>
                    <button 
                      style={(!image || loading) ? 
                        {...styles.analyzeButton, opacity: 0.6, cursor: 'not-allowed'} : 
                        styles.analyzeButton
                      }
                      onClick={analyzeImage}
                      disabled={!image || loading}
                    >
                      {loading ? '🔄 Analyzing...' : '🧠 Analyze Image'}
                    </button>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <button style={styles.captureButton} onClick={captureImage}>
                      📸 Capture Photo
                    </button>
                    <button style={styles.button} onClick={flipCamera}>
                      🔄 Flip Camera
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

              <div style={styles.tips}>
                <h4>📋 For Best Analysis Results:</h4>
                <ul>
                  <li><strong>Lighting:</strong> Use natural light or bright, even lighting</li>
                  <li><strong>Focus:</strong> Ensure the skin area is sharp and clear</li>
                  <li><strong>Distance:</strong> Fill the frame with the affected area</li>
                  <li><strong>Angle:</strong> Take photo straight-on, avoid shadows</li>
                  <li><strong>Background:</strong> Use plain background if possible</li>
                </ul>
              </div>
            </div>

            {(loading || result || error) && (
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>📊 Professional Analysis Results</h3>
                
                {loading && (
                  <div style={styles.loading}>
                    <div style={styles.spinner}></div>
                    <p>🔬 Analyzing image with advanced AI vision...</p>
                    <small>Processing medical-grade analysis • This may take 10-15 seconds</small>
                  </div>
                )}

                {error && (
                  <div style={styles.error}>
                    <h4>⚠️ Analysis Error</h4>
                    <pre style={styles.errorText}>{error}</pre>
                  </div>
                )}

                {result && (
                  <div style={styles.result}>
                    <div style={styles.resultHeader}>
                      <div style={styles.resultTitle}>
                        <span>✅ Professional Analysis Complete</span>
                        <span style={styles.resultBadge}>
                          {result.imageAnalyzed ? '📸 Image Analyzed' : '📝 Text Analysis'}
                        </span>
                      </div>
                      <div style={styles.resultMeta}>
                        <span style={styles.model}>Model: {result.model}</span>
                        <span style={styles.timestamp}>{result.timestamp}</span>
                      </div>
                    </div>
                    <div style={styles.resultContent}>
                      <pre style={styles.resultText}>{result.text}</pre>
                    </div>
                    <div style={styles.disclaimer}>
                      <strong>⚕️ Professional Medical Disclaimer:</strong> This AI analysis is for educational and screening purposes only. It should not be considered as a definitive medical diagnosis. For accurate diagnosis, treatment planning, and medical advice, please consult with a qualified dermatologist or healthcare provider. In case of serious symptoms or emergency conditions, seek immediate medical attention.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>💬 Professional Health Assistant</h3>
            
            <div style={styles.chatContainer}>
              {chatHistory.map((msg, index) => (
                <div key={index} style={msg.role === 'user' ? 
                  {...styles.chatMessage, ...styles.userMessage} : 
                  {...styles.chatMessage, ...styles.botMessage}
                }>
                  <div style={styles.messageContent}>
                    <div style={styles.messageText}>{msg.text}</div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{...styles.chatMessage, ...styles.botMessage}}>
                  <div style={styles.messageContent}>
                    <div style={styles.typingIndicator}>
                      <span>🤔</span>
                      <span>Consulting medical knowledge base...</span>
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
                placeholder="Ask about skin conditions, treatments, symptoms, prevention strategies..."
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
            <h3 style={styles.cardTitle}>ℹ️ About Arogya Mantra Professional</h3>
            <div style={styles.aboutContent}>
              <div style={styles.featureHighlight}>
                <h4>🔬 Advanced Vision AI Technology</h4>
                <p>Now powered with <strong>Google Gemini Vision API</strong> for direct image analysis and professional-grade skin condition detection.</p>
              </div>
              
              <h4>🌟 Professional Features:</h4>
              <ul>
                <li><strong>Real Image Analysis:</strong> Direct analysis of uploaded skin images</li>
                <li><strong>Medical-Grade AI:</strong> Advanced computer vision for skin condition detection</li>
                <li><strong>Professional Assessment:</strong> Detailed clinical observations and recommendations</li>
                <li><strong>Multiple AI Models:</strong> Automatic fallback to ensure best results</li>
                <li><strong>High-Resolution Support:</strong> Processes high-quality images up to 4MB</li>
                <li><strong>Expert Chat Assistant:</strong> Specialized in dermatology and health guidance</li>
              </ul>

              <h4>🔧 Technical Specifications:</h4>
              <ul>
                <li><strong>Vision Models:</strong> Gemini-1.5-Flash, Gemini-1.5-Pro, Gemini-Pro-Vision</li>
                <li><strong>Image Support:</strong> JPEG, PNG up to 4MB</li>
                <li><strong>Analysis Speed:</strong> 10-15 seconds for complete assessment</li>
                <li><strong>API Integration:</strong> Google Cloud AI with medical safety settings</li>
                <li><strong>Privacy:</strong> Images processed securely, not stored permanently</li>
              </ul>

              <h4>🎯 How Professional Analysis Works:</h4>
              <ol>
                <li><strong>Image Upload:</strong> High-quality photo processing with quality checks</li>
                <li><strong>AI Vision Analysis:</strong> Advanced computer vision examines skin features</li>
                <li><strong>Medical Assessment:</strong> Clinical evaluation of visual characteristics</li>
                <li><strong>Professional Report:</strong> Detailed findings with confidence levels</li>
                <li><strong>Recommendations:</strong> Care guidance and consultation advice</li>
              </ol>
              
              <div style={styles.disclaimerBox}>
                <strong>⚠️ Professional Medical Disclaimer:</strong>
                <p>Arogya Mantra Professional uses advanced AI for educational screening and preliminary assessment. While our technology provides sophisticated analysis, it cannot replace professional medical examination and diagnosis.</p>
                <p><strong>Always consult qualified healthcare professionals for:</strong></p>
                <ul>
                  <li>Definitive medical diagnosis</li>
                  <li>Treatment recommendations and prescriptions</li>
                  <li>Persistent, worsening, or concerning symptoms</li>
                  <li>Any serious health concerns or emergencies</li>
                </ul>
                <p><strong>Emergency:</strong> For urgent medical conditions, contact emergency services immediately.</p>
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
    margin: '0 0 1rem 0',
    color: '#a0aec0',
  },
  badge: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
    fontSize: '0.85rem',
    opacity: 0.8,
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
    transition: 'all 0.2s ease',
  },
  imageContainer: {
    border: '2px dashed #4a5568',
    borderRadius: '1rem',
    padding: '2rem',
    textAlign: 'center',
    minHeight: '350px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.5rem',
    position: 'relative',
  },
  placeholder: {
    color: '#718096',
  },
  placeholderIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  supportedFormats: {
    marginTop: '1rem',
    padding: '0.5rem',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: '0.5rem',
    color: '#a0aec0',
  },
  cameraContainer: {
    width: '100%',
    position: 'relative',
  },
  video: {
    width: '100%',
    maxHeight: '400px',
    borderRadius: '0.5rem',
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    pointerEvents: 'none',
  },
  cameraFrame: {
    width: '250px',
    height: '250px',
    border: '3px solid #667eea',
    borderRadius: '1rem',
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)',
  },
  cameraInstructions: {
    marginTop: '1rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '0.5rem',
    color: '#ffffff',
    fontSize: '0.9rem',
  },
  imagePreview: {
    textAlign: 'center',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '400px',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  imageStatus: {
    color: '#48bb78',
    fontWeight: '600',
    fontSize: '1.1rem',
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
    minWidth: '140px',
    transition: 'all 0.2s ease',
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
    minWidth: '140px',
  },
  analyzeButton: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    padding: '0.75rem 1.5rem',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    minWidth: '140px',
    boxShadow: '0 4px 15px rgba(240, 147, 251, 0.3)',
    transition: 'all 0.2s ease',
  },
  tips: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: '0.5rem',
    padding: '1rem',
    fontSize: '0.875rem',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
  },
  spinner: {
    width: '4rem',
    height: '4rem',
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
    padding: '1.5rem',
    color: '#feb2b2',
  },
  errorText: {
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    margin: '0.5rem 0',
  },
  result: {
    backgroundColor: 'rgba(72, 187, 120, 0.1)',
    border: '1px solid rgba(72, 187, 120, 0.3)',
    borderRadius: '0.5rem',
    padding: '1.5rem',
  },
  resultHeader: {
    marginBottom: '1rem',
  },
  resultTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
    color: '#9ae6b4',
    fontWeight: '600',
    fontSize: '1.1rem',
  },
  resultBadge: {
    fontSize: '0.8rem',
    padding: '0.25rem 0.5rem',
    backgroundColor: 'rgba(72, 187, 120, 0.2)',
    borderRadius: '0.25rem',
  },
  resultMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    opacity: 0.8,
  },
  model: {
    color: '#a0aec0',
  },
  timestamp: {
    color: '#a0aec0',
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
    border: '1px solid rgba(237, 137, 54, 0.3)',
    borderRadius: '0.5rem',
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#fbb74d',
    lineHeight: '1.5',
  },
  chatContainer: {
    height: '450px',
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
  messageText: {
    lineHeight: '1.4',
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontStyle: 'italic',
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
  chatButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  },
  aboutContent: {
    lineHeight: '1.7',
  },
  featureHighlight: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    border: '1px solid rgba(102, 126, 234, 0.2)',
    borderRadius: '0.5rem',
    padding: '1rem',
    marginBottom: '1.5rem',
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
