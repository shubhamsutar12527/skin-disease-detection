# Create the complete App.js file with the user's API key already integrated
app_js_with_api = """import React, { useState, useRef, useEffect } from 'react';
import './App.css';

// Language data
const translations = {
    en: {
        title: "AI Skin Disease Detection",
        tagline: "Your intelligent health companion - Detect skin conditions using advanced AI",
        tabDiagnosis: "🔬 Skin Diagnosis",
        tabChatbot: "🤖 Health Assistant",
        diagnosisInstructions: "Upload an image or take a photo to get AI-powered analysis of skin conditions.",
        disclaimer: "⚠️ Medical Disclaimer: This tool is for educational purposes only and not a substitute for professional medical advice. Always consult a qualified dermatologist.",
        imagePlaceholder: "📷 Image Preview Area",
        uploadButton: "📁 Upload Image",
        takePhotoButton: "📷 Take Photo",
        capturePhotoButton: "📸 Capture",
        switchCameraButton: "🔄 Switch Camera",
        analyzeButton: "🧠 Analyze with AI",
        analyzing: "🔍 Analyzing...",
        analysisResults: "📊 AI Analysis Results",
        diseaseName: "Condition:",
        confidenceScore: "Confidence:",
        symptomsTitle: "🩺 Common Symptoms",
        basicPrecautionsTitle: "💡 Care & Prevention Tips",
        precautionsDefault: [
            "🧴 Cleanse gently: Use mild, pH-balanced cleanser twice daily",
            "💧 Moisturize regularly: Keep skin hydrated with suitable moisturizer",
            "☀️ Sun protection: Use SPF 30+ sunscreen daily, even indoors",
            "🥗 Healthy diet: Eat antioxidant-rich foods and stay hydrated"
        ],
        precautionsAcne: [
            "🧼 Wash face twice daily with gentle, oil-free cleanser",
            "🚫 Avoid touching face to prevent bacterial spread",
            "✨ Use non-comedogenic (non-pore-clogging) products only",
            "⛔ Never pop pimples - this causes scarring and infection"
        ],
        precautionsEczema: [
            "💧 Keep skin moisturized, especially after bathing",
            "🚫 Avoid harsh soaps, detergents, and fragranced products",
            "🌡️ Use lukewarm water for baths and showers",
            "👕 Wear loose, breathable cotton clothing"
        ],
        precautionsFungal: [
            "🧽 Keep affected area clean and completely dry",
            "💊 Apply antifungal cream/powder as directed by pharmacist",
            "🚫 Don't share towels, hats, combs, or personal items",
            "👔 Wear clean, breathable clothing and change daily"
        ],
        precautionsHealthy: [
            "🥗 Maintain balanced diet with vitamins and minerals",
            "☀️ Daily sunscreen protects from premature aging",
            "💧 Cleanse and moisturize regularly for healthy glow",
            "🚭 Avoid smoking and excessive alcohol consumption"
        ],
        precautionsDisclaimer: "💡 These are general wellness tips. For specific medical concerns, always consult a healthcare professional.",
        chatbotInstructions: "Ask me anything about skin health, conditions, or general wellness advice.",
        chatbotPlaceholder: "Type your health question here...",
        sendButton: "Send",
        chatbotInitialMessage: "👋 Hello! I'm your AI health assistant. Ask me about skin conditions, symptoms, or general health advice.",
        networkError: "🌐 Connection issue. Please check your internet and try again.",
        apiError: "🤖 AI temporarily unavailable. Please try again in a moment.",
        cameraError: "📷 Camera access denied. Please enable camera permissions in browser settings.",
        browserError: "❌ Your browser doesn't support camera features. Try Chrome or Firefox.",
        uploadError: "📸 Please upload an image or take a photo first before analysis.",
        analysisFailed: "❌ Analysis failed. Please try a clearer, well-lit image.",
        language: "🌐 Language",
        langInstruction: "in English",
        photoTips: "📋 Tips for Better Results:",
        tip1: "💡 Ensure bright, natural lighting (near window is best)",
        tip2: "🔍 Take clear, focused photo of affected skin area",
        tip3: "👍 Remove jewelry/clothing that blocks the view",
        tip4: "📏 Keep camera 6-12 inches away for optimal detail"
    },
    hi: {
        title: "AI त्वचा रोग जांच",
        tagline: "आपका बुद्धिमान स्वास्थ्य साथी - उन्नत AI से त्वचा की समस्याओं की पहचान करें",
        tabDiagnosis: "🔬 त्वचा जांच",
        tabChatbot: "🤖 स्वास्थ्य सहायक",
        diagnosisInstructions: "AI द्वारा त्वचा की स्थिति का विश्लेषण पाने के लिए तस्वीर अपलोड करें या खींचें।",
        disclaimer: "⚠️ चिकित्सा अस्वीकरण: यह उपकरण केवल शैक्षिक उद्देश्यों के लिए है और पेशेवर चिकित्सा सलाह का विकल्प नहीं है। हमेशा योग्य त्वचा विशेषज्ञ से सलाह लें।",
        imagePlaceholder: "📷 तस्वीर पूर्वावलोकन क्षेत्र",
        uploadButton: "📁 फ़ाइल अपलोड करें",
        takePhotoButton: "📷 फोटो खींचें",
        capturePhotoButton: "📸 कैप्चर करें",
        switchCameraButton: "🔄 कैमरा बदलें",
        analyzeButton: "🧠 AI से जांच करें",
        analyzing: "🔍 जांच हो रही है...",
        analysisResults: "📊 AI विश्लेषण परिणाम",
        diseaseName: "स्थिति:",
        confidenceScore: "विश्वास स्तर:",
        symptomsTitle: "🩺 सामान्य लक्षण",
        basicPrecautionsTitle: "💡 देखभाल और रोकथाम युक्तियाँ",
        precautionsDefault: [
            "🧴 धीरे से साफ करें: दिन में दो बार हल्के साबुन का उपयोग करें",
            "💧 नियमित मॉइस्चराइज़ करें: उपयुक्त मॉइस्चराइज़र से त्वचा को हाइड्रेटेड रखें",
            "☀️ धूप से बचाव: रोज़ाना SPF 30+ सनस्क्रीन का उपयोग करें",
            "🥗 स्वस्थ आहार: एंटीऑक्सीडेंट युक्त भोजन लें और हाइड्रेटेड रहें"
        ],
        precautionsAcne: [
            "🧼 दिन में दो बार हल्के, तेल-रहित क्लींज़र से चेहरा धोएं",
            "🚫 बैक्टीरिया के प्रसार को रोकने के लिए चेहरे को छूने से बचें",
            "✨ केवल नॉन-कॉमेडोजेनिक (छिद्र न भरने वाले) उत्पादों का उपयोग करें",
            "⛔ कभी भी दाने न फोड़ें - इससे निशान और संक्रमण होता है"
        ],
        precautionsEczema: [
            "💧 त्वचा को मॉइस्चराइज़ रखें, खासकर स्नान के बाद",
            "🚫 कठोर साबुन, डिटर्जेंट और सुगंधित उत्पादों से बचें",
            "🌡️ स्नान और शावर के लिए गुनगुने पानी का उपयोग करें",
            "👕 ढीले, सांस लेने वाले सूती कपड़े पहनें"
        ],
        precautionsFungal: [
            "🧽 प्रभावित क्षेत्र को साफ और पूरी तरह सुखा रखें",
            "💊 फार्मासिस्ट के निर्देशानुसार एंटी-फंगल क्रीम/पाउडर लगाएं",
            "🚫 तौलिए, टोपी, कंघी या व्यक्तिगत वस्तुओं को साझा न करें",
            "👔 साफ, सांस लेने वाले कपड़े पहनें और रोज़ाना बदलें"
        ],
        precautionsHealthy: [
            "🥗 विटामिन और खनिजों के साथ संतुलित आहार बनाए रखें",
            "☀️ रोज़ाना सनस्क्रीन समय से पहले बुढ़ापे से बचाता है",
            "💧 स्वस्थ चमक के लिए नियमित रूप से साफ और मॉइस्चराइज़ करें",
            "🚭 धूम्रपान और अत्यधिक शराब के सेवन से बचें"
        ],
        precautionsDisclaimer: "💡 ये सामान्य कल्याण सुझाव हैं। विशिष्ट चिकित्सा चिंताओं के लिए, हमेशा स्वास्थ्य पेशेवर से सलाह लें।",
        chatbotInstructions: "त्वचा स्वास्थ्य, स्थितियों या सामान्य कल्याण सलाह के बारे में मुझसे कुछ भी पूछें।",
        chatbotPlaceholder: "यहाँ अपना स्वास्थ्य प्रश्न टाइप करें...",
        sendButton: "भेजें",
        chatbotInitialMessage: "👋 नमस्ते! मैं आपका AI स्वास्थ्य सहायक हूँ। मुझसे त्वचा की स्थितियों, लक्षणों या सामान्य स्वास्थ्य सलाह के बारे में पूछें।",
        networkError: "🌐 कनेक्शन समस्या। कृपया अपना इंटरनेट जांचें और पुनः प्रयास करें।",
        apiError: "🤖 AI अस्थायी रूप से अनुपलब्ध। कृपया एक क्षण में पुनः प्रयास करें।",
        cameraError: "📷 कैमरा एक्सेस अस्वीकृत। कृपया ब्राउज़र सेटिंग में कैमरा अनुमतियाँ सक्षम करें।",
        browserError: "❌ आपका ब्राउज़र कैमरा सुविधाओं का समर्थन नहीं करता। Chrome या Firefox आज़माएं।",
        uploadError: "📸 कृपया विश्लेषण से पहले एक तस्वीर अपलोड करें या खींचें।",
        analysisFailed: "❌ विश्लेषण असफल। कृपया एक स्पष्ट, अच्छी तरह से प्रकाशित छवि का प्रयास करें।",
        language: "🌐 भाषा",
        langInstruction: "in Hindi",
        photoTips: "📋 बेहतर परिणामों के लिए युक्तियाँ:",
        tip1: "💡 उज्ज्वल, प्राकृतिक प्रकाश सुनिश्चित करें (खिड़की के पास सबसे अच्छा)",
        tip2: "🔍 प्रभावित त्वचा क्षेत्र की स्पष्ट, केंद्रित तस्वीर लें",
        tip3: "👍 दृश्य को अवरुद्ध करने वाले गहने/कपड़े हटाएं",
        tip4: "📏 इष्टतम विवरण के लिए कैमरे को 6-12 इंच दूर रखें"
    },
    mr: {
        title: "AI त्वचा रोग तपासणी",
        tagline: "तुमचा हुशार आरोग्य मित्र - प्रगत AI द्वारे त्वचेच्या समस्यांची ओळख करा",
        tabDiagnosis: "🔬 त्वचा तपासणी",
        tabChatbot: "🤖 आरोग्य सहायक",
        diagnosisInstructions: "AI द्वारे त्वचेच्या स्थितीचे विश्लेषण मिळवण्यासाठी फोटो अपलोड करा किंवा काढा.",
        disclaimer: "⚠️ वैद्यकीय अस्वीकरण: हे साधन केवळ शैक्षणिक हेतूंसाठी आहे आणि व्यावसायिक वैद्यकीय सल्ल्याचा पर्याय नाही. नेहमी पात्र त्वचा विशेषज्ञांचा सल्ला घ्या.",
        imagePlaceholder: "📷 फोटो पूर्वावलोकन क्षेत्र",
        uploadButton: "📁 फाइल अपलोड करा",
        takePhotoButton: "📷 फोटो काढा",
        capturePhotoButton: "📸 कॅप्चर करा",
        switchCameraButton: "🔄 कॅमेरा बदला",
        analyzeButton: "🧠 AI ने तपासा",
        analyzing: "🔍 तपासणी होत आहे...",
        analysisResults: "📊 AI विश्लेषण परिणाम",
        diseaseName: "स्थिती:",
        confidenceScore: "विश्वास पातळी:",
        symptomsTitle: "🩺 सामान्य लक्षणे",
        basicPrecautionsTitle: "💡 काळजी आणि प्रतिबंध टिप्स",
        precautionsDefault: [
            "🧴 हळूवारपणे स्वच्छ करा: दिवसातून दोनदा सौम्य साबणाचा वापर करा",
            "💧 नेहमी मॉइश्चराइझ करा: योग्य मॉइश्चरायझरने त्वचा हायड्रेटेड ठेवा",
            "☀️ सूर्यापासून संरक्षण करा: रोज SPF 30+ सनस्क्रीनचा वापर करा",
            "🥗 निरोगी आहार: अँटिऑक्सिडंट समृद्ध पदार्थ खा आणि हायड्रेटेड राहा"
        ],
        precautionsAcne: [
            "🧼 दिवसातून दोनदा हलक्या, तेल-मुक्त क्लींझरने चेहरा धुवा",
            "🚫 बॅक्टेरिया पसरू नये म्हणून चेहरा स्पर्श करणे टाळा",
            "✨ फक्त नॉन-कॉमेडोजेनिक (छिद्र न भरणारी) उत्पादने वापरा",
            "⛔ कधीही फोड फोडू नका - यामुळे डाग आणि संसर्ग होतो"
        ],
        precautionsEczema: [
            "💧 त्वचा मॉइश्चराइझ ठेवा, विशेषतः आंघोळीनंतर",
            "🚫 कठोर साबण, डिटर्जंट आणि सुगंधित उत्पादनांपासून दूर राहा",
            "🌡️ आंघोळ आणि शॉवरसाठी कोमट पाण्याचा वापर करा",
            "👕 सैल, श्वास घेणारे कापसाचे कपडे घाला"
        ],
        precautionsFungal: [
            "🧽 बाधित भाग स्वच्छ आणि पूर्णपणे कोरडा ठेवा",
            "💊 फार्मासिस्टच्या निर्देशानुसार अँटी-फंगल क्रीम/पावडर वापरा",
            "🚫 टॉवेल, टोपी, कंगवा किंवा वैयक्तिक वस्तू सामायिक करू नका",
            "👔 स्वच्छ, श्वास घेणारे कपडे घाला आणि रोज बदला"
        ],
        precautionsHealthy: [
            "🥗 जीवनसत्त्वे आणि खनिजांसह संतुलित आहार राखा",
            "☀️ रोजचे सनस्क्रीन अकाली वृद्धत्वापासून संरक्षण करते",
            "💧 निरोगी चमक साठी नियमितपणे साफ आणि मॉइश्चराइझ करा",
            "🚭 धूम्रपान आणि अती मद्यपान टाळा"
        ],
        precautionsDisclaimer: "💡 हे सामान्य कल्याण सूचना आहेत. विशिष्ट वैद्यकीय चिंतांसाठी, नेहमी आरोग्य व्यावसायिकांचा सल्ला घ्या.",
        chatbotInstructions: "त्वचेच्या आरोग्याबद्दल, स्थितींबद्दल किंवा सामान्य कल्याण सल्ल्याबद्दल मला काहीही विचारा.",
        chatbotPlaceholder: "येथे तुमचा आरोग्य प्रश्न टाइप करा...",
        sendButton: "पाठवा",
        chatbotInitialMessage: "👋 नमस्कार! मी तुमचा AI आरोग्य सहायक आहे. मला त्वचेच्या स्थितींबद्दल, लक्षणांबद्दल किंवा सामान्य आरोग्य सल्ल्याबद्दल विचारा.",
        networkError: "🌐 कनेक्शन समस्या. कृपया तुमचे इंटरनेट तपासा आणि पुन्हा प्रयत्न करा.",
        apiError: "🤖 AI तात्पुरते अनुपलब्ध. कृपया क्षणभरात पुन्हा प्रयत्न करा.",
        cameraError: "📷 कॅमेरा प्रवेश नाकारला. कृपया ब्राउझर सेटिंगमध्ये कॅमेरा परवानग्या सक्षम करा.",
        browserError: "❌ तुमचा ब्राउझर कॅमेरा वैशिष्ट्यांना समर्थन देत नाही. Chrome किंवा Firefox वापरून पहा.",
        uploadError: "📸 कृपया विश्लेषणापूर्वी एक फोटो अपलोड करा किंवा काढा.",
        analysisFailed: "❌ विश्लेषण अयशस्वी. कृपया स्पष्ट, चांगल्या प्रकाशात असलेली प्रतिमा वापरून पहा.",
        language: "🌐 भाषा",
        langInstruction: "in Marathi",
        photoTips: "📋 चांगल्या परिणामांसाठी टिप्स:",
        tip1: "💡 तेजस्वी, नैसर्गिक प्रकाश सुनिश्चित करा (खिडकीजवळ सर्वोत्तम)",
        tip2: "🔍 बाधित त्वचा क्षेत्राचा स्पष्ट, केंद्रित फोटो घ्या",
        tip3: "👍 दृश्य अवरोधित करणारे दागिने/कपडे काढून टाका",
        tip4: "📏 इष्टतम तपशीलासाठी कॅमेरा 6-12 इंच अंतरावर ठेवा"
    }
};

const diseaseSymptoms = {
    en: {
        "acne": ["🔴 Red bumps or whiteheads on skin", "🛢️ Oily, shiny skin texture", "💢 Painful cysts under the skin", "🏴 Blackheads in pores"],
        "eczema": ["🏜️ Dry, itchy patches of skin", "🔴 Red or brownish-gray patches", "💧 Small bumps that may leak fluid", "📏 Rough, scaly texture"],
        "psoriasis": ["🔴 Red patches with thick, silvery scales", "🩸 Dry, cracked skin that may bleed", "🔥 Itching, burning, or soreness", "💅 Nail pitting and discoloration"],
        "fungal infection": ["⭕ Red, scaly rash in ring shape", "🔥 Itching or burning sensation", "📄 Cracked, peeling skin", "👣 Common between toes"],
        "healthy skin": ["✨ Even tone and smooth texture", "🚫 No blemishes or rashes", "🤏 Feels soft and supple", "💧 Well-hydrated appearance"]
    },
    hi: {
        "acne": ["🔴 त्वचा पर लाल दाने या सफेद मुंहासे", "🛢️ तैलीय, चमकदार त्वचा", "💢 त्वचा के नीचे दर्दनाक गांठें", "🏴 छिद्रों में ब्लैकहेड्स"],
        "eczema": ["🏜️ त्वचा पर सूखे, खुजली वाले धब्बे", "🔴 लाल या भूरे-स्लेटी रंग के धब्बे", "💧 छोटे दाने जिनसे तरल निकल सकता है", "📏 खुरदरी, पपड़ीदार बनावट"],
        "psoriasis": ["🔴 मोटी, चांदी की पपड़ी वाले लाल धब्बे", "🩸 सूखी, फटी त्वचा जिसमें खून आ सकता है", "🔥 खुजली, जलन या दर्द", "💅 नाखूनों में गड्ढे और रंग बदलना"],
        "fungal infection": ["⭕ अंगूठी के आकार में लाल, पपड़ीदार दाने", "🔥 खुजली या जलन की भावना", "📄 फटी, छिलती त्वचा", "👣 पैर की उंगलियों के बीच आम"],
        "healthy skin": ["✨ समान रंग और चिकनी बनावट", "🚫 कोई दाग या दाने नहीं", "🤏 नरम और मुलायम महसूस", "💧 अच्छी तरह से हाइड्रेटेड दिखावट"]
    },
    mr: {
        "acne": ["🔴 त्वचेवर लाल पुरळ किंवा पांढरे डाग", "🛢️ तेलकट, चमकदार त्वचा पोत", "💢 त्वचेखाली वेदनादायक गाठी", "🏴 छिद्रांमध्ये ब्लॅकहेड्स"],
        "eczema": ["🏜️ त्वचेवर कोरडे, खाज सुटणारे चट्टे", "🔴 लाल किंवा तपकिरी-राखाडी रंगाचे चट्टे", "💧 लहान पुरळ ज्यातून द्रव येऊ शकतो", "📏 खडबडीत, खवलेयुक्त पोत"],
        "psoriasis": ["🔴 जाड, चांदीसारख्या खवल्यांसह लाल चट्टे", "🩸 कोरडी, फाटलेली त्वचा ज्यातून रक्त येऊ शकते", "🔥 खाज, जळजळ किंवा वेदना", "💅 नखांमध्ये खड्डे आणि रंग बदल"],
        "fungal infection": ["⭕ वर्तुळाकार आकारात लाल, खवलेयुक्त पुरळ", "🔥 खाज किंवा जळजळ होण्याची भावना", "📄 फाटलेली, सोललेली त्वचा", "👣 पायाच्या बोटांमध्ये सामान्य"],
        "healthy skin": ["✨ समान रंग आणि गुळगुळीत पोत", "🚫 कोणतेही डाग किंवा पुरळ नाही", "🤏 मऊ आणि लवचिक वाटणे", "💧 चांगल्या प्रकारे हायड्रेटेड दिसणे"]
    }
};

const App = () => {
    const [locale, setLocale] = useState('en');
    const t = translations[locale];

    const [activeTab, setActiveTab] = useState('diagnosis');
    
    // Diagnosis states
    const [imageSrc, setImageSrc] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [diagnosis, setDiagnosis] = useState(null);
    const [diagnosisErrorMessage, setDiagnosisErrorMessage] = useState('');
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [currentCamera, setCurrentCamera] = useState('environment');

    // Chatbot states
    const [chatHistory, setChatHistory] = useState([]);
    const [userMessage, setUserMessage] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const chatContainerRef = useRef(null);

    const handleImageUpload = (event) => {
        setDiagnosisErrorMessage('');
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageSrc(reader.result);
                setDiagnosis(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const startCamera = (facingMode) => {
        setDiagnosisErrorMessage('');
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            setIsCameraActive(true);
            navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false })
                .then(stream => {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                    setCurrentCamera(facingMode);
                })
                .catch(err => {
                    console.error("Error accessing camera: ", err);
                    setDiagnosisErrorMessage(t.cameraError);
                    setIsCameraActive(false);
                });
        } else {
            setDiagnosisErrorMessage(t.browserError);
        }
    };

    const handleTakePhoto = () => {
        startCamera('environment');
    };

    const switchCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        const newCamera = currentCamera === 'environment' ? 'user' : 'environment';
        startCamera(newCamera);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
            const capturedImage = canvasRef.current.toDataURL('image/jpeg');
            setImageSrc(capturedImage);
            setDiagnosis(null);

            // Stop camera
            const stream = videoRef.current.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            setIsCameraActive(false);
        }
    };

    const analyzeImage = async () => {
        if (!imageSrc) {
            setDiagnosisErrorMessage(t.uploadError);
            return;
        }

        setIsAnalyzing(true);
        setDiagnosis(null);
        setDiagnosisErrorMessage('');

        try {
            const base64Data = imageSrc.split(',')[1];
            
            const prompt = `Analyze this skin image to identify possible skin conditions. Respond with a JSON object containing 'diseaseName' (string), 'confidenceScore' (number 0-100), 'description' (string), and 'disclaimer' (string). If no specific condition is identified, use 'Healthy Skin' as the disease name. Provide medical accuracy based on dermatological knowledge.`;
            
            const payload = {
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType: "image/jpeg",
                                    data: base64Data
                                }
                            }
                        ]
                    }
                ],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            "diseaseName": { "type": "STRING" },
                            "confidenceScore": { "type": "INTEGER" },
                            "description": { "type": "STRING" },
                            "disclaimer": { "type": "STRING" }
                        }
                    }
                }
            };
            
            // Real Gemini API with your API key
            const apiKey = "AIzaSyDbVaM34izzzi7I65DbYBsH3ssNIfiSaC0";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.candidates && result.candidates[0] && result.candidates[0].content) {
                const jsonText = result.candidates[0].content.parts[0].text;
                const parsedDiagnosis = JSON.parse(jsonText);
                setDiagnosis(parsedDiagnosis);
            } else {
                throw new Error("Invalid response from API");
            }

        } catch (error) {
            console.error("Analysis failed:", error);
            setDiagnosisErrorMessage(t.analysisFailed);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSendMessage = async () => {
        if (userMessage.trim() === '') return;

        const newUserMessage = { role: 'user', text: userMessage };
        const newChatHistory = [...chatHistory, newUserMessage];
        setChatHistory(newChatHistory);
        setUserMessage('');
        setIsChatting(true);

        try {
            // Enhanced chatbot with Gemini API
            const prompt = `Provide a short and simple answer ${t.langInstruction} for a non-technical person about this skin health question: "${userMessage}". Answer in short sentences, like you would to a child or someone not familiar with complex medical terms.`;
            
            const payload = {
                contents: [{
                    role: "user",
                    parts: [{ text: prompt }]
                }]
            };

            const apiKey = "AIzaSyDbVaM34izzzi7I65DbYBsH3ssNIfiSaC0";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content) {
                const botMessage = result.candidates[0].content.parts[0].text;
                setChatHistory(prevChat => [...prevChat, { role: 'bot', text: botMessage }]);
            } else {
                setChatHistory(prevChat => [...prevChat, { role: 'bot', text: t.apiError }]);
            }

        } catch (error) {
            console.error("Chatbot error:", error);
            setChatHistory(prevChat => [...prevChat, { role: 'bot', text: t.networkError }]);
        } finally {
            setIsChatting(false);
        }
    };

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, isChatting]);

    const getSymptomsList = () => {
        if (!diagnosis || !diagnosis.diseaseName) return [];

        const diseaseName = diagnosis.diseaseName.toLowerCase();
        for (const key in diseaseSymptoms[locale]) {
            if (diseaseName.includes(key)) {
                return diseaseSymptoms[locale][key].map((item, index) => <li key={index}>{item}</li>);
            }
        }
        return [];
    };

    const getPrecautionsList = () => {
        const selectedList = (diagnosis && diagnosis.diseaseName) ? 
            (
                diagnosis.diseaseName.toLowerCase().includes('acne') ? t.precautionsAcne :
                diagnosis.diseaseName.toLowerCase().includes('eczema') ? t.precautionsEczema :
                diagnosis.diseaseName.toLowerCase().includes('fungal') ? t.precautionsFungal :
                diagnosis.diseaseName.toLowerCase().includes('healthy') ? t.precautionsHealthy :
                t.precautionsDefault
            ) : t.precautionsDefault;

        return selectedList.map((item, index) => {
            const parts = item.split(':');
            if (parts.length > 1) {
                return <li key={index}><span className="font-semibold">{parts[0]}:</span>{parts.slice(1).join(':')}</li>;
            } else {
                return <li key={index}>{item}</li>;
            }
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100 p-4 font-sans">
            <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-3xl p-8 max-w-6xl w-full mx-auto my-8 backdrop-blur-sm bg-opacity-95">
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {t.title}
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
                        {t.tagline}
                    </p>
                    
                    <div className="flex justify-center items-center space-x-4 mb-8">
                        <label className="text-sm font-medium">{t.language}:</label>
                        <select
                            value={locale}
                            onChange={(e) => setLocale(e.target.value)}
                            className="p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 border-2 border-indigo-200 dark:border-gray-500 text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-indigo-300 transition-all"
                        >
                            <option value="en">🇺🇸 English</option>
                            <option value="hi">🇮🇳 हिंदी</option>
                            <option value="mr">🇮🇳 मराठी</option>
                        </select>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex justify-center mb-8">
                    <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('diagnosis')}
                            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ease-in-out ${
                                activeTab === 'diagnosis' 
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105' 
                                : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600'
                            }`}
                        >
                            {t.tabDiagnosis}
                        </button>
                        <button
                            onClick={() => setActiveTab('chatbot')}
                            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ease-in-out ${
                                activeTab === 'chatbot' 
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105' 
                                : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600'
                            }`}
                        >
                            {t.tabChatbot}
                        </button>
                    </div>
                </div>

                {/* Diagnosis Section */}
                {activeTab === 'diagnosis' && (
                    <div className="space-y-8">
                        <div className="text-center">
                            <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                                {t.diagnosisInstructions}
                            </p>
                            <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                                <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                                    {t.disclaimer}
                                </p>
                            </div>
                        </div>

                        {/* Photo Tips */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border-2 border-blue-200 dark:border-blue-700">
                            <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300 mb-4">{t.photoTips}</h3>
                            <div className="grid md:grid-cols-2 gap-3">
                                <div className="flex items-center space-x-3">
                                    <span className="text-2xl">💡</span>
                                    <span className="text-blue-700 dark:text-blue-300">{t.tip1}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <span className="text-2xl">🔍</span>
                                    <span className="text-blue-700 dark:text-blue-300">{t.tip2}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <span className="text-2xl">👍</span>
                                    <span className="text-blue-700 dark:text-blue-300">{t.tip3}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <span className="text-2xl">📏</span>
                                    <span className="text-blue-700 dark:text-blue-300">{t.tip4}</span>
                                </div>
                            </div>
                        </div>

                        {/* Image Preview Area */}
                        <div className="relative w-full max-w-2xl mx-auto">
                            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-3xl overflow-hidden shadow-2xl border-4 border-dashed border-gray-300 dark:border-gray-500 flex items-center justify-center">
                                {imageSrc && !isCameraActive ? (
                                    <img src={imageSrc} alt="Preview" className="object-contain h-full w-full rounded-2xl" />
                                ) : isCameraActive ? (
                                    <>
                                        <video ref={videoRef} className="object-cover h-full w-full rounded-2xl" autoPlay playsInline muted></video>
                                        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                                    </>
                                ) : (
                                    <div className="text-center">
                                        <div className="text-6xl mb-4">📷</div>
                                        <span className="text-gray-500 dark:text-gray-400 text-xl font-medium">{t.imagePlaceholder}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Control Buttons */}
                        <div className="flex flex-wrap justify-center gap-4">
                            <input type="file" accept="image/*" onChange={handleImageUpload} ref={fileInputRef} className="hidden" />
                            <button 
                                onClick={() => fileInputRef.current.click()} 
                                className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-2xl shadow-lg transition-all transform hover:scale-105 hover:shadow-xl"
                            >
                                {t.uploadButton}
                            </button>
                            {!isCameraActive ? (
                                <button 
                                    onClick={handleTakePhoto} 
                                    className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-all transform hover:scale-105 hover:shadow-xl"
                                >
                                    {t.takePhotoButton}
                                </button>
                            ) : (
                                <>
                                    <button 
                                        onClick={capturePhoto} 
                                        className="px-8 py-4 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold rounded-2xl shadow-lg transition-all transform hover:scale-105 hover:shadow-xl"
                                    >
                                        {t.capturePhotoButton}
                                    </button>
                                    <button 
                                        onClick={switchCamera} 
                                        className="px-8 py-4 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold rounded-2xl shadow-lg transition-all transform hover:scale-105 hover:shadow-xl"
                                    >
                                        {t.switchCameraButton}
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Analyze Button */}
                        <div className="text-center">
                            <button
                                onClick={analyzeImage}
                                disabled={!imageSrc || isAnalyzing}
                                className={`px-12 py-5 text-white font-bold text-xl rounded-2xl shadow-2xl transition-all transform hover:scale-105 ${
                                    !imageSrc || isAnalyzing 
                                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 hover:shadow-3xl'
                                }`}
                            >
                                {isAnalyzing ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        {t.analyzing}
                                    </span>
                                ) : (
                                    t.analyzeButton
                                )}
                            </button>
                        </div>

                        {/* Error Message */}
                        {diagnosisErrorMessage && (
                            <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-6 rounded-r-2xl">
                                <div className="flex items-center">
                                    <span className="text-2xl mr-3">⚠️</span>
                                    <div>
                                        <p className="font-semibold text-lg">Error:</p>
                                        <p>{diagnosisErrorMessage}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Results */}
                        {diagnosis && (
                            <div className="space-y-8">
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-8 rounded-3xl shadow-2xl border-2 border-green-200 dark:border-green-700">
                                    <h2 className="text-3xl font-bold text-center mb-6 text-green-800 dark:text-green-300">{t.analysisResults}</h2>
                                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                                            <h3 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 mb-2">{t.diseaseName}</h3>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{diagnosis.diseaseName}</p>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                                            <h3 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 mb-2">{t.confidenceScore}</h3>
                                            <div className="flex items-center">
                                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 mr-4">
                                                    <div className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-1000" style={{width: `${diagnosis.confidenceScore}%`}}></div>
                                                </div>
                                                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{diagnosis.confidenceScore}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">{diagnosis.description}</p>
                                        <p className="text-sm text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">{diagnosis.disclaimer}</p>
                                    </div>
                                </div>

                                {/* Symptoms */}
                                <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-8 rounded-3xl shadow-2xl border-2 border-red-200 dark:border-red-700">
                                    <h2 className="text-3xl font-bold text-center mb-6 text-red-700 dark:text-red-400">{t.symptomsTitle}</h2>
                                    {getSymptomsList().length > 0 ? (
                                        <ul className="space-y-3 text-lg">
                                            {getSymptomsList()}
                                        </ul>
                                    ) : (
                                        <p className="text-center text-red-600 dark:text-red-400 text-lg">
                                            No specific symptoms found for this condition.
                                        </p>
                                    )}
                                </div>

                                {/* Precautions */}
                                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-8 rounded-3xl shadow-2xl border-2 border-teal-200 dark:border-teal-700">
                                    <h2 className="text-3xl font-bold text-center mb-6 text-teal-700 dark:text-teal-400">{t.basicPrecautionsTitle}</h2>
                                    <p className="text-center text-teal-600 dark:text-teal-400 mb-6 text-lg">
                                        {t.precautionsDisclaimer}
                                    </p>
                                    <ul className="space-y-4 text-lg">
                                        {getPrecautionsList()}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Chatbot Section */}
                {activeTab === 'chatbot' && (
                    <div className="space-y-6">
                        <div className="text-center mb-6">
                            <p className="text-lg text-gray-600 dark:text-gray-300">
                                {t.chatbotInstructions}
                            </p>
                        </div>
                        
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-3xl shadow-2xl h-96 flex flex-col">
                            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                                {chatHistory.length === 0 ? (
                                    <div className="text-center mt-20">
                                        <div className="text-6xl mb-4">🤖</div>
                                        <p className="text-xl text-gray-500 dark:text-gray-400">{t.chatbotInitialMessage}</p>
                                    </div>
                                ) : (
                                    chatHistory.map((msg, index) => (
                                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-xs sm:max-w-md p-4 rounded-2xl shadow-lg ${
                                                msg.role === 'user' 
                                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                                                : 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100'
                                            }`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))
                                )}
                                {isChatting && (
                                    <div className="flex justify-start">
                                        <div className="max-w-xs sm:max-w-md p-4 rounded-2xl bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-lg">
                                            <div className="flex space-x-1">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-6 border-t border-gray-200 dark:border-gray-600">
                                <div className="flex space-x-3">
                                    <input
                                        type="text"
                                        className="flex-1 p-4 rounded-2xl bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-4 focus:ring-indigo-300 shadow-lg border-2 border-gray-200 dark:border-gray-500"
                                        placeholder={t.chatbotPlaceholder}
                                        value={userMessage}
                                        onChange={(e) => setUserMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        disabled={isChatting}
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={isChatting || userMessage.trim() === ''}
                                        className={`px-8 py-4 rounded-2xl font-bold shadow-lg transition-all transform hover:scale-105 ${
                                            isChatting || userMessage.trim() === '' 
                                            ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-gray-200' 
                                            : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white hover:shadow-xl'
                                        }`}
                                    >
                                        {t.sendButton}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;"""

# Save the complete App.js file with API key
with open('App_with_API.js', 'w', encoding='utf-8') as f:
    f.write(app_js_with_api)

print("🎉 Complete App.js file with your API key created successfully!")
print("\n📁 File: App_with_API.js")
print(f"📊 Size: {len(app_js_with_api.split())} lines")
print(f"🔑 API Key: AIzaSyDbVaM34izzzi7I65DbYBsH3ssNIfiSaC0 (integrated)")
print(f"📱 Features included:")
print("• 🌐 Trilingual support (English, Hindi, Marathi)")
print("• 📷 Camera capture and file upload")
print("• 🤖 REAL Gemini AI analysis (no mock data)")  
print("• 💬 REAL AI chatbot with multilingual responses")
print("• 🎨 Modern gradient UI design")
print("• ⚡ Ready to copy and paste!")
print("\n🚀 This version will give you REAL AI results!")
