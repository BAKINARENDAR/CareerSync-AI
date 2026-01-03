let editor;
const studentName = localStorage.getItem("studentName") || "Narendra";

// Templates and Test Cases
const starterTemplates = {
    javascript: "var twoSum = function(nums, target) {\n    \n};",
    python: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        ",
    java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}",
    cpp: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};"
};

// Monaco Setup
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' }});
require(['vs/editor/editor.main'], function() {
    editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: starterTemplates.javascript,
        language: 'javascript',
        theme: 'vs-dark',
        fontSize: 14,
        automaticLayout: true
    });
});

function changeLanguage() {
    const lang = document.getElementById("langSelect").value;
    monaco.editor.setModelLanguage(editor.getModel(), lang === 'cpp' ? 'cpp' : lang);
    editor.setValue(starterTemplates[lang]);
}

// REAL EXECUTION ENGINE
async function runLogic(isSubmit) {
    const output = document.getElementById("consoleOutput");
    const userCode = editor.getValue();
    const lang = document.getElementById("langSelect").value;
    
    output.innerHTML = "<div class='running-text'>Compiling and Running...</div>";

    // We use the Piston API (Free Open Source Execution Engine)
    const runData = {
        "language": lang === "javascript" ? "js" : lang,
        "version": "*",
        "files": [{ "content": userCode + "\n\n// Added Driver Code for Testing\n" + getDriverCode(lang) }]
    };

    try {
        const response = await fetch("https://emkc.org/api/v2/piston/execute", {
            method: "POST",
            body: JSON.stringify(runData)
        });
        const result = await response.json();

        // 1. Check for Compilation/Runtime Errors
        if (result.run.stderr) {
            output.innerHTML = `<span style="color: #ef4743;">Compilation Error:</span><br><pre style="color: #eee;">${result.run.stderr}</pre>`;
            speakAI("I see a mistake in your code. Check the console for the error message.");
            return;
        }

        // 2. Verify Output
        const actualOutput = result.run.stdout.trim();
        if (actualOutput.includes("PASSED")) {
            output.innerHTML = `<span style="color: #2cbb5d;">Accepted</span><br>All test cases passed!`;
            if (isSubmit) triggerVictory();
        } else {
            output.innerHTML = `<span style="color: #ef4743;">Wrong Answer</span><br>${actualOutput}`;
            speakAI("Your code compiled, but it didn't return the right answer.");
        }

    } catch (err) {
        output.innerHTML = "Error connecting to execution server.";
    }
}

// Driver code to actually test your C++/Python/Java classes
function getDriverCode(lang) {
    if (lang === "cpp") {
        return `int main() { 
            Solution sol; 
            vector<int> n1 = {2,7,11,15}; 
            auto r = sol.twoSum(n1, 9); 
            if(r.size() == 2) cout << "PASSED"; 
            else cout << "FAILED";
            return 0;
        }`;
    }
    return ""; // Add similar drivers for other languages
}

function triggerVictory() {
    document.getElementById("victoryOverlay").style.display = "flex";
    speakAI(`Congratulations ${studentName}! Successfully submitted.`);
}

function speakAI(text) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utter);
    document.getElementById("aiChat").innerHTML = `<b>AI Mentor:</b> ${text}`;
}

// Mic Logic
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    const response = await fetch('http://localhost:5000/api/technical/analyze-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: editor.getValue(), question: transcript, studentName: studentName })
    });
    const data = await response.json();
    speakAI(data.feedback);
};
document.getElementById("micBtn").onclick = () => recognition.start();