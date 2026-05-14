import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trash2, User, Calendar, Users, Edit3, Loader, Info, Heart, Plus, Image as ImageIcon, Globe, Brain, RefreshCw, FolderTree } from 'lucide-react';
import PersonForm from '../components/PersonForm';
import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from 'react-hot-toast';
import { getPerson, updatePerson, deletePerson, uploadPhoto, syncImmichPerson, getImmichFaces, setPrimaryPhoto, resetProfilePhoto, getEvaluations } from '../services/api';
import { getGenderedStatus } from '../utils/statusHelpers';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import EvaluationDisplay from '../components/EvaluationDisplay';

const AuthenticatedImage = ({ src, alt, className }) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const loadImage = async () => {
            try {
                const token = sessionStorage.getItem('token');
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

const ImmichFacesModule = ({ personId, faces, onSetPrimary }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    if (!faces || faces.length === 0) return null;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-4">
                    <div className="w-1.5 h-8 bg-blue-500/40 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
                    <div>
                        <span className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-slate-500 block">Immich</span>
                        <span className="text-xl font-black uppercase tracking-tighter text-white">Images ({faces.length})</span>
                    </div>
                </div>
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)} 
                    className="glass-button px-5 py-2 text-[10px] font-mono font-black uppercase tracking-widest"
                >
                    {isCollapsed ? '[ Expand ]' : '[ Collapse ]'}
                </button>
            </div>
            
            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                            {faces.map((assetId, idx) => (
                                <motion.div 
                                    key={assetId}
                                    whileHover={{ y: -4, scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="aspect-square rounded-2xl overflow-hidden border border-white/5 relative group cursor-pointer shadow-2xl shadow-black/60 bg-black/40"
                                    onClick={() => onSetPrimary(assetId)}
                                >
                                    <AuthenticatedImage
                                        src={`/api/people/${personId}/immich-face/${assetId}`}
                                        alt={`Face ${idx + 1}`}
                                        className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                                    />
                                    <div className="absolute inset-0 bg-blue-600/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-300 backdrop-blur-[2px]">
                                        <Plus size={20} className="text-white mb-2" />
                                        <div className="text-[8px] font-black uppercase text-white tracking-widest text-center px-2">Set Primary</div>
                                    </div>
                                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 rounded-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[8px] font-mono text-gray-400">#{(idx+1).toString().padStart(3, '0')}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const PersonDetail = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const activeTab = location.state?.activeTab || 'people';
    const [person, setPerson] = useState(null);

    const getBackButtonText = () => {
        switch (activeTab) {
            case 'groups': return 'BACK TO GROUPS';
            case 'network': return 'BACK TO NETWORK';
            case 'facescan': return 'BACK TO SCANNER';
            default: return 'BACK TO DATABASE';
        }
    };
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [focusedModule, setFocusedModule] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [immichFaces, setImmichFaces] = useState([]);
    const [evaluations, setEvaluations] = useState([]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await getPerson(id);
            setPerson(data.data);
            
            try {
                const evalData = await getEvaluations(id);
                if (evalData && evalData.data) {
                    setEvaluations(evalData.data);
                }
            } catch (evalErr) {
                console.error("Failed to fetch evaluations", evalErr);
            }
            
            if (data.data.immich_person_id) {
                try {
                    const facesData = await getImmichFaces(id);
                    setImmichFaces(facesData.faces || []);
                } catch (e) {
                    console.error("Failed to fetch immich faces", e);
                }
            } else {
                setImmichFaces([]);
            }
        } catch (error) {
            console.error("Failed to fetch person data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const handleUpdate = async (formData, photoFiles) => {
        try {
            const response = await updatePerson(id, formData);
            if (photoFiles && Array.isArray(photoFiles)) {
                for (let i = 0; i < photoFiles.length; i++) {
                    if (photoFiles[i]) {
                        await uploadPhoto(id, photoFiles[i], i);
                    }
                }
            }
            if (response && response.data) {
                setPerson(response.data);
                setIsEditing(false);
                setFocusedModule(null);
                fetchData();
            }
        } catch (error) {
            toast.error('Fehler beim Speichern');
        }
    };

    const handleDelete = async () => {
        try {
            await deletePerson(id);
            navigate('/', { state: { activeTab } });
        } catch (error) {
            console.error("Failed to delete person", error);
        }
    };

    const handleSyncImmich = async () => {
        if (!person?.immich_person_id) return;
        try {
            setIsSyncing(true);
            toast.success('Synchronisation gestartet...');
            const response = await syncImmichPerson(id);
            toast.success(`Erfolgreich synchronisiert: ${response.descriptorsAdded} Gesichter hinzugefügt`);
            fetchData();
        } catch (error) {
            console.error("Immich sync failed", error);
            toast.error('Synchronisation fehlgeschlagen');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleResetProfilePhoto = async () => {
        if (!window.confirm("Möchtest du das Profilbild wirklich zurücksetzen?")) return;
        try {
            await resetProfilePhoto(id);
            toast.success('Profilbild zurückgesetzt');
            fetchData();
        } catch (error) {
            toast.error('Fehler beim Zurücksetzen');
        }
    };

    const handleSetPrimaryPhoto = async (assetId) => {
        try {
            toast.success('Aktualisiere Profilbild...');
            const response = await setPrimaryPhoto(id, { assetId, source: 'immich' });
            if (response && response.data) {
                setPerson(response.data);
            } else {
                fetchData();
            }
            toast.success('Profilbild erfolgreich aktualisiert');
        } catch (error) {
            console.error("Set primary photo failed", error);
            toast.error('Fehler beim Aktualisieren des Profilbilds');
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <Loader className="animate-spin text-blue-500" size={64} strokeWidth={1} />
                <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse" />
            </div>
            <span className="text-blue-500/50 font-mono animate-pulse uppercase text-[10px] tracking-[0.5em] font-black">Decrypting Identity...</span>
        </div>
    );

    if (!person) return (
        <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center text-white p-8 text-center">
            <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-8">
                <Info size={40} />
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter mb-8">Subject Not Found</h2>
            <button 
                onClick={() => navigate('/', { state: { activeTab } })} 
                className="glass-button px-10 py-4 font-black uppercase text-xs tracking-widest"
            >
                Return to Database
            </button>
        </div>
    );

    const modules = [
        {
            id: 'photo',
            label: 'Ident-Focus',
            icon: ImageIcon,
            color: 'blue',
            fullWidth: true,
            isActive: (p) => p.photo_url || (p.photo_urls && p.photo_urls.filter(u => u).length > 0),
            render: (p) => {
                const urls = p.photo_urls && p.photo_urls.length > 0 ? p.photo_urls : (p.photo_url ? [p.photo_url] : []);
                const activeUrls = urls.filter(u => u);

                return (
                    <div className="space-y-10">
                        <div className="flex justify-center relative">
                            <div className="relative group/photo">
                                {/* Scanner Frame */}
                                <div className="absolute -inset-4 border border-blue-500/20 rounded-[2.5rem] pointer-events-none group-hover/photo:border-blue-500/40 transition-colors" />
                                <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-blue-500 rounded-tl-2xl" />
                                <div className="absolute -top-4 -right-4 w-12 h-12 border-t-2 border-r-2 border-blue-500 rounded-tr-2xl" />
                                <div className="absolute -bottom-4 -left-4 w-12 h-12 border-b-2 border-l-2 border-blue-500 rounded-bl-2xl" />
                                <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-blue-500 rounded-br-2xl" />

                                <div className="w-72 h-72 rounded-[2rem] overflow-hidden border-2 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
                                    {activeUrls[0] ? (
                                        <AuthenticatedImage
                                            src={activeUrls[0]}
                                            alt={p.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-white/5 flex items-center justify-center text-slate-700">
                                            <ImageIcon size={64} strokeWidth={1} />
                                        </div>
                                    )}
                                    
                                    {/* Scanline Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent h-20 w-full animate-scanline pointer-events-none" />
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />
                                    
                                    <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                        <span className="text-[10px] font-mono font-black uppercase text-white tracking-[0.4em] bg-blue-600 px-4 py-2 rounded-lg shadow-xl">
                                            Confirmed Identity
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {activeUrls.length > 1 && (
                            <div className="flex flex-wrap justify-center gap-4 mt-8 pt-10 border-t border-white/5">
                                {activeUrls.slice(1).map((url, idx) => (
                                    <motion.div 
                                        key={`gallery-${idx}`}
                                        whileHover={{ y: -4, scale: 1.05 }}
                                        className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 hover:border-blue-500/50 transition-all group/tile bg-black/40 shadow-xl"
                                    >
                                        <AuthenticatedImage
                                            src={url}
                                            alt={`${p.name} alternate ${idx + 1}`}
                                            className="w-full h-full object-cover grayscale opacity-50 group-hover/tile:grayscale-0 group-hover/tile:opacity-100 transition-all duration-500"
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            id: 'age',
            label: 'Age',
            icon: Calendar,
            color: 'blue',
            isActive: (p) => {
                let hasAi = false;
                try { if (p.ai_metadata) hasAi = !!JSON.parse(p.ai_metadata).estimated_age; } catch (e) { }
                return (p.age && p.age > 0) || p.birth_date || hasAi;
            },
            render: (p) => {
                let displayAge = p.age || '00';
                let isApprox = false;
                if (!p.age && p.ai_metadata) {
                    try {
                        const ai = JSON.parse(p.ai_metadata);
                        if (ai.estimated_age) {
                            displayAge = ai.estimated_age;
                            isApprox = true;
                        }
                    } catch (e) { }
                }

                return (
                    <div className="flex flex-col">
                        <div className="text-5xl font-black text-white flex items-baseline gap-3 tracking-tighter">
                            {displayAge} <span className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest">Standard Years</span>
                            {isApprox && (
                                <div className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[8px] rounded-md font-mono border border-blue-500/20 tracking-tighter uppercase font-black">AI Estimated</div>
                            )}
                        </div>
                        {p.birth_date && (
                            <div className="text-[10px] font-mono text-slate-500 mt-2 uppercase tracking-[0.2em] flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-blue-500" />
                                Recorded: {new Date(p.birth_date).toLocaleDateString('de-DE')}
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            id: 'group',
            label: 'Group',
            icon: Users,
            color: 'orange',
            isActive: (p) => p.group_id || p.group_name,
            render: (p) => (
                <div className="flex items-center gap-4">
                    <div className="text-2xl font-black text-white uppercase tracking-tighter">
                        {p.group_path ? p.group_path.join(' / ') : (p.group_name || '[Unassigned]')}
                    </div>
                </div>
            )
        },
        {
            id: 'gender',
            label: 'Gender',
            icon: Users,
            color: 'purple',
            isActive: (p) => {
                let hasAi = false;
                try { if (p.ai_metadata) hasAi = !!JSON.parse(p.ai_metadata).estimated_gender; } catch (e) { }
                return (p.gender && p.gender.trim().length > 0) || hasAi;
            },
            render: (p) => {
                let displayGender = p.gender;
                let isApprox = false;
                if ((!p.gender || p.gender.trim().length === 0) && p.ai_metadata) {
                    try {
                        const ai = JSON.parse(p.ai_metadata);
                        if (ai.estimated_gender) {
                            displayGender = ai.estimated_gender === 'male' ? 'Männlich' : 'Weiblich';
                            isApprox = true;
                        }
                    } catch (e) { }
                }

                return (
                    <div className="flex items-center gap-4">
                        <div className="text-2xl font-black text-white uppercase tracking-tighter">
                            {displayGender}
                        </div>
                        {isApprox && (
                             <div className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[8px] rounded-md font-mono border border-purple-500/20 tracking-tighter uppercase font-black">Pattern Found</div>
                        )}
                    </div>
                );
            }
        },
        {
            id: 'aliases',
            label: 'Alias',
            icon: Users,
            color: 'blue',
            fullWidth: true,
            isActive: (p) => p.aliases && p.aliases.trim().length > 0,
            render: (p) => (
                <div className="text-2xl font-black text-blue-400 uppercase tracking-tighter">
                    {p.aliases}
                </div>
            )
        },
        {
            id: 'location',
            label: 'Sector / Residence',
            icon: Globe,
            color: 'orange',
            isActive: (p) => p.location && p.location.trim().length > 0,
            render: (p) => (
                <div className="text-2xl font-black text-white uppercase tracking-tighter">
                    {p.location}
                </div>
            )
        },
        {
            id: 'clusters',
            label: 'Clusters / Designations',
            icon: FolderTree,
            color: 'orange',
            fullWidth: true,
            isActive: (p) => (p.groups && p.groups.length > 0) || p.group_name,
            render: (p) => (
                <div className="flex flex-wrap gap-3">
                    {p.groups && p.groups.length > 0 ? (
                        p.groups.map((group, idx) => (
                            <div key={idx} className="px-6 py-3 bg-orange-500/5 border border-orange-500/20 rounded-2xl text-orange-300 transition-all flex items-center gap-3 shadow-lg">
                                <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                                <span className="text-sm font-black uppercase tracking-widest">{group.name}</span>
                            </div>
                        ))
                    ) : (
                        <div className="px-6 py-3 bg-orange-500/5 border border-orange-500/20 rounded-2xl text-orange-300 transition-all flex items-center gap-3 shadow-lg">
                            <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                            <span className="text-sm font-black uppercase tracking-widest">{p.group_name || 'UNASSIGNED'}</span>
                        </div>
                    )}
                </div>
            )
        },
        {
            id: 'family',
            label: 'Genetic Network / Family',
            icon: Users,
            color: 'green',
            fullWidth: true,
            isActive: (p) => p.family && p.family.length > 0,
            render: (p) => {
                return (
                    <div className="flex flex-wrap gap-3">
                        {p.family.map((member, idx) => {
                            const status = getGenderedStatus(member.status, member.gender);
                            if (member.id) {
                                return (
                                    <motion.button 
                                        key={`fam-${member.id}`} 
                                        whileHover={{ scale: 1.05, x: 5 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => navigate(`/person/${member.id}`, { state: { activeTab } })} 
                                        className="px-6 py-3 bg-green-500/5 hover:bg-green-500/10 border border-green-500/20 rounded-2xl text-green-300 transition-all flex flex-col items-start gap-1 group/node"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] group-hover/node:scale-125 transition-transform" />
                                            <span className="text-xs font-black uppercase tracking-widest">{member.name}</span>
                                        </div>
                                        <span className="text-[9px] font-mono text-green-500/50 tracking-[0.2em] uppercase pl-5">{status}</span>
                                    </motion.button>
                                );
                            }
                            return (
                                <div key={`fam-unlinked-${idx}`} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-slate-500 flex flex-col items-start gap-1">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500/50" />
                                        <span className="text-xs font-black uppercase tracking-widest opacity-60">{member.name}</span>
                                    </div>
                                    <span className="text-[9px] font-mono opacity-40 tracking-[0.2em] uppercase pl-4.5">{member.status}</span>
                                </div>
                            );
                        })}
                    </div>
                );
            }
        },
        {
            id: 'partners',
            label: 'Partners',
            icon: Heart,
            color: 'red',
            fullWidth: true,
            isActive: (p) => p.partners && p.partners.length > 0,
            render: (p) => {
                return (
                    <div className="flex flex-wrap gap-3">
                        {p.partners.map((member, idx) => {
                            const status = getGenderedStatus(member.status, member.gender);
                            if (member.id) {
                                return (
                                    <motion.button 
                                        key={`part-${member.id}`} 
                                        whileHover={{ scale: 1.05, x: 5 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => navigate(`/person/${member.id}`, { state: { activeTab } })} 
                                        className="px-6 py-3 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-2xl text-red-300 transition-all flex flex-col items-start gap-1 group/node"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] group-hover/node:scale-125 transition-transform" />
                                            <span className="text-xs font-black uppercase tracking-widest">{member.name}</span>
                                        </div>
                                        <span className="text-[9px] font-mono text-red-500/50 tracking-[0.2em] uppercase pl-5">{status}</span>
                                    </motion.button>
                                );
                            }
                            return (
                                <div key={`part-unlinked-${idx}`} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-slate-500 flex flex-col items-start gap-1">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500/50" />
                                        <span className="text-xs font-black uppercase tracking-widest opacity-60">{member.name}</span>
                                    </div>
                                    <span className="text-[9px] font-mono opacity-40 tracking-[0.2em] uppercase pl-4.5">{member.status}</span>
                                </div>
                            );
                        })}
                    </div>
                );
            }
        },
        {
            id: 'social',
            label: 'Social',
            icon: Users,
            color: 'blue',
            fullWidth: true,
            isActive: (p) => p.social && p.social.length > 0,
            render: (p) => {
                return (
                    <div className="flex flex-wrap gap-3">
                        {p.social.map((member, idx) => {
                            const status = getGenderedStatus(member.status, member.gender);
                            if (member.id) {
                                return (
                                    <motion.button 
                                        key={`soc-${member.id}`} 
                                        whileHover={{ scale: 1.05, x: 5 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => navigate(`/person/${member.id}`, { state: { activeTab } })} 
                                        className="px-6 py-3 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-300 transition-all flex flex-col items-start gap-1 group/node"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] group-hover/node:scale-125 transition-transform" />
                                            <span className="text-xs font-black uppercase tracking-widest">{member.name}</span>
                                        </div>
                                        <span className="text-[9px] font-mono text-blue-500/50 tracking-[0.2em] uppercase pl-5">{status}</span>
                                    </motion.button>
                                );
                            }
                            return (
                                <div key={`soc-unlinked-${idx}`} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-slate-500 flex flex-col items-start gap-1">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500/50" />
                                        <span className="text-xs font-black uppercase tracking-widest opacity-60">{member.name}</span>
                                    </div>
                                    <span className="text-[9px] font-mono opacity-40 tracking-[0.2em] uppercase pl-4.5">{member.status}</span>
                                </div>
                            );
                        })}
                    </div>
                );
            }
        },
        {
            id: 'ai_analysis',
            label: 'Intelligence / AI Analysis',
            icon: Brain,
            color: 'purple',
            fullWidth: false,
            isActive: (p) => {
                try {
                    if (!p.ai_metadata) return false;
                    const ai = JSON.parse(p.ai_metadata);
                    return !!(ai.race || ai.emotion);
                } catch { return false; }
            },
            render: (p) => {
                let ai = {};
                try { ai = JSON.parse(p.ai_metadata); } catch { }
                const raceMap = { white: 'Caucasoid', black: 'Negroid', asian: 'Mongoloid', 'middle eastern': 'Middle Eastern', latino: 'Hispanic', indian: 'Indic' };
                const emotionMap = { happy: '😊 CALM / CONTENT', sad: '😢 DEPLETED', angry: '😠 AGITATED', fear: '😨 VULNERABLE', surprise: '😲 ANOMALY', neutral: '😐 BASELINE', disgust: '🤢 AVERSION' };

                return (
                    <div className="space-y-6">
                        {ai.race && (
                            <div className="flex flex-col">
                                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] mb-2">Heritage Classification</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl font-black text-white uppercase tracking-tight">{raceMap[ai.race?.toLowerCase()] || ai.race}</span>
                                    <div className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-[8px] rounded-md font-mono border border-yellow-500/20 font-black uppercase">Low Confidence</div>
                                </div>
                            </div>
                        )}
                        {ai.emotion && (
                            <div className="flex flex-col">
                                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] mb-2">Psych-State Signature</span>
                                <span className="text-xl font-black text-white uppercase tracking-tighter">{emotionMap[ai.emotion?.toLowerCase()] || ai.emotion}</span>
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            id: 'additional_info',
            label: 'Notes',
            icon: Info,
            color: 'purple',
            fullWidth: true,
            isActive: (p) => p.additional_info && p.additional_info.trim().length > 0,
            render: (p) => (
                <div className="relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/40 rounded-full" />
                    <p className="text-slate-400 leading-relaxed font-mono text-xs whitespace-pre-wrap pl-6 py-2">
                        {p.additional_info}
                    </p>
                </div>
            )
        },
        {
            id: 'online_profiles',
            label: 'Profiles',
            icon: Globe,
            color: 'blue',
            fullWidth: true,
            isActive: (p) => p.online_profiles && p.online_profiles.length > 0,
            render: (p) => {
                return (
                    <div className="flex flex-wrap gap-4">
                        {p.online_profiles.map((profile, idx) => (
                            <div key={`profile-${idx}`} className="px-6 py-3 bg-blue-500/5 border border-blue-500/20 rounded-2xl text-blue-300 transition-all flex flex-col items-start gap-1 shadow-lg">
                                <div className="flex items-center gap-3">
                                    <Globe size={14} className="opacity-60" />
                                    <span className="text-xs font-black uppercase tracking-widest">{profile.platform}</span>
                                </div>
                                <span className="text-[10px] text-blue-500/60 tracking-[0.1em] font-mono lowercase pl-6">{profile.username}</span>
                            </div>
                        ))}
                    </div>
                );
            }
        },
        {
            id: 'immich_faces',
            label: 'Immich Collection',
            icon: ImageIcon,
            color: 'cyan',
            fullWidth: true,
            isActive: (p) => immichFaces && immichFaces.length > 0,
            render: (p) => <ImmichFacesModule personId={p.id} faces={immichFaces} onSetPrimary={handleSetPrimaryPhoto} />
        },
        {
            id: 'evaluations',
            label: 'Psych-Evaluation Profile',
            icon: Brain,
            color: 'blue',
            fullWidth: true,
            isActive: (p) => true,
            render: (p) => (
                <div className="w-full">
                    <EvaluationDisplay evaluations={evaluations} />
                    <div className="mt-6 flex justify-end">
                        <button 
                            onClick={() => navigate('/evaluation')}
                            className="glass-button px-6 py-3 font-black text-[10px] uppercase tracking-widest text-blue-400 hover:text-blue-300"
                        >
                            <Brain size={14} className="inline mr-2" />
                            Neue Evaluierung starten
                        </button>
                    </div>
                </div>
            )
        }
    ];

    const activeModules = modules.filter(m => m.isActive(person));

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-obsidian text-white selection:bg-blue-500/30 p-4 md:p-12 relative overflow-visible"
        >
            {/* Global Ambient Accents */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-blue-600/5 blur-[200px] rounded-full" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-600/5 blur-[180px] rounded-full" />
            </div>

            <div className="max-w-[1500px] mx-auto relative z-10">
                {/* Navigation Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
                    <motion.button 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        onClick={() => navigate('/', { state: { activeTab } })} 
                        className="flex items-center gap-4 text-slate-500 hover:text-white transition-all font-mono text-[10px] uppercase tracking-[0.4em] group"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-blue-600/20 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-all border border-white/10 shadow-2xl">
                            <ArrowLeft size={18} />
                        </div>
                        <span className="font-black">{getBackButtonText()}</span>
                    </motion.button>

                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-wrap gap-4"
                    >
                        {(user?.role === 'admin' || user?.role === 'editor') && person?.immich_person_id && (
                            <button
                                onClick={handleSyncImmich}
                                disabled={isSyncing}
                                className="glass-button px-6 py-3 flex items-center gap-3 font-black text-[10px] uppercase tracking-widest group"
                            >
                                <RefreshCw size={14} className={`${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                                Sync Core
                            </button>
                        )}
                        {(user?.role === 'admin' || user?.role === 'editor') && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="glass-button px-6 py-3 flex items-center gap-3 font-black text-[10px] uppercase tracking-widest border-blue-500/20 text-blue-400 hover:text-white"
                            >
                                <Edit3 size={14} />
                                Edit Profile
                            </button>
                        )}
                        {user?.role === 'admin' && (
                            <button 
                                onClick={() => setShowDeleteModal(true)} 
                                className="glass-button px-6 py-3 text-red-500 border-red-500/20 hover:bg-red-500/10 active:bg-red-500/20"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </motion.div>
                </div>

                {isEditing ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-4xl mx-auto"
                    >
                        <div className="flex items-center gap-6 mb-16">
                            <div className="w-1.5 h-14 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.4)]" />
                            <div>
                                <h2 className="text-5xl font-black uppercase tracking-tighter text-white leading-none mb-2">Registry Access</h2>
                                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.4em]">Amending Biological Record: {person.id.toString().substring(0, 12)}</p>
                            </div>
                        </div>

                        <PersonForm
                            initialData={person}
                            onSubmit={handleUpdate}
                            onCancel={() => {
                                setIsEditing(false);
                                setFocusedModule(null);
                            }}
                            autoFocusField={focusedModule}
                        />
                    </motion.div>
                ) : (
                    <div className="space-y-12">
                        {/* Dramatic Subject Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12 pb-16 border-b border-white/5 relative">
                            <div className="flex-1">
                                <motion.div 
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-4 mb-6"
                                >
                                    <div className="px-4 py-1.5 bg-blue-600/10 rounded-lg border border-blue-500/30 backdrop-blur-md">
                                        <span className="text-[10px] font-mono font-black text-blue-400 uppercase tracking-[0.2em]">Subject ID: {person.id.toString().substring(0, 12)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-lg border border-green-500/30">
                                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse" />
                                        <span className="text-[9px] font-mono font-black text-green-500 uppercase tracking-widest">Authorized</span>
                                    </div>
                                </motion.div>
                                <motion.h1 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-6xl md:text-9xl font-black text-white tracking-tighter uppercase leading-[0.8] mb-6 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                                >
                                    {person.name}
                                </motion.h1>
                                <motion.p 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.5 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-slate-500 font-mono text-[10px] tracking-[0.5em] uppercase pl-1"
                                >
                                    Civis Intelligence Systems // Core Database // Entry verified
                                </motion.p>
                            </div>
                        </div>

                        {/* Intelligence Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* Visual Asset Column */}
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 }}
                                className="lg:col-span-4 space-y-8"
                            >
                                {activeModules.filter(m => m.id === 'photo').map(m => (
                                    <div key={m.id} className="glass-panel p-8 rounded-[3rem] shadow-3xl">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/30 shadow-lg">
                                                <ImageIcon size={20} strokeWidth={1.5} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-slate-500 block">Primary Visual</span>
                                                <span className="text-xs font-black uppercase text-white">{m.label}</span>
                                            </div>
                                        </div>
                                        {m.render(person)}
                                    </div>
                                ))}

                                {activeModules.filter(m => m.id === 'ai_analysis').map(m => (
                                    <div key={m.id} className="glass-panel p-8 rounded-[3rem] shadow-3xl">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400 border border-purple-500/30 shadow-lg">
                                                <Brain size={20} strokeWidth={1.5} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-slate-500 block">Neural Engine</span>
                                                <span className="text-xs font-black uppercase text-white">{m.label}</span>
                                            </div>
                                        </div>
                                        {m.render(person)}
                                    </div>
                                ))}
                            </motion.div>

                            {/* Data Modules Column */}
                            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <AnimatePresence mode="popLayout">
                                    {activeModules.filter(m => !['photo', 'ai_analysis', 'immich_faces'].includes(m.id)).map((module, index) => {
                                        const styles = {
                                            blue: 'bg-blue-600/10 text-blue-400 border-blue-500/20',
                                            orange: 'bg-orange-600/10 text-orange-400 border-orange-500/20',
                                            green: 'bg-green-600/10 text-green-400 border-green-500/20',
                                            red: 'bg-red-600/10 text-red-400 border-red-500/20',
                                            purple: 'bg-purple-600/10 text-purple-400 border-purple-500/20',
                                            cyan: 'bg-cyan-600/10 text-cyan-400 border-cyan-500/20'
                                        }[module.color] || 'bg-white/5 text-slate-400 border-white/10';

                                        return (
                                            <motion.div
                                                key={module.id}
                                                layout
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.1 * index + 0.4 }}
                                                className={`${module.fullWidth ? 'col-span-full' : ''} glass-panel rounded-[2.5rem] p-10 hover:bg-white/[0.03] transition-colors group shadow-2xl relative overflow-hidden`}
                                            >
                                                {/* Corner Accent */}
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
                                                
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all group-hover:scale-110 ${styles} shadow-lg`}>
                                                        <module.icon size={20} strokeWidth={1.5} />
                                                    </div>
                                                    <span className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-slate-500">{module.label}</span>
                                                </div>
                                                <div className="pl-1">
                                                    {module.render(person)}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>

                                {/* Immich Faces Full Width */}
                                {activeModules.filter(m => m.id === 'immich_faces').map(m => (
                                    <motion.div 
                                        key={m.id} 
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        className="col-span-full mt-10"
                                    >
                                        <div className="glass-panel rounded-[3.5rem] p-12 md:p-16 shadow-3xl bg-slate-900/40 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[100px] rounded-full" />
                                            <div className="relative z-10">
                                                {m.render(person)}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <ConfirmationModal 
                    isOpen={showDeleteModal} 
                    onClose={() => setShowDeleteModal(false)} 
                    onConfirm={handleDelete} 
                    title="Terminate Record" 
                    message={`Are you certain you wish to purge all data associated with ${person.name}? This action is irreversible.`} 
                    isDanger={true} 
                />
            </div>
        </motion.div>
    );
};

export default PersonDetail;
