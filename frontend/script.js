const API_BASE = 'http://localhost:8000';
const chat = document.getElementById('chat');
const startModal = document.getElementById('startModal');
const inputSection = document.getElementById('input-section');
const welcomeMessage = document.getElementById('welcome-message');
const startBtn = document.getElementById('startBtn');
const startNewBtn = document.getElementById('startNewBtn');
const topicInput = document.getElementById('topicInput');
const sideSelect = document.getElementById('sideSelect');
const startError = document.getElementById('startError');
const humanInput = document.getElementById('humanInput');
const sendBtn = document.getElementById('sendBtn');
const sendError = document.getElementById('sendError');
const lengthHint = document.getElementById('lengthHint');
const turnSpan = document.getElementById('turnSpan');
const botSideBadge = document.getElementById('botSideBadge');
const messageCounter = document.getElementById('messageCounter');

const MAX_MESSAGES = 20;

let sessionId = null;
let state = { history: [], botSide: 'PRO' };

function initializeMessageCount() {
    const today = new Date().toISOString().slice(0, 10);
    let countData = JSON.parse(localStorage.getItem('messageCount'));

    if (!countData || countData.date !== today) {
        countData = { date: today, count: MAX_MESSAGES };
        localStorage.setItem('messageCount', JSON.stringify(countData));
    }

    return countData.count;
}

let remainingMessages = initializeMessageCount();
messageCounter.textContent = `Messages: ${remainingMessages}`;

function updateMessageCount() {
    const today = new Date().toISOString().slice(0, 10);
    let countData = JSON.parse(localStorage.getItem('messageCount'));

    if (countData && countData.date === today) {
        countData.count--;
        remainingMessages = countData.count;
    } else {
        countData = { date: today, count: MAX_MESSAGES - 1 };
        remainingMessages = MAX_MESSAGES - 1;
    }

    localStorage.setItem('messageCount', JSON.stringify(countData));
    messageCounter.textContent = `Messages: ${remainingMessages}`;
}

function wordCount(s) { return (s.trim().match(/\b\w+\b/g) || []).length; }
function updateLengthHint() {
    const n = wordCount(humanInput.value);
    lengthHint.textContent = `${n} words (need 120–180)`;
    if (n < 120 || n > 180 || remainingMessages <= 0) {
        lengthHint.className = "text-sm text-red-600 font-semibold";
        sendBtn.disabled = true;
        sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        lengthHint.className = "text-sm text-slate-600";
        sendBtn.disabled = false;
        sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}
humanInput.addEventListener('input', updateLengthHint);

function renderMessageHTML(raw) {
    let html = raw
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\r\n/g, "\n").replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>");
    const li = [];
    const re = /(?:^|\s)(\d\))\s([^]*?)(?=\s\d\)\s|$)/g;
    let m;
    while ((m = re.exec(raw)) !== null) {
        li.push(m[2].trim());
    }
    if (li.length >= 2) {
        const list = '<ul class="list-disc pl-6 mt-2">' + li.map(s => `<li>${s}</li>`).join("") + "</ul>";
        html = html.replace(/(?:^|\s)\d\)\s[^]*?(?=\s\d\)\s|$)/g, "").trim();
        html = (html ? html + " " : "") + list;
    }
    return html;
}

