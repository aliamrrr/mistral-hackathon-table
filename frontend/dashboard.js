document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    const submitBtn = document.getElementById('submit-btn');
    const submitIcon = document.getElementById('submit-icon');
    const entitiesLayer = document.getElementById('entities-layer');
    const playBtn = document.getElementById('play-btn');
    const playIcon = playBtn.querySelector('span');
    const scrubberThumb = document.getElementById('scrubber-thumb');
    const progressBar = document.getElementById('progress-bar');
    const timelineTrack = document.getElementById('timeline-track');
    const timeDisplay = document.getElementById('time-display');
    const audioEl = document.getElementById('narration-audio');

    let currentDrill = null;
    let isPlaying = false;
    let currentTime = 0;
    let totalTime = 0;
    let animationReq = null;
    let lastTimestamp = null;

    const API_BASE = "http://localhost:8001/api";

    submitBtn.addEventListener('click', generateDrill);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') generateDrill();
    });

    playBtn.addEventListener('click', togglePlayback);

    timelineTrack.addEventListener('click', (e) => {
        if (!currentDrill || !totalTime) return;
        const rect = timelineTrack.getBoundingClientRect();
        let perc = (e.clientX - rect.left) / rect.width;
        perc = Math.max(0, Math.min(1, perc));
        seekTo(perc * totalTime);
    });

    // Save and Export buttons
    document.getElementById('save-drill-btn').addEventListener('click', async () => {
        if (!currentDrill) return alert("No drill to save!");
        try {
            const res = await fetch(`${API_BASE}/drills/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: currentDrill.metadata.title,
                    tags: currentDrill.metadata.tags,
                    intensity: currentDrill.metadata.intensity,
                    duration: currentDrill.metadata.duration,
                    full_json_data: currentDrill,
                    audio_url: currentDrill.audio_url || ""
                })
            });
            if (res.ok) {
                alert("Drill saved successfully!");
                // Optionally redirect to library here
            } else {
                alert("Failed to save drill.");
            }
        } catch (err) { alert(err); }
    });

    document.getElementById('export-video-btn').addEventListener('click', async () => {
        alert("Saving drill to backend then exporting to video...");
        // This is a stub for the hackathon MVP, technically we'd need to save first and get ID.
    });

    function formatTime(secs) {
        if (isNaN(secs)) secs = 0;
        const s = Math.floor(secs);
        const m = Math.floor(s / 60);
        const remS = s % 60;
        return `${m.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}`;
    }

    async function generateDrill() {
        const prompt = chatInput.value.trim();
        if (!prompt) return;

        chatInput.disabled = true;
        submitIcon.innerText = 'hourglass_empty';
        submitIcon.classList.add('animate-spin');

        try {
            const response = await fetch(`${API_BASE}/generate/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            if (!response.ok) throw new Error("API Error");
            const data = await response.json();

            loadDrill(data);
        } catch (err) {
            console.error(err);
            alert("Failed to generate drill. Ensure backend is running.");
        } finally {
            chatInput.disabled = false;
            submitIcon.innerText = 'arrow_upward';
            submitIcon.classList.remove('animate-spin');
            chatInput.value = '';
        }
    }

    function loadDrill(data) {
        currentDrill = data;
        const phases = data.animation.phases;
        totalTime = phases.length > 0 ? phases[phases.length - 1].time_end : 0;
        currentTime = 0;
        isPlaying = false;
        playIcon.innerText = 'play_arrow';

        if (data.audio_url) {
            audioEl.src = `http://localhost:8001${data.audio_url}`;
            audioEl.load();
        } else {
            audioEl.src = "";
        }

        renderStaticUI(data.metadata);
        updateProgress();
        renderPitch(currentTime);
    }

    function renderStaticUI(meta) {
        // Update Title
        document.querySelector('header span.text-white.text-sm.font-medium').innerText = meta.title;
    }

    function togglePlayback() {
        if (!currentDrill) return;
        if (isPlaying) {
            isPlaying = false;
            playIcon.innerText = 'play_arrow';
            audioEl.pause();
            if (animationReq) cancelAnimationFrame(animationReq);
        } else {
            isPlaying = true;
            playIcon.innerText = 'pause';
            if (currentTime >= totalTime) {
                currentTime = 0; // reset
            }
            lastTimestamp = performance.now();

            // Sync audio
            if (audioEl.src) {
                audioEl.currentTime = currentTime;
                audioEl.play().catch(e => console.log("Audio play blocked", e));
            }

            animationReq = requestAnimationFrame(animateLoop);
        }
    }

    function seekTo(time) {
        currentTime = time;
        if (audioEl.src) audioEl.currentTime = currentTime;
        updateProgress();
        renderPitch(currentTime);
    }

    function animateLoop(timestamp) {
        if (!isPlaying) return;
        const delta = (timestamp - lastTimestamp) / 1000; // seconds
        lastTimestamp = timestamp;

        currentTime += delta;
        if (currentTime >= totalTime) {
            currentTime = totalTime;
            isPlaying = false;
            playIcon.innerText = 'play_arrow';
            audioEl.pause();
        }

        updateProgress();
        renderPitch(currentTime);

        if (isPlaying) {
            animationReq = requestAnimationFrame(animateLoop);
        }
    }

    function updateProgress() {
        const perc = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;
        progressBar.style.width = `${perc}%`;
        scrubberThumb.style.left = `${perc}%`;
        timeDisplay.innerText = `${formatTime(currentTime)} / ${formatTime(totalTime)}`;
    }

    function renderPitch(time) {
        if (!currentDrill || !currentDrill.animation) return;

        const phases = currentDrill.animation.phases;
        const entities = currentDrill.animation.entities;
        const pitchSize = currentDrill.animation.pitch_size;

        let currentPhase = phases[0];
        let nextPhase = phases[0];

        for (let i = 0; i < phases.length; i++) {
            if (time >= phases[i].time_start && time <= phases[i].time_end) {
                currentPhase = phases[i];
                nextPhase = phases[i];
                break;
            } else if (time < phases[i].time_start) {
                nextPhase = phases[i];
                currentPhase = i > 0 ? phases[i - 1] : phases[i];
                break;
            }
        }

        let fraction = 0;
        if (nextPhase.time_end > currentPhase.time_start) {
            fraction = (time - currentPhase.time_start) / (nextPhase.time_end - currentPhase.time_start);
            fraction = Math.max(0, Math.min(1, fraction));
        }

        entitiesLayer.innerHTML = '';

        // Render players
        if (entities.players) {
            entities.players.forEach(p => {
                const sPos = currentPhase.positions[p.id] || { x: 52, y: 34 };
                const ePos = nextPhase.positions[p.id] || sPos;
                const x = sPos.x + (ePos.x - sPos.x) * fraction;
                const y = sPos.y + (ePos.y - sPos.y) * fraction;

                // CSS percentages: Pitch is 105x68. 
                // Left = (x / length) * 100%. Top = (y / width) * 100%.
                const leftPerc = (x / pitchSize.length) * 100;
                const topPerc = (y / pitchSize.width) * 100;

                const bgClass = p.color.toLowerCase() === 'blue' ? 'bg-blue-600' :
                    (p.color.toLowerCase() === 'yellow' ? 'bg-yellow-500' : 'bg-red-600');

                const el = document.createElement('div');
                el.className = `absolute flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 shadow-lg transition-transform`;
                el.style.left = `${leftPerc}%`;
                el.style.top = `${topPerc}%`;

                el.innerHTML = `
                    <div class="w-8 h-8 rounded-full ${bgClass} border-2 border-white shadow-lg flex items-center justify-center text-xs font-bold text-white z-10">${p.number}</div>
                    <div class="w-6 h-1 bg-black/40 rounded-full blur-[2px] mt-1 hidden lg:block"></div>
                `;
                entitiesLayer.appendChild(el);
            });
        }

        // Render balls
        if (entities.balls) {
            entities.balls.forEach(b => {
                const sPos = currentPhase.positions[b.id] || { x: 52, y: 34 };
                const ePos = nextPhase.positions[b.id] || sPos;
                const x = sPos.x + (ePos.x - sPos.x) * fraction;
                const y = sPos.y + (ePos.y - sPos.y) * fraction;

                const leftPerc = (x / pitchSize.length) * 100;
                const topPerc = (y / pitchSize.width) * 100;

                const el = document.createElement('div');
                el.className = `absolute flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 transition-transform shadow-sm z-20`;
                el.style.left = `${leftPerc}%`;
                el.style.top = `${topPerc}%`;

                el.innerHTML = `
                    <div class="w-3 h-3 rounded-full bg-white border border-gray-300"></div>
                `;
                entitiesLayer.appendChild(el);
            });
        }
    }
});
