import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';

const API_BASE = "http://localhost:8001/api";

const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];

const POSITION_COLORS = {
    GK: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    CB: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    LB: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    RB: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    CDM: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    CM: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    CAM: "bg-pink-500/15 text-pink-400 border-pink-500/30",
    LW: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    RW: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    ST: "bg-red-500/15 text-red-400 border-red-500/30",
};

const POSITION_GROUPS = {
    "Goalkeepers": ["GK"],
    "Defenders": ["CB", "LB", "RB"],
    "Midfielders": ["CDM", "CM", "CAM"],
    "Forwards": ["LW", "RW", "ST"],
};

export default function Players() {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [filterPosition, setFilterPosition] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const fileInputRef = useRef(null);
    const [uploadingId, setUploadingId] = useState(null);

    // Form state
    const [formData, setFormData] = useState({ name: "", number: "", position: "CM", nationality: "" });

    useEffect(() => {
        fetchPlayers();
    }, []);

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
    };

    const fetchPlayers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/players/`);
            if (res.ok) {
                const data = await res.json();
                setPlayers(data);
            }
        } catch (err) {
            console.error("Failed to fetch players:", err);
        }
        setLoading(false);
    };

    const handleCreatePlayer = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        try {
            const res = await fetch(`${API_BASE}/players/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    number: parseInt(formData.number) || 0,
                }),
            });
            if (res.ok) {
                showToast("Player added to squad!", "success");
                setShowAddModal(false);
                setFormData({ name: "", number: "", position: "CM", nationality: "" });
                fetchPlayers();
            } else {
                showToast("Failed to add player.", "error");
            }
        } catch (err) {
            showToast("Error adding player.", "error");
        }
    };

    const handleUpdatePlayer = async (e) => {
        e.preventDefault();
        if (!editingPlayer) return;
        try {
            const res = await fetch(`${API_BASE}/players/${editingPlayer.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    number: parseInt(formData.number) || 0,
                    position: formData.position,
                    nationality: formData.nationality,
                }),
            });
            if (res.ok) {
                showToast("Player updated!", "success");
                setEditingPlayer(null);
                setShowAddModal(false);
                setFormData({ name: "", number: "", position: "CM", nationality: "" });
                fetchPlayers();
            } else {
                showToast("Failed to update player.", "error");
            }
        } catch (err) {
            showToast("Error updating player.", "error");
        }
    };

    const handleDeletePlayer = async (e, playerId) => {
        e.stopPropagation();
        if (!window.confirm("Remove this player from your squad?")) return;
        try {
            const res = await fetch(`${API_BASE}/players/${playerId}`, { method: "DELETE" });
            if (res.ok) {
                showToast("Player removed from squad.", "success");
                fetchPlayers();
            }
        } catch (err) {
            showToast("Error removing player.", "error");
        }
    };

    const handlePhotoUpload = async (playerId, file) => {
        if (!file) return;
        setUploadingId(playerId);
        const formData = new FormData();
        formData.append("file", file);
        try {
            const res = await fetch(`${API_BASE}/players/${playerId}/photo`, {
                method: "POST",
                body: formData,
            });
            if (res.ok) {
                showToast("Photo uploaded!", "success");
                fetchPlayers();
            } else {
                showToast("Failed to upload photo.", "error");
            }
        } catch (err) {
            showToast("Error uploading photo.", "error");
        }
        setUploadingId(null);
    };

    const openEditModal = (player) => {
        setEditingPlayer(player);
        setFormData({
            name: player.name,
            number: player.number.toString(),
            position: player.position,
            nationality: player.nationality || "",
        });
        setShowAddModal(true);
    };

    const openAddModal = () => {
        setEditingPlayer(null);
        setFormData({ name: "", number: "", position: "CM", nationality: "" });
        setShowAddModal(true);
    };

    const filteredPlayers = players.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.nationality?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPos = filterPosition === "all" || p.position === filterPosition;
        return matchesSearch && matchesPos;
    });

    const getPlayersByGroup = () => {
        const groups = {};
        for (const [group, positions] of Object.entries(POSITION_GROUPS)) {
            const groupPlayers = filteredPlayers.filter(p => {
                const playerPositions = p.position.split("/").map(s => s.trim());
                return playerPositions.some(pp => positions.includes(pp));
            });
            if (groupPlayers.length > 0) {
                groups[group] = groupPlayers;
            }
        }
        return groups;
    };

    const groupedPlayers = getPlayersByGroup();

    return (
        <div className="flex w-full h-full relative">
            {/* Toast */}
            <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 transform ${toast.show ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95 pointer-events-none'}`}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-surface-dark border-surface-border text-white'}`}>
                    <span className="material-symbols-outlined text-[20px]">
                        {toast.type === 'error' ? 'error' : 'check_circle'}
                    </span>
                    <p className="text-sm font-medium tracking-wide">{toast.message}</p>
                </div>
            </div>

            <Sidebar />

            <main className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark">
                {/* Header */}
                <header className="flex flex-col gap-6 px-8 py-8 shrink-0">
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-white font-display text-4xl font-bold tracking-tight">
                                    Squad Management
                                </h1>
                                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-bold uppercase tracking-wider">
                                    {players.length} Players
                                </span>
                            </div>
                            <p className="text-text-muted mt-2 text-sm">Manage your squad, upload player photos, and organize positions.</p>
                        </div>
                        <button
                            onClick={openAddModal}
                            className="flex items-center gap-2 h-11 px-5 rounded-lg bg-primary hover:bg-primary/90 text-primary-content text-sm font-bold tracking-wide transition-all shadow-lg shadow-primary/20"
                        >
                            <span className="material-symbols-outlined text-[20px]">person_add</span>
                            <span>Add Player</span>
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-4 items-center">
                        <div className="relative flex-1 max-w-md">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]">search</span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search players by name or nationality..."
                                className="w-full h-10 bg-surface-dark border border-slate-700 rounded-lg pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-slate-500 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2 h-10 px-2 rounded-lg bg-surface-dark border border-slate-700 text-sm">
                            <select
                                value={filterPosition}
                                onChange={(e) => setFilterPosition(e.target.value)}
                                className="bg-transparent text-text-muted hover:text-white focus:outline-none cursor-pointer h-full px-2 appearance-none"
                            >
                                <option value="all">All Positions</option>
                                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <span className="material-symbols-outlined text-text-muted pointer-events-none text-[18px] mr-2">expand_more</span>
                        </div>
                    </div>
                </header>

                {/* Players Grid */}
                <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
                        </div>
                    ) : filteredPlayers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
                            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">groups</span>
                            <h3 className="text-lg font-medium text-white mb-2">No players found</h3>
                            <p>Add players to your squad or adjust your filters.</p>
                        </div>
                    ) : (
                        Object.entries(groupedPlayers).map(([group, groupPlayers]) => (
                            <div key={group} className="mb-8">
                                <div className="flex items-center gap-3 mb-4">
                                    <h2 className="text-lg font-bold text-white">{group}</h2>
                                    <div className="flex-1 h-px bg-slate-800"></div>
                                    <span className="text-xs font-bold text-text-muted bg-surface-dark px-2 py-1 rounded">{groupPlayers.length}</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {groupPlayers.map(player => (
                                        <div
                                            key={player.id}
                                            onClick={() => openEditModal(player)}
                                            className="group relative flex flex-col items-center bg-surface-dark border border-slate-800 rounded-2xl p-5 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-pointer overflow-hidden"
                                        >
                                            {/* Hover actions */}
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                <label className="size-7 rounded-lg bg-primary/80 text-white flex items-center justify-center shadow-lg hover:bg-primary transition-colors cursor-pointer backdrop-blur-sm" title="Upload Photo">
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={(e) => handlePhotoUpload(player.id, e.target.files[0])}
                                                    />
                                                    <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                                                </label>
                                                <button
                                                    onClick={(e) => handleDeletePlayer(e, player.id)}
                                                    className="size-7 rounded-lg bg-red-500/80 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors backdrop-blur-sm"
                                                    title="Remove Player"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                                </button>
                                            </div>

                                            {/* Player Number Badge */}
                                            <div className="absolute top-3 left-3 z-10">
                                                <span className="text-3xl font-display font-black text-white/10 leading-none">{player.number}</span>
                                            </div>

                                            {/* Player Photo */}
                                            <div className="relative mb-3">
                                                <div className="size-20 rounded-full overflow-hidden ring-2 ring-slate-700 group-hover:ring-primary/50 transition-all bg-slate-800 flex items-center justify-center">
                                                    {uploadingId === player.id ? (
                                                        <span className="material-symbols-outlined animate-spin text-primary">refresh</span>
                                                    ) : player.photo_url ? (
                                                        <img
                                                            src={player.photo_url.startsWith("http") ? player.photo_url : `http://localhost:8001${player.photo_url}`}
                                                            alt={player.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                        />
                                                    ) : null}
                                                    <div className={`${player.photo_url ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
                                                        <span className="material-symbols-outlined text-3xl text-slate-600">person</span>
                                                    </div>
                                                </div>
                                                {/* Position badge */}
                                                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${POSITION_COLORS[player.position] || "bg-slate-500/15 text-slate-400 border-slate-500/30"}`}>
                                                    {player.position}
                                                </div>
                                            </div>

                                            {/* Player Info */}
                                            <h3 className="text-sm font-bold text-white text-center group-hover:text-primary transition-colors leading-tight mt-1">
                                                {player.name}
                                            </h3>
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <span className="text-[11px] text-text-muted font-medium">#{player.number}</span>
                                                {player.nationality && (
                                                    <>
                                                        <span className="text-slate-700">•</span>
                                                        <span className="text-[11px] text-text-muted">{player.nationality}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Add/Edit Player Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setEditingPlayer(null); }}>
                    <div className="bg-surface-dark border border-surface-border rounded-2xl shadow-2xl w-full max-w-md p-0 overflow-hidden animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-background-dark/50">
                            <div className="flex items-center gap-3">
                                <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                                    <span className="material-symbols-outlined text-primary text-[18px]">{editingPlayer ? 'edit' : 'person_add'}</span>
                                </div>
                                <h2 className="text-white font-bold text-lg">{editingPlayer ? 'Edit Player' : 'Add New Player'}</h2>
                            </div>
                            <button onClick={() => { setShowAddModal(false); setEditingPlayer(null); }} className="text-text-subtle hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={editingPlayer ? handleUpdatePlayer : handleCreatePlayer} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-text-subtle uppercase tracking-wider mb-1.5">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Kevin De Bruyne"
                                        className="w-full bg-background-dark border border-surface-border rounded-lg px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-text-muted"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-text-subtle uppercase tracking-wider mb-1.5">Number</label>
                                    <input
                                        type="number"
                                        value={formData.number}
                                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                                        placeholder="17"
                                        min="1" max="99"
                                        className="w-full bg-background-dark border border-surface-border rounded-lg px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-text-muted"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-text-subtle uppercase tracking-wider mb-1.5">Position</label>
                                    <select
                                        value={formData.position}
                                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                        className="w-full bg-background-dark border border-surface-border rounded-lg px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
                                    >
                                        {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-text-subtle uppercase tracking-wider mb-1.5">Nationality</label>
                                    <input
                                        type="text"
                                        value={formData.nationality}
                                        onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                                        placeholder="e.g. Belgium"
                                        className="w-full bg-background-dark border border-surface-border rounded-lg px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-text-muted"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => { setShowAddModal(false); setEditingPlayer(null); }} className="flex-1 h-11 rounded-lg bg-surface-border text-white text-sm font-medium hover:bg-slate-600 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 h-11 rounded-lg bg-primary text-primary-content text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                                    {editingPlayer ? 'Save Changes' : 'Add to Squad'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
