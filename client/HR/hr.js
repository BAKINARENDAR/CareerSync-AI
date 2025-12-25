let recordingActive = false;
let mediaRecorder;
let audioChunks = [];

// Create stars
function createStars() {
    const container = document.getElementById('starContainer');
    if (!container) {
        console.error('starContainer element not found!');
        return;
    }
    
    for (let i = 0; i < 50; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 3 + 's';
        container.appendChild(star);
    }
}

// Toggle Recording - START/STOP
async function toggleRecording() {
    if (!recordingActive) {
        // START RECORDING
        recordingActive = true;
        audioChunks = [];
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
            
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                await sendAudioToBackend(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorder.start();
            document.getElementById('recordingStatus').style.display = 'flex';
            document.getElementById('statusText').textContent = '🔴 Recording... Click mic to stop';
            
        } catch (error) {
            console.error('Microphone access denied:', error);
            document.getElementById('statusText').textContent = '❌ Microphone access denied!';
            recordingActive = false;
        }
    } else {
        // STOP RECORDING
        recordingActive = false;
        mediaRecorder.stop();
        document.getElementById('statusText').textContent = '⏳ Processing your response...';
    }
}

// Send Audio to Backend
async function sendAudioToBackend(audioBlob) {
    try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'response.wav');
        
        const response = await fetch('http://localhost:5000/api/analyze', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayFeedback(result);
        } else {
            document.getElementById('statusText').textContent = '❌ Error processing response';
        }
    } catch (error) {
        console.error('Error sending audio:', error);
        document.getElementById('statusText').textContent = '❌ Failed to process response. Make sure backend is running on port 5000';
    }
}

// Display Feedback Results
function displayFeedback(data) {
    const statusElement = document.getElementById('statusText');
    const recordingIndicator = document.getElementById('recordingStatus');
    
    recordingIndicator.style.display = 'none';
    
    // Create feedback HTML
    const feedbackHTML = `
        <div style="margin-top: 20px;">
            <h3 style="color: #81c784; margin-bottom: 15px;">📊 Your Feedback</h3>
            
            <div style="background: rgba(76, 175, 80, 0.1); border: 2px solid rgba(76, 175, 80, 0.4); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                <p style="color: #81c784; font-weight: 600; margin-bottom: 8px;">Communication Skills</p>
                <p style="color: #b0bec5;">${data.communicationSkills || 'Good clarity and structure'}</p>
                <p style="margin-top: 8px; color: #64b5f6;">Score: ${data.communicationScore || 7.5}/10</p>
            </div>
            
            <div style="background: rgba(100, 181, 246, 0.1); border: 2px solid rgba(100, 181, 246, 0.4); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                <p style="color: #64b5f6; font-weight: 600; margin-bottom: 8px;">Confidence Level</p>
                <p style="color: #b0bec5;">${data.confidenceLevel || 'Moderate. Speak with conviction'}</p>
                <p style="margin-top: 8px; color: #64b5f6;">Score: ${data.confidenceScore || 6.5}/10</p>
            </div>
            
            <div style="background: rgba(255, 152, 0, 0.1); border: 2px solid rgba(255, 152, 0, 0.4); padding: 15px; border-radius: 10px;">
                <p style="color: #ffb74d; font-weight: 600; margin-bottom: 8px;">🎯 Follow-up Questions</p>
                <ol style="color: #b0bec5; margin-left: 20px;">
                    ${data.followupQuestions ? data.followupQuestions.map(q => `<li style="margin-bottom: 8px;">${q}</li>`).join('') : '<li>What was your biggest challenge?</li><li>How did you handle conflicts?</li>'}
                </ol>
            </div>
            
            <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #64b5f6; color: #0a0e27; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                🎤 Try Again
            </button>
        </div>
    `;
    
    statusElement.innerHTML = feedbackHTML;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    createStars();
});
