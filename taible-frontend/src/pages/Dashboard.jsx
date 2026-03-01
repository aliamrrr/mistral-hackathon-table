import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLocation, useNavigate } from 'react-router-dom';

const API_BASE = "http://localhost:8001/api";

function formatTime(secs) {
    if (isNaN(secs)) secs = 0;
    const s = Math.floor(secs);
    const m = Math.floor(s / 60);
    const remS = s % 60;
    return `${m.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}`;
}

export default function Dashboard() {
    const location = useLocation();
    const navigate = useNavigate();

    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentDrill, setCurrentDrill] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Config State
    const [language, setLanguage] = useState("English");
    const [enableAudio, setEnableAudio] = useState(true);
    const [volume, setVolume] = useState(0.8); // 80% default

    // STT & Brainstorming State
    const [isRecording, setIsRecording] = useState(false);
    const [isBrainstorming, setIsBrainstorming] = useState(false);
    const [brainstormMessages, setBrainstormMessages] = useState([]);
    const [brainstormInput, setBrainstormInput] = useState("");
    const [isBrainstormLoading, setIsBrainstormLoading] = useState(false);
    const [showNarrationStatus, setShowNarrationStatus] = useState(true);
    const [activeFiles, setActiveFiles] = useState([]); // Array of { name, text }
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // Notifications State
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // Animation state
    const [currentTime, setCurrentTime] = useState(0);
    const [totalTime, setTotalTime] = useState(0);
    const [playerPositions, setPlayerPositions] = useState([]);
    const [ballPositions, setBallPositions] = useState([]);
    const [ballTrails, setBallTrails] = useState([]);
    const [overlayType, setOverlayType] = useState('none'); // none, zones, lanes, thirds

    // Resizable bottom panel
    const [bottomPanelHeight, setBottomPanelHeight] = useState(180);
    const isDraggingPanel = useRef(false);
    const dragStartY = useRef(0);
    const dragStartHeight = useRef(180);

    const handlePanelDragStart = useCallback((e) => {
        e.preventDefault();
        isDraggingPanel.current = true;
        dragStartY.current = e.clientY;
        dragStartHeight.current = bottomPanelHeight;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';

        const onMove = (ev) => {
            if (!isDraggingPanel.current) return;
            const delta = dragStartY.current - ev.clientY;
            const newHeight = Math.max(120, Math.min(500, dragStartHeight.current + delta));
            setBottomPanelHeight(newHeight);
        };
        const onUp = () => {
            isDraggingPanel.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [bottomPanelHeight]);



    const audioRef = useRef(null);
    const animationReqRef = useRef(null);
    const lastTimestampRef = useRef(null);

    // Sync state refs for requestAnimationFrame
    const isPlayingRef = useRef(false);
    const currentTimeRef = useRef(0);
    const totalTimeRef = useRef(0);
    const drillRef = useRef(null);

    useEffect(() => {
        isPlayingRef.current = isPlaying;
        currentTimeRef.current = currentTime;
        totalTimeRef.current = totalTime;
        drillRef.current = currentDrill;
    }, [isPlaying, currentTime, totalTime, currentDrill]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    // Check if we came from Library with a drill loaded
    useEffect(() => {
        if (location.state?.loadDrill) {
            let drillData = location.state.loadDrill;
            try {
                if (typeof drillData.full_json_data === "string") {
                    drillData.full_json_data = JSON.parse(drillData.full_json_data);
                }
                const loadTarget = drillData.full_json_data || drillData;
                loadDrill(loadTarget);
                showToast("Drill loaded from Library", "success");
            } catch (err) {
                console.error("Failed to parse loaded drill", err);
            }
            // Clear router state to prevent reloading on every render
            navigate('/dashboard', { replace: true, state: {} });
        }
    }, [location.state, navigate]);

    const generateDrill = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);

        try {
            const response = await fetch(`${API_BASE}/generate/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    language: language,
                    generate_audio: enableAudio,
                    context: activeFiles.map(f => f.text).join("\n\n")
                })
            });
            if (!response.ok) throw new Error("API Error");
            const data = await response.json();
            loadDrill(data);
            setShowNarrationStatus(true);
            showToast("Drill generated successfully!", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to generate drill. Ensure backend is running.", "error");
        } finally {
            setIsGenerating(false);
            setPrompt("");
        }
    };

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
    };

    const loadDrill = (data) => {
        const fullDataObj = data.full_json_data ? data.full_json_data : data;

        setCurrentDrill(data);
        setShowNarrationStatus(true);
        const phases = fullDataObj.animation?.phases || [];
        const tTime = phases.length > 0 ? phases[phases.length - 1].time_end : 0;

        setTotalTime(tTime);
        setCurrentTime(0);
        setIsPlaying(false);

        renderEntities(0, fullDataObj);
    };

    const renderTacticalOverlay = () => {
        if (overlayType === 'none') return null;

        return (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* 18-Zone Grid (6x3) */}
                {overlayType === 'zones' && (
                    <>
                        <line x1="16.6" y1="0" x2="16.6" y2="100" stroke="white" strokeWidth="0.1" strokeDasharray="1,1" opacity="0.3" />
                        <line x1="33.3" y1="0" x2="33.3" y2="100" stroke="white" strokeWidth="0.1" strokeDasharray="1,1" opacity="0.3" />
                        <line x1="50" y1="0" x2="50" y2="100" stroke="white" strokeWidth="0.1" strokeDasharray="1,1" opacity="0.3" />
                        <line x1="66.6" y1="0" x2="66.6" y2="100" stroke="white" strokeWidth="0.1" strokeDasharray="1,1" opacity="0.3" />
                        <line x1="83.3" y1="0" x2="83.3" y2="100" stroke="white" strokeWidth="0.1" strokeDasharray="1,1" opacity="0.3" />

                        <line x1="0" y1="33.3" x2="100" y2="33.3" stroke="white" strokeWidth="0.1" strokeDasharray="1,1" opacity="0.3" />
                        <line x1="0" y1="66.6" x2="100" y2="66.6" stroke="white" strokeWidth="0.1" strokeDasharray="1,1" opacity="0.3" />
                    </>
                )}

                {/* 5 Vertical Lanes */}
                {overlayType === 'lanes' && (
                    <>
                        {/* Half-spaces and wing lanes */}
                        <line x1="15" y1="0" x2="15" y2="100" stroke="white" strokeWidth="0.15" strokeDasharray="2,2" opacity="0.4" />
                        <line x1="35" y1="0" x2="35" y2="100" stroke="white" strokeWidth="0.15" strokeDasharray="2,2" opacity="0.4" />
                        <line x1="65" y1="0" x2="65" y2="100" stroke="white" strokeWidth="0.15" strokeDasharray="2,2" opacity="0.4" />
                        <line x1="85" y1="0" x2="85" y2="100" stroke="white" strokeWidth="0.15" strokeDasharray="2,2" opacity="0.4" />
                    </>
                )}

                {/* Thirds */}
                {overlayType === 'thirds' && (
                    <>
                        <line x1="33.3" y1="0" x2="33.3" y2="100" stroke="white" strokeWidth="0.2" strokeDasharray="3,3" opacity="0.5" />
                        <line x1="66.6" y1="0" x2="66.6" y2="100" stroke="white" strokeWidth="0.2" strokeDasharray="3,3" opacity="0.5" />
                        <rect x="0" y="0" width="33.3" height="100" fill="white" opacity="0.03" />
                        <rect x="66.6" y="0" width="33.4" height="100" fill="white" opacity="0.03" />
                    </>
                )}
            </svg>
        );
    };

    // --- STT Logic (MediaRecorder) ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await sendAudioToSTT(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Mic access denied", err);
            showToast("Microphone access denied", "error");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const sendAudioToSTT = async (blob) => {
        setIsGenerating(true);
        showToast("Transcribing audio...", "success");
        const formData = new FormData();
        formData.append("file", blob, "recording.webm");

        try {
            const res = await fetch(`${API_BASE}/stt/`, {
                method: "POST",
                body: formData
            });
            if (!res.ok) throw new Error("STT Failed");
            const data = await res.json();
            if (data.text) {
                setPrompt(prev => prev ? prev + " " + data.text : data.text);
            }
        } catch (err) {
            console.error(err);
            showToast("Speech recognition failed", "error");
        } finally {
            setIsGenerating(false);
        }
    };


    // --- Brainstorm Logic ---
    const sendBrainstormMessage = async () => {
        if (!brainstormInput.trim()) return;
        const userMsg = { role: "user", content: brainstormInput };
        const newMessages = [...brainstormMessages, userMsg];
        setBrainstormMessages(newMessages);
        setBrainstormInput("");
        setIsBrainstormLoading(true);

        try {
            const body = {
                messages: newMessages,
                context: activeFiles.map(f => f.text).join("\n\n")
            };
            const res = await fetch(`${API_BASE}/brainstorm/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error("Brainstorm Failed");
            const data = await res.json();
            setBrainstormMessages([...newMessages, { role: "assistant", content: data.content }]);
        } catch (err) {
            console.error(err);
            showToast("Tactical Architect is offline", "error");
        } finally {
            setIsBrainstormLoading(false);
        }
    };

    // Robust Audio Source Syncing
    useEffect(() => {
        if (currentDrill && audioRef.current) {
            const url = currentDrill.audio_url || currentDrill.full_json_data?.audio_url;
            if (url) {
                const fullUrl = url.startsWith('http') ? url : `http://localhost:8001${url}`;
                if (audioRef.current.src !== fullUrl) {
                    audioRef.current.src = fullUrl;
                    audioRef.current.load();
                }
            } else {
                audioRef.current.src = "";
            }
        }
    }, [currentDrill]);

    // --- File Context Logic ---
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        showToast(`Uploading ${file.name}...`, "success");
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`${API_BASE}/stt/context/upload`, {
                method: "POST",
                body: formData
            });
            if (!res.ok) throw new Error("Upload failed");
            const data = await res.json();
            setActiveFiles(prev => [...prev, { name: file.name, text: data.text }]);
            showToast("Context file processed", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to process file", "error");
        }
    };

    const removeFile = (index) => {
        setActiveFiles(prev => prev.filter((_, i) => i !== index));
    };

    const renderEntities = (time, drillConfig) => {
        if (!drillConfig || !drillConfig.animation) return;
        const phases = drillConfig.animation.phases;
        const frames = drillConfig.animation.frames;
        const entities = drillConfig.animation.entities;
        const pitchSize = drillConfig.animation.pitch_size;

        let newPlayers = [];
        let newBalls = [];
        let nextBallTrails = [];

        // High-Density Unified Mathematical Rendering Path
        if (frames && frames.length > 0) {
            const fps = 60;
            let frameIdx = Math.floor(time * fps);
            if (frameIdx >= frames.length) frameIdx = frames.length - 1;

            const currentFrame = frames[frameIdx];

            newPlayers = (currentFrame?.players || []).map(p => {
                const staticData = entities?.players?.find(ep => ep.id === p.id) || {};
                return {
                    ...staticData,
                    ...p,
                    leftPerc: ((p?.x || 0) / (pitchSize?.length || 105)) * 100,
                    topPerc: ((p?.y || 0) / (pitchSize?.width || 68)) * 100
                };
            });

            newBalls = (currentFrame?.balls || []).map(b => {
                const staticData = entities?.balls?.find(eb => eb.id === b.id) || {};
                return {
                    ...staticData,
                    ...b,
                    leftPerc: ((b?.x || 0) / (pitchSize?.length || 105)) * 100,
                    topPerc: ((b?.y || 0) / (pitchSize?.width || 68)) * 100
                };
            });

            // Build Yellow Ball SVG Polyline String exactly matching the video Export engine
            if (newBalls.length > 0) {
                newBalls.forEach(b => {
                    let pointsStr = "";
                    for (let j = 0; j <= frameIdx; j += 2) { // slight sampling optimization
                        const fBall = frames[j]?.balls?.find(pb => pb.id === b.id);
                        if (fBall) {
                            pointsStr += `${((fBall?.x || 0) / (pitchSize?.length || 105)) * 100},${((fBall?.y || 0) / (pitchSize?.width || 68)) * 100} `;
                        }
                    }
                    nextBallTrails.push({ id: b.id, points: pointsStr.trim() });
                });
            }

        } else if (phases && phases.length > 0) {
            // Legacy Sparse Match Rendering (Backward Compatibility for old saved drills)
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

            if (entities.players) {
                newPlayers = entities.players.map(p => {
                    const sPos = currentPhase.positions[p.id] || { x: pitchSize.length / 2, y: pitchSize.width / 2 };
                    const ePos = nextPhase.positions[p.id] || sPos;
                    const x = sPos.x + (ePos.x - sPos.x) * fraction;
                    const y = sPos.y + (ePos.y - sPos.y) * fraction;
                    return { ...p, leftPerc: (x / pitchSize.length) * 100, topPerc: (y / pitchSize.width) * 100 };
                });
            }

            if (entities.balls) {
                newBalls = entities.balls.map(b => {
                    const sPos = currentPhase.positions[b.id] || { x: pitchSize.length / 2, y: pitchSize.width / 2 };
                    const ePos = nextPhase.positions[b.id] || sPos;
                    const x = sPos.x + (ePos.x - sPos.x) * fraction;
                    const y = sPos.y + (ePos.y - sPos.y) * fraction;
                    return { ...b, leftPerc: (x / pitchSize.length) * 100, topPerc: (y / pitchSize.width) * 100 };
                });
            }
        }

        setPlayerPositions(newPlayers);
        setBallPositions(newBalls);
        setBallTrails(nextBallTrails);
    };

    const togglePlayback = () => {
        if (!currentDrill) return;

        if (isPlaying) {
            setIsPlaying(false);
            audioRef.current?.pause();
            if (animationReqRef.current) cancelAnimationFrame(animationReqRef.current);
        } else {
            let startTime = currentTime;
            if (currentTime >= totalTime) {
                startTime = 0;
                setCurrentTime(0);
            }
            setIsPlaying(true);
            lastTimestampRef.current = performance.now();

            if (audioRef.current && audioRef.current.src) {
                audioRef.current.currentTime = startTime;
                audioRef.current.play().catch(e => console.log("Audio block:", e));
            }

            animationReqRef.current = requestAnimationFrame(animateLoop);
        }
    };

    const animateLoop = (timestamp) => {
        if (!isPlayingRef.current) return;

        const delta = (timestamp - lastTimestampRef.current) / 1000;
        lastTimestampRef.current = timestamp;

        let nextTime = currentTimeRef.current + delta;

        if (nextTime >= totalTimeRef.current) {
            nextTime = totalTimeRef.current;
            setIsPlaying(false);
            audioRef.current?.pause();
        } else {
            animationReqRef.current = requestAnimationFrame(animateLoop);
        }

        setCurrentTime(nextTime);
        renderEntities(nextTime, drillRef.current?.full_json_data || drillRef.current);
    };

    useEffect(() => {
        return () => {
            if (animationReqRef.current) cancelAnimationFrame(animationReqRef.current);
        };
    }, []);

    const handleSeek = (e) => {
        if (!currentDrill || !totalTime) return;
        const rect = e.currentTarget.getBoundingClientRect();
        let perc = (e.clientX - rect.left) / rect.width;
        perc = Math.max(0, Math.min(1, perc));

        const seekTime = perc * totalTime;
        setCurrentTime(seekTime);
        if (audioRef.current) audioRef.current.currentTime = seekTime;
        renderEntities(seekTime, currentDrill?.full_json_data || currentDrill);
    };

    const handleSave = async () => {
        let meta = currentDrill?.metadata || currentDrill?.full_json_data?.metadata;
        if (!currentDrill || !meta) {
            console.warn("handleSave: No drill or metadata available", currentDrill);
            return showToast("No drill available to save!", "error");
        }

        console.log("Attempting to save drill:", meta.title);

        try {
            const payload = {
                title: meta.title || "Untitled Drill",
                tags: Array.isArray(meta.tags) ? meta.tags : [],
                intensity: meta.intensity || "Medium",
                duration: meta.duration || "15 min",
                full_json_data: currentDrill.full_json_data || currentDrill,
                audio_url: currentDrill.audio_url || currentDrill.full_json_data?.audio_url || ""
            };

            console.log("Save payload:", payload);

            const res = await fetch(`${API_BASE}/drills/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const savedData = await res.json();
                console.log("Drill saved successfully:", savedData);
                showToast("Drill saved successfully to your Library.", "success");
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error("Failed to save drill to database:", res.status, errorData);
                showToast(`Failed to save drill: ${res.statusText}`, "error");
            }
        } catch (err) {
            console.error("Error in handleSave:", err);
            showToast(`Error saving drill: ${err.message}`, "error");
        }
    };

    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        const payload = currentDrill?.full_json_data || currentDrill;
        if (!payload || !payload.animation) return showToast("No drill to export.", "error");
        setIsExporting(true);
        showToast("Generating 60fps MP4... This may take a minute.", "success");

        try {
            const res = await fetch(`${API_BASE}/export/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                if (data.export_url) {
                    showToast("Video exported successfully!", "success");
                    const fullUrl = `http://localhost:8001${data.export_url}`;

                    // Update drill with video URL if it's a saved drill
                    if (currentDrill?.id) {
                        try {
                            await fetch(`${API_BASE}/drills/${currentDrill.id}/video`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ video_url: data.export_url })
                            });
                        } catch (e) {
                            console.error("Failed to save video reference", e);
                        }
                    }

                    window.open(fullUrl, '_blank');
                }
            } else {
                showToast("Failed to export video.", "error");
            }
        } catch (err) {
            showToast(`Export error: ${err.message}`, "error");
        } finally {
            setIsExporting(false);
        }
    };

    const progressPerc = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;
    const drillMeta = currentDrill?.metadata || currentDrill?.full_json_data?.metadata || null;

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display overflow-hidden h-screen flex flex-col relative w-full">

            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-surface-border px-6 py-3 bg-surface-dark z-20 relative">
                <div className="flex items-center gap-4 text-white">
                    <div className="size-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center text-background-dark font-bold cursor-pointer transition-transform hover:scale-105" onClick={() => navigate('/dashboard')}>
                        T
                    </div>
                    <h2 className="text-white text-xl font-bold leading-tight tracking-tight cursor-pointer" onClick={() => navigate('/dashboard')}>Taible</h2>
                    <div className="h-6 w-px bg-surface-border mx-1 hidden md:block"></div>
                </div>
                <div className="flex flex-1 justify-end gap-6 items-center">
                    <div className="flex items-center gap-2 px-3 py-1 rounded bg-background-dark border border-surface-border">
                        <span className="material-symbols-outlined text-text-subtle text-[18px]">edit</span>
                        <span className="text-white text-sm font-medium leading-normal">{drillMeta?.title || "Tactical Analysis - Zones"}</span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleExport} disabled={isExporting} className="flex items-center gap-2 justify-center overflow-hidden rounded-lg h-9 px-4 bg-primary text-background-dark text-sm font-bold leading-normal hover:opacity-90 transition-opacity disabled:opacity-50">
                            {isExporting ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> : null}
                            <span>{isExporting ? "Exporting..." : "Export Video"}</span>
                        </button>
                        <button onClick={handleSave} className="flex items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-surface-border text-white text-sm font-bold leading-normal hover:bg-opacity-80 transition-opacity">
                            <span>Save to Library</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <aside className="w-64 flex flex-col border-r border-surface-border bg-surface-dark overflow-y-auto hidden lg:flex shrink-0">
                    <div className="p-4 border-b border-surface-border">
                        <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-4">Library</h3>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => navigate('/library')} className="flex items-center gap-3 px-3 py-2 rounded-lg text-white hover:bg-surface-border transition-colors group">
                                <span className="material-symbols-outlined text-text-subtle group-hover:text-primary transition-colors">folder_open</span>
                                <span className="text-sm font-medium">My Drills</span>
                            </button>
                            <button className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                                <span className="material-symbols-outlined fill-1">grid_on</span>
                                <span className="text-sm font-medium">Zone Training</span>
                            </button>
                        </div>
                    </div>
                    <div className="p-4 flex-1">
                        <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-4">Tactical Overlays</h3>
                        <div className="space-y-2">
                            {[
                                { id: 'none', label: 'Standard Pitch', icon: 'rectangle' },
                                { id: 'zones', label: '18-Zone Grid', icon: 'grid_on' },
                                { id: 'lanes', label: 'Vertical Lanes', icon: 'view_column' },
                                { id: 'thirds', label: 'Thirds', icon: 'view_week' }
                            ].map(ov => (
                                <div
                                    key={ov.id}
                                    onClick={() => setOverlayType(ov.id)}
                                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${overlayType === ov.id ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-background-dark/50 border-surface-border text-text-subtle hover:border-text-subtle'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`material-symbols-outlined text-[18px] ${overlayType === ov.id ? 'text-primary' : 'text-text-subtle'}`}>{ov.icon}</span>
                                        <span className="text-xs font-medium">{ov.label}</span>
                                    </div>
                                    {overlayType === ov.id && <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Branding */}
                    <div className="p-4 border-t border-surface-border mt-auto">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                                <img src="/assets/mistral_logo.png" alt="Mistral AI" className="h-4 w-auto" />
                                <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Mistral AI Worldwide Hackathon</span>
                            </div>
                            <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                                <span className="text-[9px] font-medium text-white/70 uppercase tracking-wider">Voice by</span>
                                <img src="/assets/elevenlabs_logo.png" alt="ElevenLabs" className="h-3 w-auto" />
                            </div>
                        </div>
                    </div>
                </aside>

                <main className="flex-1 flex flex-col relative bg-gradient-to-b from-[#1a2c30] to-[#121f22]">
                    <div className="flex-1 relative overflow-hidden flex items-center justify-center" style={{ perspective: "1000px" }}>

                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-surface-dark/90 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-4 border border-surface-border shadow-lg">
                            <button onClick={togglePlayback} className="text-white hover:text-primary transition-colors flex items-center justify-center">
                                <span className="material-symbols-outlined">{isPlaying ? 'pause' : 'play_arrow'}</span>
                            </button>
                            <div className="h-4 w-px bg-surface-border"></div>
                            <span className="text-xs font-bold text-text-subtle tracking-widest min-w-[50px] text-center">{formatTime(currentTime)} / {formatTime(totalTime)}</span>

                            <div className="h-4 w-px bg-surface-border"></div>

                            <div className="w-48 relative h-2 rounded-full bg-background-dark border border-surface-border overflow-visible cursor-pointer group" onClick={handleSeek}>
                                <div className="absolute inset-y-0 left-0 bg-primary rounded-full pointer-events-none" style={{ width: `${progressPerc}%` }}></div>
                                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3 bg-white rounded-full shadow border-2 border-primary pointer-events-none" style={{ left: `${progressPerc}%` }}></div>
                            </div>

                            <div className="h-4 w-px bg-surface-border"></div>

                            {/* Volume Control */}
                            <div className="flex items-center gap-3 px-3 py-1 bg-background-dark/50 rounded-lg border border-surface-border/50 group/vol">
                                <span className="material-symbols-outlined text-text-subtle text-[18px] group-hover/vol:text-primary transition-colors cursor-pointer" onClick={() => setVolume(volume === 0 ? 0.8 : 0)}>
                                    {volume === 0 ? 'volume_off' : (volume < 0.5 ? 'volume_down' : 'volume_up')}
                                </span>
                                <div className="flex flex-col gap-1">
                                    <input
                                        type="range"
                                        min="0" max="1" step="0.01"
                                        value={volume}
                                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                                        className="w-20 h-1 bg-surface-border rounded-full appearance-none cursor-pointer accent-primary"
                                    />
                                    <span className="text-[9px] font-bold text-text-subtle text-center uppercase tracking-tighter">{Math.round(volume * 100)}% Volume</span>
                                </div>
                            </div>
                        </div>

                        <div className="w-[85%] h-[75%] relative transform rotate-x-12 scale-95 transition-transform duration-700">
                            <div className="absolute inset-0 bg-[#244b2c] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden border-4 border-[#3a6b44]" style={{ backgroundImage: "linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent)", backgroundSize: "50px 50px" }}>
                                {renderTacticalOverlay()}

                                {overlayType === 'none' && (
                                    <>
                                        <div className="absolute top-1/2 left-1/2 w-0.5 h-full bg-white/40 -translate-x-1/2 -translate-y-1/2"></div>
                                        <div className="absolute top-1/2 left-1/2 w-32 h-32 border-2 border-white/40 rounded-full -translate-x-1/2 -translate-y-1/2"></div>

                                        {/* Penalty Areas (Left and Right) */}
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-32 h-64 border-2 border-l-0 border-white/40 bg-white/5"></div>
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-32 h-64 border-2 border-r-0 border-white/40 bg-white/5"></div>

                                        {/* Standard tactical markings */}
                                    </>
                                )}

                                <div className="absolute inset-0 z-20">
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        {ballTrails.map((trail, i) => (
                                            <polyline
                                                key={`trail-${i}`}
                                                points={trail.points}
                                                fill="none"
                                                stroke="yellow"
                                                strokeWidth="0.8"
                                                strokeDasharray="1.5,1"
                                                opacity="0.8"
                                            />
                                        ))}
                                    </svg>

                                    {playerPositions.map((p, i) => {
                                        const colorStr = p.color || 'white';
                                        const bgClass = colorStr.toLowerCase() === 'blue' ? 'bg-blue-600' :
                                            (colorStr.toLowerCase() === 'yellow' ? 'bg-yellow-500' : 'bg-red-600');

                                        return (
                                            <div key={`p-${i}`} className="absolute flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 shadow-lg"
                                                style={{ left: `${p.leftPerc}%`, top: `${p.topPerc}%` }}>
                                                <div className={`w-8 h-8 rounded-full ${bgClass} border-2 border-white shadow-lg flex items-center justify-center text-[8px] font-bold text-white z-10 tracking-tight`}>{p.position || p.number}</div>
                                                <div className="w-6 h-1 bg-black/40 rounded-full blur-[2px] mt-1 hidden lg:block"></div>
                                            </div>
                                        );
                                    })}

                                    {ballPositions.map((b, i) => (
                                        <div key={`b-${i}`} className="absolute flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 shadow-sm z-30"
                                            style={{ left: `${b.leftPerc}%`, top: `${b.topPerc}%` }}>
                                            <div className="w-3 h-3 rounded-full bg-white border-2 border-gray-300"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface-dark border-t border-surface-border flex flex-col z-30" style={{ height: `${bottomPanelHeight}px`, minHeight: '120px', maxHeight: '500px' }}>
                        {/* Drag Handle */}
                        <div
                            onMouseDown={handlePanelDragStart}
                            className="w-full flex items-center justify-center h-3 cursor-ns-resize group hover:bg-primary/10 transition-colors shrink-0 select-none"
                        >
                            <div className="w-12 h-1 rounded-full bg-slate-600 group-hover:bg-primary transition-colors"></div>
                        </div>

                        {isGenerating && (
                            <div className="px-6 py-3 border-b border-surface-border/50 bg-black/10">
                                <div className="flex items-center gap-3">
                                    <span className="size-2 rounded-full bg-primary animate-pulse"></span>
                                    <span className="text-xs font-medium text-text-subtle">AI Generating Tactical Drill...</span>
                                </div>
                            </div>
                        )}
                        <div className="p-4 flex flex-col items-center bg-surface-dark">
                            <div className="w-full max-w-3xl flex flex-col gap-3 relative">
                                <div className="flex justify-between items-center px-4 w-full">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text-subtle group">
                                        <input type="checkbox" checked={enableAudio} onChange={(e) => setEnableAudio(e.target.checked)} className="size-4 rounded border-surface-border text-primary focus:ring-primary bg-background-dark" />
                                        <span className="group-hover:text-white transition-colors">Generate Narration Voiceover</span>
                                    </label>
                                    <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={!enableAudio} className="bg-background-dark border border-surface-border rounded-lg text-sm font-medium text-text-subtle focus:ring-primary focus:border-primary px-3 py-1.5 outline-none hover:border-text-subtle transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                        <option value="English">Select Language: English</option>
                                        <option value="French">Français (French)</option>
                                        <option value="Spanish">Español (Spanish)</option>
                                        <option value="German">Deutsch (German)</option>
                                        <option value="Arabic">العربية (Arabic)</option>
                                    </select>
                                </div>
                                {activeFiles.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {activeFiles.map((file, idx) => (
                                            <div key={idx} className="flex items-center gap-2 bg-surface-border/30 px-2 py-1 rounded-lg border border-surface-border group">
                                                <span className="text-[10px] text-text-subtle truncate max-w-[100px]">{file.name}</span>
                                                <button onClick={() => removeFile(idx)} className="text-text-subtle hover:text-red-500 transition-colors">
                                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="w-full relative group shadow-lg">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-primary group-focus-within:scale-110 transition-transform">auto_awesome</span>
                                    </div>
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                generateDrill();
                                            }
                                        }}
                                        disabled={isGenerating}
                                        placeholder="Request a zone modification or tactical setup..."
                                        rows={2}
                                        className="block w-full pl-12 pr-24 py-3.5 bg-background-dark border border-surface-border rounded-2xl text-white placeholder-text-subtle focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all sm:text-sm shadow-inner resize-none overflow-auto min-h-[48px] flex-1"

                                        onInput={(e) => {
                                            e.target.style.height = 'auto';
                                            e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                                        }}

                                    />
                                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1.5">
                                        <label className="p-2 cursor-pointer text-text-subtle hover:text-primary transition-colors flex items-center">
                                            <input type="file" className="hidden" accept=".pdf,.docx" onChange={handleFileUpload} />
                                            <span className="material-symbols-outlined text-[20px]">attach_file</span>
                                        </label>
                                        <button
                                            onMouseDown={startRecording}
                                            onMouseUp={stopRecording}
                                            onMouseLeave={stopRecording}
                                            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${isRecording ? 'bg-red-500 scale-110 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-surface-border hover:bg-white hover:text-background-dark text-white'}`}
                                            title="Hold to Record"
                                        >
                                            <span className={`material-symbols-outlined text-[20px] ${isRecording ? 'animate-pulse' : ''}`}>{isRecording ? 'mic' : 'mic_none'}</span>
                                        </button>
                                        <button
                                            onClick={() => setIsBrainstorming(!isBrainstorming)}
                                            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${isBrainstorming ? 'bg-primary text-background-dark' : 'bg-surface-border hover:bg-white hover:text-background-dark text-white'}`}
                                            title="Brainstorm with Tactical Architect"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">psychology</span>
                                        </button>
                                        <button onClick={generateDrill} disabled={isGenerating} className="p-2 bg-primary text-background-dark rounded-xl hover:shadow-[0_0_15px_rgba(43,205,238,0.4)] transition-all cursor-pointer flex items-center justify-center">
                                            <span className={`material-symbols-outlined text-[20px] font-bold ${isGenerating ? 'animate-spin' : ''}`}>{isGenerating ? 'hourglass_empty' : 'arrow_upward'}</span>
                                        </button>
                                    </div>
                                </div>
                                {isRecording && (
                                    <div className="absolute -top-8 left-0 flex items-center gap-2 bg-red-500/20 px-3 py-1 rounded-full border border-red-500/50 backdrop-blur-sm animate-fadeIn">
                                        <span className="size-2 bg-red-500 rounded-full animate-pulse"></span>
                                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Recording...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Brainstorming Sidepanel */}
                <div className={`fixed inset-y-0 right-0 w-80 bg-surface-dark border-l border-surface-border z-40 transition-transform duration-300 transform ${isBrainstorming ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="flex flex-col h-full">
                        <div className="p-4 border-b border-surface-border flex justify-between items-center bg-background-dark/50">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">psychology</span>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tactical Architect</h3>
                            </div>
                            <button onClick={() => setIsBrainstorming(false)} className="text-text-subtle hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-surface-border">
                            {brainstormMessages.length === 0 && (
                                <div className="text-center py-10 px-4">
                                    <span className="material-symbols-outlined text-4xl text-primary/40 mb-3">lightbulb</span>
                                    <p className="text-xs text-text-subtle leading-relaxed">I'm your tactical consultant. Start a voice call or type an idea to refine your session.</p>
                                </div>
                            )}
                            {brainstormMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-primary text-background-dark font-medium' : 'bg-background-dark border border-surface-border text-white shadow-xl'}`}>
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                            {isBrainstormLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-background-dark border border-surface-border p-3 rounded-2xl">
                                        <div className="flex gap-1">
                                            <div className="size-1.5 bg-primary rounded-full animate-bounce"></div>
                                            <div className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-background-dark/50 border-t border-surface-border">
                            <div className="relative">
                                <textarea
                                    value={brainstormInput}
                                    onChange={(e) => setBrainstormInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendBrainstormMessage();
                                        }
                                    }}
                                    placeholder="Type a tactical idea..."
                                    rows={2}
                                    className="w-full bg-background-dark border border-surface-border rounded-xl px-4 py-2.5 text-xs text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all pr-16 resize-y overflow-auto min-h-[40px] max-h-[160px]"
                                    onInput={(e) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                                    }}

                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
                                    <label className="p-1 cursor-pointer text-text-subtle hover:text-primary transition-colors flex items-center">
                                        <input type="file" className="hidden" accept=".pdf,.docx" onChange={handleFileUpload} />
                                        <span className="material-symbols-outlined text-[18px]">attach_file</span>
                                    </label>
                                    <button onClick={sendBrainstormMessage} className="text-primary hover:scale-110 transition-transform flex items-center">
                                        <span className="material-symbols-outlined text-[18px]">send</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <aside className="w-72 border-l border-surface-border bg-surface-dark hidden xl:flex flex-col shrink-0">
                    <div className="p-4 border-b border-surface-border flex justify-between items-center">
                        <h3 className="text-sm font-bold text-white">Zone Properties</h3>
                        <span className="material-symbols-outlined text-text-subtle cursor-pointer hover:text-white">settings</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        <div className="space-y-3">
                            <label className="block text-xs font-medium text-text-subtle uppercase tracking-wider">Active Region</label>
                            <div className="p-3 bg-background-dark border border-primary/20 rounded-lg">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-white">Focus Area</span>
                                </div>
                                <p className="text-[11px] text-text-subtle">{drillMeta?.title || "No drill loaded yet."}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-xs font-medium text-text-subtle uppercase tracking-wider">Parameters</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-background-dark border border-surface-border rounded-lg p-2 flex flex-col gap-1 items-start">
                                    <span className="text-[10px] font-medium text-text-subtle">Intensity</span>
                                    <span className="text-xs font-bold text-primary">{drillMeta?.intensity || "--"}</span>
                                </div>
                                <div className="bg-background-dark border border-surface-border rounded-lg p-2 flex flex-col gap-1 items-start">
                                    <span className="text-[10px] font-medium text-text-subtle">Duration</span>
                                    <span className="text-xs font-bold text-white">{drillMeta?.duration || "--"}</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-surface-border">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[18px]">analytics</span>
                                <label className="block text-xs font-medium text-white uppercase tracking-wider">Session Metrics</label>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-text-subtle">Success Rate</span>
                                    <span className="text-white">64%</span>
                                </div>
                                <div className="w-full bg-surface-border h-1 rounded-full overflow-hidden">
                                    <div className="bg-primary h-full w-[64%]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Toast Notification */}
            <div className={`absolute top-20 right-6 z-50 transition-all duration-300 transform ${toast.show ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95 pointer-events-none'}`}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-surface-dark/95 border-surface-border text-white'}`}>
                    <span className="material-symbols-outlined text-[20px]">
                        {toast.type === 'error' ? 'error' : 'check_circle'}
                    </span>
                    <p className="text-sm font-medium tracking-wide">{toast.message}</p>
                </div>
            </div>

            {/* Floating Audio Status */}
            {currentDrill && (currentDrill.audio_url || currentDrill?.full_json_data?.audio_url) && showNarrationStatus && (
                <div className="fixed bottom-6 right-6 z-50 bg-surface-dark/95 backdrop-blur-md rounded-2xl p-3 border border-surface-border shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex items-center gap-3 transform transition-transform animate-fadeIn group">
                    <div className="size-10 bg-primary/20 rounded-full flex items-center justify-center border border-primary/40 shrink-0">
                        <span className="material-symbols-outlined text-primary text-[20px] animate-pulse">mic</span>
                    </div>
                    <div className="flex flex-col min-w-[150px]">
                        <span className="text-xs font-bold text-white mb-1 tracking-wide">Coach Narration Active</span>
                        <p className="text-[10px] text-text-subtle italic">Syncronized with Pitch</p>
                    </div>
                    <button
                        onClick={() => setShowNarrationStatus(false)}
                        className="absolute -top-2 -right-2 size-6 bg-surface-border text-white rounded-full flex items-center justify-center hover:bg-primary hover:text-background-dark transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                    >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                </div>
            )}

            {/* Audio element is always present to keep ref stable */}
            <audio ref={audioRef} className="hidden" />
        </div>
    );
}
