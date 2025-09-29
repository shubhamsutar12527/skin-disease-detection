import React, { useState, useRef } from 'react';

function App() {
  const [activeTab, setActiveTab] = useState('scan');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [apiTest, setApiTest] = useState(null);

  const fileInputRef = useRef(null);

  // TEST API FUNCTION - This will tell us exactly what's wrong
  const testAPI = async () => {
    setApiTest('Testing API...');
    
    try {
      // Test 1: Basic API connectivity
      console.log('Testing basic API...');
      const testResponse = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyClr14CAWBVITR6oi24fKkHxkPBAuc5pEI',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: 'Hello, this is a test. Please respond with "API working successfully".' }]
            }]
          })
        }
      );

      console.log('Basic API Status:', testResponse.status);

      if (testResponse.ok) {
        const data = await testResponse.json();
        console.log('Basic API Response:', data);
        
        // Test 2: Check available models
        console.log('Checking available models...');
        const modelsResponse = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyClr14CAWBVITR6oi24fKkHxkPBAuc5pEI'
        );
        
        if (modelsResponse.ok) {
          const modelsData = await modelsResponse.json();
          console.log('Available Models:', modelsData);
          
          const visionModels = modelsData.models?.filter(model => 
            model.name.includes('vision') || 
            model.supportedGenerationMethods?.includes('generateContent')
          ) || [];
          
          setApiTest(`✅ API Working! 
          
Available Models: ${modelsData.models?.length || 0}
Vision Models Found: ${visionModels.length}

Models: ${modelsData.models?.map(m => m.name).join(', ') || 'None'}

${visionModels.length > 0 ? 'Vision analysis should work!' : 'No vision models - subscription may not include vision API'}`);
          
        } else {
          setApiTest(`✅ Basic API works, but cannot list models. Status: ${modelsResponse.status}`);
        }
      } else {
        const errorData = await testResponse.json();
        console.error('API Test Failed:', errorData);
        setApiTest(`❌ API Test Failed: ${errorData.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('API Test Error:', err);
      setApiTest(`❌ Connection Error: ${err.message}`);
    }
  };

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

  const analyzeImage = async () => {
    if (!image) {
      setError('Please select an image first.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const base64Image = image.split(',')[1];
      
      // Try the most likely working combinations
      const attempts = [
        {
          url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyClr14CAWBVITR6oi24fKkHxkPBAuc5pEI',
          model: 'gemini-1.5-flash (v1beta)'
        },
        {
          url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=AIzaSyClr14CAWBVITR6oi24fKkHxkPBAuc5pEI',
          model: 'gemini-1.5-pro (v1beta)'
        },
        {
          url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=AIzaSyClr14CAWBVITR6oi24fKkHxkPBAuc5pEI',
          model: 'gemini-pro-vision (v1beta)'
        },
        {
          url: 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=AIzaSyClr14CAWBVITR6oi24fKkHxkPBAuc5pEI',
          model: 'gemini-1.5-flash (v1)'
        }
      ];

      let success = false;

      for (const attempt of attempts) {
        try {
          console.log(`Trying: ${attempt.model}`);
          
          const response = await fetch(attempt.url, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-goog-user-project': '798774183029'
            },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    text: "Analyze this skin image. Provide: 1) What you see 2) Possible skin conditions 3) Recommendations 4) Medical disclaimer"
                  },
                  {
                    inlineData: {
                      mimeType: "image/jpeg",
                      data: base64Image
                    }
                  }
                ]
              }]
            })
          });

          console.log(`${attempt.model} Status:`, response.status);

          if (response.ok) {
            const data = await response.json();
            console.log(`${attempt.model} Response:`, data);
            
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (text && text.trim()) {
              setResult({
                text: text,
                model: attempt.model,
                timestamp: new Date().toLocaleString()
              });
              success = true;
              console.log(`✅ Success with: ${attempt.model}`);
              break;
            }
          } else {
            const errorData = await response.json();
            console.log(`❌ ${attempt.model} failed:`, errorData.error?.message);
          }
        } catch (err) {
          console.log(`❌ ${attempt.model} error:`, err.message);
        }
      }

      if (!success) {
        setError(`All attempts failed. Possible issues:

1. **Vision API not enabled**: Your subscription might not include vision models
2. **API Key permissions**: May need to enable Gemini API in Google Cloud
3. **Regional restrictions**: Vision API might not be available in your region

Check the browser console (F12) for detailed error messages.`);
      }

    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
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

      {/* API Test Section */}
      <div style={styles.testSection}>
        <button onClick={testAPI} style={styles.testButton}>
          🔧 Test API Connection
        </button>
        {apiTest && (
          <div style={styles.testResult}>
            <pre>{apiTest}</pre>
          </div>
        )}
      </div>

      <main style={styles.content}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>📸 Image Analysis</h3>
          </div>
          
          <div style={styles.imageContainer}>
            {image ? (
              <div style={styles.imagePreview}>
                <img src={image} alt="Skin for analysis" style={styles.image} />
                <p style={styles.imageStatus}>✅ Image ready for analysis</p>
              </div>
            ) : (
              <div style={styles.placeholder}>
                <div style={styles.placeholderIcon}>🖼️</div>
                <h4>Upload Image for Analysis</h4>
                <p>Select a clear skin image for AI analysis</p>
              </div>
            )}
          </div>

          <div style={styles.buttonContainer}>
            <button style={styles.button} onClick={() => fileInputRef.current?.click()}>
              📁 Upload Image
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
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {(loading || result || error) && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📊 Analysis Results</h3>
            
            {loading && (
              <div style={styles.loading}>
                <div style={styles.spinner}></div>
                <p>Analyzing with AI...</p>
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
                  <span>✅ Analysis Complete</span>
                  <div style={styles.resultMeta}>
                    <span style={styles.model}>Model: {result.model}</span>
                    <span style={styles.timestamp}>{result.timestamp}</span>
                  </div>
                </div>
                <pre style={styles.resultText}>{result.text}</pre>
                <div style={styles.disclaimer}>
                  <strong>⚕️ Disclaimer:</strong> This analysis is for educational purposes only. Always consult healthcare professionals for medical diagnosis and treatment.
                </div>
              </div>
            )}
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
  testSection: {
    textAlign: 'center',
    padding: '1rem',
    maxWidth: '800px',
    margin: '0 auto',
  },
  testButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '1rem',
  },
  testResult: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '0.5rem',
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.9rem',
    lineHeight: '1.4',
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
    marginBottom: '1.5rem',
  },
  cardTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: '0',
    color: '#667eea',
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
    padding: '0.75rem 1.5rem',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    minWidth: '120px',
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    color: '#9ae6b4',
    fontWeight: '600',
  },
  resultMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    fontSize: '0.85rem',
  },
  model: {
    opacity: 0.8,
    marginBottom: '0.25rem',
  },
  timestamp: {
    opacity: 0.7,
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
};

export default App;
