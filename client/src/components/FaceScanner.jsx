import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Scan, Upload, Loader2, User, Search, X, AlertCircle, Fingerprint, ShieldCheck } from 'lucide-react';
import { searchByFace, submitFeedback } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const FaceScanner = () => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [results, setResults] = useState(null);
    const [queryEmbedding, setQueryEmbedding] = useState(null);
    const [queryMetadata, setQueryMetadata] = useState(null);
    const [feedbackSent, setFeedbackSent] = useState({}); // { personId: true }
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const getFacePosition = (meta) => {
        if (!meta || !meta.bbox || !meta.width || !meta.height) return 'center';
        const [x1, y1, x2, y2] = meta.bbox;
        const centerX = ((x1 + x2) / 2 / meta.width) * 100;
        const centerY = ((y1 + y2) / 2 / meta.height) * 100;
        return `${centerX}% ${centerY}%`;
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
            setResults(null);
            setQueryMetadata(null);
            setError(null);
        }
    };

    const handleScan = async () => {
        if (!file) return;
        setIsScanning(true);
        setError(null);
        setFeedbackSent({});
        try {
            const response = await searchByFace(file);
            setResults(response.matches || []);
            setQueryEmbedding(response.queryEmbedding || null);
            setQueryMetadata(response.queryMetadata || null);
        } catch (err) {
            setError(err.response?.data?.error || "Biometrischer Scan fehlgeschlagen");
            console.error(err);
        } finally {
            setIsScanning(false);
        }
    };

    const handleFeedback = async (e, personId, isCorrect) => {
        e.stopPropagation();
        if (!queryEmbedding) return;

        try {
            await submitFeedback(personId, queryEmbedding, isCorrect);
            setFeedbackSent(prev => ({ ...prev, [personId]: true }));
            if (isCorrect) {
                 toast.success('Biometrische Verifizierung erfolgreich');
            } else {
                 toast('Feedback erfasst', { icon: 'ℹ️' });
            }
        } catch (err) {
            console.error("Feedback error:", err);
            toast.error("Feedback-Übertragung fehlgeschlagen");
        }
    };

    const reset = () => {
        setFile(null);
        setPreview(null);
        setResults(null);
        setQueryMetadata(null);
        setError(null);
    };

    return (
        <div className="glass-panel p-6 md:p-10 relative overflow-hidden">
            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 space-y-10">
                {/* Header Area */}
                <div className="flex items-center justify-between border-b border-white/5 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                            <Scan size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter font-outfit text-white">Biometrischer Scan</h2>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] font-bold">Neural ID Verification System v4.0</p>
                            </div>
                        </div>
                    </div>
                    {file && (
                        <button 
                            onClick={reset} 
                            className="p-3 hover:bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all border border-transparent hover:border-white/10 group"
                        >
                            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    )}
                </div>

                {!file ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => fileInputRef.current.click()}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                const dropFile = e.dataTransfer.files[0];
                                setFile(dropFile);
                                setPreview(URL.createObjectURL(dropFile));
                                setResults(null);
                                setError(null);
                            }
                        }}
                        className="border-2 border-dashed border-white/5 rounded-[2.5rem] p-12 md:p-24 flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-blue-500/30 hover:bg-blue-500/[0.02] transition-all group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-blue-400 group-hover:bg-blue-500/10 group-hover:scale-110 transition-all border border-white/5 group-hover:border-blue-500/30 z-10">
                            <Upload size={48} />
                        </div>
                        
                        <div className="text-center z-10">
                            <p className="font-black uppercase text-lg mb-2 text-slate-400 group-hover:text-white transition-colors tracking-tight font-outfit">Visual Data Upload</p>
                            <p className="text-[10px] font-mono text-slate-600 uppercase tracking-[0.2em]">Drag & Drop biometrische Quelldatei</p>
                        </div>

                        <div className="mt-4 px-6 py-2 bg-white/5 rounded-full border border-white/5 text-[9px] font-mono text-slate-500 uppercase tracking-widest z-10">
                            Format Support: PNG, JPG, WEBP • Max 10MB
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Preview & Control Area */}
                        <div className="space-y-6">
                            <div className="relative aspect-square rounded-[2rem] overflow-hidden border border-white/10 bg-black/40 shadow-2xl group">
                                <img src={preview} alt="Scan Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                
                                {/* Scanning Overlay */}
                                <AnimatePresence>
                                    {isScanning && (
                                        <motion.div 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 bg-blue-500/10 backdrop-blur-[2px] flex items-center justify-center overflow-hidden"
                                        >
                                            <div className="w-full h-1 bg-blue-500 absolute top-0 shadow-[0_0_30px_rgba(59,130,246,1)] animate-scan-line z-20" />
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1),transparent)] animate-pulse" />
                                            
                                            <div className="flex flex-col items-center gap-4 z-30">
                                                <div className="p-4 bg-black/40 rounded-full border border-white/20 backdrop-blur-md">
                                                    <Loader2 className="animate-spin text-blue-400" size={40} />
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.4em]">Extraction Sequence</span>
                                                    <p className="text-[9px] font-mono text-blue-400/80 uppercase mt-1">Analysiere Feature-Vektoren...</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Frame Accents */}
                                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-blue-500/50 rounded-tl-lg" />
                                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-blue-500/50 rounded-tr-lg" />
                                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-blue-500/50 rounded-bl-lg" />
                                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-blue-500/50 rounded-br-lg" />
                            </div>

                            {!results && !isScanning && (
                                <button
                                    onClick={handleScan}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-2xl py-5 font-black uppercase text-xs tracking-[0.2em] transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 border border-blue-400/30 group"
                                >
                                    <Fingerprint size={20} className="group-hover:scale-110 transition-transform" />
                                    Biometrischen Scan Starten
                                </button>
                            )}

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400">
                                    <AlertCircle size={20} />
                                    <span className="text-xs font-mono uppercase tracking-tight font-bold">{error}</span>
                                </div>
                            )}
                        </div>

                        {/* Analysis Results */}
                        <div className="flex flex-col h-full min-h-[400px]">
                            <div className="flex items-center justify-between mb-6">
                                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3 font-bold">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,1)]" />
                                    Analyse-Protokoll
                                </div>
                                {results && (
                                    <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                                        {results.length} Matches gefunden
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 space-y-4 overflow-y-auto pr-4 custom-scrollbar max-h-[500px]">
                                {isScanning ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-20 w-full glass-card animate-pulse rounded-2xl" />
                                        ))}
                                    </div>
                                ) : results ? (
                                    <AnimatePresence mode="popLayout">
                                        {results.length === 0 ? (
                                            <motion.div 
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="flex flex-col items-center justify-center py-12 text-slate-600 glass-card rounded-[2rem] border-dashed"
                                            >
                                                </div>
                                            </motion.div>
                                        )}

                                        {results.length > 0 ? (
                                            results.map((result, idx) => {
                                                // Calculate a more user-friendly match percentage
                                                // InsightFace cosine distance: 0 = perfect, 0.4 = strong, 0.6 = possible
                                                const matchPercent = Math.max(0, Math.min(100, (1 - result.distance) * 100)).toFixed(1);
                                                const isStrongMatch = result.distance < 0.5;
                                                const isPotentialMatch = result.distance >= 0.5 && result.distance < 0.65;
                                                
                                                const personPhotoUrl = result.person.photo_url 
                                                    ? (result.person.photo_url.startsWith('http') ? result.person.photo_url : `${window.location.origin}${result.person.photo_url.startsWith('/') ? '' : '/'}${result.person.photo_url}`)
                                                    : null;
                                                
                                                return (
                                                    <motion.div
                                                        key={result.person.id}
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                        onClick={() => navigate(`/person/${result.person.id}`, { state: { activeTab: 'facescan' } })}
                                                        className={`bg-white/5 border border-white/10 hover:border-blue-500/40 rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all group/result ${isStrongMatch ? 'ring-1 ring-green-500/10' : ''}`}
                                                    >
                                                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                                                            {personPhotoUrl ? (
                                                                <img
                                                                    src={personPhotoUrl}
                                                                    alt={result.person.name}
                                                                    className="w-full h-full object-cover"
                                                                    style={{
                                                                        objectPosition: getFacePosition(result.person.ai_metadata)
                                                                    }}
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src = '/placeholder-face.png';
                                                                    }}
                                                                />
                                                        ) : (
                                                            <div className="w-full h-full bg-white/5 flex items-center justify-center text-gray-700">
                                                                <User size={20} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                    <h4 className="font-bold text-sm text-white truncate group-hover/result:text-blue-400 transition-colors uppercase">{result.person.name}</h4>
                                                                    {idx === 0 && isStrongMatch && <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[9px] rounded font-mono border border-green-500/30 flex-shrink-0 uppercase">Best Match</span>}
                                                                    {isPotentialMatch && <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500/70 text-[9px] rounded font-mono border border-yellow-500/20 flex-shrink-0 uppercase">Möglich</span>}
                                                                    {result.verified && <span className="px-1.5 py-0.5 bg-green-500/15 text-green-500 text-[9px] rounded font-mono flex-shrink-0 uppercase">✓ Verifiziert</span>}
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                                                        <div
                                                                            className={`h-full transition-all duration-1000 ${isStrongMatch ? 'bg-green-500' : 'bg-yellow-500/50'}`}
                                                                            style={{ width: `${matchPercent}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className={`text-[9px] font-mono font-bold ${isStrongMatch ? 'text-green-500' : 'text-yellow-500/70'}`}>{matchPercent}%</span>
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Feedback Buttons */}
                                                            <div className="flex items-center gap-1">
                                                                {feedbackSent[result.person.id] ? (
                                                                    <div className="text-[8px] font-mono text-green-500 bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/20">
                                                                        GESPEICHERT
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <button 
                                                                            onClick={(e) => handleFeedback(e, result.person.id, true)}
                                                                            className="p-2 hover:bg-green-500/20 text-gray-500 hover:text-green-400 rounded-lg transition-all"
                                                                            title="Richtig"
                                                                        >
                                                                            <CheckCircle2 size={18} />
                                                                        </button>
                                                                        <button 
                                                                            onClick={(e) => handleFeedback(e, result.person.id, false)}
                                                                            className="p-2 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded-lg transition-all"
                                                                            title="Falsch"
                                                                        >
                                                                            <XCircle size={18} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })
                                    ) : (
                                            <div className="flex flex-col items-center justify-center h-full py-12 text-center text-gray-600 gap-4">
                                                <Search size={40} className="opacity-20" />
                                                <p className="text-xs font-mono uppercase tracking-widest">Keine Übereinstimmung gefunden</p>
                                            </div>
                                        )}
                                    </>
                                ) : error ? (
                                    <div className="flex flex-col items-center justify-center h-full py-12 text-center text-red-500 gap-4 bg-red-500/5 rounded-3xl border border-red-500/10">
                                        <AlertCircle size={40} className="opacity-50" />
                                        <p className="text-xs font-mono uppercase tracking-widest">{error}</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full py-12 text-center text-gray-700 gap-4">
                                        <div className="w-12 h-12 rounded-2xl border-2 border-white/5 flex items-center justify-center opacity-20">
                                            <Search size={24} />
                                        </div>
                                        <p className="text-[10px] font-mono uppercase tracking-widest">Warte auf Identifikations-Prozess...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scan-line {
                    0% { top: 0; }
                    100% { top: 100%; }
                }
                .animate-scan-line {
                    animation: scan-line 3s linear infinite;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(59, 130, 246, 0.2);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(59, 130, 246, 0.4);
                }
            `}} />
        </div>
    );
};

export default FaceScanner;
