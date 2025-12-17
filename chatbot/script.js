// API Configuration
const API_KEY = 'AIzaSyAnl6b-jbvzalsAXKWAuBSMJzVoztPEpyg';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;

// DOM Elements
const chatToggle = document.getElementById('chatToggle');
const closeChat = document.getElementById('closeChat');
const chatbotContainer = document.getElementById('chatbotContainer');
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendMessage = document.getElementById('sendMessage');
const typingIndicator = document.getElementById('typingIndicator');
const quickQuestions = document.querySelectorAll('.quick-question');

// Medicine chatbot elements
const medicineChatbotContainer = document.getElementById('medicineChatbotContainer');
const medicineChatMessages = document.getElementById('medicineChatMessages');
const medicineUserInput = document.getElementById('medicineUserInput');
const medicineSendMessage = document.getElementById('medicineSendMessage');
const closeMedicineChat = document.getElementById('closeMedicineChat');

// Chat state
let isProcessing = false;
let recognition = null;
let isListening = false;
let speechTimeout = null;
let lastSpeechTranscript = '';

// System prompt for pregnancy care context
const SYSTEM_CONTEXT = `You are a helpful and compassionate Pregnancy Care Assistant. Your role is to provide supportive, accurate, and evidence-based information about pregnancy, prenatal care, nutrition, exercise, baby development, and general wellness during pregnancy. 

Guidelines:
- Be warm, empathetic, and encouraging
- Provide clear, easy-to-understand information
- Always remind users to consult their healthcare provider for personalized medical advice
- Focus on pregnancy-related topics
- If asked about medical emergencies, advise immediate medical attention
- Keep responses concise but informative (2-4 paragraphs)
- Use a friendly, conversational tone

Remember: You provide general information and support, not medical diagnosis or treatment.

You can also answer high-level questions about medicine safety in pregnancy. When asked about a medicine, briefly say if it is generally considered safe, should only be used after consulting a doctor, or is usually avoided in pregnancy. Always:
- Use a clear category: Safe / Consult Doctor / Avoid.
- Remind the user not to start or stop any medicine without their own doctor's advice.`;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    adjustTextareaHeight();
});

// Event Listeners
function setupEventListeners() {
    // Toggle chatbot
    chatToggle.addEventListener('click', () => {
        chatbotContainer.classList.add('active');
        chatToggle.style.display = 'none';
        userInput.focus();
    });

    closeChat.addEventListener('click', () => {
        chatbotContainer.classList.remove('active');
        chatToggle.style.display = 'flex';
    });

    // Send message
    sendMessage.addEventListener('click', handleSendMessage);
    
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // Auto-resize textarea
    userInput.addEventListener('input', adjustTextareaHeight);

    // Voice input (speech-to-text)
    const voiceBtn = document.getElementById('voiceInput');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition || !voiceBtn) {
        if (voiceBtn) voiceBtn.style.display = 'none';
    } else {
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = false;

        recognition.onstart = () => {
            isListening = true;
            voiceBtn.classList.add('listening');
        };

        recognition.onend = () => {
            isListening = false;
            voiceBtn.classList.remove('listening');

            // When listening stops, wait ~2s of silence before auto-sending
            if (speechTimeout) {
                clearTimeout(speechTimeout);
            }
            if (lastSpeechTranscript) {
                speechTimeout = setTimeout(() => {
                    if (lastSpeechTranscript && !isProcessing) {
                        handleSendMessage();
                    }
                }, 2000);
            }
        };

        recognition.onerror = () => {
            isListening = false;
            voiceBtn.classList.remove('listening');
        };

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            transcript = transcript.trim();

            if (!transcript) return;

            // Put recognized speech into the input box live while speaking
            userInput.value = transcript;
            adjustTextareaHeight();

            // Remember the latest full transcript; sending is handled in onend
            lastSpeechTranscript = transcript;
        };

        voiceBtn.addEventListener('click', () => {
            if (isListening) {
                recognition.stop();
            } else {
                try {
                    recognition.start();
                } catch (e) {
                    // Some browsers throw if called twice; ignore
                }
            }
        });
    }

    // Quick questions
    quickQuestions.forEach(button => {
        button.addEventListener('click', () => {
            const question = button.getAttribute('data-question');
            userInput.value = question;
            handleSendMessage();
        });
    });

    // Medicine chatbot events
    if (medicineSendMessage && medicineUserInput) {
        medicineSendMessage.addEventListener('click', handleMedicineSendMessage);
        medicineUserInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleMedicineSendMessage();
            }
        });
        medicineUserInput.addEventListener('input', () => {
            medicineUserInput.style.height = 'auto';
            medicineUserInput.style.height = Math.min(medicineUserInput.scrollHeight, 100) + 'px';
        });
    }

    if (closeMedicineChat && medicineChatbotContainer) {
        closeMedicineChat.addEventListener('click', () => {
            medicineChatbotContainer.classList.remove('active');
        });
    }
}

// Adjust textarea height
function adjustTextareaHeight() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 100) + 'px';
}

// Handle send message
async function handleSendMessage() {
    const message = userInput.value.trim();
    
    if (!message || isProcessing) return;
    
    // Add user message
    addMessage(message, 'user');
    
    // Clear input
    userInput.value = '';
    adjustTextareaHeight();
    
    // Show typing indicator
    typingIndicator.classList.add('active');
    isProcessing = true;
    
    try {
        // Get AI response
        const response = await getAIResponse(message);
        
        // Hide typing indicator
        typingIndicator.classList.remove('active');
        
        // Add bot message
        addMessage(response, 'bot');
    } catch (error) {
        console.error('Error:', error);
        typingIndicator.classList.remove('active');
        
        // Show more specific error message
        let errorMessage = 'I apologize, but I\'m having trouble connecting right now. ';
        
        if (error.message.includes('API key')) {
            errorMessage += 'There seems to be an issue with the API key. Please check the configuration.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage += 'Please check your internet connection and try again.';
        } else if (error.message.includes('blocked')) {
            errorMessage += 'The content was blocked by safety filters. Please rephrase your question.';
        } else {
            errorMessage += 'Please try again in a moment. If you have urgent concerns, please contact your healthcare provider immediately.';
        }
        
        errorMessage += `\n\nError details: ${error.message}`;
        
        addMessage(errorMessage, 'bot');
    } finally {
        isProcessing = false;
    }
}

