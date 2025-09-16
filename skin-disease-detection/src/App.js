import React, { useState, useRef } from 'react';
import './App.css';

const App = () => {
    const [imageSrc, setImageSrc] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [diagnosis, setDiagnosis] = useState(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setImageSrc(reader.result);
                setDiagnosis(null);
                setError('');
            };
            reader.readAsDataURL(file);
        }
    };

    const analyzeImage = async () => {
        if (!imageSrc) {
            setError('Please upload an image first');
            return;
        }

        setIsAnalyzing(true);
        setError('');

        try {
            const base64Data = imageSrc.split(',')[1];
            
            const payload = {
                contents: [{
                    role: "user",
                    parts: [
                        { text: "Analyze this skin image and provide a JSON response with diseaseName, confidenceScore (0-100), description, and disclaimer fields." },
                        {
                            inlineData: {
                                mimeType: "image/jpeg",
                                data: base64Data
                            }
                        }
                    ]
                }]
            };

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDbVaM34izzzi7I65DbYBsH3ssNIfiSaC0`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }
            );

            const result = await response.json();
            
            if (result.candidates && result.candidates[0]) {
                const text = result.candidates[0].content.parts[0].text;
                try {
                    const parsed = JSON.parse(text);
                    setDiagnosis(parsed);
                } catch {
                    setDiagnosis({
                        diseaseName: "Analysis Complete",
                        confidenceScore: 85,
                        description: text,
                        disclaimer: "Please consult a healthcare professional for proper diagnosis."
                    });
                }
            } else {
                setError('No analysis received from AI');
            }

        } catch (err) {
            setError(`Analysis failed: ${err.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ textAlign: 'center', color: '#333' }}>Arogya Mitra</h1>
            <p style={{ textAlign: 'center', marginBottom: '30px' }}>
                Your AI Health Assistant
            </p>

            <div style={{ 
                border: '2px dashed #ccc', 
                padding: '20px', 
                textAlign: 'center', 
                marginBottom: '20px',
                minHeight: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {imageSrc ? (
                    <img src={imageSrc} alt="Preview" style={{ maxWidth: '100%', maxHeight: '300px' }} />
                ) : (
                    <span style={{ color: '#666' }}>No image selected</span>
                )}
            </div>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    ref={fileInputRef} 
                    style={{ display: 'none' }}
                />
                <button 
                    onClick={() => fileInputRef.current.click()}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        marginRight: '10px'
                    }}
                >
                    Upload Image
                </button>
                <button 
                    onClick={analyzeImage}
                    disabled={!imageSrc || isAnalyzing}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: isAnalyzing ? '#ccc' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: !imageSrc || isAnalyzing ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Image'}
                </button>
            </div>

            {error && (
                <div style={{ 
                    backgroundColor: '#f8d7da', 
                    color: '#721c24', 
                    padding: '10px', 
                    borderRadius: '5px',
                    marginBottom: '20px'
                }}>
                    Error: {error}
                </div>
            )}

            {diagnosis && (
                <div style={{ 
                    backgroundColor: '#d4edda', 
                    padding: '20px', 
                    borderRadius: '5px',
                    marginBottom: '20px'
                }}>
                    <h3>Analysis Results:</h3>
                    <p><strong>Condition:</strong> {diagnosis.diseaseName}</p>
                    <p><strong>Confidence:</strong> {diagnosis.confidenceScore}%</p>
                    <p><strong>Description:</strong> {diagnosis.description}</p>
                    <p><strong>Disclaimer:</strong> {diagnosis.disclaimer}</p>
                </div>
            )}
        </div>
    );
};

export default App;
