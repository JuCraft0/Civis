import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trash2, User, Calendar, Users, Edit3, Loader, Info, Heart, Plus, Image as ImageIcon, Globe } from 'lucide-react';
import PersonForm from '../components/PersonForm';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import { getPerson, updatePerson, deletePerson, uploadPhoto } from '../services/api';
import { getGenderedStatus } from '../utils/statusHelpers';
import { useAuth } from '../context/AuthContext';

const PersonDetail = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const activeTab = location.state?.activeTab || 'people';
    const [person, setPerson] = useState(null);

    const getBackButtonText = () => {
        switch (activeTab) {
            case 'groups': return 'Zurück zu Gruppen';
            case 'network': return 'Zurück zum Netzwerk';
            case 'facescan': return 'Zurück zum Face Scan';
            default: return 'Zurück zur Übersicht';
        }
    };
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'success' });
    const [focusedModule, setFocusedModule] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await getPerson(id);
            setPerson(data.data);
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
            setToast({ message: 'Fehler beim Speichern', type: 'error' });
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

    if (loading) return (
        <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center gap-4">
            <Loader className="animate-spin text-blue-500" size={48} />
            <span className="text-gray-500 font-mono animate-pulse uppercase text-xs">Daten werden geladen...</span>
        </div>
    );

    if (!person) return (
        <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center text-white p-8 text-center">
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-4">Eintrag nicht gefunden</h2>
            <button onClick={() => navigate('/', { state: { activeTab } })} className="bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/20 px-6 py-3 rounded-xl transition-all font-bold uppercase text-xs">Zurück</button>
        </div>
    );

    // Module Definition
    const modules = [
        {
            id: 'photo',
            label: 'Fotogalerie',
            icon: ImageIcon,
            color: 'blue',
            fullWidth: true,
            isActive: (p) => p.photo_url || (p.photo_urls && p.photo_urls.filter(u => u).length > 0),
            render: (p) => {
                const urls = p.photo_urls && p.photo_urls.length > 0 ? p.photo_urls : (p.photo_url ? [p.photo_url] : []);
                const activeUrls = urls.filter(u => u);

                return (
                    <div className="space-y-6">
                        {/* Primary Photo */}
                        <div className="flex justify-center">
                            <div className="w-64 h-64 rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl relative group/photo">
                                {activeUrls[0] ? (
                                    <img
                                        src={`${activeUrls[0].startsWith('/') ? activeUrls[0] : `/${activeUrls[0]}`}`}
                                        alt={p.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-white/5 flex items-center justify-center text-gray-700">
                                        <ImageIcon size={48} />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-end justify-center pb-4">
                                    <span className="text-[10px] font-mono uppercase text-blue-400">Primäre Identifikation</span>
                                </div>
                            </div>
                        </div>

                        {/* Gallery Tiles */}
                        {activeUrls.length > 1 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/5">
                                {activeUrls.slice(1).map((url, idx) => (
                                    <div key={`gallery-${idx}`} className="aspect-square rounded-2xl overflow-hidden border border-white/10 hover:border-blue-500/30 transition-all group/tile">
                                        <img
                                            src={`${url.startsWith('/') ? url : `/${url}`}`}
                                            alt={`${p.name} detail ${idx + 2}`}
                                            className="w-full h-full object-cover group-hover/tile:scale-110 transition-transform duration-500"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            id: 'age',
            label: 'Alter & Geburt',
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
                        <div className="text-4xl font-black text-white flex items-baseline gap-2">
                            {displayAge} <span className="text-xs font-mono font-normal text-gray-600 uppercase">Jahre</span>
                            {isApprox && <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-[10px] rounded-md font-mono border border-yellow-500/30">APPROX.</span>}
                        </div>
                        {p.birth_date && (
                            <div className="text-[10px] font-mono text-gray-500 mt-1 uppercase tracking-wider">
                                Geboren: {new Date(p.birth_date).toLocaleDateString('de-DE')}
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            id: 'group',
            label: 'Gruppe',
            icon: Users,
            color: 'orange',
            isActive: (p) => p.group_id || p.group_name,
            render: (p) => (
                <div className="text-xl font-black text-white uppercase tracking-tight">
                    {p.group_path ? p.group_path.join(' > ') : (p.group_name || '[Keine Gruppe]')}
                </div>
            )
        },
        {
            id: 'gender',
            label: 'Geschlecht',
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
                    <div className="flex items-center gap-3">
                        <div className="text-xl font-black text-white uppercase tracking-tight">
                            {displayGender}
                        </div>
                        {isApprox && <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-[10px] rounded-md font-mono border border-yellow-500/30">APPROX.</span>}
                    </div>
                );
            }
        },
        {
            id: 'aliases',
            label: 'Alias (Spitznamen)',
            icon: Users,
            color: 'blue',
            fullWidth: true,
            isActive: (p) => p.aliases && p.aliases.trim().length > 0,
            render: (p) => (
                <div className="text-xl font-black text-white uppercase tracking-tight">
                    {p.aliases}
                </div>
            )
        },
        {
            id: 'location',
            label: 'Wohnort',
            icon: Users,
            color: 'orange',
            isActive: (p) => p.location && p.location.trim().length > 0,
            render: (p) => (
                <div className="text-xl font-black text-white uppercase tracking-tight">
                    {p.location}
                </div>
            )
        },
        {
            id: 'family',
            label: 'Familie',
            icon: Users,
            color: 'green',
            fullWidth: true,
            isActive: (p) => p.family && p.family.length > 0,
            render: (p) => {
                return (
                    <div className="flex flex-wrap gap-3">
                        {p.family.map((member, idx) => {
                            if (member.id) {
                                return (
                                    <button key={`fam-${member.id}`} onClick={() => navigate(`/person/${member.id}`, { state: { activeTab } })} className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-xl text-green-300 text-xs font-bold uppercase transition-all flex flex-col items-start gap-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                            <span>{member.name}</span>
                                        </div>
                                        <span className="text-[10px] text-green-500/60 tracking-wider">als {getGenderedStatus(member.status, member.gender)}</span>
                                    </button>
                                );
                            }
                            return (
                                <div key={`fam-unlinked-${idx}`} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 text-xs font-mono uppercase flex flex-col items-start gap-1">
                                    <span>{member.name}</span>
                                    <span className="text-[10px] text-gray-500 tracking-wider">als {member.status}</span>
                                </div>
                            );
                        })}
                    </div>
                );
            }
        },
        {
            id: 'partners',
            label: 'Beziehungen',
            icon: Heart,
            color: 'red',
            fullWidth: true,
            isActive: (p) => p.partners && p.partners.length > 0,
            render: (p) => {
                return (
                    <div className="flex flex-wrap gap-3">
                        {p.partners.map((member, idx) => {
                            if (member.id) {
                                return (
                                    <button key={`part-${member.id}`} onClick={() => navigate(`/person/${member.id}`, { state: { activeTab } })} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-300 text-xs font-bold uppercase transition-all flex flex-col items-start gap-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                            <span>{member.name}</span>
                                        </div>
                                        <span className="text-[10px] text-red-500/60 tracking-wider">als {getGenderedStatus(member.status, member.gender)}</span>
                                    </button>
                                );
                            }
                            return (
                                <div key={`part-unlinked-${idx}`} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 text-xs font-mono uppercase flex flex-col items-start gap-1">
                                    <span>{member.name}</span>
                                    <span className="text-[10px] text-gray-500 tracking-wider">als {member.status}</span>
                                </div>
                            );
                        })}
                    </div>
                );
            }
        },
        {
            id: 'social',
            label: 'Soziales Umfeld',
            icon: Users,
            color: 'blue',
            fullWidth: true,
            isActive: (p) => p.social && p.social.length > 0,
            render: (p) => {
                return (
                    <div className="flex flex-wrap gap-3">
                        {p.social.map((member, idx) => {
                            if (member.id) {
                                return (
                                    <button key={`soc-${member.id}`} onClick={() => navigate(`/person/${member.id}`, { state: { activeTab } })} className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-blue-300 text-xs font-bold uppercase transition-all flex flex-col items-start gap-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                            <span>{member.name}</span>
                                        </div>
                                        <span className="text-[10px] text-blue-500/60 tracking-wider">als {getGenderedStatus(member.status, member.gender)}</span>
                                    </button>
                                );
                            }
                            return (
                                <div key={`soc-unlinked-${idx}`} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 text-xs font-mono uppercase flex flex-col items-start gap-1">
                                    <span>{member.name}</span>
                                    <span className="text-[10px] text-gray-500 tracking-wider">als {member.status}</span>
                                </div>
                            );
                        })}
                    </div>
                );
            }
        },
        {
            id: 'additional_info',
            label: 'Zusatzinfos',
            icon: Info,
            color: 'purple',
            fullWidth: true,
            isActive: (p) => p.additional_info && p.additional_info.trim().length > 0,
            render: (p) => (
                <p className="text-gray-400 leading-relaxed font-mono text-sm whitespace-pre-wrap p-4 bg-black/20 rounded-xl border border-white/5">
                    {p.additional_info}
                </p>
            )
        },
        {
            id: 'online_profiles',
            label: 'Online-Profile',
            icon: Globe,
            color: 'blue',
            fullWidth: true,
            isActive: (p) => p.online_profiles && p.online_profiles.length > 0,
            render: (p) => {
                return (
                    <div className="flex flex-wrap gap-3">
                        {p.online_profiles.map((profile, idx) => (
                            <div key={`profile-${idx}`} className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300 text-xs font-bold uppercase transition-all flex flex-col items-start gap-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                    <span>{profile.platform}</span>
                                </div>
                                <span className="text-[10px] text-blue-500/60 tracking-wider font-mono lowercase">{profile.username}</span>
                            </div>
                        ))}
                    </div>
                );
            }
        }
    ];

    const activeModules = modules.filter(m => m.isActive(person));
    const inactiveModules = modules.filter(m => !m.isActive(person));

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white p-8 selection:bg-blue-500/30">
            <div className="max-w-4xl mx-auto space-y-8">

                <motion.button onClick={() => navigate('/', { state: { activeTab } })} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-mono text-xs uppercase group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    {getBackButtonText()}
                </motion.button>

                <div className="bg-[#121214] border border-white/10 rounded-3xl p-10 shadow-2xl relative overflow-visible backdrop-blur-xl">
                    <div className="absolute top-0 right-0 p-40 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 p-40 bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

                    {isEditing ? (
                        <div className="relative z-10">
                            <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 border-b border-white/10 pb-4">Profil-Editor</h2>

                            <PersonForm
                                initialData={person}
                                onSubmit={handleUpdate}
                                onCancel={() => {
                                    setIsEditing(false);
                                    setFocusedModule(null);
                                }}
                                autoFocusField={focusedModule}
                            />
                        </div>
                    ) : (
                        <div className="relative z-10 space-y-10">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-blue-500 pl-6 py-2">
                                <div>
                                    <div className="text-[10px] font-mono text-blue-500/50 uppercase tracking-[0.3em] mb-1">Stammdatei</div>
                                    <h1 className="text-5xl font-black text-white tracking-tighter uppercase">{person.name}</h1>
                                </div>
                                <div className="flex gap-3">
                                    {(user?.role === 'admin' || user?.role === 'editor') && (
                                        <button onClick={() => setIsEditing(true)} className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-blue-400 border border-white/10 transition-all shadow-lg"><Edit3 size={20} /></button>
                                    )}
                                    {user?.role === 'admin' && (
                                        <button onClick={() => setShowDeleteModal(true)} className="p-4 bg-red-500/10 hover:bg-red-500/20 rounded-full text-red-500 border border-red-500/20 transition-all shadow-lg"><Trash2 size={20} /></button>
                                    )}
                                </div>
                            </div>

                            {/* ACTIVE MODULES GRID */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <AnimatePresence mode="popLayout">
                                    {activeModules.map((module) => {
                                        const getColorStyles = (color) => {
                                            switch (color) {
                                                case 'blue': return 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:border-blue-500/30';
                                                case 'orange': return 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:border-orange-500/30';
                                                case 'green': return 'bg-green-500/10 text-green-400 border-green-500/20 hover:border-green-500/30';
                                                case 'red': return 'bg-red-500/10 text-red-400 border-red-500/20 hover:border-red-500/30';
                                                case 'purple': return 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:border-purple-500/30';
                                                default: return 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20';
                                            }
                                        };
                                        const styles = getColorStyles(module.color);

                                        return (
                                            <motion.div
                                                key={module.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className={`${module.fullWidth ? 'col-span-full' : ''} bg-white/5 border border-white/10 rounded-3xl p-6 transition-colors group relative ${styles.split(' ').pop()}`}
                                            >
                                                <div className="flex items-center gap-3 mb-4 text-gray-500">
                                                    <div className={`p-2 rounded-2xl border ${styles.split(' ').slice(0, 3).join(' ')}`}>
                                                        <module.icon size={18} />
                                                    </div>
                                                    <span className="text-[10px] font-mono uppercase tracking-[0.2em]">{module.label}</span>
                                                </div>
                                                {module.render(person)}
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </div>

                <ConfirmationModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} title="Eintrag löschen" message={`Möchten Sie ${person.name} wirklich löschen?`} isDanger={true} />
                <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
            </div>
        </div>
    );
};

export default PersonDetail;
