document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = "http://localhost:8001/api";
    const drillsGrid = document.getElementById('drills-grid');

    async function loadDrills() {
        try {
            const res = await fetch(`${API_BASE}/drills/`);
            if (res.ok) {
                const drills = await res.json();
                renderDrills(drills);
            }
        } catch (err) {
            console.error(err);
        }
    }

    function renderDrills(drills) {
        if (!drillsGrid) return;

        // Remove existing items except the "Add New Card Placeholder" if we want to keep it
        drillsGrid.innerHTML = `
            <!-- Add New Card Placeholder -->
            <div id="create-new-drill" class="group bg-surface-dark/50 rounded-xl overflow-hidden border border-dashed border-slate-700 hover:border-primary/50 hover:bg-surface-dark transition-all cursor-pointer flex flex-col items-center justify-center min-h-[300px]">
                <div class="w-16 h-16 rounded-full bg-slate-800 group-hover:bg-primary/20 flex items-center justify-center transition-colors mb-4">
                    <span class="material-symbols-outlined text-3xl text-slate-400 group-hover:text-primary">add</span>
                </div>
                <h3 class="text-white text-lg font-display font-medium leading-tight mb-2">Create New Drill</h3>
                <p class="text-text-muted text-sm text-center px-8">Start from scratch or use AI generation to build a new tactical setup.</p>
            </div>
        `;

        drills.forEach(drill => {
            const card = document.createElement('div');
            card.className = "group bg-surface-dark rounded-xl overflow-hidden border border-slate-800 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 cursor-pointer flex flex-col";

            // Randomly select one of the neat background images for MVP visually
            const bgs = [
                "https://lh3.googleusercontent.com/aida-public/AB6AXuDy3xr5iHlc7mX9zy6EevmkGIdRfEIWnPHYhKh5Uhio-9gF1CPgp4T-AnJZqCHWnFH0GHEmbU-i5wqx2ksW9IKrl5WDbnF6Z86Lep0Dxsty25CxbdBxR7s1YIegVOKFVB0h-XeZdOAVSjIKUMZHRp48RypJfO2x7wmlyeoS6N0j6DKni5tcMO5_seMKfVzjsrM7Q138aPSyUdU-ecVrLP8SHP6bBaU5fMb0XN6eodSBLN-7cK1mBSYBfU2TnxxmaW1TdeEOOOEzFwA",
                "https://lh3.googleusercontent.com/aida-public/AB6AXuC9fazsLfHnevPJXBofy_nxx0IW8Ca-SZ4rMbMqxUxs3o1nW5iRCva59m_fY8L-MDQFIjpGnOCWxkyXISEUNNXi9HY1O4q2zyBqQk85sGCutZMucVLnT9HjLoTYaRAz-7U9YRn1iAmzcr2hSmG2kSiVm94yGc3KxeOEmgiQv_zJbeVVl6RASGswqY1TnmizrMqGWd4FnSiI8a5fNLOxgWB7xPCesTsQPct8u2mBuyE65uc6zad4D91Xw3Wc2mW0E8IUuBfY7I9yq30",
                "https://lh3.googleusercontent.com/aida-public/AB6AXuCz7fVJA8jmVZ3aEwHV08n-Fpe6d-OZb6r1p84Fvuimpz6fBLlvaxCtoXamP1VEqn2qBGGuHRcs0AOy3mX0Lk9Yv_KKspWdJnWJc7e1VFDyJO7eUM5SLotYKe_lWdWFVNiutT-Gc6sXvPT4R5qnL8pZA0BG724S3CP6IqDNm8IaxxwiLTCvc4g5NQwsiKKSz4szSNHWHirX2WD9jD0oL1hBoKiRSX5Wfv4wp1q2-nidg0n4wuhVMH93QsAvKLpPoDWXnEprvYnWgyw"
            ];
            const bgStr = bgs[drill.id % bgs.length];

            const tagsHtml = (Math.random() > 0.5 ? ["Tactical", "Possession"] : ["Pressing", "Intense"]).map(t =>
                `<span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-medium">${t}</span>`
            ).join('');

            card.innerHTML = `
                <div class="relative aspect-[16/9] w-full overflow-hidden">
                    <div class="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style="background-image: url('${bgStr}');"></div>
                    <div class="absolute inset-0 bg-gradient-to-t from-surface-dark/90 to-transparent opacity-60"></div>
                    <div class="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-mono text-primary border border-primary/20">
                        ${drill.intensity} Intensity
                    </div>
                </div>
                <div class="p-4 flex flex-col gap-2 flex-1">
                    <div class="flex justify-between items-start">
                        <h3 class="text-white text-lg font-display font-medium leading-tight group-hover:text-primary transition-colors">${drill.title}</h3>
                        <button class="text-text-muted hover:text-white"><span class="material-symbols-outlined text-[20px]">more_vert</span></button>
                    </div>
                    <div class="flex flex-wrap gap-2 mt-1">
                        ${tagsHtml}
                    </div>
                    <div class="mt-auto pt-4 flex items-center justify-between border-t border-slate-800/50">
                        <span class="text-text-muted text-xs">Saved Today</span>
                        <div class="flex -space-x-2">
                           <div class="w-6 h-6 rounded-full bg-slate-600 border border-surface-dark bg-cover"></div>
                        </div>
                    </div>
                </div>
            `;

            // Insert before the "Add New" button
            const addBtn = document.getElementById('create-new-drill');
            drillsGrid.insertBefore(card, addBtn);
        });

        document.getElementById('create-new-drill').addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });
    }

    loadDrills();
});