function showTypingIndicator() {
    const typingIndicator = document.createElement('div');
    typingIndicator.id = 'typing-indicator';
    typingIndicator.className = 'flex items-center gap-2 p-3 bg-slate-100 rounded-2xl w-fit';
    typingIndicator.innerHTML = `
        <div class="dot-typing bg-[#02182B] w-2 h-2 rounded-full animate-bounce"></div>
        <div class="dot-typing bg-[#02182B] w-2 h-2 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
        <div class="dot-typing bg-[#02182B] w-2 h-2 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
    `;
    chat.appendChild(typingIndicator);
    chat.scrollTop = chat.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function addMessage(role, text) {
    const tpl = document.getElementById('msgTemplate').content.cloneNode(true);
    const container = tpl.firstElementChild;
    const avatar = tpl.querySelector('.avatar');
    const bubble = tpl.querySelector('.msg-bubble');
    bubble.innerHTML = renderMessageHTML(text);
    if (role === 'bot') {
        container.classList.add('justify-start');
        avatar.textContent = 'D'; avatar.classList.add('bg-[#02182B]', 'text-white');
        bubble.classList.add('bg-slate-100', 'border-slate-200', 'bubble-bot');
    } else {
        container.classList.add('justify-end');
        avatar.textContent = 'U'; avatar.classList.add('bg-slate-700', 'text-white');
        bubble.classList.add('bg-[#02182B]/5', 'border-[#02182B]/20', 'bubble-user');
    }
    chat.appendChild(tpl);
    chat.scrollTop = chat.scrollHeight;
}

function updateBotSide(newSide) {
    const side = newSide || sideSelect.value || 'PRO';
    state.botSide = side;
    botSideBadge.textContent = `Side: ${side}`;
}

startModal.addEventListener('click', (e) => {
    if (e.target.id === 'startModal') {
        startModal.classList.add('hidden');
    }
});

startBtn.addEventListener('click', async () => {
    startError.classList.add('hidden');
    const topic = topicInput.value.trim();
    const bot_side = sideSelect.value;
    if (!topic) { startError.textContent = 'Topic is required.'; startError.classList.remove('hidden'); return; }

    startBtn.disabled = true;
    startBtn.textContent = 'Starting...';

    startModal.classList.add('hidden');
    welcomeMessage.classList.add('hidden');
    inputSection.classList.remove('hidden');
    showTypingIndicator();
    updateMessageCount();

    try {
        const res = await fetch(`${API_BASE}/api/debate/start`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, bot_side })
        });
        const data = await res.json();
        if (!res.ok) {
            startError.textContent = data.detail;
            startError.classList.remove('hidden');
            return;
        }
        sessionId = data.session_id;
        state = { topic, botSide: data.bot_side, history: [{ role: 'bot', message: data.bot_message }] };
        chat.innerHTML = '';
        addMessage('bot', data.bot_message);
        updateBotSide(data.bot_side);
    } catch (error) {
        console.error("Failed to start debate:", error);
        startError.textContent = "Failed to connect to the server. Please try again.";
        startError.classList.remove('hidden');
    } finally {
        startBtn.disabled = false;
        startBtn.textContent = 'Start Debate';
        hideTypingIndicator();
    }
});

sendBtn.addEventListener('click', async () => {
    sendError.classList.add('hidden');
    if (remainingMessages <= 0) {
        sendError.textContent = 'You have reached your daily message limit.';
        sendError.classList.remove('hidden');
        return;
    }
    if (!sessionId) { sendError.textContent = 'Start a debate first.'; sendError.classList.remove('hidden'); return; }
    const msg = humanInput.value.trim();
    const n = wordCount(msg);
    if (n < 120 || n > 180) { sendError.textContent = 'Message must be 120–180 words.'; sendError.classList.remove('hidden'); return; }

    const isSwitchRequested = msg.toLowerCase().includes('[switch]');
    addMessage('user', msg);
    state.history.push({ role: 'user', message: msg });
    humanInput.value = '';
    updateLengthHint();
    updateMessageCount();

    sendBtn.disabled = true;
    showTypingIndicator();

    try {
        const res = await fetch(`${API_BASE}/api/debate/turn`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, human_message: msg })
        });
        const data = await res.json();
        if (!res.ok) {
            sendError.textContent = data.detail;
            sendError.classList.remove('hidden');
            return;
        }

        if (isSwitchRequested) {
            const newSide = state.botSide === 'PRO' ? 'CON' : 'PRO';
            updateBotSide(newSide);
        }

        addMessage('bot', data.bot_message);
        state.history.push({ role: 'bot', message: data.bot_message });
    } catch (error) {
        console.error("Failed to take turn:", error);
        sendError.textContent = "Failed to connect to the server. Please try again.";
        sendError.classList.remove('hidden');
    } finally {
        sendBtn.disabled = false;
        hideTypingIndicator();
    }
});

startNewBtn.addEventListener('click', () => {
    sessionId = null;
    state = { history: [], botSide: 'PRO' };
    chat.innerHTML = '';
    topicInput.value = '';
    humanInput.value = '';
    updateLengthHint();
    welcomeMessage.classList.remove('hidden');
    inputSection.classList.add('hidden');
    updateBotSide(sideSelect.value);
    startError.classList.add('hidden');
    sendError.classList.add('hidden');
    startModal.classList.remove('hidden');
});

document.addEventListener('DOMContentLoaded', () => {
    updateBotSide(sideSelect.value);
});