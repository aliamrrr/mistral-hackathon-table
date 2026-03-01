import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function Library() {
    const navigate = useNavigate();
    const [drills, setDrills] = useState([]);
    const [collections, setCollections] = useState([]);
    const [currentCollection, setCurrentCollection] = useState(null); // null means All Drills
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterIntensity, setFilterIntensity] = useState("all");
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"


    const API_BASE = "http://localhost:8001/api";

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        await Promise.all([fetchDrills(), fetchCollections()]);
        setLoading(false);
    };

    const fetchCollections = async () => {
        try {
            const res = await fetch(`${API_BASE}/collections/`);
            if (res.ok) {
                const data = await res.json();
                setCollections(data);
            }
        } catch (err) {
            console.error("Failed to fetch collections:", err);
        }
    };

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
    };

    const fetchDrills = async () => {
        try {
            const res = await fetch(`${API_BASE}/drills/`);
            if (res.ok) {
                const data = await res.json();
                setDrills(data);
            }
        } catch (err) {
            console.error("Failed to fetch drills:", err);
        }
    };

    const getIntensityColor = (intensity) => {
        const raw = intensity ? intensity.toLowerCase() : "";
        if (raw.includes("high")) return "bg-red-500/10 text-red-500 border-red-500/20";
        if (raw.includes("medium")) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
        return "bg-green-500/10 text-green-500 border-green-500/20";
    };

    const filteredDrills = drills.filter(drill => {
        const matchesSearch = drill.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            drill.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesFilter = filterIntensity === "all" ||
            (drill.intensity && drill.intensity.toLowerCase().includes(filterIntensity.toLowerCase()));

        const matchesCollection = !currentCollection || currentCollection.drill_ids.includes(drill.id);

        return matchesSearch && matchesFilter && matchesCollection;
    });

    const handleDeleteDrill = async (e, drillId) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this drill permanently?")) return;

        try {
            const res = await fetch(`${API_BASE}/drills/${drillId}`, { method: 'DELETE' });
            if (res.ok) {
                showToast("Drill deleted seamlessly.", "success");
                fetchAllData(); // refresh
            } else {
                showToast("Failed to delete drill.", "error");
            }
        } catch (err) {
            showToast("Network error deleting drill.", "error");
        }
    };

    const handleDeleteCollection = async () => {
        if (!currentCollection) return;
        if (!window.confirm(`Are you sure you want to delete the collection "${currentCollection.name}"? The drills inside will NOT be deleted.`)) return;

        try {
            const res = await fetch(`${API_BASE}/collections/${currentCollection.id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast("Collection removed.", "success");
                setCurrentCollection(null);
                fetchAllData(); // refresh
            } else {
                showToast("Failed to delete collection.", "error");
            }
        } catch (err) {
            showToast("Network error deleting collection.", "error");
        }
    };

    const [newColName, setNewColName] = useState("");
    const handleCreateCollection = async (e) => {
        e.preventDefault();
        if (!newColName.trim()) return;

        try {
            const res = await fetch(`${API_BASE}/collections/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newColName.trim(), description: "Custom collection" })
            });
            if (res.ok) {
                showToast("Collection created!", "success");
                setNewColName("");
                fetchAllData(); // refresh
            }
        } catch (err) {
            showToast("Error creating collection.", "error");
        }
    };

    const handleAddDrillToCollection = async (e, drillId, collectionId) => {
        e.stopPropagation();
        try {
            const res = await fetch(`${API_BASE}/collections/${collectionId}/drills/${drillId}`, { method: 'POST' });
            if (res.ok) {
                showToast("Added to collection.", "success");
                fetchAllData(); // refresh
            }
        } catch (err) {
            showToast("Error adding drill to collection.", "error");
        }
    };

    return (
        <div className="flex w-full h-full relative">

            {/* Toast Notification */}
            <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 transform ${toast.show ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95 pointer-events-none'}`}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-surface-dark border-surface-border text-white'}`}>
                    <span className="material-symbols-outlined text-[20px]">
                        {toast.type === 'error' ? 'error' : 'check_circle'}
                    </span>
                    <p className="text-sm font-medium tracking-wide">{toast.message}</p>
                </div>
            </div>

            <Sidebar />

            {/* Collections Sidebar Panel */}
            <aside className="w-64 flex flex-col border-r border-surface-border bg-surface-dark overflow-y-auto shrink-0 z-20">
                <div className="p-6 border-b border-surface-border">
                    <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-4">Library Views</h3>
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => setCurrentCollection(null)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group border ${currentCollection === null ? 'bg-primary/10 text-primary border-primary/20' : 'text-text-muted hover:bg-surface-border border-transparent'}`}>
                            <span className={`material-symbols-outlined transition-colors ${currentCollection === null ? 'text-primary' : 'text-text-subtle group-hover:text-white'}`}>grid_view</span>
                            <span className="text-sm font-bold">All Drills</span>
                        </button>
                    </div>
                </div>

                <div className="p-6 flex-1">
                    <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-4">My Collections</h3>
                    <div className="flex flex-col gap-2 mb-6">
                        {collections.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setCurrentCollection(c)}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors group border ${currentCollection?.id === c.id ? 'bg-primary/10 text-primary border-primary/20' : 'text-text-muted hover:bg-surface-border border-transparent'}`}>
                                <div className="flex items-center gap-3 truncate">
                                    <span className={`material-symbols-outlined text-[18px] transition-colors ${currentCollection?.id === c.id ? 'text-primary' : 'text-text-subtle group-hover:text-white'}`}>folder</span>
                                    <span className="text-sm font-medium truncate">{c.name}</span>
                                </div>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${currentCollection?.id === c.id ? 'bg-primary/20 text-primary' : 'bg-background-dark text-text-subtle'}`}>{c.drill_ids.length}</span>
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleCreateCollection} className="mt-auto">
                        <div className="relative">
                            <input
                                type="text"
                                value={newColName}
                                onChange={e => setNewColName(e.target.value)}
                                placeholder="New collection..."
                                className="w-full bg-background-dark border border-surface-border rounded-lg pl-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors placeholder:text-text-muted"
                            />
                            <button type="submit" disabled={!newColName.trim()} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-primary hover:text-white disabled:opacity-50 transition-colors">
                                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                            </button>
                        </div>
                    </form>
                </div>
            </aside>

            <main className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark z-10">
                <header className="flex flex-col gap-6 px-8 py-8 shrink-0">
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-white font-display text-4xl font-bold tracking-tight">
                                    {currentCollection ? currentCollection.name : "Drill Library"}
                                </h1>
                                {currentCollection && (
                                    <span className="px-2.5 py-1 rounded bg-primary/20 text-primary border border-primary/30 text-xs font-bold uppercase tracking-wider ml-2">
                                        Collection
                                    </span>
                                )}
                            </div>
                            <p className="text-text-muted mt-2 text-sm">
                                {currentCollection
                                    ? `Viewing ${currentCollection.drill_ids.length} drills systematically grouped.`
                                    : "Manage and organize your tactical exercises and set pieces."}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            {currentCollection && (
                                <button onClick={handleDeleteCollection} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors text-sm font-medium">
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                    <span>Delete Collection</span>
                                </button>
                            )}
                            <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:text-white hover:bg-surface-dark'}`}>
                                <span className="material-symbols-outlined">grid_view</span>
                            </button>
                            <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:text-white hover:bg-surface-dark'}`}>
                                <span className="material-symbols-outlined">list</span>
                            </button>

                        </div>
                    </div>

                    <div className="flex gap-4 items-center">
                        <div className="relative flex-1 max-w-md">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]">search</span>
                            <input type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search drills, tags, or formations..."
                                className="w-full h-10 bg-surface-dark border border-slate-700 rounded-lg pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-slate-500 transition-all" />
                        </div>
                        <div className="flex items-center gap-1 h-10 rounded-lg bg-surface-dark border border-slate-700 text-sm overflow-hidden">
                            <span className="material-symbols-outlined text-text-muted text-[18px] pl-3">filter_list</span>
                            <select
                                value={filterIntensity}
                                onChange={(e) => setFilterIntensity(e.target.value)}
                                className="bg-transparent text-text-muted hover:text-white focus:outline-none focus:ring-0 cursor-pointer h-full px-2 pr-8 appearance-none text-sm font-medium">
                                <option value="all">All Intensities</option>
                                <option value="high">High Intensity</option>
                                <option value="medium">Medium Intensity</option>
                                <option value="low">Low Intensity</option>
                            </select>
                            <span className="material-symbols-outlined text-text-muted pointer-events-none text-[18px] -ml-6 mr-2">expand_more</span>
                        </div>

                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar relative z-10">
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "flex flex-col gap-3"}>

                        {loading ? (
                            <div className="col-span-full flex justify-center py-12">
                                <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
                            </div>
                        ) : filteredDrills.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-text-muted">
                                <span className="material-symbols-outlined text-6xl mb-4 opacity-50">search_off</span>
                                <h3 className="text-lg font-medium text-white mb-2">No matching drills found</h3>
                                <p>Try adjusting your search or intensity filters.</p>
                            </div>
                        ) : (
                            filteredDrills.map((drill) => {
                                const date = new Date(drill.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                return (
                                    <div key={drill.id}
                                        onClick={async () => {
                                            try {
                                                const res = await fetch(`${API_BASE}/drills/${drill.id}`);
                                                if (res.ok) {
                                                    const fullDrill = await res.json();
                                                    navigate('/dashboard', { state: { loadDrill: fullDrill } });
                                                } else {
                                                    showToast("Failed to load drill data.", "error");
                                                }
                                            } catch (err) {
                                                console.error("Error fetching full drill:", err);
                                                showToast("Error loading drill.", "error");
                                            }
                                        }}
                                        className="group relative flex flex-col bg-surface-dark border border-slate-800 rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-pointer">
                                        <div className="aspect-video bg-slate-800 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-cover bg-center brightness-75 group-hover:scale-105 transition-transform duration-700"
                                                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1543351611-58f69d7c1781?q=80&w=600&auto=format&fit=crop')" }}>
                                            </div>
                                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-surface-dark to-transparent"></div>

                                            <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                <button onClick={(e) => handleDeleteDrill(e, drill.id)} className="size-8 rounded bg-red-500/90 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors backdrop-blur-sm" title="Delete Drill">
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>

                                            <div className="absolute bottom-3 right-3 flex gap-1.5 z-20">
                                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md ${getIntensityColor(drill.intensity)}`}>
                                                    {drill.intensity || "Medium"}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-5 flex flex-col flex-1 relative z-10">
                                            <div className="-mt-10 mb-3 flex items-center justify-between">
                                                <div className="size-10 rounded-full bg-surface-dark border-2 border-slate-800 flex items-center justify-center text-primary shadow-lg">
                                                    <span className="material-symbols-outlined text-[20px]">strategy</span>
                                                </div>

                                                <div className="relative group/menu">
                                                    <button className="text-text-muted hover:text-white transition-colors" onClick={(e) => e.stopPropagation()}>
                                                        <span className="material-symbols-outlined text-[20px]">library_add</span>
                                                    </button>
                                                    <div className="absolute right-0 top-full mt-1 w-48 bg-surface-dark border border-surface-border rounded-lg shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-50 overflow-hidden">
                                                        <div className="px-3 py-2 border-b border-surface-border bg-black/20">
                                                            <span className="text-[10px] uppercase font-bold text-text-subtle tracking-wider">Add to Collection</span>
                                                        </div>
                                                        <div className="max-h-48 overflow-y-auto">
                                                            {collections.length === 0 ? (
                                                                <div className="px-3 py-4 text-center text-xs text-text-muted">No collections created.</div>
                                                            ) : collections.map(c => {
                                                                const inCollection = c.drill_ids.includes(drill.id);
                                                                return (
                                                                    <button
                                                                        key={c.id}
                                                                        disabled={inCollection}
                                                                        onClick={(e) => handleAddDrillToCollection(e, drill.id, c.id)}
                                                                        className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${inCollection ? 'text-primary bg-primary/5 cursor-default' : 'text-white hover:bg-surface-border'}`}>
                                                                        <span className="truncate">{c.name}</span>
                                                                        {inCollection && <span className="material-symbols-outlined text-[14px]">check</span>}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <h3 className="text-white font-display text-lg font-bold leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-1">{drill.title}</h3>
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {drill.tags && drill.tags.map((tag, idx) => (
                                                    <span key={idx} className="block px-2 py-0.5 rounded bg-slate-800/50 text-text-muted text-xs font-medium border border-slate-700/50">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="mt-auto flex items-center justify-between border-t border-slate-800/50 pt-4">
                                                <div className="flex items-center gap-1.5 text-text-muted">
                                                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                                                    <span className="text-xs font-medium">{drill.duration || "10 mins"}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-text-muted">
                                                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                                                    <span className="text-xs font-medium">{date}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
