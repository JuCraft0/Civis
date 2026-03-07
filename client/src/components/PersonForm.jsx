import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { motion, AnimatePresence } from 'framer-motion';
import { getGroups, getPeople } from '../services/api';
import HUDSelect from './HUDSelect';
import { Calendar as CalendarIcon, Save, X, Users, Search, UserPlus, UserMinus, Plus, Image as ImageIcon, Upload, ChevronDown, Globe, Trash2, Scan } from 'lucide-react';
import { analyzeFace } from '../services/api';

const calculateAge = (birthDate) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

const InlineStatusSelect = ({ value, options, onChange, colorClass }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = React.useRef(null);

    React.useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 bg-black/60 border border-white/10 hover:border-white/20 rounded-lg px-2.5 py-1.5 text-[10px] uppercase font-mono text-gray-300 transition-all cursor-pointer"
            >
                {value}
                <ChevronDown size={10} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        className="absolute right-0 top-full mt-1 z-50 bg-[#121214] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[160px]"
                    >
                        <div className="max-h-48 overflow-y-auto">
                            {options.map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        onChange(opt);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full px-4 py-2.5 flex items-center gap-2.5 text-left transition-all border-b border-white/5 last:border-0 hover:bg-white/5 ${value === opt ? 'bg-white/5' : ''
                                        }`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full ${value === opt ? 'bg-current opacity-80' : 'bg-transparent'}`}></div>
                                    <span className={`font-mono text-[10px] uppercase tracking-wider ${value === opt ? 'text-white font-bold' : 'text-gray-400'}`}>{opt}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const RelationSection = ({
    label,
    type,
    search,
    setSearch,
    show,
    setShow,
    colorClass,
    iconColor,
    formData,
    getSuggestions,
    handleAddRelation,
    handleRemoveRelation,
    handleUpdateRelationStatus,
    allPeople,
    statusOptions
}) => {
    // formData[type] is now an array of objects: [{ name: '...', status: '...' }]
    const relationsList = formData[type] || [];
    const suggestions = getSuggestions(search, type);

    const activeDefaultStatus = statusOptions[0];

    return (
        <div className="space-y-4">
            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2">{label}</label>

            <div className="relative">
                <div className="relative flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setShow(true);
                            }}
                            onFocus={() => setShow(true)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all uppercase font-mono text-sm"
                            placeholder="SUCHEN & HINZUFÜGEN..."
                        />
                    </div>
                </div>

                <AnimatePresence>
                    {show && search && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-20 w-full mt-2 bg-[#1a1a1c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                        >
                            {suggestions.length > 0 ? (
                                suggestions.map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleAddRelation(p.name, type, activeDefaultStatus);
                                        }}
                                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-500/10 text-left transition-colors border-b border-white/5 last:border-0"
                                    >
                                        <span className="font-mono text-xs text-white uppercase">{p.name} <span className="text-[10px] text-gray-500 ml-2">als {activeDefaultStatus}</span></span>
                                        <UserPlus size={14} className={iconColor} />
                                    </button>
                                ))
                            ) : (
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleAddRelation(search, type, activeDefaultStatus);
                                    }}
                                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-orange-500/10 text-left transition-colors"
                                >
                                    <span className="font-mono text-[10px] text-orange-400 uppercase">'{search}' als {activeDefaultStatus} hinzufügen</span>
                                    <Plus size={14} className="text-orange-500" />
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex flex-col gap-2">
                {relationsList.map(relation => {
                    const person = allPeople?.find(p => p.name.toLowerCase() === relation.name.toLowerCase());
                    const isLinked = !!person;

                    return (
                        <motion.div
                            layout
                            key={relation.name}
                            className={`px-3 py-2 ${colorClass} bg-black/40 border rounded-xl text-[10px] font-mono flex items-center justify-between group transition-all`}
                        >
                            <div className="flex items-center gap-3">
                                {isLinked ? (
                                    <Link
                                        to={`/person/${person.id}`}
                                        className="hover:underline flex items-center gap-1.5 uppercase font-bold"
                                        title="Profil öffnen"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60 group-hover:animate-ping"></div>
                                        {relation.name}
                                    </Link>
                                ) : (
                                    <span className="uppercase font-bold flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-30"></div>
                                        {relation.name}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <InlineStatusSelect
                                    value={relation.status}
                                    options={statusOptions}
                                    onChange={(val) => handleUpdateRelationStatus(relation.name, type, val)}
                                    colorClass={colorClass}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveRelation(relation.name, type)}
                                    className="text-gray-500 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-black/40"
                                    title="Entfernen"
                                >
                                    <UserMinus size={14} />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
                {relationsList.length === 0 && (
                    <span className="text-[10px] font-mono text-gray-700 uppercase italic">Keine Einträge ausgewählt.</span>
                )}
            </div>
        </div>
    );
};

const PersonForm = ({ initialData, onSubmit, onCancel, autoFocusField = null }) => {
    const [formData, setFormData] = useState({
        name: '',
        birth_date: '',
        age: '',
        gender: '',
        aliases: '',
        location: '',
        additional_info: '',
        group_id: '',
        family: [],
        partners: [],
        social: [],
        online_profiles: [],
        photo_url: '',
        photo_urls: []
    });
    const [photoFiles, setPhotoFiles] = useState([null, null, null, null, null]);
    const [photoPreviews, setPhotoPreviews] = useState(['', '', '', '', '']);

    const [groups, setGroups] = useState([]);
    const [allPeople, setAllPeople] = useState([]);

    const [searchQuery, setSearchQuery] = useState({ family: '', partners: '', social: '' });
    const [showSuggestions, setShowSuggestions] = useState({ family: false, partners: false, social: false });

    // New states for dynamic modules
    const [activeModules, setActiveModules] = useState(['name']);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showCustomGender, setShowCustomGender] = useState(false);

    const moduleCategories = {
        'Allgemein': [
            { id: 'photo', label: 'Foto', icon: ImageIcon },
            { id: 'age', label: 'Alter (Geburtsdatum)', icon: CalendarIcon },
            { id: 'gender', label: 'Geschlecht', icon: Users },
            { id: 'aliases', label: 'Alias', icon: Users },
            { id: 'location', label: 'Wohnort', icon: Users },
            { id: 'additional_info', label: 'Zusätzliche Infos', icon: Plus }
        ],
        'Verbindungen': [
            { id: 'group_id', label: 'Gruppe', icon: Users },
            { id: 'family', label: 'Familie', icon: Users },
            { id: 'partners', label: 'Beziehung/Partner', icon: Users },
            { id: 'social', label: 'Soziales Umfeld', icon: Users },
            { id: 'online_profiles', label: 'Online-Profile', icon: Globe }
        ]
    };

    useEffect(() => {
        if (autoFocusField) {
            const timer = setTimeout(() => {
                const element = document.getElementsByName(autoFocusField)[0];
                if (element) {
                    element.focus();
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [autoFocusField]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [groupsRes, peopleRes] = await Promise.all([
                    getGroups(),
                    getPeople()
                ]);
                setGroups(groupsRes.data);
                setAllPeople(peopleRes.data);
            } catch (err) {
                console.error("Failed to fetch data", err);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (initialData) {
            let formattedDate = initialData.birth_date || '';
            if (formattedDate.includes('T')) {
                formattedDate = formattedDate.split('T')[0];
            }

            setFormData(prev => ({
                ...prev,
                name: initialData.name || '',
                birth_date: formattedDate,
                age: formattedDate ? calculateAge(formattedDate) : (initialData.age || ''),
                gender: initialData.gender || '',
                aliases: initialData.aliases || '',
                location: initialData.location || '',
                additional_info: initialData.additional_info || '',
                group_id: initialData.group_id !== null && initialData.group_id !== undefined ? initialData.group_id : '',
                family: initialData.family || [],
                partners: initialData.partners || [],
                social: initialData.social || [],
                online_profiles: initialData.online_profiles || [],
                photo_url: initialData.photo_url || '',
                photo_urls: initialData.photo_urls || []
            }));

            // Initialize active modules based on existing data
            const initialActive = ['name'];
            if (formattedDate || initialData.age) initialActive.push('age');
            if (initialData.gender) initialActive.push('gender');
            if (initialData.aliases) initialActive.push('aliases');
            if (initialData.location) initialActive.push('location');
            if (initialData.group_id !== null && initialData.group_id !== undefined) initialActive.push('group_id');
            if (initialData.family && initialData.family.length > 0) initialActive.push('family');
            if (initialData.partners && initialData.partners.length > 0) initialActive.push('partners');
            if (initialData.social && initialData.social.length > 0) initialActive.push('social');
            if (initialData.online_profiles && initialData.online_profiles.length > 0) initialActive.push('online_profiles');
            if (initialData.additional_info) initialActive.push('additional_info');

            if (initialData.photo_url || (initialData.photo_urls && initialData.photo_urls.filter(u => u).length > 0)) {
                initialActive.push('photo');

                const newPreviews = ['', '', '', '', ''];
                const urls = initialData.photo_urls || [];

                // If we have old-style photo_url but no photo_urls, use it as index 0
                if (initialData.photo_url && (!urls || urls.length === 0)) {
                    const pUrl = initialData.photo_url.startsWith('/') ? initialData.photo_url : `/${initialData.photo_url}`;
                    newPreviews[0] = `${pUrl}`;
                } else {
                    urls.forEach((url, idx) => {
                        if (url && idx < 5) {
                            const pUrl = url.startsWith('/') ? url : `/${url}`;
                            newPreviews[idx] = `${pUrl}`;
                        }
                    });
                }
                setPhotoPreviews(newPreviews);
            }

            // Also include autoFocusField if it was requested from the dashboard/view mode
            if (autoFocusField && autoFocusField !== 'birth_date' && !initialActive.includes(autoFocusField)) {
                initialActive.push(autoFocusField);
            } else if (autoFocusField === 'birth_date' && !initialActive.includes('age')) {
                initialActive.push('age');
            }

            setActiveModules(initialActive);
        }
    }, [initialData, autoFocusField]);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiDetection, setAiDetection] = useState(null);

    const handlePhotoChange = async (e, index) => {
        const file = e.target.files[0];
        if (file) {
            setPhotoFiles(prev => {
                const newFiles = [...prev];
                newFiles[index] = file;
                return newFiles;
            });
            setPhotoPreviews(prev => {
                const newPreviews = [...prev];
                newPreviews[index] = URL.createObjectURL(file);
                return newPreviews;
            });

            if (index === 0) {
                setIsAnalyzing(true);
                setAiDetection(null);
                try {
                    const res = await analyzeFace(file);
                    setAiDetection(res.data);
                } catch (err) {
                    console.error("AI Analysis failed", err);
                } finally {
                    setIsAnalyzing(false);
                }
            }
        }
    };

    const handlePhotoDelete = (index) => {
        setPhotoFiles(prev => {
            const newFiles = [...prev];
            newFiles[index] = null;
            return newFiles;
        });
        setPhotoPreviews(prev => {
            const newPreviews = [...prev];
            newPreviews[index] = '';
            return newPreviews;
        });

        // Update formData to clear existing photo configurations
        setFormData(prev => {
            const newUrls = [...(prev.photo_urls || ['', '', '', '', ''])];
            newUrls[index] = '';
            return {
                ...prev,
                photo_urls: newUrls,
                photo_url: index === 0 ? '' : prev.photo_url
            };
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'birth_date') {
            const age = calculateAge(value);
            setFormData(prev => ({
                ...prev,
                birth_date: value,
                age: age
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleAddRelation = (name, type, status) => {
        const current = formData[type] || [];
        if (!current.some(r => r.name.toLowerCase() === name.toLowerCase())) {
            setFormData(prev => ({
                ...prev,
                [type]: [...current, { name, status }]
            }));
        }
        setSearchQuery(prev => ({ ...prev, [type]: '' }));
        setShowSuggestions(prev => ({ ...prev, [type]: false }));
    };

    const handleUpdateRelationStatus = (name, type, newStatus) => {
        setFormData(prev => ({
            ...prev,
            [type]: (prev[type] || []).map(r => r.name === name ? { ...r, status: newStatus } : r)
        }));
    };

    const handleRemoveRelation = (name, type) => {
        const current = formData[type] || [];
        setFormData(prev => ({
            ...prev,
            [type]: current.filter(r => r.name !== name)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Clean up unselected modules before submitting
        const finalData = { ...formData };
        if (!activeModules.includes('age')) {
            finalData.birth_date = null;
            finalData.age = null;
        }
        if (!activeModules.includes('gender')) finalData.gender = '';
        if (!activeModules.includes('aliases')) finalData.aliases = '';
        if (!activeModules.includes('location')) finalData.location = '';
        if (!activeModules.includes('group_id')) finalData.group_id = null;
        if (!activeModules.includes('family')) finalData.family = [];
        if (!activeModules.includes('partners')) finalData.partners = [];
        if (!activeModules.includes('social')) finalData.social = [];
        if (!activeModules.includes('online_profiles')) finalData.online_profiles = [];
        if (!activeModules.includes('additional_info')) finalData.additional_info = '';
        if (!activeModules.includes('photo')) {
            finalData.photo_url = '';
            finalData.photo_urls = [];
        }

        onSubmit({
            ...finalData,
            group_id: finalData.group_id === '' || finalData.group_id === null ? null : parseInt(finalData.group_id)
        }, photoFiles);
    };

    const getSuggestions = (search, type) => {
        if (!search) return [];
        return allPeople.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase()) &&
            p.name.toLowerCase() !== formData.name.toLowerCase() &&
            !(formData[type] || []).some(r => r.name.toLowerCase() === p.name.toLowerCase())
        ).slice(0, 5);
    };

    const toggleModule = (moduleId) => {
        setActiveModules(prev => {
            if (prev.includes(moduleId)) {
                if (moduleId === 'photo') {
                    setPhotoFiles([null, null, null, null, null]);
                    setPhotoPreviews(['', '', '', '', '']);
                }
                return prev.filter(id => id !== moduleId);
            } else {
                return [...prev, moduleId];
            }
        });
        setShowAddMenu(false);
    };

    const renderRemoveButton = (moduleId) => (
        <button
            type="button"
            onClick={() => toggleModule(moduleId)}
            className="absolute -top-1 -right-1 w-8 h-8 bg-black border border-red-500/20 hover:border-red-500/50 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 shadow-lg"
            title="Modul entfernen"
        >
            <X size={14} />
        </button>
    );

    return (
        <form onSubmit={handleSubmit} className="relative space-y-6 pt-12">
            {/* Add Module Button & Dropdown */}
            <div className="absolute top-0 right-0 z-50">
                <button
                    type="button"
                    onClick={() => setShowAddMenu(!showAddMenu)}
                    className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-4 py-2 rounded-full border border-blue-500/20 transition-all font-mono text-xs uppercase"
                >
                    <Plus size={16} /> Modul hinzufügen
                </button>

                <AnimatePresence>
                    {showAddMenu && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-0 top-full mt-2 w-72 bg-[#121214] border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-4 z-50 overflow-y-auto max-h-[60vh]"
                        >
                            {Object.entries(moduleCategories).map(([category, mods]) => {
                                const availableMods = mods.filter(m => !activeModules.includes(m.id));
                                if (availableMods.length === 0) return null;

                                return (
                                    <div key={category}>
                                        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 px-2">{category}</div>
                                        <div className="flex flex-col gap-1">
                                            {availableMods.map(module => (
                                                <button
                                                    key={module.id}
                                                    type="button"
                                                    onClick={() => toggleModule(module.id)}
                                                    className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-xl transition-colors text-left text-gray-300 hover:text-white group"
                                                >
                                                    <module.icon size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
                                                    <span className="text-xs font-bold uppercase">{module.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            {Object.values(moduleCategories).flat().every(m => activeModules.includes(m.id)) && (
                                <div className="text-xs text-gray-500 text-center py-2 font-mono italic">
                                    Alle Module aktiv
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Always visible: Name */}
            <div className="space-y-2 relative">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Name</label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all uppercase font-mono text-sm"
                    placeholder="NAME EINGEBEN..."
                />
            </div>

            <AnimatePresence mode="popLayout">
                {activeModules.includes('photo') && (
                    <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group p-1">
                        {renderRemoveButton('photo')}
                        <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-4">Fotos (Maximale Erfassung: 5 Kacheln)</label>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                            {[0, 1, 2, 3, 4].map((idx) => (
                                <div key={`photo-tile-${idx}`} className="relative group/tile aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-blue-500/30 bg-black/40 hover:bg-black/60 transition-all overflow-hidden flex flex-col items-center justify-center p-2">
                                    {photoPreviews[idx] ? (
                                        <div className="w-full h-full relative rounded-xl overflow-hidden">
                                            <img src={photoPreviews[idx]} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/tile:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                                <ImageIcon size={16} className="text-blue-400" />
                                                <span className="text-[8px] uppercase font-bold text-white bg-blue-600/80 px-2 py-0.5 rounded-full">ERSETZEN</span>
                                            </div>
                                            <input type="file" accept="image/*" onChange={(e) => handlePhotoChange(e, idx)} className="absolute inset-0 opacity-0 cursor-pointer z-10" title={`Foto ${idx + 1} ändern`} />

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handlePhotoDelete(idx);
                                                }}
                                                className="absolute top-2 right-2 z-20 p-2 bg-red-500 hover:bg-red-400 text-white rounded-lg shadow-lg opacity-0 group-hover/tile:opacity-100 transition-all cursor-pointer border border-red-400/50"
                                                title="Foto löschen"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="p-3 rounded-full bg-white/5 text-gray-600 group-hover/tile:text-blue-400 group-hover/tile:bg-blue-500/10 transition-all border border-transparent group-hover/tile:border-blue-500/20">
                                                <Upload size={18} />
                                            </div>
                                            <span className="text-[8px] font-mono text-gray-600 group-hover/tile:text-blue-500 transition-colors uppercase tracking-[0.1em]">SLOT {idx + 1}</span>
                                            <input type="file" accept="image/*" onChange={(e) => handlePhotoChange(e, idx)} className="absolute inset-0 opacity-0 cursor-pointer z-10" title={`Foto ${idx + 1} hochladen`} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <AnimatePresence>
                            {(isAnalyzing || aiDetection) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="mt-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg bg-blue-500/10 text-blue-400 ${isAnalyzing ? 'animate-pulse' : ''}`}>
                                            <Scan size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">KI-Sichtprüfung</span>
                                            <span className="text-xs font-bold text-white uppercase">
                                                {isAnalyzing ? 'Analysiere Daten...' : `Age: ${aiDetection.estimatedAge} // Gender: ${aiDetection.estimatedGender === 'male' ? 'M' : 'F'}`}
                                            </span>
                                        </div>
                                    </div>
                                    {!isAnalyzing && (
                                        <div className="text-[10px] font-mono text-blue-500/50 uppercase">Vertrauen: {(aiDetection.confidence * 100).toFixed(0)}%</div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {activeModules.includes('age') && (
                    <motion.div
                        layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                        className="grid grid-cols-2 gap-4 relative group"
                    >
                        {renderRemoveButton('age')}
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Geburtsdatum</label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                                <input
                                    type="date"
                                    name="birth_date"
                                    value={formData.birth_date}
                                    onChange={handleChange}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all font-mono text-sm uppercase appearance-none"
                                    style={{ colorScheme: 'dark' }}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Berechnetes Alter</label>
                            <div className="w-full bg-black/20 border border-white/5 rounded-2xl px-4 py-3 text-gray-400 font-mono text-sm">
                                {formData.age ? `${formData.age} JAHRE` : '--'}
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeModules.includes('group_id') && (
                    <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group p-1">
                        {renderRemoveButton('group_id')}
                        <HUDSelect
                            label="Gruppe"
                            icon={Users}
                            value={formData.group_id}
                            onChange={(val) => setFormData(prev => ({ ...prev, group_id: val }))}
                            options={[
                                { value: "", label: "[KEINE GRUPPE]" },
                                ...groups.map(g => ({
                                    value: g.id,
                                    label: g.full_path ? g.full_path.join(' > ').toUpperCase() : g.name.toUpperCase()
                                }))
                            ]}
                            color="blue"
                        />
                    </motion.div>
                )}

                {activeModules.includes('gender') && (
                    <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group space-y-2 p-1">
                        {renderRemoveButton('gender')}
                        <HUDSelect
                            label="Geschlecht"
                            icon={Users}
                            value={showCustomGender || !['Männlich', 'Weiblich', 'Non-Binary', ''].includes(formData.gender) ? 'Anderes' : formData.gender}
                            onChange={(val) => {
                                if (val === 'Anderes') {
                                    setShowCustomGender(true);
                                    setFormData(prev => ({ ...prev, gender: '' }));
                                } else {
                                    setShowCustomGender(false);
                                    setFormData(prev => ({ ...prev, gender: val }));
                                }
                            }}
                            options={[
                                { value: "", label: "[AUSWÄHLEN]" },
                                { value: "Männlich", label: "MÄNNLICH" },
                                { value: "Weiblich", label: "WEIBLICH" },
                                { value: "Non-Binary", label: "NON-BINARY" },
                                { value: "Anderes", label: "ANDERES..." }
                            ]}
                            color="purple"
                        />
                        {(showCustomGender || !['Männlich', 'Weiblich', 'Non-Binary', ''].includes(formData.gender)) && (
                            <input
                                type="text"
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all uppercase font-mono text-sm mt-2"
                                placeholder="GESCHLECHT EINGEBEN..."
                                autoFocus
                            />
                        )}
                    </motion.div>
                )}

                {activeModules.includes('aliases') && (
                    <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group space-y-2 p-1">
                        {renderRemoveButton('aliases')}
                        <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Alias (Spitznamen)</label>
                        <input
                            type="text"
                            name="aliases"
                            value={formData.aliases}
                            onChange={handleChange}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all uppercase font-mono text-sm"
                            placeholder="ALIAS EINGEBEN..."
                        />
                    </motion.div>
                )}

                {activeModules.includes('location') && (
                    <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group space-y-2 p-1">
                        {renderRemoveButton('location')}
                        <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Wohnort</label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all uppercase font-mono text-sm"
                            placeholder="WOHNORT EINGEBEN..."
                        />
                    </motion.div>
                )}

                {/* Family Section */}
                {activeModules.includes('family') && (
                    <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group p-1">
                        {renderRemoveButton('family')}
                        <RelationSection
                            label="Familie verknüpfen"
                            type="family"
                            search={searchQuery.family}
                            setSearch={(val) => setSearchQuery(p => ({ ...p, family: val }))}
                            show={showSuggestions.family}
                            setShow={(val) => setShowSuggestions(p => ({ ...p, family: val }))}
                            colorClass="bg-blue-500/10 text-blue-400 border-blue-500/20"
                            iconColor="text-blue-500"
                            formData={formData}
                            getSuggestions={getSuggestions}
                            handleAddRelation={handleAddRelation}
                            handleRemoveRelation={handleRemoveRelation}
                            handleUpdateRelationStatus={handleUpdateRelationStatus}
                            allPeople={allPeople}
                            statusOptions={['Vater', 'Mutter', 'Sohn', 'Tochter', 'Bruder', 'Schwester', 'Großmutter', 'Großvater', 'Elternteil', 'Kind', 'Geschwister', 'Großeltern']}
                        />
                    </motion.div>
                )}

                {/* Partners Section */}
                {activeModules.includes('partners') && (
                    <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group p-1">
                        {renderRemoveButton('partners')}
                        <RelationSection
                            label="Beziehungen & Partner"
                            type="partners"
                            search={searchQuery.partners}
                            setSearch={(val) => setSearchQuery(p => ({ ...p, partners: val }))}
                            show={showSuggestions.partners}
                            setShow={(val) => setShowSuggestions(p => ({ ...p, partners: val }))}
                            colorClass="bg-red-500/10 text-red-400 border-red-500/20"
                            iconColor="text-red-500"
                            formData={formData}
                            getSuggestions={getSuggestions}
                            handleAddRelation={handleAddRelation}
                            handleRemoveRelation={handleRemoveRelation}
                            handleUpdateRelationStatus={handleUpdateRelationStatus}
                            allPeople={allPeople}
                            statusOptions={['Dating', 'Ehepartner', 'Verlobt', 'Ex-Partner', 'Crush', 'Feste Beziehung']}
                        />
                    </motion.div>
                )}

                {/* Social Section */}
                {activeModules.includes('social') && (
                    <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group p-1">
                        {renderRemoveButton('social')}
                        <RelationSection
                            label="Soziales Umfeld"
                            type="social"
                            search={searchQuery.social}
                            setSearch={(val) => setSearchQuery(p => ({ ...p, social: val }))}
                            show={showSuggestions.social}
                            setShow={(val) => setShowSuggestions(p => ({ ...p, social: val }))}
                            colorClass="bg-green-500/10 text-green-400 border-green-500/20"
                            iconColor="text-green-500"
                            formData={formData}
                            getSuggestions={getSuggestions}
                            handleAddRelation={handleAddRelation}
                            handleRemoveRelation={handleRemoveRelation}
                            handleUpdateRelationStatus={handleUpdateRelationStatus}
                            allPeople={allPeople}
                            statusOptions={['Bester Freund/Freundin', 'Freund/Freundin', 'Bekannter/Bekannte', 'Nachbar/Nachbarinn', 'Mitbewohner/Mitbewohnerinn']}
                        />
                    </motion.div>
                )}

                {/* Online Profiles Section */}
                {activeModules.includes('online_profiles') && (
                    <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group p-1 space-y-4">
                        {renderRemoveButton('online_profiles')}
                        <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Online-Profile</label>

                        {/* Existing profiles */}
                        <div className="flex flex-col gap-2">
                            {(formData.online_profiles || []).map((profile, idx) => (
                                <motion.div
                                    layout
                                    key={`profile-${idx}`}
                                    className="px-3 py-2 bg-cyan-500/10 text-cyan-400 border-cyan-500/20 bg-black/40 border rounded-xl text-[10px] font-mono flex items-center justify-between group/item transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 opacity-60"></div>
                                        <span className="uppercase font-bold">{profile.platform}</span>
                                        <span className="text-gray-500">—</span>
                                        <span className="text-gray-300">{profile.username}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData(prev => ({
                                                ...prev,
                                                online_profiles: prev.online_profiles.filter((_, i) => i !== idx)
                                            }));
                                        }}
                                        className="text-gray-500 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-black/40"
                                        title="Entfernen"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </motion.div>
                            ))}
                            {(formData.online_profiles || []).length === 0 && (
                                <span className="text-[10px] font-mono text-gray-700 uppercase italic">Keine Profile hinzugefügt.</span>
                            )}
                        </div>

                        {/* Add new profile */}
                        <div className="bg-black/20 border border-white/5 rounded-2xl p-4 space-y-3">
                            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Neues Profil hinzufügen</div>
                            <div className="grid grid-cols-2 gap-3">
                                <HUDSelect
                                    label="Platform"
                                    icon={Globe}
                                    value={formData._newProfilePlatform || ''}
                                    onChange={(val) => setFormData(prev => ({ ...prev, _newProfilePlatform: val }))}
                                    options={[
                                        { value: '', label: '[AUSWÄHLEN]' },
                                        { value: 'Instagram', label: 'INSTAGRAM' },
                                        { value: 'Facebook', label: 'FACEBOOK' },
                                        { value: 'X', label: 'X (TWITTER)' },
                                        { value: 'TikTok', label: 'TIKTOK' },
                                        { value: 'Telegram', label: 'TELEGRAM' },
                                        { value: 'Discord', label: 'DISCORD' },
                                        { value: 'YouTube', label: 'YOUTUBE' },
                                        { value: 'Twitch', label: 'TWITCH' },
                                        { value: 'Steam', label: 'STEAM' }
                                    ]}
                                    color="blue"
                                />
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Benutzername</label>
                                    <input
                                        type="text"
                                        value={formData._newProfileUsername || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, _newProfileUsername: e.target.value }))}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-all uppercase font-mono text-sm"
                                        placeholder="@BENUTZERNAME..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const platform = formData._newProfilePlatform;
                                                const username = formData._newProfileUsername?.trim();
                                                if (platform && username) {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        online_profiles: [...(prev.online_profiles || []), { platform, username }],
                                                        _newProfilePlatform: '',
                                                        _newProfileUsername: ''
                                                    }));
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const platform = formData._newProfilePlatform;
                                    const username = formData._newProfileUsername?.trim();
                                    if (platform && username) {
                                        setFormData(prev => ({
                                            ...prev,
                                            online_profiles: [...(prev.online_profiles || []), { platform, username }],
                                            _newProfilePlatform: '',
                                            _newProfileUsername: ''
                                        }));
                                    }
                                }}
                                className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-xl py-2.5 font-mono text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={14} /> Profil hinzufügen
                            </button>
                        </div>
                    </motion.div>
                )}

                {activeModules.includes('additional_info') && (
                    <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group space-y-2 p-1">
                        {renderRemoveButton('additional_info')}
                        <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Zusätzliche Infos</label>
                        <textarea
                            name="additional_info"
                            value={formData.additional_info}
                            onChange={handleChange}
                            rows={4}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-blue-500 transition-all uppercase font-mono text-sm resize-none"
                            placeholder="DETAILS..."
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex gap-4 pt-4">
                <motion.button
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(37, 99, 235, 1)' }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="flex-1 bg-blue-600/80 text-white rounded-full py-4 flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-blue-500/10 border border-blue-400/20"
                >
                    <Save size={18} />
                    Speichern
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={onCancel}
                    className="px-8 bg-white/5 text-white rounded-full py-4 flex items-center justify-center gap-2 font-bold uppercase text-xs tracking-widest transition-all border border-white/10"
                >
                    <X size={18} />
                    Abbrechen
                </motion.button>
            </div>
        </form>
    );
};

export default PersonForm;
