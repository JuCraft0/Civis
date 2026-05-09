import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { motion, AnimatePresence } from 'framer-motion';
import { getPerson, updatePerson, deletePerson, uploadPhoto, deletePhoto, getGroups, getPeople } from '../services/api';
import HUDSelect from './HUDSelect';
import { Calendar as CalendarIcon, Save, X, Users, Search, UserPlus, UserMinus, Plus, Image as ImageIcon, Upload, ChevronDown, Globe, Trash2, Scan, Check, MapPin, Clock } from 'lucide-react';
import { analyzeFace, getImmichPeople } from '../services/api';
import axios from 'axios';

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
        else setLoading(false);

        return () => {
            isMounted = false;
            if (imageSrc) URL.revokeObjectURL(imageSrc);
        };
    }, [src]);

    if (loading) return <div className={`${className} bg-white/5 animate-pulse`} />;
    if (!imageSrc) return <div className={`${className} bg-white/5 flex items-center justify-center`}><ImageIcon size={18} className="text-gray-700" /></div>;

    return <img src={imageSrc} alt={alt} className={className} />;
};

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
                        className="absolute right-0 top-full mt-1 z-[100] bg-[#121214] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[160px]"
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
            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] block mb-2 px-1">{label}</label>

            <div className="relative">
                <div className="relative flex gap-2">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setShow(true);
                            }}
                            onFocus={() => setShow(true)}
                            className="w-full glass-panel rounded-2xl pl-11 pr-4 py-3.5 text-white focus:outline-none focus:border-blue-500/50 transition-all uppercase font-mono text-xs tracking-wider border border-white/5 shadow-xl"
                            placeholder="SUCHEN & HINZUFÜGEN..."
                        />
                    </div>
                </div>

                <AnimatePresence>
                    {show && search && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            className="absolute z-[60] w-full mt-3 glass-panel rounded-2xl shadow-2xl overflow-hidden border border-white/10 p-1.5"
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
                                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-500/10 text-left transition-all rounded-xl mb-1 last:mb-0 border border-transparent hover:border-blue-500/20 group"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-mono text-[11px] text-white uppercase tracking-wider font-bold">{p.name}</span>
                                            <span className="text-[9px] text-gray-500 uppercase font-mono tracking-widest mt-0.5">Als {activeDefaultStatus}</span>
                                        </div>
                                        <UserPlus size={14} className={`${iconColor} opacity-50 group-hover:opacity-100 transition-opacity`} />
                                    </button>
                                ))
                            ) : (
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleAddRelation(search, type, activeDefaultStatus);
                                    }}
                                    className="w-full px-4 py-4 flex items-center justify-between hover:bg-orange-500/10 text-left transition-all rounded-xl border border-transparent hover:border-orange-500/20 group"
                                >
                                    <div className="flex flex-col">
                                        <span className="font-mono text-[11px] text-orange-400 uppercase tracking-wider font-bold">'{search}' hinzufügen</span>
                                        <span className="text-[9px] text-orange-400/50 uppercase font-mono tracking-widest mt-0.5">Als {activeDefaultStatus} (Neu)</span>
                                    </div>
                                    <Plus size={16} className="text-orange-500" />
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex flex-col gap-2">
                {relationsList.map((relation, idx) => {
                    const person = allPeople?.find(p => p.name.toLowerCase() === relation.name.toLowerCase());
                    const isLinked = !!person;

                    return (
                        <motion.div
                            layout
                            key={relation.name}
                            style={{ zIndex: 50 - idx }}
                            className={`px-4 py-2.5 glass-panel border rounded-xl text-[10px] font-mono flex items-center justify-between group transition-all hover:border-white/10 relative ${colorClass.split(' ')[0]}`}
                        >
                            <div className="flex items-center gap-3">
                                {isLinked ? (
                                    <Link
                                        to={`/person/${person.id}`}
                                        className="hover:underline flex items-center gap-2.5 uppercase font-black tracking-widest text-white/90 hover:text-white"
                                        title="Profil öffnen"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-current opacity-60"></div>
                                        {relation.name}
                                    </Link>
                                ) : (
                                    <span className="uppercase font-bold flex items-center gap-2.5 text-gray-400">
                                        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-30"></div>
                                        {relation.name}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <InlineStatusSelect
                                    value={relation.status}
                                    options={statusOptions}
                                    onChange={(val) => handleUpdateRelationStatus(relation.name, type, val)}
                                    colorClass={colorClass}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveRelation(relation.name, type)}
                                    className="text-gray-500 hover:text-red-500 transition-all p-2 rounded-xl hover:bg-red-500/10 active:scale-90"
                                    title="Entfernen"
                                >
                                    <UserMinus size={14} />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
                {relationsList.length === 0 && (
                    <div className="px-4 py-3 glass-panel border border-white/5 rounded-xl border-dashed">
                        <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest italic">Keine Einträge verknüpft</span>
                    </div>
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
        immich_person_id: '',
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

    // Immich Selector States
    const [immichPeople, setImmichPeople] = useState([]);
    const [showImmichModal, setShowImmichModal] = useState(false);
    const [immichSearch, setImmichSearch] = useState('');
    const [loadingImmich, setLoadingImmich] = useState(false);

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
            { id: 'online_profiles', label: 'Online-Profile', icon: Globe },
            { id: 'immich_person_id', label: 'Immich Integration', icon: Scan }
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
                const groupsRes = await getGroups();
                // Handle different Axios response wrapping safely
                const groupsData = groupsRes?.data?.data ? groupsRes.data.data : (groupsRes?.data || groupsRes || []);
                if (Array.isArray(groupsData)) {
                    setGroups(groupsData);
                } else if (groupsRes && Array.isArray(groupsRes.data)) {
                    setGroups(groupsRes.data);
                } else {
                    setGroups([]);
                }
            } catch (err) {
                console.error("Failed to fetch groups", err);
            }

            try {
                const peopleRes = await getPeople();
                // Handle different Axios response wrapping safely
                const peopleData = peopleRes?.data?.data ? peopleRes.data.data : (peopleRes?.data || peopleRes || []);
                if (Array.isArray(peopleData)) {
                    setAllPeople(peopleData);
                } else if (peopleRes && Array.isArray(peopleRes.data)) {
                    setAllPeople(peopleRes.data);
                } else {
                    setAllPeople([]);
                }
            } catch (err) {
                console.error("Failed to fetch people", err);
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
                immich_person_id: initialData.immich_person_id || '',
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
            if (initialData.immich_person_id) initialActive.push('immich_person_id');
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

    const handlePhotoDelete = async (index) => {
        // If editing an existing person, delete from server
        if (initialData?.id) {
            try {
                await deletePhoto(initialData.id, index);
            } catch (err) {
                console.error("Failed to delete photo from server", err);
            }
        }

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
        if (!activeModules.includes('immich_person_id')) finalData.immich_person_id = '';
        if (!activeModules.includes('additional_info')) finalData.additional_info = '';
        if (!activeModules.includes('photo')) {
            finalData.photo_url = '';
            finalData.photo_urls = [];
            finalData.face_descriptor = null;
            finalData.ai_metadata = null;
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
            className="absolute top-0 right-0 w-8 h-8 bg-black border border-red-500/20 hover:border-red-500/50 active:border-red-500 text-red-500 rounded-full flex items-center justify-center opacity-100 transition-all z-20 shadow-lg"
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
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            className="absolute z-[100] w-[280px] md:w-[600px] right-0 mt-3 glass-panel rounded-2xl shadow-2xl border border-white/10 overflow-hidden p-2"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
                                {Object.entries(moduleCategories).map(([category, modules]) => {
                                    const availableModules = modules.filter(m => !activeModules.includes(m.id));
                                    if (availableModules.length === 0) return null;

                                    return (
                                        <div key={category} className="p-2">
                                            <h4 className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.2em] mb-2 px-3 border-l border-white/5">{category}</h4>
                                            <div className="space-y-1">
                                                {availableModules.map(module => (
                                                    <button
                                                        key={module.id}
                                                        type="button"
                                                        onClick={() => {
                                                            toggleModule(module.id);
                                                            setShowAddMenu(false);
                                                        }}
                                                        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/5 rounded-xl transition-all text-left group border border-transparent hover:border-white/5"
                                                    >
                                                        <div className="p-1.5 bg-white/5 rounded-lg text-gray-500 group-hover:text-blue-400 transition-colors">
                                                            <module.icon size={14} />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-white uppercase tracking-wider">{module.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {Object.values(moduleCategories).flat().every(m => activeModules.includes(m.id)) && (
                                <div className="p-8 text-center">
                                    <div className="inline-block p-3 rounded-full bg-green-500/10 text-green-400 mb-3">
                                        <Check size={20} />
                                    </div>
                                    <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest italic">Alle verfügbaren Module sind aktiv</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Main Form Content */}
            <div className="glass-panel rounded-3xl border border-white/5 p-8 shadow-2xl relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-30"></div>
                
                <div className="space-y-10 relative">
                    {/* Always visible: Name */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] block mb-2 px-1">Identität / Primärer Name</label>
                        <div className="relative group">
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full glass-panel rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all uppercase font-black text-sm tracking-[0.1em] border border-white/5 shadow-inner"
                                placeholder="VOLLSTÄNDIGER NAME..."
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500/30 group-focus-within:text-blue-500 transition-colors">
                                <Scan size={18} />
                            </div>
                        </div>
                    </div>

                    <AnimatePresence mode="popLayout">
                        {activeModules.includes('photo') && (
                            <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group pt-4">
                                {renderRemoveButton('photo')}
                                <div className="flex items-center justify-between mb-6">
                                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] px-1">Biometrische Erfassung (Max. 5)</label>
                                    <div className="flex gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${photoPreviews[i] ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-white/10'}`}></div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                    {[0, 1, 2, 3, 4].map((idx) => (
                                        <div key={`photo-tile-${idx}`} className="relative group/tile aspect-square rounded-2xl border border-dashed border-white/10 hover:border-blue-500/40 bg-black/40 hover:bg-black/60 transition-all overflow-hidden flex flex-col items-center justify-center p-2 shadow-inner">
                                            {photoPreviews[idx] ? (
                                                <div className="w-full h-full relative rounded-xl overflow-hidden">
                                                    <img src={photoPreviews[idx]} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover grayscale-[0.2] group-hover/tile:grayscale-0 transition-all duration-500" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/tile:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                                                        <Upload size={18} className="text-white" />
                                                        <span className="text-[8px] uppercase font-black text-white tracking-widest bg-blue-600 px-3 py-1 rounded-full shadow-lg">UPDATE</span>
                                                    </div>
                                                    <input type="file" accept="image/*" onChange={(e) => handlePhotoChange(e, idx)} className="absolute inset-0 opacity-0 cursor-pointer z-10" title={`Foto ${idx + 1} ändern`} />

                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handlePhotoDelete(idx);
                                                        }}
                                                        className="absolute top-2 right-2 z-20 p-2 bg-red-500/90 hover:bg-red-500 text-white rounded-xl shadow-xl opacity-0 group-hover/tile:opacity-100 transition-all transform translate-y-2 group-hover/tile:translate-y-0"
                                                        title="Foto löschen"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <div className="p-3 rounded-2xl bg-white/5 text-gray-600 group-hover/tile:text-blue-400 group-hover/tile:bg-blue-500/10 transition-all border border-transparent group-hover/tile:border-blue-500/20 group-hover/tile:scale-110">
                                                        <Upload size={20} />
                                                    </div>
                                                    <span className="text-[8px] font-mono text-gray-600 group-hover/tile:text-blue-500 transition-colors uppercase tracking-[0.2em] font-black">SCAN {idx + 1}</span>
                                                    <input type="file" accept="image/*" onChange={(e) => handlePhotoChange(e, idx)} className="absolute inset-0 opacity-0 cursor-pointer z-10" title={`Foto ${idx + 1} hochladen`} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <AnimatePresence>
                                    {(isAnalyzing || aiDetection) && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                            className="mt-6 p-5 glass-panel border border-blue-500/20 rounded-2xl flex items-center justify-between shadow-blue-500/5 shadow-2xl"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2.5 rounded-xl bg-blue-500/10 text-blue-400 ${isAnalyzing ? 'animate-pulse' : ''} border border-blue-500/20 shadow-lg shadow-blue-500/10`}>
                                                    <Scan size={20} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em]">KI-BIO-ANALYSE</span>
                                                    <span className="text-xs font-black text-white uppercase tracking-wider mt-0.5">
                                                        {isAnalyzing ? 'SCANNRE DATEN-STRUKTUREN...' : `${aiDetection.estimatedAge} JAHRE // ${aiDetection.estimatedGender === 'male' ? 'MÄNNLICH' : 'WEIBLICH'}`}
                                                    </span>
                                                </div>
                                            </div>
                                            {!isAnalyzing && (
                                                <div className="text-[10px] font-mono text-blue-500/50 uppercase font-black bg-blue-500/5 px-3 py-1 rounded-full border border-blue-500/10">
                                                    { (aiDetection.confidence * 100).toFixed(0) }% CONF
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}

                        {activeModules.includes('age') && (
                            <motion.div
                                layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                                className="grid grid-cols-2 gap-6 relative group pt-4"
                            >
                                {renderRemoveButton('age')}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] px-1">Geburtsdatum</label>
                                    <div className="relative group">
                                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                                        <input
                                            type="date"
                                            name="birth_date"
                                            value={formData.birth_date}
                                            onChange={handleChange}
                                            className="w-full glass-panel rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono text-xs uppercase appearance-none border border-white/5"
                                            style={{ colorScheme: 'dark' }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] px-1">Bio-Alter</label>
                                    <div className="w-full glass-panel border border-white/5 rounded-2xl px-5 py-4 text-gray-400 font-black text-xs tracking-widest flex items-center gap-3">
                                        <Clock size={16} className="text-gray-600" />
                                        {formData.age ? `${formData.age} JAHRE` : '--'}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeModules.includes('group_id') && (
                            <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group pt-4">
                                {renderRemoveButton('group_id')}
                                <HUDSelect
                                    label="Organisations-Einheit"
                                    icon={Users}
                                    value={formData.group_id}
                                    onChange={(val) => setFormData(prev => ({ ...prev, group_id: val }))}
                                    options={[
                                        { value: "", label: "[KEINE ZUWEISUNG]" },
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
                            <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group pt-4 space-y-4">
                                {renderRemoveButton('gender')}
                                <HUDSelect
                                    label="Physisches Geschlecht"
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
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative group">
                                        <input
                                            type="text"
                                            name="gender"
                                            value={formData.gender}
                                            onChange={handleChange}
                                            className="w-full glass-panel rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-all uppercase font-mono text-xs border border-white/5"
                                            placeholder="BENUTZERDEFINIERT..."
                                            autoFocus
                                        />
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                        {activeModules.includes('aliases') && (
                            <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group pt-4">
                                {renderRemoveButton('aliases')}
                                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] block mb-3 px-1">Alias / Codenamen</label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        name="aliases"
                                        value={formData.aliases}
                                        onChange={handleChange}
                                        className="w-full glass-panel rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all uppercase font-mono text-xs border border-white/5 tracking-wider"
                                        placeholder="ALIAS EINGEBEN..."
                                    />
                                </div>
                            </motion.div>
                        )}

                        {activeModules.includes('location') && (
                            <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group pt-4">
                                {renderRemoveButton('location')}
                                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] block mb-3 px-1">Primärer Aufenthaltsort</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        name="location"
                                        value={formData.location}
                                        onChange={handleChange}
                                        className="w-full glass-panel rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all uppercase font-mono text-xs border border-white/5 tracking-wider"
                                        placeholder="STADT / LAND / REGION..."
                                    />
                                </div>
                            </motion.div>
                        )}

                        {/* Family Section */}
                        {activeModules.includes('family') && (
                            <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group pt-6">
                                {renderRemoveButton('family')}
                                <RelationSection
                                    label="Blutsverwandtschaft & Familie"
                                    type="family"
                                    search={searchQuery.family}
                                    setSearch={(val) => setSearchQuery(p => ({ ...p, family: val }))}
                                    show={showSuggestions.family}
                                    setShow={(val) => setShowSuggestions(p => ({ ...p, family: val }))}
                                    colorClass="border-blue-500/20 text-blue-400"
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
                            <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group pt-6">
                                {renderRemoveButton('partners')}
                                <RelationSection
                                    label="Romantische Beziehungen"
                                    type="partners"
                                    search={searchQuery.partners}
                                    setSearch={(val) => setSearchQuery(p => ({ ...p, partners: val }))}
                                    show={showSuggestions.partners}
                                    setShow={(val) => setShowSuggestions(p => ({ ...p, partners: val }))}
                                    colorClass="border-red-500/20 text-red-400"
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
                            <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group pt-6">
                                {renderRemoveButton('social')}
                                <RelationSection
                                    label="Soziale Netzwerk-Verknüpfungen"
                                    type="social"
                                    search={searchQuery.social}
                                    setSearch={(val) => setSearchQuery(p => ({ ...p, social: val }))}
                                    show={showSuggestions.social}
                                    setShow={(val) => setShowSuggestions(p => ({ ...p, social: val }))}
                                    colorClass="border-green-500/20 text-green-400"
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
                            <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group pt-6 space-y-6">
                                {renderRemoveButton('online_profiles')}
                                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] block px-1">Digital Footprint / Online-Profile</label>

                                {/* Existing profiles */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {(formData.online_profiles || []).map((profile, idx) => (
                                        <motion.div
                                            layout
                                            key={`profile-${idx}`}
                                            className="px-5 py-3.5 glass-panel border border-white/5 rounded-2xl flex items-center justify-between group/item hover:border-cyan-500/30 transition-all shadow-xl"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-white text-[10px] uppercase tracking-widest">{profile.platform}</span>
                                                    <span className="text-[10px] font-mono text-cyan-400/80 tracking-tighter mt-0.5">{profile.username}</span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        online_profiles: prev.online_profiles.filter((_, i) => i !== idx)
                                                    }));
                                                }}
                                                className="text-gray-500 hover:text-red-500 transition-all p-2 rounded-xl hover:bg-red-500/10"
                                                title="Entfernen"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </motion.div>
                                    ))}
                                    {(formData.online_profiles || []).length === 0 && (
                                        <div className="col-span-2 px-5 py-4 glass-panel border border-white/5 rounded-2xl border-dashed">
                                            <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest italic">Keine digitalen Profile hinterlegt</span>
                                        </div>
                                    )}
                                </div>

                                {/* Add new profile */}
                                <div className="glass-panel border border-white/5 bg-black/20 rounded-3xl p-6 space-y-6 shadow-inner">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
                                        <div className="text-[10px] font-mono text-gray-400 uppercase tracking-[0.2em] font-black">Neues Profil hinzufügen</div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] block px-1">Benutzername</label>
                                            <input
                                                type="text"
                                                value={formData._newProfileUsername || ''}
                                                onChange={(e) => setFormData(prev => ({ ...prev, _newProfileUsername: e.target.value }))}
                                                className="w-full glass-panel rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-cyan-500/50 transition-all font-mono text-xs border border-white/5 tracking-wider"
                                                placeholder="@IDENTIFIER..."
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
                                        className="w-full glass-panel bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-2xl py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                                    >
                                        <Plus size={16} /> Profil bestätigen
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Immich Integration Section */}
                        {activeModules.includes('immich_person_id') && (
                            <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group pt-6 space-y-4">
                                {renderRemoveButton('immich_person_id')}
                                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] block px-1">Immich Cloud Integration</label>
                                <div className="flex gap-4">
                                    <div className="flex-1 relative">
                                        <Scan size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="text"
                                            name="immich_person_id"
                                            value={formData.immich_person_id}
                                            onChange={handleChange}
                                            className="w-full glass-panel rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-cyan-500/50 transition-all font-mono text-xs border border-white/5"
                                            placeholder="PERSON-ID (UUID)..."
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setLoadingImmich(true);
                                            setShowImmichModal(true);
                                            try {
                                                const res = await getImmichPeople();
                                                setImmichPeople(res.people || []);
                                            } catch (err) {
                                                console.error("Failed to fetch Immich people", err);
                                            } finally {
                                                setLoadingImmich(false);
                                            }
                                        }}
                                        className="glass-panel bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-2xl px-6 flex items-center gap-3 transition-all active:scale-[0.95]"
                                    >
                                        <Search size={18} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Suchen</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {activeModules.includes('additional_info') && (
                            <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} className="relative group pt-6">
                                {renderRemoveButton('additional_info')}
                                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] block mb-3 px-1">Erweiterte Informationen / Dossier</label>
                                <textarea
                                    name="additional_info"
                                    value={formData.additional_info}
                                    onChange={handleChange}
                                    rows={5}
                                    className="w-full glass-panel border border-white/5 rounded-3xl px-6 py-6 text-white focus:outline-none focus:border-blue-500/50 transition-all uppercase font-mono text-xs tracking-wider resize-none shadow-inner"
                                    placeholder="ZUSÄTZLICHE DETAILS, NOTIZEN ODER HINTERGRUNDINFOS..."
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="flex-[2] bg-blue-600 text-white rounded-2xl py-5 flex items-center justify-center gap-3 font-black uppercase text-xs tracking-[0.3em] transition-all shadow-2xl shadow-blue-500/20 border border-blue-400/30 hover:bg-blue-500"
                >
                    <Save size={20} />
                    Profil Speichern
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={onCancel}
                    className="flex-1 glass-panel bg-white/5 text-white rounded-2xl py-5 flex items-center justify-center gap-3 font-black uppercase text-xs tracking-[0.2em] transition-all border border-white/10 hover:bg-white/10 shadow-xl"
                >
                    <X size={20} />
                    Abbrechen
                </motion.button>
            </div>

            {/* Immich Selection Modal */}
            <AnimatePresence>
                {showImmichModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 md:p-12">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowImmichModal(false)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 40 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 40 }}
                            className="glass-panel border border-white/10 rounded-[2.5rem] w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl relative z-[201]"
                        >
                            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/20">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-cyan-500/20 rounded-2xl text-cyan-400 shadow-lg shadow-cyan-500/20">
                                        <Scan size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-black uppercase text-lg tracking-[0.2em]">Immich Intelligence</h3>
                                        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-1">Personen-Datenbank abgleichen</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowImmichModal(false)} className="p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-90">
                                    <X size={24} className="text-gray-500" />
                                </button>
                            </div>

                            <div className="p-6 border-b border-white/5">
                                <div className="relative group">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={20} />
                                    <input
                                        type="text"
                                        autoFocus
                                        value={immichSearch}
                                        onChange={(e) => setImmichSearch(e.target.value)}
                                        placeholder="NACH NAME FILTERN..."
                                        className="w-full glass-panel rounded-2xl pl-14 pr-6 py-4 text-white focus:outline-none focus:border-cyan-500/50 transition-all font-mono text-xs uppercase tracking-[0.1em] border border-white/5 shadow-inner"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                {loadingImmich ? (
                                    <div className="p-20 flex flex-col items-center gap-6 text-gray-500">
                                        <div className="relative">
                                            <div className="w-12 h-12 border-2 border-cyan-500/10 rounded-full"></div>
                                            <div className="absolute inset-0 w-12 h-12 border-t-2 border-cyan-500 rounded-full animate-spin"></div>
                                        </div>
                                        <span className="font-mono text-[10px] uppercase tracking-[0.3em] animate-pulse">Synchronisiere Cloud-Daten...</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2">
                                        {immichPeople
                                            .filter(p => p.name.toLowerCase().includes(immichSearch.toLowerCase()))
                                            .map(person => (
                                                <button
                                                    key={person.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, immich_person_id: person.id }));
                                                        setShowImmichModal(false);
                                                    }}
                                                    className="flex items-center gap-4 p-4 glass-panel border border-white/5 hover:border-cyan-500/30 rounded-3xl transition-all group text-left shadow-xl hover:shadow-cyan-500/5"
                                                >
                                                    <div className="w-16 h-16 rounded-2xl bg-black/40 border border-white/10 overflow-hidden flex-shrink-0 relative shadow-2xl">
                                                        {person.thumbnail ? (
                                                            <AuthenticatedImage 
                                                                src={person.thumbnail} 
                                                                alt="" 
                                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-700">
                                                                <Users size={24} />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none"></div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[11px] font-black text-gray-300 group-hover:text-white transition-colors uppercase tracking-wider truncate">{person.name || 'UNBENANNT'}</div>
                                                        <div className="text-[8px] font-mono text-gray-600 group-hover:text-cyan-500/70 transition-colors mt-1 truncate">{person.id}</div>
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 pr-1">
                                                        <Check size={18} className="text-cyan-500" />
                                                    </div>
                                                </button>
                                            ))
                                        }
                                        {immichPeople.filter(p => p.name.toLowerCase().includes(immichSearch.toLowerCase())).length === 0 && (
                                            <div className="col-span-2 p-12 text-center text-gray-600 font-mono text-[10px] uppercase tracking-widest italic">
                                                Keine Übereinstimmungen gefunden
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </form>
    );
};

export default PersonForm;