// Add message to chat
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.innerHTML = sender === 'bot' 
        ? '<i class="fas fa-robot"></i>' 
        : '<i class="fas fa-user"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Format text with paragraphs
    const paragraphs = text.split('\n').filter(p => p.trim());
    paragraphs.forEach(paragraph => {
        const p = document.createElement('p');
        p.textContent = paragraph;
        contentDiv.appendChild(p);
    });
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add message to medicine chat
function addMedicineMessage(text, sender) {
    if (!medicineChatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.innerHTML = sender === 'bot' 
        ? '<i class="fas fa-pills"></i>' 
        : '<i class="fas fa-user"></i>';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const paragraphs = text.split('\n').filter(p => p.trim());
    paragraphs.forEach(paragraph => {
        const p = document.createElement('p');
        p.textContent = paragraph;
        contentDiv.appendChild(p);
    });

    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    medicineChatMessages.appendChild(messageDiv);

    medicineChatMessages.scrollTop = medicineChatMessages.scrollHeight;
}

// Handle send in medicine chatbot
async function handleMedicineSendMessage() {
    if (!medicineUserInput) return;

    const message = medicineUserInput.value.trim();
    if (!message) return;

    addMedicineMessage(message, 'user');
    medicineUserInput.value = '';
    medicineUserInput.style.height = 'auto';

    try {
        const response = await getAIResponse(message);
        addMedicineMessage(response, 'bot');
    } catch (error) {
        console.error('Medicine chat error:', error);
        addMedicineMessage('I was not able to check this medicine right now. Please try again later and always follow your doctor\'s advice.', 'bot');
    }
}

// Get AI response from Google Gemini API
async function getAIResponse(userMessage) {
    // First, try the actual API
    try {
        const requestBody = {
            contents: [{
                parts: [{
                    text: `${SYSTEM_CONTEXT}\n\nUser question: ${userMessage}\n\nPlease provide a helpful response:`
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            const data = await response.json();
            
            // Extract the response text
            if (data.candidates && data.candidates.length > 0) {
                const candidate = data.candidates[0];
                if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                    return candidate.content.parts[0].text;
                }
            }
        }
        
        // If API fails, use fallback responses
        console.warn('API not available, using fallback responses');
        return getFallbackResponse(userMessage);
        
    } catch (error) {
        console.error('Error getting AI response:', error);
        // Use fallback responses
        return getFallbackResponse(userMessage);
    }
}

// Fallback response system for when API is not available
function getFallbackResponse(userMessage) {
    const message = userMessage.toLowerCase();

    // Try to detect week and trimester from the question for more specific tips
    const weekMatch = message.match(/(week|wk)\s*(\d{1,2})/);
    const week = weekMatch ? parseInt(weekMatch[2], 10) : null;
    let trimester = '';
    if (week) {
        if (week <= 12) trimester = 'first';
        else if (week <= 26) trimester = 'second';
        else trimester = 'third';
    } else if (message.includes('first trimester')) {
        trimester = 'first';
    } else if (message.includes('second trimester')) {
        trimester = 'second';
    } else if (message.includes('third trimester')) {
        trimester = 'third';
    }

    const trimLabel = week
        ? `Week ${week}${trimester ? ` (${trimester} trimester)` : ''}`
        : (trimester ? `${trimester} trimester` : 'your current stage');

    // Try to detect month, e.g. "4th month" or "month 4"
    let month = null;
    const monthMatch1 = message.match(/(\d{1,2})\s*(st|nd|rd|th)?\s*month/); // "4th month"
    const monthMatch2 = message.match(/month\s*(\d{1,2})/);                  // "month 4"
    if (monthMatch1) {
        month = parseInt(monthMatch1[1], 10);
    } else if (monthMatch2) {
        month = parseInt(monthMatch2[1], 10);
    }

    // Nutrition-related questions
    if (message.includes('food') || message.includes('eat') || message.includes('nutrition') || message.includes('diet')) {
        // Month-based specific lists (short and clear)
        if (month) {
            switch (month) {
                case 4:
                    return `Month 4 (weeks ~14–17) nutrition focus:\n\n` +
`• Iron: spinach, methi, dals, jaggery, lean meat – helps prevent anaemia.\n` +
`• Calcium: milk/curd, paneer, ragi, sesame seeds – for baby’s bones.\n` +
`• Protein: dals, beans, chana, eggs, fish/lean chicken if you eat non‑veg.\n` +
`• Snacks: fruit, nuts, roasted chana instead of chips and biscuits.\n\n` +
`Eat 3 smaller main meals + 2–3 healthy snacks, and keep sipping water through the day.`;
                case 3:
                    return `Month 3 nutrition focus:\n\n` +
`• Continue folate: leafy greens, citrus fruits, fortified cereals.\n` +
`• Gentle proteins: curd, paneer, dals, eggs.\n` +
`• For nausea: dry snacks (toast, khakhra, crackers) and ginger tea in small sips.\n\n` +
`Avoid long gaps without food – small, frequent meals help.`;
                case 5:
                    return `Month 5 nutrition focus:\n\n` +
`• Calcium + vitamin D: milk, curd, paneer, fortified foods, safe sun exposure.\n` +
`• Colourful vegetables: carrots, beets, pumpkin, capsicum for vitamins and fibre.\n` +
`• Omega‑3: walnuts, flax/chia seeds, or low‑mercury fish (if you eat non‑veg).\n\n` +
`Limit fried and very spicy foods if you feel acidity or heartburn.`;
                default:
                    return `Here are simple nutrition tips for month ${month} of pregnancy:\n\n` +
`• Make every meal balanced: grain + protein + vegetables + healthy fat.\n` +
`• Include 2–3 servings of fruit and plenty of seasonal vegetables daily.\n` +
`• Take your prenatal vitamin as prescribed and drink 8–10 glasses of water.\n\n` +
`If you have anaemia, diabetes, thyroid, or low weight, your doctor can give a more personalised chart.`;
            }
        }

        // Week/trimester-based answer
        if (week || trimester) {
            return `Here are nutrition tips tailored for ${trimLabel}:\n\n` +
`• Focus on balanced meals: half your plate vegetables + fruits, one quarter whole grains, one quarter protein.\n` +
`• Key nutrients now: folate, iron, calcium, protein, omega‑3.\n` +
`• Good choices: lentils/beans, eggs, yogurt or curd, leafy greens, nuts & seeds, whole grains, seasonal fruits.\n` +
`• Drink plenty of water; limit sugary drinks and highly processed snacks.\n\n` +
`If you have nausea, acidity, or diabetes in pregnancy, your doctor or dietitian can adjust this plan for you.`;
        }

        // Generic nutrition answer – pick one of a few variations
        const genericNutrition = [
            `Great question about pregnancy nutrition!\n\n` +
            `• Build each meal with: whole grains + protein (dal, beans, eggs, lean meat) + vegetables + healthy fat (nuts, seeds, oils).\n` +
            `• Eat small, frequent meals instead of 2–3 heavy ones to avoid nausea and acidity.\n` +
            `• Include iron‑rich foods (spinach, dals, jaggery, red meat if you eat it) together with vitamin‑C foods (lemon, orange).\n` +
            `• Avoid raw/undercooked meat, high‑mercury fish, unpasteurised milk/cheese, and excess caffeine or packaged junk.\n\n` +
            `For a personalised diet chart (especially if you have low weight, anaemia, diabetes, or thyroid issues) please talk to your healthcare provider.`,

            `Here is a simple way to plan your meals in pregnancy:\n\n` +
            `• Half plate vegetables + salad + fruit, one quarter grains (rice/roti), one quarter protein (dal, beans, eggs, paneer, lean meat).\n` +
            `• Add good fats like nuts, seeds, or a spoon of healthy oil – they help baby’s brain growth.\n` +
            `• Drink water regularly; limit juices, fizzy drinks, and very sugary snacks.\n\n` +
            `If you have special conditions like gestational diabetes or thyroid problems, your doctor or dietitian should customise this plan.`,

            `To support both you and your baby, focus on:\n\n` +
            `• Iron and folate: leafy greens, dals, beans, jaggery, fortified cereals.\n` +
            `• Calcium: milk/curd, paneer, ragi, sesame seeds.\n` +
            `• Protein: dals, chana, soy, eggs, fish or chicken if you eat non‑veg.\n` +
            `• Fibre: fruits, vegetables, whole grains – helps with constipation.\n\n` +
            `Try not to skip breakfast and avoid very long gaps without food.`
        ];

        const idx = Math.floor(Math.random() * genericNutrition.length);
        return genericNutrition[idx];
    }

    // Exercise-related questions
    if (message.includes('exercise') || message.includes('workout') || message.includes('yoga') || message.includes('walk')) {
        const stageLine = trimester
            ? `In the ${trimester} trimester, most women can do:`
            : 'In a normal, low‑risk pregnancy, most women can do:';

        const exerciseTemplates = [
            `${stageLine}\n\n` +
            `• Walking 20–30 minutes most days at a comfortable pace.\n` +
            `• Prenatal yoga or stretching that avoids deep twists and lying flat on the back for long.\n` +
            `• Light strength work: body‑weight squats, wall push‑ups, light dumbbells if you already exercised before pregnancy.\n\n` +
            `Always stop if you feel pain, dizziness, chest pain, leakage of fluid, or bleeding. Get your doctor’s approval before starting or changing an exercise routine.`,

            `${stageLine}\n\n` +
            `• Aim for about 150 minutes per week of moderate activity (like brisk walking), if your doctor agrees.\n` +
            `• Choose low‑impact options: walking, swimming, stationary cycling, prenatal yoga.\n` +
            `• Warm up, drink water, and cool down after exercise. Avoid contact sports and activities with fall risk.\n\n` +
            `If you feel short of breath before you start, chest pain, contractions, or leaking fluid, stop and get medical advice.`,

            `${stageLine}\n\n` +
            `• Mix gentle cardio (walking, swimming) with stretching and pelvic‑floor (Kegel) exercises.\n` +
            `• Wear comfortable shoes and a supportive bra, and avoid exercising in very hot, humid conditions.\n` +
            `• You should be able to talk during exercise; if you cannot, slow down.\n\n` +
            `Always clear your plan with your healthcare provider, especially if you have any medical complications.`
        ];

        const idxEx = Math.floor(Math.random() * exerciseTemplates.length);
        return exerciseTemplates[idxEx];
    }

    // Labor signs / late pregnancy (keep wording consistent for safety)
    if (message.includes('labor') || message.includes('labour') || message.includes('contraction') || message.includes('birth')) {
        return `Important labor signs to know:\n\n` +
`• Regular contractions that get stronger, longer, and closer together.\n` +
`• Low back pain or period‑like cramps that come and go in a pattern.\n` +
`• Water breaking – a gush or slow leak of clear fluid from the vagina.\n` +
`• Mucus plug / bloody show – thick mucus with blood streaks.\n\n` +
`Call your healthcare provider or go to hospital immediately if you have heavy bleeding, severe pain, decreased baby movement, fever, or if your waters break and the fluid is green/brown or foul‑smelling.`;
    }

    // Baby development
    if (message.includes('baby') || message.includes('development') || message.includes('grow') || message.includes('growth')) {
        if (week) {
            if (week <= 12) {
                return `Around week ${week}, your baby is in the early organ‑forming stage. The heart, brain, and spinal cord are forming and tiny limb buds appear. Baby is still very small, but the foundations for all major organs are being built.\n\nYou may feel tired or nauseated in this period. Rest, hydration, and regular small meals are very important.`;
            } else if (week <= 26) {
                return `Around week ${week} (second trimester), your baby is growing fast: facial features are forming, movements become stronger, and baby can often hear your voice. Fat stores and the nervous system are developing.\n\nMany women feel better in this phase – more energy and a visible bump. It’s a good time for gentle exercise and regular check‑ups.`;
            }
            return `Around week ${week} (third trimester), baby is putting on weight, lungs and brain are maturing, and baby is practising breathing and sucking. Space becomes tight, so movements feel different but should still be regular.\n\nYou may feel heavier, have back pain, and need more rest. Keep attending your scheduled visits and monitor baby’s movements.`;
        }

        const babyDevTemplates = [
            `Across pregnancy, your baby develops in stages:\n\n` +
            `• First trimester: organs form, heart starts beating, basic body structure appears.\n` +
            `• Second trimester: baby moves more, hears sounds, and facial features, hair, and fingerprints develop.\n` +
            `• Third trimester: lungs and brain mature, baby gains most of the birth weight, and prepares for birth.\n\nYour own doctor or scan reports can tell you exactly how your baby is doing right now.`,

            `Here is a high‑level view of baby’s growth:\n\n` +
            `• Early weeks: tiny ball of cells that quickly forms the heart, brain and spinal cord.\n` +
            `• Middle of pregnancy: baby can move, hear sounds, and starts building fat and muscles.\n` +
            `• Last months: rapid brain growth, lung maturation, weight gain and getting into head‑down position.\n\nYour scan reports give the most accurate picture for your own baby.`,

            `Week by week, baby changes a lot:\n\n` +
            `• First 12 weeks: the “building plan” for all major organs is created.\n` +
            `• Weeks 13–28: features like fingers, toes, facial expressions and hair appear, and movements get stronger.\n` +
            `• Weeks 29–40: baby practises breathing and sucking, puts on fat, and prepares for birth.\n\nDiscuss your scan results with your doctor if you want detailed growth information.`
        ];
        const idxDev = Math.floor(Math.random() * babyDevTemplates.length);
        return babyDevTemplates[idxDev];
    }

    // Symptoms and discomfort (including headache and severe pain)
    if (
        message.includes('symptom') ||
        message.includes('nausea') ||
        message.includes('vomit') ||
        message.includes('tired') ||
        message.includes('pain') ||
        message.includes('cramp') ||
        message.includes('headache')
    ) {
        // Stronger advice for severe pain phrases
        if (message.includes('severe pain') || message.includes('very bad pain') || message.includes('unbearable pain')) {
            return `Severe or very strong pain in pregnancy is **not** something to ignore.\n\n` +
`Because I cannot examine you, I cannot say if it is safe. Please do this:\n` +
`• Contact your obstetrician or local emergency number **now**, especially if the pain is in your belly, chest, or head.\n` +
`• Go to the nearest hospital if you also have bleeding, leakage of fluid, fever, breathing trouble, or feel baby moving less than usual.\n\n` +
`Until you are seen, avoid self‑medicating with strong painkillers without your doctor’s advice. Getting checked quickly is the safest option for you and your baby.`;
        }

        if (message.includes('headache')) {
            return `Mild, occasional headache can happen in pregnancy (due to hormones, poor sleep, dehydration, or eye strain).\n\n` +
`Try at home:\n` +
`• Drink water and have a light snack.\n` +
`• Rest in a dark, quiet room; avoid screens for a while.\n` +
`• Use cold or warm compress on neck/forehead and practise slow breathing.\n\n` +
`Get urgent medical help if:\n` +
`• Headache is very severe or sudden,\n` +
`• Comes with blurred vision, flashing lights, or spots,\n` +
`• Comes with chest pain, shortness of breath, or severe belly pain,\n` +
`• You have swelling of face/hands or high blood pressure.\n\nOnly your own doctor can tell you if your headache is safe or not, so please contact them if you are worried or it keeps coming back.`;
        }

        return `Many pregnancy symptoms are common, but some need urgent care.\n\n` +
`Common, usually mild symptoms:\n` +
`• Nausea/vomiting (especially early weeks).\n` +
`• Tiredness and sleepiness.\n` +
`• Backache, pelvic pressure, mild leg cramps.\n` +
`• Mild swelling of feet by evening.\n\n` +
`Danger signs – call your doctor or go to hospital:\n` +
`• Heavy bleeding or soaking pads.\n` +
`• Severe abdominal pain or strong constant cramps.\n` +
`• Severe headache, vision changes, or sudden swelling of face/hands.\n` +
`• Decreased or no baby movement after you usually feel movement.\n\nWhen you describe your exact symptom (where, how long, how strong), your doctor can guide you best.`;
    }

    // Simple medicine safety checker fallback
    // Tries to recognise some common medicines and give a short, categorized answer
    const medMessage = message.replace(/[^a-z0-9\s]/g, ' '); // strip punctuation
    const words = medMessage.split(/\s+/).filter(Boolean);
    const knownMeds = {
        'paracetamol': {
            name: 'Paracetamol (acetaminophen)',
            category: 'Safe',
            text: 'Paracetamol is generally considered the safest pain and fever medicine in pregnancy when used at the lowest effective dose, for the shortest possible time. Do not exceed the maximum daily dose on the pack, and always follow your doctor\'s advice.'
        },
        'acetaminophen': {
            name: 'Paracetamol (acetaminophen)',
            category: 'Safe',
            text: 'This medicine is usually the first choice for pain and fever in pregnancy. Use the smallest dose that works, and avoid long‑term daily use unless your doctor is supervising you.'
        },
        'ibuprofen': {
            name: 'Ibuprofen and other NSAIDs',
            category: 'Avoid',
            text: 'Ibuprofen and many other NSAIDs are usually **avoided in pregnancy**, especially in the third trimester, because they can affect the baby\'s kidneys and the fluid around the baby. Only take them if your own doctor specifically says it is necessary.'
        },
        'diclofenac': {
            name: 'Diclofenac and other NSAIDs',
            category: 'Avoid',
            text: 'Diclofenac is generally **not recommended** in pregnancy unless a specialist advises it, particularly later in pregnancy. Ask your obstetrician about safer options such as paracetamol.'
        },
        'amoxicillin': {
            name: 'Amoxicillin (antibiotic)',
            category: 'Consult Doctor',
            text: 'Amoxicillin is a commonly used antibiotic in pregnancy and is often considered acceptable when it is truly needed. However, antibiotics should only be taken on a doctor\'s prescription, for a confirmed or strongly suspected infection.'
        }
    };

    let detectedMedKey = null;
    for (const w of words) {
        if (knownMeds[w]) {
            detectedMedKey = w;
            break;
        }
    }

    // Handle simple misspellings like "paracetomal" by checking common substrings
    if (!detectedMedKey) {
        if (medMessage.includes('paracet')) {
            detectedMedKey = 'paracetamol';
        } else if (medMessage.includes('ibupr')) {
            detectedMedKey = 'ibuprofen';
        } else if (medMessage.includes('amox')) {
            detectedMedKey = 'amoxicillin';
        } else if (medMessage.includes('diclo')) {
            detectedMedKey = 'diclofenac';
        }
    }

    if (detectedMedKey) {
        const med = knownMeds[detectedMedKey];
        return `Medicine safety (pregnancy)\n\n` +
`Medicine: ${med.name}\n` +
`Category: ${med.category} (in general)\n\n` +
`${med.text}\n\n` +
`Very important: only your own doctor can decide if this medicine is right for **you**, based on your week of pregnancy, other illnesses, and all the medicines you already take. Never start or stop a medicine in pregnancy without medical advice.`;
    }

    // Default response – keep short but useful, with a bit of variation
    const defaultTemplates = [
        `I’ll share general pregnancy information, but I can’t see your medical reports.\n\n` +
        `You can ask about topics like:\n` +
        `• What to eat in a specific week or trimester.\n` +
        `• Safe exercises for your stage.\n` +
        `• What is normal vs. warning symptoms.\n` +
        `• How baby grows week by week.\n\nPlease describe your question with your week or trimester if you know it. And always follow the advice of your own doctor over anything written here.`,

        `I’m your Pregnancy Care Assistant. I can give general guidance (not a diagnosis) about:\n` +
        `• Nutrition and weight gain in pregnancy.\n` +
        `• Safe exercises and daily activity.\n` +
        `• Common symptoms and which warning signs need urgent care.\n` +
        `• Baby’s week‑by‑week development.\n\nTell me your week or trimester (if you know it) and what you’re worried about, and always follow your own doctor’s advice first.`,

        `I can help with many pregnancy topics – food, exercise, symptoms, baby growth and more – but I don’t replace your doctor.\n\n` +
        `Please ask a clear question like:\n` +
        `• “Week 10 what food should I eat?”\n` +
        `• “Is it normal to have back pain in 7th month?”\n` +
        `• “What exercises are safe in second trimester?”\n\nIf you ever have severe pain, heavy bleeding, or feel very unwell, seek emergency medical care instead of chatting here.`
    ];

    const idxDef = Math.floor(Math.random() * defaultTemplates.length);
    return defaultTemplates[idxDef];
}

// Add some helpful animations
function addWelcomeAnimation() {
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'all 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 50);
        }, index * 100);
    });
}

