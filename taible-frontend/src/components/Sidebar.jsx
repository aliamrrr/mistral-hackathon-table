import { NavLink } from 'react-router-dom';

export default function Sidebar() {
    return (
        <aside className="w-64 flex-shrink-0 flex flex-col justify-between bg-surface-dark border-r border-slate-800 h-full hidden lg:flex">
            <div className="flex flex-col gap-4 p-4">
                {/* App Header */}
                <div className="flex gap-3 items-center mb-6">
                    <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 ring-2 ring-primary/20"
                        style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBQrR_KvrmfGNgZ1E5TQIfFpDsiz66LJkOqNwMdSdPq7ArINXQdyyLebhNJlGqV0tu57YhKFngEVCvEb7818xJxtqliS_vrho8WQdV5t7_qV2ex5yxImapuBKb8YVfZ2fGT6TS3bPnACOf0QEYfbRopacQ2ZNwrdzgBjCta_ffxmf2DmHM_uePgCJ8j0q2fUM3k_nP44DjYHGsAOnxuf70-6f5XGDLNtRLR8eaYgUsMGe2UzHXdWt7LxNEGiTkjsZHD8rSsauw7WBA")' }}>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-white text-lg font-display font-bold leading-tight">Taible</h1>
                        <p className="text-text-muted text-xs font-normal">Premium Tactics</p>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="flex flex-col gap-1">
                    <NavLink to="/dashboard" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${isActive ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-slate-800 hover:text-white'}`}>
                        {({ isActive }) => (
                            <>
                                <span className={`material-symbols-outlined ${isActive ? 'fill-1' : 'group-hover:text-primary transition-colors'}`}>dashboard</span>
                                <p className="text-sm font-medium">Dashboard</p>
                            </>
                        )}
                    </NavLink>

                    <NavLink to="/library" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${isActive ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-slate-800 hover:text-white'}`}>
                        {({ isActive }) => (
                            <>
                                <span className={`material-symbols-outlined ${isActive ? 'fill-1' : 'group-hover:text-primary transition-colors'}`}>book_2</span>
                                <p className="text-sm font-medium">Drills</p>
                            </>
                        )}
                    </NavLink>

                    <NavLink to="/players" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${isActive ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-slate-800 hover:text-white'}`}>
                        {({ isActive }) => (
                            <>
                                <span className={`material-symbols-outlined ${isActive ? 'fill-1' : 'group-hover:text-primary transition-colors'}`}>groups</span>
                                <p className="text-sm font-medium">Squad</p>
                            </>
                        )}
                    </NavLink>
                </nav>
            </div>

            <div className="flex flex-col gap-4">
                {/* Branding Section */}
                <div className="px-4 py-2 flex flex-col gap-3">
                    <div className="flex flex-col gap-1 opacity-80 hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-2">
                            <img src="/assets/mistral_logo.png" alt="Mistral AI" className="h-4 w-auto" />
                            <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Mistral AI Worldwide Hackathon</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                        <span className="text-[9px] font-medium text-text-muted uppercase tracking-wider">Voice by</span>
                        <img src="/assets/elevenlabs_logo.png" alt="ElevenLabs" className="h-3 w-auto" />
                    </div>
                </div>

                {/* Sidebar Footer Action */}
                <div className="p-4 border-t border-slate-800">
                    <NavLink to="/dashboard" className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg h-11 px-4 bg-primary hover:bg-primary/90 text-primary-content text-sm font-bold tracking-wide transition-all shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        <span>New Drill</span>
                    </NavLink>
                </div>
            </div>
        </aside>
    );
}
