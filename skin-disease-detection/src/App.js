import React, { useState, useRef } from 'react';

function App() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);

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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
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
            Advanced AI-Powered Skin Health Analysis
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: image ? '1fr 1fr' : '1fr',
          gap: '30px',
          alignItems: 'start'
        }}>
          
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
              📸 Upload Image for Analysis
            </h2>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                border: isDragging ? '3px dashed #667eea' : '3px dashed #e2e8f0',
                borderRadius: '15px',
                padding: '40px',
                textAlign: 'center',
                backgroundColor: isDragging ? '#f0f4ff' : '#f8fafc',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                marginBottom: '25px'
              }}
              onClick={() => fileRef.current && fileRef.current.click()}
            >
              {image ? (
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
                    Drag & drop your image here
                  </p>
                  <p style={{
                    color: '#9ca3af',
                    fontSize: '0.95rem'
                  }}>
                    or click to browse your files
                  </p>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '15px',
                    marginTop: '20px',
                    fontSize: '0.9rem',
                    color: '#6b7280'
                  }}>
                    <span>📋 JPG</span>
                    <span>📋 PNG</span>
                    <span>📋 WEBP</span>
                  </div>
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

            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => fileRef.current && fileRef.current.click()}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  padding: '15px 30px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                  transition: 'all 0.3s ease'
                }}
              >
                📁 Choose Image
              </button>

              <button
                onClick={analyzeImage}
                disabled={!image || loading}
                style={{
                  background: loading || !image 
                    ? 'linear-gradient(135deg, #d1d5db, #9ca3af)' 
                    : 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  padding: '15px 30px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  borderRadius: '12px',
                  cursor: loading || !image ? 'not-allowed' : 'pointer',
                  boxShadow: loading || !image 
                    ? 'none' 
                    : '0 4px 15px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s ease'
                }}
              >
                {loading ? '🔍 Analyzing...' : '🧠 Analyze with AI'}
              </button>
            </div>

            <div style={{
              marginTop: '25px',
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
                💡 Tips for Better Results
              </h4>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                color: '#78350f',
                fontSize: '0.9rem'
              }}>
                <li style={{ marginBottom: '6px' }}>✨ Use good lighting (natural light preferred)</li>
                <li style={{ marginBottom: '6px' }}>📏 Keep the affected area clearly visible</li>
                <li style={{ marginBottom: '6px' }}>🔍 Ensure image is clear and focused</li>
                <li>📱 High resolution images work best</li>
              </ul>
            </div>
          </div>

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
                  <p style={{ color: '#6b7280', marginTop: '10px' }}>
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
                  <div style={{ fontSize: '3rem', marginBottom: '15px' }}>❌</div>
                  <h3 style={{
                    color: '#dc2626',
                    fontSize: '1.3rem',
                    fontWeight: '600',
                    marginBottom: '10px'
                  }}>
                    Analysis Failed
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
                      AI Analysis Complete
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
                      marginBottom: '15px',
                      border: '1px solid #d1fae5'
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
                      alignItems: 'center',
                      fontSize: '0.9rem',
                      color: '#6b7280'
                    }}>
                      <span>🕒 {result.timestamp}</span>
                      <span>🤖 Powered by AI</span>
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#fef3c7',
                    border: '2px solid #fcd34d',
                    borderRadius: '12px',
                    padding: '20px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}>
                      <div style={{ fontSize: '1.5rem' }}>⚠️</div>
                      <div>
                        <h4 style={{
                          color: '#92400e',
                          fontSize: '1.1rem',
                          fontWeight: '600',
                          margin: '0 0 8px 0'
                        }}>
                          Important Medical Disclaimer
                        </h4>
                        <p style={{
                          color: '#78350f',
                          fontSize: '0.95rem',
                          lineHeight: '1.5',
                          margin: 0
                        }}>
                          This AI analysis is for educational and informational purposes only. 
                          It should not be considered as professional medical advice, diagnosis, or treatment. 
                          Always consult with a qualified healthcare professional or dermatologist 
                          for proper medical evaluation and treatment.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: '50px',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '0.9rem'
        }}>
          <p>Made with ❤️ using AI and Machine Learing • Advancing Healthcare Through Technology</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }}></style>
    </div>
  );
}

export default App;
