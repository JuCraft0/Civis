import React from 'react';
import { motion } from 'framer-motion';
import { User, Calendar, Users, Info, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useState, useEffect } from 'react';

const AuthenticatedImage = ({ src, alt, className, style = {} }) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const loadImage = async () => {
            try {
                const token = sessionStorage.getItem('token');
                if (!token) return;
                const response = await axios.get(src, {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob'
                });
                if (isMounted) {
                    const url = URL.createObjectURL(response.data);
                    setImageSrc(url);
                }
            } catch (error) {
                console.error("Failed to load authenticated image", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (src) loadImage();
        return () => {
            isMounted = false;
            if (imageSrc) URL.revokeObjectURL(imageSrc);
        };
    }, [src]);

    if (loading) return <div className={`${className} bg-white/5 animate-pulse`} />;
    if (!imageSrc) return <div className={`${className} bg-white/5 flex items-center justify-center`}><ImageIcon size={24} /></div>;

    return <img src={imageSrc} alt={alt} className={className} style={style} />;
};

const PersonCard = ({ person }) => {
    const navigate = useNavigate();

    const getFacePosition = (aiMetadata) => {
        if (!aiMetadata) return 'center';
        try {
            const meta = typeof aiMetadata === 'string' ? JSON.parse(aiMetadata) : aiMetadata;
            if (meta.bbox && meta.width && meta.height) {
                const [x1, y1, x2, y2] = meta.bbox;
                const centerX = ((x1 + x2) / 2 / meta.width) * 100;
                const centerY = ((y1 + y2) / 2 / meta.height) * 100;
                return `${centerX}% ${centerY}%`;
            }
        } catch (e) {
            return 'center';
        }
        return 'center';
    };

    const faceStyle = {
        objectPosition: getFacePosition(person.ai_metadata)
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -8, transition: { duration: 0.4 } }}
            whileTap={{ scale: 0.98 }}
            className="group glass-card rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden cursor-pointer border-white/5 hover:border-blue-500/30"
            onClick={() => navigate(`/person/${person.id}`, { state: { activeTab: 'people' } })}
        >
            {/* Background Neural Network Pattern (Simulated) */}
            <div className="absolute top-0 right-0 p-12 bg-blue-500/5 rounded-full -mr-12 -mt-12 blur-3xl group-hover:bg-blue-500/10 transition-colors" />
            
            <div className="relative z-10 flex flex-col h-full space-y-6">
                {/* Header: Photo & Primary Info */}
                <div className="flex items-start gap-6">
                    <div className="relative shrink-0">
                        <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-white/10 group-hover:border-blue-500/50 transition-all duration-500 shadow-2xl bg-slate-900/50 relative">
                            {person.photo_url ? (
                                <AuthenticatedImage
                                    src={person.photo_url}
                                    alt={person.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    style={faceStyle}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-700">
                                    <User size={40} />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        
                        {/* Biometric Status Indicator */}
                        <div className="absolute -bottom-2 -right-2 bg-slate-900 p-1 rounded-full border border-white/10">
                            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 pt-2">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-[1px] w-4 bg-blue-500/50" />
                            <span className="text-[9px] font-black text-blue-500/60 uppercase tracking-[0.3em] font-mono">Neural ID: {person.id.toString().padStart(4, '0')}</span>
                        </div>
                        <h3 className="text-2xl font-black text-white leading-tight uppercase tracking-tighter group-hover:text-blue-400 transition-colors truncate font-outfit">
                            {person.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                            <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${person.gender === 'male' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-pink-500/10 text-pink-400 border-pink-500/20'}`}>
                                {person.gender || 'Unknown'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 group-hover:bg-white/[0.04] group-hover:border-white/10 transition-all flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-slate-500">
                            <Calendar size={12} />
                            <span className="text-[9px] font-black uppercase tracking-widest font-mono">Bio Age</span>
                        </div>
                        <div className="text-xl font-black text-slate-100 font-outfit">{person.age || '--'} <span className="text-[10px] text-slate-500 font-medium">L-CYCLE</span></div>
                    </div>
                    
                    <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 group-hover:bg-white/[0.04] group-hover:border-white/10 transition-all flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-slate-500">
                            <Users size={12} />
                            <span className="text-[9px] font-black uppercase tracking-widest font-mono">Synapses</span>
                        </div>
                        <div className="text-xl font-black text-slate-100 font-outfit">{person.relationship_count || 0} <span className="text-[10px] text-slate-500 font-medium">NODES</span></div>
                    </div>
                </div>

                {/* Footer: Group & Action */}
                <div className="pt-2 flex items-center justify-between">
                    <div className="flex flex-wrap gap-2 min-w-0 flex-1">
                        {person.groups && person.groups.length > 0 ? (
                            person.groups.slice(0, 2).map((g, idx) => (
                                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/5 rounded-lg border border-blue-500/10 group-hover:bg-blue-600/20 group-hover:border-blue-500/30 transition-all">
                                    <div className="w-1 h-1 rounded-full bg-blue-500" />
                                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest truncate font-mono">
                                        {g.name}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-600/5 rounded-xl border border-blue-500/10 group-hover:bg-blue-600/20 group-hover:border-blue-500/30 transition-all">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] truncate font-mono">
                                    {person.group_path ? person.group_path[person.group_path.length - 1] : (person.group_name || 'UNASSIGNED')}
                                </span>
                            </div>
                        )}
                        {person.groups && person.groups.length > 2 && (
                             <span className="text-[8px] text-slate-500 font-mono self-center">+{person.groups.length - 2}</span>
                        )}
                    </div>
                    
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 group-hover:text-white group-hover:bg-blue-600 group-hover:border-blue-500 group-hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all shrink-0">
                        <ArrowRight size={20} />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default PersonCard;
