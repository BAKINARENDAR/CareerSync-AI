function createStars() {
    const container = document.getElementById('starContainer');
    if (!container) return;

    for (let i = 0; i < 50; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 3 + 's';
        container.appendChild(star);
    }
}

let recognition;
let isRecording = false;
let finalTranscript = '';
let timeLeft = 300; 
let timerInterval;
let maxDuration = 300;

function speakFinalFeedback(data) {
    const speechText = `
        Your communication score is ${data.communicationScore} out of 10.
        ${data.communicationSkills}
        
        Confidence score is ${data.confidenceScore} out of 10.
        ${data.confidenceLevel}
        
        Overall score ${data.overallScore} out of 10.
        
        Next questions: ${data.followupQuestions.join('. ')}
    `;
    
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;  
    utterance.pitch = 1.1;   
    utterance.volume = 0.9;
    
    speechSynthesis.speak(utterance);
}

function stopSpeech() {
    speechSynthesis.cancel();
}

function autoSpeakFeedback(data) {
    setTimeout(() => {
        speakFinalFeedback(data);
    }, 2000); 
}

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert('Speech Recognition is not supported in this browser. Please use Chrome.');
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const statusText = document.getElementById('statusText');
    const recordingStatus = document.getElementById('recordingStatus');
    const transcriptText = document.getElementById('transcriptText');
    const summaryBox = document.getElementById('summaryMetricsBox');
    const summaryMetrics = document.getElementById('summaryMetrics');
    const timerDisplay = document.getElementById('timerDisplay');

    recognition.onstart = () => {
        finalTranscript = '';
        transcriptText.textContent = '';
        summaryBox.style.display = 'none';
        isRecording = true;
        timeLeft = maxDuration;
        
        statusText.textContent = '🎙️ Listening... speak your answer (5 mins max)';
        recordingStatus.style.display = 'flex';
        timerDisplay.style.display = 'block';
        
        timerInterval = setInterval(() => {
            timeLeft--;
            const mins = Math.floor(timeLeft / 60);
            const secs = timeLeft % 60;
            timerDisplay.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                stopRecording();
            }
        }, 1000);
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        statusText.textContent = `❌ Error: ${event.error}. Click mic to retry.`;
        recordingStatus.style.display = 'none';
        timerDisplay.style.display = 'none';
        isRecording = false;
        clearInterval(timerInterval);
    };

    recognition.onend = () => {
        recordingStatus.style.display = 'none';
        timerDisplay.style.display = 'none';
        
        if (isRecording && timeLeft > 0) {
            setTimeout(() => recognition.start(), 100);
        } else if (!finalTranscript) {
            statusText.textContent = 'No speech detected. Click the mic and try again.';
        }
        
        isRecording = false;
    };

    recognition.onresult = async (event) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;

            if (result.isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }

        transcriptText.textContent = finalTranscript || interimTranscript;

        const lastResult = event.results[event.results.length - 1];
        const confidence = lastResult[0].confidence || 0;

        if (finalTranscript.trim().length > 0 && lastResult.isFinal) {
            statusText.textContent = '⏳ Processing your response...';
            
            const wordCount = finalTranscript.trim().split(/\s+/).length;
            summaryMetrics.textContent = `Recognized ${wordCount} words. Confidence: ${(confidence * 100).toFixed(1)}%.`;
            summaryBox.style.display = 'block';

            await sendTextToBackend(finalTranscript.trim(), confidence);
        }
    };
}

function toggleRecording() {
    const statusText = document.getElementById('statusText');
    const timerDisplay = document.getElementById('timerDisplay');

    if (!recognition) {
        initSpeechRecognition();
        if (!recognition) return; 
    }

    if (!isRecording) {
        isRecording = true;
        statusText.textContent = '🎙️ Listening... Click STOP when finished';
        recognition.start();
    } else {
        stopRecording();
    }
}

function stopRecording() {
    isRecording = false;
    if (recognition) {
        recognition.stop();
    }
    clearInterval(timerInterval);
    const statusText = document.getElementById('statusText');
    const timerDisplay = document.getElementById('timerDisplay');
    statusText.textContent = 'Stopped. Processing complete answer...';
    timerDisplay.style.display = 'none';
}

async function sendTextToBackend(text, confidence) {
    try {
        const response = await fetch('https://careersync-backend-yo5x.onrender.com/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, confidence })
        });

        const data = await response.json();

        if (response.ok && data.success !== false) {
            displayFeedback(data);
        } else {
            document.getElementById('statusText').textContent = '❌ Error processing response.';
        }
    } catch (error) {
        console.error('Error sending text:', error);
        document.getElementById('statusText').textContent =
            '❌ Failed to process. Backend on port 5000?';
    }
}

function displayFeedback(data) {
    const statusElement = document.getElementById('statusText');
    const recordingIndicator = document.getElementById('recordingStatus');

    recordingIndicator.style.display = 'none';

    const feedbackHTML = `
        <div style="margin-top: 20px;">
            <h3 style="color: #81c784; margin-bottom: 15px;">📊 Your Feedback</h3>

            <div style="background: rgba(76, 175, 80, 0.1); border: 2px solid rgba(76, 175, 80, 0.4); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                <p style="color: #81c784; font-weight: 600; margin-bottom: 8px;">Communication Skills</p>
                <p style="color: #b0bec5;">${data.communicationSkills || 'Good clarity and structure.'}</p>
                <p style="margin-top: 8px; color: #64b5f6;">Score: ${data.communicationScore || 7.5}/10</p>
            </div>

            <div style="background: rgba(100, 181, 246, 0.1); border: 2px solid rgba(100, 181, 246, 0.4); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                <p style="color: #64b5f6; font-weight: 600; margin-bottom: 8px;">Confidence Level</p>
                <p style="color: #b0bec5;">${data.confidenceLevel || 'Moderate. Speak with conviction.'}</p>
                <p style="margin-top: 8px; color: #64b5f6;">Score: ${data.confidenceScore || 6.5}/10</p>
            </div>

            <div style="background: rgba(255, 152, 0, 0.1); border: 2px solid rgba(255, 152, 0, 0.4); padding: 15px; border-radius: 10px;">
                <p style="color: #ffb74d; font-weight: 600; margin-bottom: 8px;">🎯 Follow-up Questions</p>
                <ol style="color: #b0bec5; margin-left: 20px;">
                    ${
                        data.followupQuestions
                            ? data.followupQuestions
                                .map(q => `<li style="margin-bottom: 8px;">${q}</li>`)
                                .join('')
                            : '<li>What was your biggest challenge?</li><li>How did you handle conflicts?</li>'
                    }
                </ol>
            </div>

            <div style="text-align: center; margin-top: 20px;">
                <h4 style="color: #4caf50; margin-bottom: 10px;">Overall: ${data.overallScore || 7.0}/10</h4>
                <button onclick="location.reload()" style="padding: 10px 20px; background: #64b5f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    🎤 Try Again
                </button>
            </div>
        </div>
    `;

    statusElement.innerHTML = feedbackHTML;
    
    autoSpeakFeedback(data);
}

document.addEventListener('DOMContentLoaded', () => {
    createStars();
    initSpeechRecognition();
});
