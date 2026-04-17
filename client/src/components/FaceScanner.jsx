import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Scan, Upload, Loader, User, Search, X, AlertCircle } from 'lucide-react';
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
            setError(err.response?.data?.error || "Fehler beim Gesichtsscan");
            console.error(err);
        } finally {
            setIsScanning(false);
        }
    };

    const handleFeedback = async (e, personId, isCorrect) => {
        e.stopPropagation(); // Don't navigate to person detail
        if (!queryEmbedding) return;

        try {
            await submitFeedback(personId, queryEmbedding, isCorrect);
            setFeedbackSent(prev => ({ ...prev, [personId]: true }));
            if (isCorrect) {
                 toast.success('Gesicht verifiziert - System lernt...');
            } else {
                 toast('Feedback erhalten', { icon: 'ℹ️' });
            }
        } catch (err) {
            console.error("Feedback error:", err);
            toast.error("Feedback konnte nicht gesendet werden");
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
        <div className="bg-[#121214] border border-blue-500/20 rounded-3xl p-4 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-20 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
                            <Scan size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tighter">Biometrischer Scan</h2>
                            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Gesichtserkennung & Ähnlichkeitsabgleich</p>
                        </div>
                    </div>
                    {file && (
                        <button onClick={reset} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {!file ? (
                    <div
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
                        className="border-2 border-dashed border-white/10 rounded-3xl p-6 md:p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-blue-500/30 hover:bg-blue-500/[0.02] transition-all group"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-all pointer-events-none">
                            <Upload size={32} />
                        </div>
                        <div className="text-center pointer-events-none">
                            <p className="font-bold uppercase text-sm mb-1 text-gray-400 group-hover:text-white transition-colors">Datei auswählen oder Drag & Drop</p>
                            <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">PNG, JPG, WEBP (MAX. 10MB)</p>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Preview Area */}
                        <div className="space-y-4">
                            <div className="relative aspect-square rounded-3xl overflow-hidden border border-white/10 bg-black/40">
                                <img src={preview} alt="Scan Preview" className="w-full h-full object-cover" />
                                {isScanning && (
                                    <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-[2px] flex items-center justify-center overflow-hidden">
                                        <div className="w-full h-1 bg-blue-500 absolute top-0 shadow-[0_0_15px_rgba(59,130,246,1)] animate-scan-line" />
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader className="animate-spin text-white" size={32} />
                                            <span className="text-[10px] font-mono text-white uppercase tracking-[0.3em] font-bold">Analysiere Gesichtszüge...</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!results && !isScanning && (
                                <button
                                    onClick={handleScan}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-2xl py-4 font-black uppercase text-xs tracking-[0.2em] transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                                >
                                    <Search size={18} />
                                    Scan Starten
                                </button>
                            )}
                        </div>

                        {/* Results Area */}
                        <div className="space-y-4 min-h-[300px]">
                            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                                <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                                Analyse-Ergebnisse
                            </div>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {isScanning ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-600">
                                        <div className="space-y-2 w-full">
                                            <div className="h-16 w-full bg-white/5 animate-pulse rounded-2xl" />
                                            <div className="h-16 w-full bg-white/5 animate-pulse rounded-2xl" />
                                            <div className="h-16 w-full bg-white/5 animate-pulse rounded-2xl" />
                                        </div>
                                    </div>
                                ) : results ? (
                                    <>
                                        {/* Main Identifier Box */}
                                        {queryMetadata && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 mb-4"
                                            >
                                                <div className="text-[9px] font-mono text-blue-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                                                    <span>Identifizierte Merkmale</span>
                                                    <span className="bg-blue-500/20 px-1.5 py-0.5 rounded text-[8px]">Scan-Analyse</span>
                                                </div>
                                                <div className="flex gap-4 items-center">
                                                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-blue-500/20 bg-black/40 relative">
                                                        <img 
                                                            src={preview} 
                                                            alt="Detected Face"
                                                            className="w-full h-full object-cover" 
                                                            style={{
                                                                objectPosition: getFacePosition(queryMetadata)
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 flex-1">
                                                        <div>
                                                            <div className="text-[8px] font-mono text-gray-500 uppercase">Alter (Est.)</div>
                                                            <div className="text-sm font-black text-white">{queryMetadata.age || '??'} <span className="text-[9px] font-normal text-gray-500">J.</span></div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[8px] font-mono text-gray-500 uppercase">Geschlecht</div>
                                                            <div className="text-sm font-black text-white uppercase">{queryMetadata.gender || '??'}</div>
                                                        </div>
                                                    </div>
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