// Initialize animations on load
window.addEventListener('load', () => {
    addWelcomeAnimation();
});

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden
        console.log('Page hidden');
    } else {
        // Page is visible
        console.log('Page visible');
    }
});

// Error handling for API key
if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('Please set your Google AI API key in the script.js file');
}

// Send on Enter (without Shift) in textarea, allow Shift+Enter for new line
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});

// Add smooth scroll behavior
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Handle window resize
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        // Adjust chatbot position on resize
        if (window.innerWidth <= 768) {
            chatbotContainer.style.width = 'calc(100% - 20px)';
            chatbotContainer.style.height = 'calc(100% - 20px)';
        } else {
            chatbotContainer.style.width = '420px';
            chatbotContainer.style.height = '600px';
        }
    }, 250);
});

// Modal Functions
function closeModal() {
    const modal = document.getElementById('infoModal');
    modal.classList.remove('active');
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('infoModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Show Baby Development Information
function showBabyDevelopment() {
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <h2><i class="fas fa-baby"></i> Baby Development Guide</h2>
        <p>Your baby goes through amazing changes throughout pregnancy. Here's what to expect each trimester:</p>
        
        <h3><i class="fas fa-seedling"></i> First Trimester (Weeks 1-12)</h3>
        <ul>
            <li><strong>Week 4-5:</strong> Baby's heart begins to beat! Major organs start forming.</li>
            <li><strong>Week 6-7:</strong> Brain and spinal cord develop. Tiny limb buds appear.</li>
            <li><strong>Week 8:</strong> All major organs have begun to form. Baby is about the size of a raspberry.</li>
            <li><strong>Week 10:</strong> Baby's vital organs are fully formed and starting to function.</li>
            <li><strong>Week 12:</strong> Baby can open and close fingers, curl toes. About 2.5 inches long.</li>
        </ul>
        
        <h3><i class="fas fa-heart"></i> Second Trimester (Weeks 13-26)</h3>
        <ul>
            <li><strong>Week 14-15:</strong> Baby can make facial expressions and may start sucking thumb.</li>
            <li><strong>Week 16-18:</strong> You may start feeling baby's movements (quickening)!</li>
            <li><strong>Week 20:</strong> Halfway there! Baby can hear sounds and respond to them.</li>
            <li><strong>Week 22-24:</strong> Baby's senses are developing. Fingerprints form.</li>
            <li><strong>Week 26:</strong> Baby's eyes begin to open. Lungs are developing.</li>
        </ul>
        
        <h3><i class="fas fa-star"></i> Third Trimester (Weeks 27-40)</h3>
        <ul>
            <li><strong>Week 28-30:</strong> Baby can blink and has eyelashes. Brain is developing rapidly.</li>
            <li><strong>Week 32-34:</strong> Baby's bones are fully formed but still soft. Gaining weight quickly.</li>
            <li><strong>Week 36:</strong> Baby is getting ready for birth. May drop into birth position.</li>
            <li><strong>Week 38-40:</strong> Baby is full term! Ready to meet you any day now!</li>
        </ul>
        
        <p><strong>Remember:</strong> Every baby develops at their own pace. Your healthcare provider will monitor your baby's growth at each appointment.</p>
    `;
    document.getElementById('infoModal').classList.add('active');
}

// Emergency Symptoms Checker
function showEmergencyChecker() {
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <h2><i class="fas fa-triangle-exclamation"></i> Emergency Symptoms Checker</h2>
        <p>These are important warning signs in pregnancy. Tap a card to see when to call your doctor and when to go to hospital.</p>

        <div class="emergency-grid">
            <button class="emergency-card" data-symptom="bleeding">
                <span class="icon"><i class="fas fa-droplet"></i></span>
                <span class="title">Bleeding</span>
            </button>
            <button class="emergency-card" data-symptom="pain">
                <span class="icon"><i class="fas fa-bolt"></i></span>
                <span class="title">Severe pain</span>
            </button>
            <button class="emergency-card" data-symptom="movement">
                <span class="icon"><i class="fas fa-child-reaching"></i></span>
                <span class="title">Decreased movement</span>
            </button>
            <button class="emergency-card" data-symptom="fever">
                <span class="icon"><i class="fas fa-temperature-high"></i></span>
                <span class="title">High fever</span>
            </button>
            <button class="emergency-card" data-symptom="swelling">
                <span class="icon"><i class="fas fa-hand-holding-droplet"></i></span>
                <span class="title">Severe swelling</span>
            </button>
        </div>

        <div id="emergencyDetail" class="emergency-detail">
            <h3>Select a symptom above</h3>
            <p>Choose the symptom that matches how you feel to see clear guidance on when to call your doctor and when to go to hospital.</p>
        </div>
        <p class="emergency-disclaimer"><strong>Important:</strong> If you ever feel something is seriously wrong, trust your instincts and seek emergency medical care immediately, even if it is not listed here.</p>
    `;

    const detailBox = modalBody.querySelector('#emergencyDetail');
    const cards = modalBody.querySelectorAll('.emergency-card');

    const detailContent = {
        bleeding: {
            title: 'Bleeding',
            doctor: [
                'Light spotting or small streaks of blood.',
                'Mild cramps but you still feel generally well.',
            ],
            hospital: [
                'Bleeding like a period or soaking pads.',
                'Bleeding with clots, severe pain, dizziness, or fainting.',
            ],
        },
        pain: {
            title: 'Severe pain',
            doctor: [
                'New or increasing back, pelvic, or abdominal pain that worries you but is not unbearable.',
                'Pain that comes and goes but you can still move and talk.',
            ],
            hospital: [
                'Very strong, constant, or one-sided abdominal pain.',
                'Pain with bleeding, leaking fluid, fever, or difficulty breathing.',
            ],
        },
        movement: {
            title: 'Decreased baby movement',
            doctor: [
                'You are not sure if movements have reduced, but you feel nervous.',
                'Baby’s pattern feels slightly different but you still feel some kicks.',
            ],
            hospital: [
                'You notice much fewer movements than usual.',
                'You do not feel any movement at a time when baby is normally active.',
            ],
        },
        fever: {
            title: 'High fever',
            doctor: [
                'Fever around 100–101°F (37.8–38.3°C) with mild symptoms only.',
                'Sore throat, cold, or body aches but you can drink fluids and pass urine normally.',
            ],
            hospital: [
                'Fever 102°F (38.9°C) or higher.',
                'Fever with rash, breathing difficulty, chest pain, strong belly pain, or confusion.',
            ],
        },
        swelling: {
            title: 'Severe swelling',
            doctor: [
                'Mild ankle swelling by evening that improves after rest and elevating your legs.',
                'Slight puffiness of feet during hot weather.',
            ],
            hospital: [
                'Sudden swelling of face, hands, or around eyes.',
                'Swelling with severe headache, vision changes, or pain under the ribs.',
            ],
        },
    };

    cards.forEach(card => {
        card.addEventListener('click', () => {
            cards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            const key = card.getAttribute('data-symptom');
            const info = detailContent[key];
            if (!info) return;

            detailBox.innerHTML = `
                <h3>${info.title}</h3>
                <div class="detail-columns">
                    <div class="detail-column">
                        <h4><i class="fas fa-phone"></i> Call your doctor</h4>
                        <ul>
                            ${info.doctor.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="detail-column urgent">
                        <h4><i class="fas fa-hospital"></i> Go to hospital now</h4>
                        <ul>
                            ${info.hospital.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        });
    });

    document.getElementById('infoModal').classList.add('active');
}

// Open Medicine Safety Checker (separate chatbot)
function openMedicineChecker() {
    if (!medicineChatbotContainer || !medicineUserInput) return;

    // Show medicine chatbot as a separate panel
    medicineChatbotContainer.classList.add('active');
    medicineUserInput.focus();
}

// Show Nutrition Guide with Month-by-Month Food Suggestions
function showNutritionGuide() {
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <h2><i class="fas fa-apple-alt"></i> Pregnancy Nutrition Guide</h2>
        <p>Proper nutrition is crucial for your baby's development. Here's a comprehensive month-by-month food guide:</p>
        
        <div class="month-section">
            <h4><i class="fas fa-calendar"></i> Month 1 (Weeks 1-4)</h4>
            <p><strong>Focus:</strong> Folic acid and early development</p>
            <ul>
                <li><strong>Leafy Greens:</strong> Spinach, kale, lettuce - rich in folate</li>
                <li><strong>Fortified Cereals:</strong> Whole grain cereals with added folic acid</li>
                <li><strong>Citrus Fruits:</strong> Oranges, grapefruits for vitamin C and folate</li>
                <li><strong>Beans & Lentils:</strong> Excellent source of protein and folate</li>
                <li><strong>Eggs:</strong> Complete protein and choline for brain development</li>
            </ul>
        </div>
        
        <div class="month-section">
            <h4><i class="fas fa-calendar"></i> Month 2 (Weeks 5-8)</h4>
            <p><strong>Focus:</strong> Managing morning sickness, vitamin B6</p>
            <ul>
                <li><strong>Ginger:</strong> Fresh ginger tea or ginger candies for nausea</li>
                <li><strong>Bananas:</strong> Easy to digest, rich in vitamin B6</li>
                <li><strong>Whole Grain Crackers:</strong> Helps settle stomach</li>
                <li><strong>Lean Chicken:</strong> Protein and vitamin B6</li>
                <li><strong>Avocados:</strong> Healthy fats and folate</li>
            </ul>
        </div>
        
        <div class="month-section">
            <h4><i class="fas fa-calendar"></i> Month 3 (Weeks 9-13)</h4>
            <p><strong>Focus:</strong> Protein for rapid growth, omega-3s</p>
            <ul>
                <li><strong>Salmon:</strong> Rich in omega-3 DHA for brain development (2-3 servings/week)</li>
                <li><strong>Greek Yogurt:</strong> Protein, calcium, and probiotics</li>
                <li><strong>Nuts & Seeds:</strong> Almonds, walnuts, chia seeds for healthy fats</li>
                <li><strong>Sweet Potatoes:</strong> Vitamin A and fiber</li>
                <li><strong>Broccoli:</strong> Folate, calcium, and vitamin C</li>
            </ul>
        </div>
        
        <div class="month-section">
            <h4><i class="fas fa-calendar"></i> Month 4 (Weeks 14-17)</h4>
            <p><strong>Focus:</strong> Iron and calcium for bone development</p>
            <ul>
                <li><strong>Red Meat:</strong> Lean beef for iron and protein (well-cooked)</li>
                <li><strong>Dairy Products:</strong> Milk, cheese, yogurt for calcium</li>
                <li><strong>Fortified Orange Juice:</strong> Calcium and vitamin D</li>
                <li><strong>Tofu:</strong> Calcium and protein (vegetarian option)</li>
                <li><strong>Dried Fruits:</strong> Apricots, prunes for iron</li>
            </ul>
        </div>
        
        <div class="month-section">
            <h4><i class="fas fa-calendar"></i> Month 5 (Weeks 18-22)</h4>
            <p><strong>Focus:</strong> Vitamin D and continued calcium</p>
            <ul>
                <li><strong>Fatty Fish:</strong> Sardines, mackerel for vitamin D and omega-3s</li>
                <li><strong>Egg Yolks:</strong> Vitamin D and choline</li>
                <li><strong>Mushrooms:</strong> Natural source of vitamin D</li>
                <li><strong>Fortified Milk:</strong> Vitamin D and calcium</li>
                <li><strong>Quinoa:</strong> Complete protein and minerals</li>
            </ul>
        </div>
        
        <div class="month-section">
            <h4><i class="fas fa-calendar"></i> Month 6 (Weeks 23-27)</h4>
            <p><strong>Focus:</strong> Increased calories, complex carbohydrates</p>
            <ul>
                <li><strong>Brown Rice:</strong> Complex carbs and B vitamins</li>
                <li><strong>Oatmeal:</strong> Fiber and sustained energy</li>
                <li><strong>Berries:</strong> Antioxidants and vitamin C</li>
                <li><strong>Lean Turkey:</strong> Protein and B vitamins</li>
                <li><strong>Bell Peppers:</strong> Vitamin C and fiber</li>
            </ul>
        </div>
        
        <div class="month-section">
            <h4><i class="fas fa-calendar"></i> Month 7 (Weeks 28-31)</h4>
            <p><strong>Focus:</strong> Brain development, DHA, and iron</p>
            <ul>
                <li><strong>Walnuts:</strong> Omega-3 ALA for brain development</li>
                <li><strong>Spinach:</strong> Iron, folate, and calcium</li>
                <li><strong>Chickpeas:</strong> Protein, iron, and fiber</li>
                <li><strong>Pumpkin Seeds:</strong> Zinc and magnesium</li>
                <li><strong>Dark Chocolate:</strong> Iron and antioxidants (in moderation)</li>
            </ul>
        </div>
        
        <div class="month-section">
            <h4><i class="fas fa-calendar"></i> Month 8 (Weeks 32-35)</h4>
            <p><strong>Focus:</strong> Protein for baby's rapid weight gain</p>
            <ul>
                <li><strong>Cottage Cheese:</strong> High protein and calcium</li>
                <li><strong>Lentil Soup:</strong> Protein, iron, and fiber</li>
                <li><strong>Chicken Breast:</strong> Lean protein</li>
                <li><strong>Edamame:</strong> Plant protein and folate</li>
                <li><strong>Whole Wheat Bread:</strong> Complex carbs and fiber</li>
            </ul>
        </div>
        
        <div class="month-section">
            <h4><i class="fas fa-calendar"></i> Month 9 (Weeks 36-40)</h4>
            <p><strong>Focus:</strong> Energy for labor, dates for easier delivery</p>
            <ul>
                <li><strong>Dates:</strong> May help with cervical ripening (6 dates/day from week 36)</li>
                <li><strong>Coconut Water:</strong> Hydration and electrolytes</li>
                <li><strong>Bananas:</strong> Quick energy and potassium</li>
                <li><strong>Whole Grains:</strong> Sustained energy for labor</li>
                <li><strong>Lean Proteins:</strong> Strength and stamina</li>
            </ul>
        </div>
        
        <div class="month-section">
            <h4><i class="fas fa-calendar"></i> Month 10 (Weeks 40+)</h4>
            <p><strong>Focus:</strong> Preparing for labor and delivery</p>
            <ul>
                <li><strong>Red Raspberry Leaf Tea:</strong> May help tone uterus (consult doctor first)</li>
                <li><strong>Pineapple:</strong> Contains bromelain (natural enzyme)</li>
                <li><strong>Spicy Foods:</strong> May help stimulate labor (if tolerated)</li>
                <li><strong>Protein-Rich Snacks:</strong> Energy for labor</li>
                <li><strong>Water:</strong> Stay well-hydrated!</li>
            </ul>
        </div>
        
        <h3><i class="fas fa-exclamation-triangle"></i> Foods to Avoid</h3>
        <ul>
            <li>Raw or undercooked meat, eggs, and seafood</li>
            <li>High-mercury fish (shark, swordfish, king mackerel)</li>
            <li>Unpasteurized dairy products and juices</li>
            <li>Deli meats (unless heated until steaming)</li>
            <li>Excessive caffeine (limit to 200mg/day)</li>
            <li>Alcohol (completely avoid)</li>
        </ul>
        
        <p><strong>💡 Pro Tip:</strong> Take prenatal vitamins daily and drink 8-10 glasses of water. Always consult your healthcare provider about your specific dietary needs!</p>
    `;
    document.getElementById('infoModal').classList.add('active');
}

// Show Exercise Tips
function showExerciseTips() {
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <h2><i class="fas fa-dumbbell"></i> Exercise Tips for Pregnancy</h2>
        <p>Regular exercise during pregnancy can help you stay healthy, reduce discomfort, and prepare for labor. Here's what's safe for each trimester:</p>
        
        <h3><i class="fas fa-running"></i> First Trimester (Weeks 1-12)</h3>
        <ul>
            <li><strong>Walking:</strong> 20-30 minutes daily, great low-impact cardio</li>
            <li><strong>Swimming:</strong> Excellent full-body workout, easy on joints</li>
            <li><strong>Prenatal Yoga:</strong> Improves flexibility and reduces stress</li>
            <li><strong>Light Strength Training:</strong> Use light weights, avoid heavy lifting</li>
            <li><strong>Stationary Cycling:</strong> Safe cardio option</li>
        </ul>
        <p><strong>Caution:</strong> Avoid overheating, stay hydrated, and listen to your body.</p>
        
        <h3><i class="fas fa-heartbeat"></i> Second Trimester (Weeks 13-26)</h3>
        <ul>
            <li><strong>Modified Aerobics:</strong> Low-impact aerobic classes</li>
            <li><strong>Prenatal Pilates:</strong> Strengthens core and pelvic floor</li>
            <li><strong>Water Aerobics:</strong> Reduces swelling and joint stress</li>
            <li><strong>Pelvic Floor Exercises:</strong> Kegel exercises daily</li>
            <li><strong>Gentle Stretching:</strong> Maintains flexibility</li>
        </ul>
        <p><strong>Modification:</strong> Avoid lying flat on your back after 16 weeks.</p>
        
        <h3><i class="fas fa-spa"></i> Third Trimester (Weeks 27-40)</h3>
        <ul>
            <li><strong>Gentle Walking:</strong> Continue daily walks at comfortable pace</li>
            <li><strong>Prenatal Yoga:</strong> Focus on breathing and relaxation</li>
            <li><strong>Swimming:</strong> Helps with swelling and back pain</li>
            <li><strong>Pelvic Tilts:</strong> Relieves back pain</li>
            <li><strong>Birth Ball Exercises:</strong> Prepares for labor</li>
        </ul>
        <p><strong>Focus:</strong> Gentle movements, breathing exercises, and preparing for labor.</p>
        
        <h3><i class="fas fa-ban"></i> Exercises to Avoid</h3>
        <ul>
            <li>Contact sports (soccer, basketball, hockey)</li>
            <li>Activities with fall risk (skiing, horseback riding)</li>
            <li>Scuba diving</li>
            <li>Hot yoga or hot Pilates</li>
            <li>Heavy weightlifting</li>
            <li>Exercises lying flat on back (after first trimester)</li>
        </ul>
        
        <h3><i class="fas fa-check-circle"></i> General Guidelines</h3>
        <ul>
            <li>Aim for 150 minutes of moderate exercise per week</li>
            <li>Warm up before and cool down after exercise</li>
            <li>Stay hydrated - drink water before, during, and after</li>
            <li>Wear comfortable, supportive clothing and shoes</li>
            <li>Stop if you feel dizzy, short of breath, or have pain</li>
            <li>Get clearance from your healthcare provider before starting</li>
        </ul>
        
        <p><strong>⚠️ Stop exercising and call your doctor if you experience:</strong> Vaginal bleeding, chest pain, severe headache, muscle weakness, calf pain or swelling, contractions, or decreased fetal movement.</p>
    `;
    document.getElementById('infoModal').classList.add('active');
}

// Show Appointments Schedule
function showAppointments() {
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <h2><i class="fas fa-calendar-check"></i> Prenatal Appointment Schedule</h2>
        <p>Regular prenatal checkups are essential for monitoring your health and your baby's development. Here's a typical appointment schedule:</p>
        
        <h3><i class="fas fa-stethoscope"></i> First Trimester Appointments</h3>
        <ul>
            <li><strong>Week 8-10:</strong> First prenatal visit - confirm pregnancy, medical history, initial tests</li>
            <li><strong>Week 12:</strong> First ultrasound, nuchal translucency screening (optional)</li>
        </ul>
        
        <h3><i class="fas fa-heartbeat"></i> Second Trimester Appointments</h3>
        <ul>
            <li><strong>Every 4 weeks:</strong> Regular checkups - weight, blood pressure, urine test, fetal heartbeat</li>
            <li><strong>Week 16-18:</strong> Quad screen or AFP test (optional)</li>
            <li><strong>Week 18-20:</strong> Anatomy ultrasound - detailed scan of baby's development</li>
            <li><strong>Week 24-28:</strong> Glucose screening test for gestational diabetes</li>
        </ul>
        
        <h3><i class="fas fa-baby"></i> Third Trimester Appointments</h3>
        <ul>
            <li><strong>Weeks 28-36:</strong> Every 2 weeks - monitor baby's position and growth</li>
            <li><strong>Week 35-37:</strong> Group B strep test</li>
            <li><strong>Weeks 36-40:</strong> Weekly visits - cervical checks, monitor for labor signs</li>
            <li><strong>Week 40+:</strong> May include non-stress tests and ultrasounds if overdue</li>
        </ul>
        
        <h3><i class="fas fa-clipboard-list"></i> What to Expect at Each Visit</h3>
        <ul>
            <li><strong>Weight Check:</strong> Monitor healthy weight gain</li>
            <li><strong>Blood Pressure:</strong> Screen for preeclampsia</li>
            <li><strong>Urine Test:</strong> Check for protein and sugar</li>
            <li><strong>Fetal Heartbeat:</strong> Listen to baby's heart (after week 10-12)</li>
            <li><strong>Fundal Height:</strong> Measure uterus growth (after week 20)</li>
            <li><strong>Questions & Concerns:</strong> Discuss any symptoms or worries</li>
        </ul>
        
        <h3><i class="fas fa-syringe"></i> Important Tests & Screenings</h3>
        <ul>
            <li><strong>Blood Tests:</strong> Blood type, Rh factor, anemia, immunity to certain diseases</li>
            <li><strong>Genetic Screening:</strong> Optional tests for chromosomal abnormalities</li>
            <li><strong>Glucose Test:</strong> Screen for gestational diabetes (week 24-28)</li>
            <li><strong>Group B Strep:</strong> Test for bacteria that could affect baby (week 35-37)</li>
            <li><strong>Ultrasounds:</strong> Monitor baby's growth and development</li>
        </ul>
        
        <h3><i class="fas fa-phone"></i> When to Call Your Doctor Between Appointments</h3>
        <ul>
            <li>Vaginal bleeding or fluid leakage</li>
            <li>Severe abdominal pain or cramping</li>
            <li>Severe headache or vision changes</li>
            <li>Sudden swelling of face, hands, or feet</li>
            <li>Fever over 100.4°F (38°C)</li>
            <li>Decreased fetal movement after week 28</li>
            <li>Signs of labor before 37 weeks</li>
        </ul>
        
        <p><strong>📝 Tip:</strong> Keep a list of questions between appointments. Bring your partner or support person to important visits. Don't hesitate to call with concerns - your healthcare team is there to help!</p>
    `;
    document.getElementById('infoModal').classList.add('active');
}

// Pregnancy Tracker Data and Functions
const pregnancyData = {
    dueDate: null,
    lastPeriod: null,
    currentWeek: 1,
    weeks: [
        // Week 1-4
        {
            babySize: "The size of a poppy seed",
            development: "Your baby is currently a tiny ball of cells called a blastocyst, which is busy dividing and preparing for rapid growth.",
            bodyChanges: "You may not notice any changes yet, but your body is already producing hormones to support the pregnancy."
        },
        // Week 5-8
        {
            babySize: "The size of a blueberry",
            development: "Your baby's heart is starting to beat and major organs like the brain and spinal cord are beginning to form.",
            bodyChanges: "You might start experiencing early pregnancy symptoms like fatigue, nausea, and breast tenderness."
        },
        // Week 9-12
        {
            babySize: "The size of a plum",
            development: "Your baby is now officially a fetus! Tiny fingers and toes are forming, and facial features are becoming more defined.",
            bodyChanges: "Your uterus is growing and you might notice your clothes feeling tighter. Morning sickness may be at its peak."
        },
        // Week 13-16
        {
            babySize: "The size of an avocado",
            development: "Your baby can make facial expressions and might start sucking their thumb. The reproductive organs are developing.",
            bodyChanges: "You might start to show a small bump. Energy levels often improve during this time."
        },
        // Week 17-20
        {
            babySize: "The size of a banana",
            development: "Your baby can hear sounds and may respond to your voice. Fine hair called lanugo covers their body.",
            bodyChanges: "You might feel your baby's first movements, often described as flutters or bubbles."
        },
        // Week 21-24
        {
            babySize: "The size of an ear of corn",
            development: "Your baby's lungs are developing rapidly. They can now swallow and are starting to develop sleep cycles.",
            bodyChanges: "Your belly is growing noticeably. You might experience backaches and leg cramps."
        },
        // Week 25-28
        {
            babySize: "The size of an eggplant",
            development: "Your baby can open their eyes and respond to light. The brain is developing rapidly.",
            bodyChanges: "You might experience heartburn, shortness of breath, and trouble sleeping."
        },
        // Week 29-32
        {
            babySize: "The size of a butternut squash",
            development: "Your baby is gaining weight quickly and their bones are hardening. They're practicing breathing movements.",
            bodyChanges: "You might experience Braxton Hicks contractions and increased fatigue."
        },
        // Week 33-36
        {
            babySize: "The size of a honeydew melon",
            development: "Your baby's immune system is developing. They're moving into position for birth, usually head down.",
            bodyChanges: "You might feel more pelvic pressure and experience more frequent urination."
        },
        // Week 37-40+
        {
            babySize: "The size of a small pumpkin",
            development: "Your baby is considered full-term and ready to be born! They're gaining about 0.5 pounds per week.",
            bodyChanges: "You might experience nesting instincts, increased vaginal discharge, and more frequent contractions."
        }
    ],
    nutritionTips: [
        "Focus on getting enough folic acid, iron, calcium, and protein in your diet.",
        "Stay hydrated by drinking at least 8-10 glasses of water daily.",
        "Eat small, frequent meals to help with nausea and heartburn.",
        "Include plenty of fruits, vegetables, and whole grains in your diet.",
        "Choose healthy snacks like yogurt, nuts, and fresh fruit.",
        "Limit caffeine intake to 200mg per day (about one 12-ounce cup of coffee).",
        "Avoid raw or undercooked seafood, eggs, and meat.",
        "Take a prenatal vitamin daily as recommended by your healthcare provider.",
        "Include omega-3 rich foods like salmon, chia seeds, and walnuts for baby's brain development.",
        "Listen to your body's hunger and fullness cues."
    ],
    appointments: [
        "Prenatal checkup with your healthcare provider",
        "Ultrasound to check baby's growth and development",
        "Glucose screening test for gestational diabetes",
        "Group B strep test",
        "Discuss birth plan with your healthcare provider",
        "Prepare hospital bag with essentials for you and baby",
        "Finalize arrangements for labor and delivery",
        "Postpartum care planning"
    ]
};

// Load pregnancy data from localStorage (no longer used to auto-fill; kept for future use if needed)
function loadPregnancyData() {
    return false; // always start fresh for each session/open
}

// Save pregnancy data to localStorage (no-op to avoid persisting between opens)
function savePregnancyData() {
    // If you want persistence again later, re-enable localStorage writes here.
}

// Open pregnancy tracker modal
function openPregnancyTracker() {
    const modal = document.getElementById('pregnancyTrackerModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    showCalculator();
}

// Close pregnancy tracker modal
function closePregnancyTracker(event) {
    if (event) {
        event.stopPropagation();
        // If clicking on the close button, close the modal
        if (event.target.classList.contains('close-modal') || event.target === document.getElementById('pregnancyTrackerModal')) {
            const modal = document.getElementById('pregnancyTrackerModal');
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    } else {
        // If called programmatically
        const modal = document.getElementById('pregnancyTrackerModal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // Always reset tracker state so next open is a new entry
    pregnancyData.dueDate = null;
    pregnancyData.lastPeriod = null;
    pregnancyData.currentWeek = 1;

    const lastPeriodInput = document.getElementById('lastPeriod');
    const dueDateInput = document.getElementById('dueDate');
    if (lastPeriodInput) lastPeriodInput.value = '';
    if (dueDateInput) dueDateInput.value = '';

    const calculatorView = document.getElementById('calculatorView');
    const dashboardView = document.getElementById('dashboardView');
    if (calculatorView && dashboardView) {
        calculatorView.style.display = 'block';
        dashboardView.style.display = 'none';
    }
}

// Switch between tabs in the calculator
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Activate selected tab
    document.querySelector(`.tab-btn[onclick*="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Calculate pregnancy week based on last period or due date
function calculatePregnancy() {
    let dueDate, lastPeriod;
    
    // Check which tab is active
    if (document.getElementById('lmpTab').classList.contains('active')) {
        // Calculate from last menstrual period
        const lmpInput = document.getElementById('lastPeriod').value;
        if (!lmpInput) {
            alert('Please enter the first day of your last period.');
            return;
        }
        
        lastPeriod = new Date(lmpInput);
        dueDate = new Date(lastPeriod);
        dueDate.setDate(dueDate.getDate() + 280); // 40 weeks from LMP
    } else {
        // Calculate from due date
        const dueDateInput = document.getElementById('dueDate').value;
        if (!dueDateInput) {
            alert('Please enter your expected due date.');
            return;
        }
        
        dueDate = new Date(dueDateInput);
        lastPeriod = new Date(dueDate);
        lastPeriod.setDate(lastPeriod.getDate() - 280); // 40 weeks before due date
    }
    
    // Calculate current week
    const today = new Date();
    const daysDiff = Math.floor((today - lastPeriod) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.min(Math.max(1, Math.floor(daysDiff / 7) + 1), 42); // Cap at 42 weeks
    
    // Update pregnancy data
    pregnancyData.dueDate = dueDate;
    pregnancyData.lastPeriod = lastPeriod;
    pregnancyData.currentWeek = currentWeek;
    
    // Save to localStorage
    savePregnancyData();
    
    // Show dashboard
    showDashboard();
}

// Show the dashboard view
function showDashboard() {
    document.getElementById('calculatorView').style.display = 'none';
    document.getElementById('dashboardView').style.display = 'block';
    
    // Update dashboard with current data
    updateDashboard();
}

// Show the calculator view
function showCalculator() {
    document.getElementById('calculatorView').style.display = 'block';
    document.getElementById('dashboardView').style.display = 'none';
    
    // Pre-fill with existing data if available
    if (pregnancyData.lastPeriod) {
        document.getElementById('lastPeriod').valueAsDate = pregnancyData.lastPeriod;
        document.getElementById('dueDate').valueAsDate = pregnancyData.dueDate;
    }
}

// Update the dashboard with current pregnancy data
function updateDashboard() {
    if (!pregnancyData.dueDate) return;
    
    const today = new Date();
    const dueDate = new Date(pregnancyData.dueDate);
    const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    const currentWeek = pregnancyData.currentWeek;
    const weekIndex = Math.min(Math.ceil(currentWeek / 4), pregnancyData.weeks.length - 1);
    const weekData = pregnancyData.weeks[weekIndex];
    
    // Update week and due date
    document.getElementById('currentWeek').textContent = currentWeek;
    document.getElementById('displayDueDate').textContent = dueDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Update days left
    const daysLeftElement = document.getElementById('daysLeft');
    if (daysLeft > 0) {
        daysLeftElement.textContent = `${daysLeft} days to go`;
    } else if (daysLeft === 0) {
        daysLeftElement.textContent = "Your due date is today!";
    } else {
        daysLeftElement.textContent = `${Math.abs(daysLeft)} days past due`;
    }
    
    // Update baby size
    document.getElementById('babySize').textContent = weekData.babySize;
    
    // Update trimester
    let trimester;
    if (currentWeek < 13) trimester = "First Trimester";
    else if (currentWeek < 27) trimester = "Second Trimester";
    else trimester = "Third Trimester";
    document.getElementById('trimester').textContent = trimester;
    
    // Update appointment reminder
    const appointmentElement = document.getElementById('appointmentReminder');
    if (currentWeek < 28) {
        appointmentElement.textContent = "Monthly checkups with your healthcare provider";
    } else if (currentWeek < 36) {
        appointmentElement.textContent = "Bi-weekly checkups with your healthcare provider";
    } else {
        appointmentElement.textContent = "Weekly checkups until delivery";
    }
    
    // Update nutrition tip
    const nutritionTipElement = document.getElementById('nutritionTip');
    const randomTipIndex = Math.floor(Math.random() * pregnancyData.nutritionTips.length);
    nutritionTipElement.textContent = pregnancyData.nutritionTips[randomTipIndex];
    
    // Update weekly development and body changes
    updateWeeklyInsights();
}

// Update weekly insights based on current week
function updateWeeklyInsights() {
    const currentWeek = pregnancyData.currentWeek;
    const weekIndex = Math.min(Math.ceil(currentWeek / 4), pregnancyData.weeks.length - 1);
    const weekData = pregnancyData.weeks[weekIndex];
    
    document.getElementById('weeklyDevelopment').innerHTML = `
        <p>${weekData.development}</p>
        <p>Your baby is now <strong>${weekData.babySize}</strong>.</p>
    `;
    
    document.getElementById('bodyChanges').innerHTML = `
        <p>${weekData.bodyChanges}</p>
    `;

    // Simple trimester-based safe exercises and warning symptoms
    let trimester;
    if (currentWeek < 13) trimester = 'first';
    else if (currentWeek < 27) trimester = 'second';
    else trimester = 'third';

    let exercisesHtml = '';
    let warningsHtml = '';

    if (trimester === 'first') {
        exercisesHtml = `
            <ul>
                <li>Walk 15–20 minutes most days at a comfortable pace.</li>
                <li>Light stretching or prenatal yoga (beginner level).</li>
                <li>Avoid overheating and very intense new workouts.</li>
            </ul>
        `;
        warningsHtml = `
            <ul>
                <li>Heavy bleeding or strong one‑sided pain.</li>
                <li>Severe vomiting with inability to keep fluids down.</li>
                <li>Sudden fainting or chest pain.</li>
            </ul>
        `;
    } else if (trimester === 'second') {
        exercisesHtml = `
            <ul>
                <li>Walking, swimming, or stationary cycling.</li>
                <li>Prenatal yoga and gentle strength work with light weights.</li>
                <li>Avoid lying flat on your back for long periods.</li>
            </ul>
        `;
        warningsHtml = `
            <ul>
                <li>Vaginal bleeding or leaking fluid.</li>
                <li>Strong cramps or tightenings that come regularly.</li>
                <li>Sudden swelling of face/hands or severe headache.</li>
            </ul>
        `;
    } else {
        exercisesHtml = `
            <ul>
                <li>Short, frequent walks at an easy pace.</li>
                <li>Prenatal yoga focused on breathing and relaxation.</li>
                <li>Pelvic tilts and birth‑ball sitting if your doctor agrees.</li>
            </ul>
        `;
        warningsHtml = `
            <ul>
                <li>Decreased baby movements compared to usual.</li>
                <li>Regular painful contractions or leaking fluid.</li>
                <li>Severe headache, vision changes, or chest pain.</li>
            </ul>
        `;
    }

    const exercisesEl = document.getElementById('weeklyExercises');
    const warningsEl = document.getElementById('weeklyWarnings');
    if (exercisesEl) exercisesEl.innerHTML = exercisesHtml;
    if (warningsEl) warningsEl.innerHTML = warningsHtml;
}

// Edit due date
function editDueDate() {
    showCalculator();
}

// Set reminder for appointments
function setReminder() {
    if (window.Notification && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showNotification('Reminder Set', 'You will receive weekly pregnancy updates!');
                
                // Schedule weekly notifications (in a real app, you would use a more robust scheduling system)
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then(registration => {
                        // In a real app, you would use the Push API for scheduled notifications
                        console.log('Service Worker ready for notifications');
                    });
                }
            }
        });
    } else {
        alert('Please enable notifications in your browser settings to receive reminders.');
    }
}

// Show notification
function showNotification(title, message) {
    if (window.Notification && Notification.permission === 'granted') {
        new Notification(title, { body: message, icon: 'https://i.imgur.com/6Jb2V7v.png' });
    }
}

// Initialize pregnancy tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // We no longer auto-load saved pregnancy data; each open is a fresh entry

    // Set up event listeners for the pregnancy tracker modal
    const modal = document.getElementById('pregnancyTrackerModal');
    window.onclick = function(event) {
        if (event.target === modal) {
            closePregnancyTracker();
        }
    };
    
    // Close modal when clicking the close button
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.onclick = closePregnancyTracker;
    }
    
    // Set default date to today for the due date input
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dueDate').setAttribute('min', today);
    
    // Set max date for last period (today - 1 day)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    document.getElementById('lastPeriod').setAttribute('max', yesterday.toISOString().split('T')[0]);
});

// Console welcome message
console.log('%c🤰 Pregnancy Care Assistant', 'color: #ff6b9d; font-size: 20px; font-weight: bold;');
console.log('%cWelcome! This app helps expecting mothers with pregnancy-related questions.', 'color: #636e72; font-size: 12px;');
