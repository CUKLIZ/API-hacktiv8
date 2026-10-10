const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const welcomeScreen = document.getElementById("welcome-screen");
const clearChatBtn = document.getElementById("clear-chat-btn");
const attachBtn = document.getElementById("attach-btn");
const fileInput = document.getElementById("file-input");
const sendBtn = document.getElementById("send-btn");

// Preview Elements
const filePreviewContainer = document.getElementById("file-preview-container");
const filePreviewName = document.getElementById("file-preview-name");
const filePreviewSIze = document.getElementById("file-preview-size");
const filePreviewIcon = document.getElementById("file-preview-icon");
const imagePreviewThumb = document.getElementById("image-preview-thumb");
const removeFileBtn = document.getElementById("remove-file-btn");

let conversation = [];
let selectedFile = null;

// Format file size
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Format current time
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Auto resize textarea
input.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 120) + "px";
});

// Handle Enter to submit (Shift+Enter for newline)
input.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.dispatchEvent(new Event("submit"));
    }
});

// Attach File Button
attachBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (!file) return;

    selectedFile = file;
    filePreviewName.textContent = file.name;
    filePreviewSIze.textContent = formatBytes(file.size);

    if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreviewThumb.src = e.target.result;
            imagePreviewThumb.classList.remove("hidden");
            filePreviewIcon.classList.add("hidden");
        };
        reader.readAsDataURL(file);
    } else {
        imagePreviewThumb.classList.add("hidden");
        filePreviewIcon.classList.remove("hidden");
        if (file.type.startsWith("audio/")) {
            filePreviewIcon.innerHTML = '<i class="fa-solid fa-file-audio"></i>';
        } else {
            filePreviewIcon.innerHTML = '<i class="fa-solid fa-file-lines"></i>';
        }
    }

    filePreviewContainer.classList.remove("hidden");
});

// Remove Attached File
removeFileBtn.addEventListener("click", () => {
    selectedFile = null;
    fileInput.value = "";
    filePreviewContainer.classList.add("hidden");
});

// Suggestion Chips
document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
        const prompt = chip.getAttribute("data-prompt");
        input.value = prompt;
        input.focus();
    });
});

// Clear Chat
clearChatBtn.addEventListener("click", () => {
    conversation = [];
    chatBox.innerHTML = "";
    if (welcomeScreen) {
        chatBox.appendChild(welcomeScreen);
    }
});

// Render message to UI
function appendMessage(sender, text, attachment = null) {
    if (welcomeScreen && welcomeScreen.parentNode === chatBox) {
        welcomeScreen.remove();
    }

    const row = document.createElement("div");
    row.classList.add("message-row", sender);

    const avatar = document.createElement("div");
    avatar.classList.add("msg-avatar");
    avatar.innerHTML = sender === "user" 
        ? '<i class="fa-solid fa-user"></i>' 
        : '<i class="fa-solid fa-robot"></i>';

    const contentWrapper = document.createElement("div");
    contentWrapper.classList.add("message-content");

    const bubble = document.createElement("div");
    bubble.classList.add("message-bubble");

    // Display attachment if present
    if (attachment && sender === "user") {
        if (attachment.type.startsWith("image/")) {
            const imgPreview = document.createElement("div");
            imgPreview.classList.add("attached-media-preview");
            const img = document.createElement("img");
            img.src = URL.createObjectURL(attachment);
            imgPreview.appendChild(img);
            bubble.appendChild(imgPreview);
        } else {
            const badge = document.createElement("div");
            badge.classList.add("attached-file-badge");
            const icon = attachment.type.startsWith("audio/") ? "fa-file-audio" : "fa-file-lines";
            badge.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${attachment.name}</span>`;
            bubble.appendChild(badge);
        }
    }

    // Message text / Markdown
    const textContainer = document.createElement("div");
    if (sender === "bot") {
        textContainer.innerHTML = typeof marked !== "undefined" ? marked.parse(text) : text;
    } else {
        textContainer.textContent = text;
    }
    bubble.appendChild(textContainer);

    // Meta (Time)
    const meta = document.createElement("div");
    meta.classList.add("message-meta");
    meta.innerHTML = `<span>${getCurrentTime()}</span>`;

    contentWrapper.appendChild(bubble);
    contentWrapper.appendChild(meta);

    row.appendChild(avatar);
    row.appendChild(contentWrapper);

    chatBox.appendChild(row);
    chatBox.scrollTop = chatBox.scrollHeight;

    return { row, bubble, textContainer };
}

// Typing indicator element
function showTypingIndicator() {
    if (welcomeScreen && welcomeScreen.parentNode === chatBox) {
        welcomeScreen.remove();
    }

    const row = document.createElement("div");
    row.classList.add("message-row", "bot", "loading-row");

    const avatar = document.createElement("div");
    avatar.classList.add("msg-avatar");
    avatar.innerHTML = '<i class="fa-solid fa-robot"></i>';

    const bubble = document.createElement("div");
    bubble.classList.add("message-bubble");
    bubble.innerHTML = `
        <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;

    row.appendChild(avatar);
    row.appendChild(bubble);
    chatBox.appendChild(row);
    chatBox.scrollTop = chatBox.scrollHeight;

    return row;
}

// Form Submit Handler
form.addEventListener("submit", async function(e) {
    e.preventDefault();

    const userMessage = input.value.trim();
    const currentAttachment = selectedFile;

    if (!userMessage && !currentAttachment) return;

    // Reset input fields
    input.value = "";
    input.style.height = "auto";
    selectedFile = null;
    fileInput.value = "";
    filePreviewContainer.classList.add("hidden");

    // Display user message in UI
    appendMessage("user", userMessage, currentAttachment);

    // Show typing indicator
    const typingIndicator = showTypingIndicator();
    sendBtn.disabled = true;

    try {
        let response;
        let data;

        if (currentAttachment) {
            const formData = new FormData();
            formData.append("prompt", userMessage || "Tolong analisa file ini.");

            if (currentAttachment.type.startsWith("image/")) {
                formData.append("image", currentAttachment);
                response = await fetch("/generate-from-image", {
                    method: "POST",
                    body: formData
                });
            } else if (currentAttachment.type.startsWith("audio/")) {
                formData.append("audio", currentAttachment);
                response = await fetch("/generate-from-audio", {
                    method: "POST",
                    body: formData
                });
            } else {
                formData.append("document", currentAttachment);
                response = await fetch("/generate-from-document", {
                    method: "POST",
                    body: formData
                });
            }

            data = await response.json();
        } else {
            // Text Chat with context
            conversation.push({ role: "user", text: userMessage });

            response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversation })
            });

            data = await response.json();
        }

        typingIndicator.remove();

        const replyText = data?.result || data?.message || "Maaf, tidak ada respon dari server.";
        appendMessage("bot", replyText);

        if (!currentAttachment && data?.result) {
            conversation.push({ role: "model", text: data.result });
        }
    } catch (error) {
        console.error(error);
        typingIndicator.remove();
        appendMessage("bot", "⚠️ Terjadi kesalahan saat menghubungi server. Silakan coba lagi.");
    } finally {
        sendBtn.disabled = false;
        input.focus();
    }
});
