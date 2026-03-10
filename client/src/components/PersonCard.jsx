import React from 'react';
import { motion } from 'framer-motion';
import { User, Calendar, Users, Info, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useState, useEffect } from 'react';

const AuthenticatedImage = ({ src, alt, className }) => {
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

    return <img src={imageSrc} alt={alt} className={className} />;
};

const PersonCard = ({ person }) => {
    const navigate = useNavigate();

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -4, borderColor: 'rgba(59, 130, 246, 0.4)' }}
            className="group relative bg-[#121214] border border-white/10 rounded-3xl p-6 shadow-xl transition-all overflow-hidden cursor-pointer"
            onClick={() => navigate(`/person/${person.id}`, { state: { activeTab: 'people' } })}
        >
            {/* Photo Background/Overlay */}
            {person.photo_url && (
                <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
                    <AuthenticatedImage
                        src={person.photo_url}
                        alt=""
                        className="w-full h-full object-cover filter grayscale blur-sm"
                    />
                </div>
            )}
            {/* Corner Accent */}
            <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-blue-500/20 rounded-tr-3xl transition-colors group-hover:border-blue-500/40"></div>

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 group-hover:border-blue-500/30 transition-colors shadow-lg bg-white/5">
                        {person.photo_url ? (
                            <AuthenticatedImage
                                src={person.photo_url}
                                alt={person.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-700">
                                <User size={32} />
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="text-[10px] font-mono text-blue-500/60 uppercase tracking-widest mb-1 flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></div>
                            Einträge
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">
                            {person.name}
                        </h3>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                        <div className="text-[9px] font-mono text-gray-600 uppercase mb-1">Alter</div>
                        <div className="text-lg font-black text-gray-200">{person.age || '--'} <span className="text-[10px] font-normal text-gray-500">Jahre</span></div>
                    </div>
                    <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                        <div className="text-[9px] font-mono text-gray-600 uppercase mb-1">Verknüpfungen</div>
                        <div className="text-lg font-black text-gray-200">
                            {person.relationship_count || 0}
                        </div>
                    </div>
                </div>

                <div className="mt-auto flex items-center justify-between">
                    <div className="px-3 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter truncate max-w-[120px] block" title={person.group_path ? person.group_path.join(' > ') : (person.group_name || '[Keine Gruppe]')}>
                            {person.group_path ? person.group_path.join(' > ') : (person.group_name || '[Keine Gruppe]')}
                        </span>
                    </div>
                    <motion.div
                        whileHover={{ x: 4 }}
                        className="text-blue-500/40 group-hover:text-blue-500 transition-colors"
                    >
                        <ArrowRight size={20} />
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

export default PersonCard;
