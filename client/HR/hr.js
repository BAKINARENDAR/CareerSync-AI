let recordingActive = false;

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

function toggleRecording() {
    if (!recordingActive) {
        recordingActive = true;
        document.getElementById('recordingStatus').style.display = 'flex';
        document.getElementById('statusText').textContent = 'Recording... Speak now!';
        
        setTimeout(() => {
            recordingActive = false;
            document.getElementById('recordingStatus').style.display = 'none';
            document.getElementById('statusText').textContent = '✓ Recording saved! Click to record again.';
        }, 5000);
    }
}

// ⭐ WAIT FOR DOM TO LOAD BEFORE CREATING STARS
document.addEventListener('DOMContentLoaded', function() {
    createStars();
});
