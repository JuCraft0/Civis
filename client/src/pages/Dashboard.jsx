import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Search, Loader, LogOut, Shield, Users, FolderTree, Trash2, Edit3, ChevronRight, ChevronDown, LayoutGrid, ArrowRight, Share2, Scan, Database, UserX } from 'lucide-react';
import PersonCard from '../components/PersonCard';
import PersonForm from '../components/PersonForm';
import UserForm from '../components/UserForm';
import NetworkGraph from '../components/NetworkGraph';
import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from 'react-hot-toast';
import { getPeople, createPerson, createUser, getUsers, updateUser, deleteUser, getGroups, createGroup, deleteGroup, updateGroup, reindexFaces, syncAllImmichPeople, deleteAllImmichFaces, deleteAllPeoplePhotos, reevaluateAllProfiles, getMaintenanceProgress } from '../services/api';
import { useAuth } from '../context/AuthContext';
import HUDSelect from '../components/HUDSelect';
import { getGenderedStatus } from '../utils/statusHelpers';
import FaceScanner from '../components/FaceScanner';

// Progress UI Component
const ProgressOverlay = ({ progress }) => {
    if (!progress.active && !progress.status.includes('abgeschlossen')) return null;
    const percent = Math.round((progress.current / progress.total) * 100) || 0;
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-10 p-8 glass-panel rounded-[2rem] border-l-4 ${progress.active ? 'border-l-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.1)]' : 'border-l-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.1)]'} relative overflow-hidden`}
        >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] pointer-events-none" />
            
            <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${progress.active ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                        {progress.active ? <Loader className="animate-spin" size={24} /> : <Scan size={24} />}
                    </div>
                    <div>
                        <span className="text-lg font-black uppercase tracking-tight text-white font-outfit">{progress.status}</span>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-widest">{progress.active ? 'System Operation in Progress' : 'Task Completed Successfully'}</p>
                    </div>
                </div>
                {progress.total > 0 && (
                    <div className="text-right">
                        <div className="font-mono text-xs text-blue-400 font-black bg-blue-500/10 px-4 py-1.5 rounded-xl border border-blue-500/20">
                            {progress.current} <span className="text-slate-600">/</span> {progress.total}
                        </div>
                    </div>
                )}
            </div>
            
            {progress.active && (
                <div className="relative z-10">
                    <div className="w-full h-2.5 bg-slate-950/50 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ type: "spring", bounce: 0, duration: 0.8 }}
                            className="h-full bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                        />
                    </div>
                    <div className="flex justify-between mt-4">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            <p className="text-[9px] font-black font-mono text-slate-500 uppercase tracking-widest">Neural Link: Stable</p>
                        </div>
                        <p className="text-[11px] font-black font-mono text-blue-400 uppercase tracking-[0.2em]">{percent}% Complete</p>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

// Nested Group Item Component
const GroupNode = ({ group, onEdit, onDelete, people = [], level = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showPeople, setShowPeople] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();
    const hasChildren = group.children && group.children.length > 0;

    const getDescendantIds = (g) => {
        let ids = [g.id];
        if (g.children) {
            g.children.forEach(child => {
                ids = [...ids, ...getDescendantIds(child)];
            });
        }
        return ids;
    };

    const descendantIds = getDescendantIds(group);
    const assignedPeople = (people || []).filter(p => descendantIds.includes(p.group_id));

    return (
        <div className="space-y-3">
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center group glass-panel rounded-2xl p-4 transition-all hover:bg-white/[0.05] border-white/5 hover:border-orange-500/30 ${level > 0 ? 'ml-8' : ''}`}
            >
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-500 hover:text-white ${!hasChildren ? 'opacity-0 cursor-default' : ''}`}
                >
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>

                <div
                    className="flex-1 flex items-center min-w-0 cursor-pointer px-2"
                    onClick={() => setShowPeople(!showPeople)}
                >
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center mr-4 border border-orange-500/20 group-hover:bg-orange-500/20 transition-all">
                        <FolderTree size={20} />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                            <h4 className="font-black text-lg text-white uppercase tracking-tight group-hover:text-orange-400 transition-colors truncate font-outfit">
                                {group.name}
                            </h4>
                            {assignedPeople.length > 0 && (
                                <span className="text-[10px] font-black bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-lg border border-orange-500/20 font-mono uppercase tracking-widest">
                                    {assignedPeople.length} Subj
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 text-xs font-mono truncate uppercase tracking-wider">{group.description || 'Sector designation: Undefined'}</p>
                    </div>
                </div>

                <div className="flex gap-2 px-2">
                    {(user?.role === 'admin' || user?.role === 'editor') && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(group); }}
                            className="p-2.5 text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all border border-transparent hover:border-blue-500/30"
                            title="Edit Group"
                        >
                            <Edit3 size={16} />
                        </button>
                    )}
                    {user?.role === 'admin' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(group.id); }}
                            className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/30"
                            title="Delete Group"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </motion.div>

            <AnimatePresence>
                {showPeople && assignedPeople.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="ml-20 pb-4 overflow-hidden"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-[1px] w-4 bg-blue-500/30" />
                            <span className="text-[9px] font-black font-mono text-slate-600 uppercase tracking-[0.3em]">Neural Connections</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {assignedPeople.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => navigate(`/person/${p.id}`, { state: { activeTab: 'groups' } })}
                                    className="flex items-center group/person gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-blue-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-left font-mono"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover/person:shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                    <span className="truncate flex-1 text-slate-400 group-hover/person:text-white transition-colors">{p.name}</span>
                                    <ArrowRight size={12} className="text-slate-700 group-hover/person:text-blue-500 transition-colors" />
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isExpanded && hasChildren && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        {group.children.map(child => (
                            <GroupNode
                                key={child.id}
                                group={child}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                people={people}
                                level={level + 1}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Dashboard = () => {
    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(true);
    const [usersList, setUsersList] = useState([]);
    const [groupsList, setGroupsList] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showUserForm, setShowUserForm] = useState(false);
    const [showGroupForm, setShowGroupForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'people');
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
    const [groupFormState, setGroupFormState] = useState({ mode: 'create', data: { name: '', description: '', parent_id: '' } });
    const [userFormState, setUserFormState] = useState({ mode: 'create', data: null });
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Transform flat groups to tree
    const groupTree = useMemo(() => {
        const map = {};
        const roots = [];

        groupsList.forEach(g => {
            map[g.id] = { ...g, children: [] };
        });

        groupsList.forEach(g => {
            if (g.parent_id && map[g.parent_id]) {
                map[g.parent_id].children.push(map[g.id]);
            } else {
                roots.push(map[g.id]);
            }
        });

        return roots;
    }, [groupsList]);

    const fetchPeople = async () => {
        try {
            const result = await getPeople();
            setPeople(result.data);
        } catch (error) {
            console.error("Failed to fetch people", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const result = await getUsers();
            setUsersList(result.data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        }
    };

    const fetchGroups = async () => {
        try {
            const result = await getGroups();
            setGroupsList(result.data);
        } catch (error) {
            console.error("Failed to fetch groups", error);
        }
    };

    useEffect(() => {
        if (activeTab === 'users' && user?.role === 'admin') fetchUsers();
        if (activeTab === 'groups' || activeTab === 'network') fetchGroups();
        if (activeTab === 'people' || activeTab === 'network') fetchPeople();
    }, [activeTab, user]);

    const [maintenanceProgress, setMaintenanceProgress] = useState({ active: false, current: 0, total: 0, status: '' });

    useEffect(() => {
        let interval;
        if (maintenanceProgress.active) {
            interval = setInterval(async () => {
                try {
                    const res = await getMaintenanceProgress();
                    setMaintenanceProgress(res.data);
                    if (!res.data.active) {
                        clearInterval(interval);
                        fetchPeople(); // Refresh data after maintenance
                    }
                } catch (err) {
                    console.error("Progress fetch failed", err);
                    clearInterval(interval);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [maintenanceProgress.active]);

    const handleGroupSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...groupFormState.data,
                parent_id: groupFormState.data.parent_id === '' ? null : parseInt(groupFormState.data.parent_id)
            };

            if (groupFormState.mode === 'create') {
                await createGroup(payload);
                toast.success('Group created successfully!');
            } else {
                await updateGroup(groupFormState.editId, payload);
                toast.success('Group updated successfully!');
            }

            setShowGroupForm(false);
            setGroupFormState({ mode: 'create', data: { name: '', description: '', parent_id: '' } });
            fetchGroups();
        } catch (error) {
            console.error("Group submit error:", error);
            toast.error(`Failed to ${groupFormState.mode} group`);
        }
    };

    const handleUserSubmit = async (userData) => {
        try {
            if (userFormState.mode === 'edit') {
                await updateUser(userFormState.editId, userData);
                toast.success('Benutzer erfolgreich aktualisiert');
            } else {
                await createUser(userData);
                toast.success('Benutzer erfolgreich erstellt');
            }
            setShowUserForm(false);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.error || "Fehler beim Speichern des Benutzers");
        }
    };

    const handleReevaluateAll = async () => {
        if (!window.confirm("Bist du sicher? Alle Profile werden auf Bildqualität geprüft und das jeweils beste Bild wird als Profilbild gesetzt.")) return;
        try {
            await reevaluateAllProfiles();
            setMaintenanceProgress({ active: true, current: 0, total: 0, status: 'Initialisierung...' });
            toast.success('Re-Evaluierung gestartet');
        } catch (err) {
            toast.error("Fehler bei der Re-Evaluierung");
        }
    };

    const handleReindex = async () => {
        if (!window.confirm("Möchten Sie wirklich alle Gesichter neu indexieren? Dies ist notwendig nach einem System-Upgrade und kann einige Zeit dauern.")) return;
        
        setReindexing(true);
        toast.success("Re-Indexierung gestartet... Bitte warten.");
        
        try {
            const result = await reindexFaces();
            toast.success("Re-Indexierung abgeschlossen");
            fetchPeople(); // Refresh data
        } catch (error) {
            console.error("Reindex error:", error);
            toast.error("Re-Indexierung fehlgeschlagen");
        } finally {
            setReindexing(false);
        }
    };

    const handleSyncAllImmich = async () => {
        if (!window.confirm("Möchten Sie wirklich die Immich-Synchronisierung für ALLE verknüpften Personen wiederholen? Dies kann bei vielen Personen lange dauern.")) return;
        
        try {
            setReindexing(true);
            await syncAllImmichPeople();
            setMaintenanceProgress({ active: true, current: 0, total: 0, status: 'Initialisierung...' });
            toast.success("Globale Immich-Synchronisierung gestartet...");
        } catch (error) {
            console.error("Bulk sync error:", error);
            toast.error("Fehler bei der globalen Synchronisierung");
            setReindexing(false);
        }
    };

    const handleDeleteAllImmichImages = async () => {
        if (!window.confirm("Bist du sicher? Alle Immich-bezogenen Bilder und Metadaten werden gelöscht!")) return;
        
        setReindexing(true);
        try {
            const result = await deleteAllImmichFaces();
            toast.success(result.message || 'Immich-Bilder gelöscht');
            fetchPeople();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Fehler beim Löschen');
        } finally {
            setReindexing(false);
        }
    };

    const handleDeleteAllPeoplePhotos = async () => {
        if (!window.confirm("⚠️ KRITISCHE AKTION: Bist du absolut sicher? Dies löscht ALLE Personen-Fotos im System und setzt alle Profilbilder zurück! Dies kann nicht rückgängig gemacht werden.")) return;
        
        setReindexing(true);
        try {
            const result = await deleteAllPeoplePhotos();
            toast.success(result.message || 'Alle Fotos gelöscht');
            fetchPeople();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Fehler beim Löschen');
        } finally {
            setReindexing(false);
        }
    };

    const handleDelete = async () => {
        const { type, id } = confirmModal;
        try {
            if (type === 'user') {
                await deleteUser(id);
                fetchUsers();
            } else if (type === 'group') {
                await deleteGroup(id);
                fetchGroups();
            }
            setConfirmModal({ isOpen: false, type: '', id: null });
            toast.success(`${type} deleted successfully`);
        } catch (error) {
            console.error("Delete error:", error);
            toast.error(`Failed to delete ${type}`);
        }
    };

    const openEditUser = (u) => {
        setUserFormState({
            mode: 'edit',
            editId: u.id,
            data: {
                username: u.username,
                role: u.role
            }
        });
        setShowUserForm(true);
    };

    const openEditGroup = (group) => {
        setGroupFormState({
            mode: 'edit',
            editId: group.id,
            data: {
                name: group.name,
                description: group.description || '',
                parent_id: group.parent_id || ''
            }
        });
        setShowGroupForm(true);
    };

    const filteredPeople = (people || []).filter(person => {
        if (!person) return false;
        const search = searchTerm.toLowerCase();
        return (
            (person.name && person.name.toLowerCase().includes(search)) ||
            (person.age && person.age.toString().includes(search)) ||
            (person.group_name && person.group_name.toLowerCase().includes(search)) ||
            (person.group_path && person.group_path.some(p => p.toLowerCase().includes(search))) ||
            (person.id && person.id.toString().includes(search))
        );
    });

    // Compute Graph Data
    const graphData = useMemo(() => {
        const nodes = [];
        const links = [];

        // Add group nodes
        groupsList.forEach(g => {
            nodes.push({ id: `group_${g.id}`, name: g.name, type: 'group' });
            if (g.parent_id) {
                links.push({ source: `group_${g.id}`, target: `group_${g.parent_id}`, type: 'Group' });
            }
        });

        // Add people nodes and their links
        (people || []).forEach(p => {
            nodes.push({ id: `person_${p.id}`, name: p.name, type: 'person', photo_url: p.photo_url });

            // Link to group
            if (p.group_id) {
                links.push({ source: `person_${p.id}`, target: `group_${p.group_id}`, type: 'Group' });
            }

            // Link relations
            ['family', 'partners', 'social'].forEach(relType => {
                let colorType = 'Familie';
                if (relType === 'partners') colorType = 'Beziehung/Partner';
                if (relType === 'social') colorType = 'Soziales Umfeld';

                (p[relType] || []).forEach(rel => {
                    const sourceId = `person_${p.id}`;
                    const targetId = `person_${rel.id}`;

                    // Check if this relationship (same type and status) already exists in reverse
                    const exists = links.some(l =>
                        ((l.source === targetId && l.target === sourceId) || (l.source === sourceId && l.target === targetId)) &&
                        l.type === colorType &&
                        l.label === rel.status
                    );

                    if (!exists) {
                        const genderedLabel = getGenderedStatus(rel.status, rel.gender);
                        links.push({ source: sourceId, target: targetId, type: colorType, label: genderedLabel });
                    }
                });
            });
        });

        return { nodes, links };
    }, [people, groupsList]);

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white p-4 md:p-10 selection:bg-blue-500/30">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header - Advanced HUD */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 pb-8 border-b border-white/5 relative">
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/5 blur-[100px] pointer-events-none" />
                    
                    <div className="space-y-1">
                        <motion.div 
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="flex items-center gap-3"
                        >
                            <div className="w-1.5 h-10 bg-blue-600 rounded-full" />
                            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter font-outfit leading-none">
                                CIVIS<span className="text-blue-500">.</span>CORE
                            </h1>
                        </motion.div>
                        <p className="text-slate-500 font-black tracking-[0.4em] text-[10px] uppercase ml-5">Neural Identity Matrix — v2.5.0</p>
                    </div>

                    <div className="flex items-center gap-6 relative z-10">
                        <div className="flex flex-col items-end pr-6 border-r border-white/10">
                            <span className="text-[9px] font-black text-blue-500/50 uppercase tracking-[0.3em]">Operator Session</span>
                            <span className="text-sm font-black text-white uppercase font-mono">{user?.username}</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {(user?.role === 'admin' || user?.role === 'editor') && (
                                <motion.button
                                    whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(59, 130, 246, 0.4)" }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowAddForm(true)}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-5 rounded-[1.25rem] flex items-center gap-3 font-black tracking-widest text-[10px] shadow-2xl shadow-blue-600/20 transition-all border border-blue-400/30"
                                >
                                    <Plus size={18} />
                                    ADD IDENTITY
                                </motion.button>
                            )}
                            <motion.button
                                whileHover={{ scale: 1.05, backgroundColor: "rgba(239, 68, 68, 0.2)" }}
                                whileTap={{ scale: 0.95 }}
                                onClick={logout}
                                className="bg-white/5 text-red-500 p-5 rounded-[1.25rem] flex items-center justify-center transition-all border border-white/10 hover:border-red-500/30"
                            >
                                <LogOut size={20} />
                            </motion.button>
                        </div>
                    </div>
                </header>
                
                {/* Floating Navigation Pill - MOVED TO TOP */}
                <div className="sticky top-4 z-50 w-full flex justify-center pointer-events-none mb-12">
                    <motion.div 
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="glass-panel p-2 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-1 border-white/10 bg-slate-900/90 pointer-events-auto"
                    >
                        {[
                            { id: 'people', icon: Users, label: 'Identities', color: 'blue' },
                            { id: 'groups', icon: FolderTree, label: 'Clusters', color: 'orange' },
                            { id: 'network', icon: Share2, label: 'Neural Net', color: 'green' },
                            { id: 'facescan', icon: Scan, label: 'Scanner', color: 'blue' },
                            { id: 'users', icon: Shield, label: 'Terminal', color: 'purple', admin: true },
                            { id: 'debug', icon: Database, label: 'System', color: 'orange', admin: true },
                        ].map((tab) => {
                            if (tab.admin && user?.role !== 'admin') return null;
                            const isActive = activeTab === tab.id;
                            const Icon = tab.icon;
                            
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative px-5 py-3.5 rounded-[1.5rem] flex items-center gap-3 transition-all duration-500 group overflow-hidden ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {isActive && (
                                        <motion.div 
                                            layoutId="activeTabPill"
                                            className="absolute inset-0 bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400/30"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <Icon size={16} className={`relative z-10 ${isActive ? 'scale-110 transition-transform' : ''}`} />
                                    <span className={`relative z-10 text-[10px] font-black uppercase tracking-[0.2em] hidden lg:inline`}>
                                        {tab.label}
                                    </span>
                                    {!isActive && (
                                        <div className="absolute top-14 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800/90 backdrop-blur-md text-white text-[9px] font-black rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none uppercase tracking-[0.2em] border border-white/10 whitespace-nowrap shadow-xl scale-95 group-hover:scale-100">
                                            {tab.label}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </motion.div>
                </div>

            {/* Content Area */}
            <div className="min-h-[500px]">
                {activeTab === 'people' && (
                    <div className="space-y-12">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="relative group flex-1 max-w-2xl">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors z-10" size={20} />
                                <input
                                    type="text"
                                    placeholder="SEARCH NEURAL IDENTITY..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="glass-input pl-16"
                                />
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div className="h-12 px-6 glass-panel rounded-2xl flex items-center gap-3 border-white/5">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    <span className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest">{filteredPeople.length} NODES INDEXED</span>
                                </div>
                            </div>
                        </div>
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-40 gap-4">
                                    <Loader className="animate-spin text-blue-500" size={48} />
                                    <span className="text-gray-500 font-mono animate-pulse">LADE DATEN...</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <AnimatePresence>
                                        {filteredPeople.map((person) => (
                                            <PersonCard key={person.id} person={person} />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'groups' && (
                        <div className="space-y-8">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 glass-panel p-8 rounded-[2rem] border-white/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] pointer-events-none" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20">
                                            <FolderTree size={20} />
                                        </div>
                                        <h2 className="text-3xl font-black uppercase tracking-tighter text-white font-outfit">
                                            Neural Clusters
                                        </h2>
                                    </div>
                                    <p className="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em]">Organizational hierarchy and sector mapping</p>
                                </div>
                                
                                {(user?.role === 'admin' || user?.role === 'editor') && (
                                    <button
                                        onClick={() => {
                                            setGroupFormState({ mode: 'create', data: { name: '', description: '', parent_id: '' } });
                                            setShowGroupForm(true);
                                        }}
                                        className="relative z-10 bg-orange-600/10 text-orange-400 hover:bg-orange-500 hover:text-white border border-orange-500/20 px-8 py-4 rounded-2xl transition-all flex items-center gap-3 font-black text-xs uppercase tracking-widest group shadow-[0_0_20px_rgba(249,115,22,0.1)] hover:shadow-[0_0_30px_rgba(249,115,22,0.3)]"
                                    >
                                        <Plus size={18} className="group-hover:rotate-90 transition-transform" /> 
                                        Initialize Cluster
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4">
                                {groupsList.length === 0 ? (
                                    <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                                        <Users size={48} className="mx-auto text-gray-700 mb-4" />
                                        <p className="text-gray-500 font-mono uppercase tracking-widest text-xs">Keine Gruppen-Daten gefunden.</p>
                                    </div>
                                ) : (
                                    groupTree.map(group => (
                                        <GroupNode
                                            key={group.id}
                                            group={group}
                                            onEdit={openEditGroup}
                                            onDelete={(id) => setConfirmModal({ isOpen: true, type: 'group', id })}
                                            people={people}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'network' && (
                        <div className="space-y-8">
                            <div className="glass-panel p-8 rounded-[2rem] border-white/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] pointer-events-none" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                                            <Share2 size={20} />
                                        </div>
                                        <h2 className="text-3xl font-black uppercase tracking-tighter text-white font-outfit">
                                            Synapse Map
                                        </h2>
                                    </div>
                                    <p className="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em]">Interactive visualization of node interconnections</p>
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-40 gap-4">
                                    <Loader className="animate-spin text-green-500" size={48} />
                                    <span className="text-gray-500 font-mono animate-pulse">BERECHNE NETZWERK...</span>
                                </div>
                            ) : (
                                <NetworkGraph data={graphData} />
                            )}
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="glass-panel rounded-[2rem] border-white/5 overflow-hidden">
                            <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <Shield size={18} className="text-purple-400" />
                                        <h2 className="text-2xl font-black uppercase tracking-tighter text-white font-outfit">Access Control</h2>
                                    </div>
                                    <p className="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em]">Authorized system personnel registry</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setUserFormState({ mode: 'create', data: null });
                                        setShowUserForm(true);
                                    }}
                                    className="bg-purple-600/10 text-purple-400 hover:bg-purple-600 hover:text-white border border-purple-500/20 px-6 py-3 rounded-xl transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]"
                                >
                                    <Plus size={16} /> Add Personnel
                                </button>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white/[0.02] text-slate-500 text-[10px] uppercase tracking-[0.3em] font-mono">
                                            <th className="px-8 py-5 font-black">Identity</th>
                                            <th className="px-8 py-5 font-black text-center">Authorization Level</th>
                                            <th className="px-8 py-5 font-black text-right">Operations</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 font-mono text-xs">
                                        {usersList.map((u) => (
                                            <tr key={u.id} className="hover:bg-white/[0.03] transition-all group/row">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 group-hover/row:border-purple-500/50 group-hover/row:text-purple-400 transition-all">
                                                            <Shield size={16} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-slate-100 group-hover/row:text-white transition-colors">{u.username.toUpperCase()}</span>
                                                            <span className="text-[9px] text-slate-600 uppercase tracking-widest">Active Session</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black border uppercase tracking-widest ${
                                                        u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                        u.role === 'editor' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                                    }`}>
                                                        {u.role.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex justify-end gap-3">
                                                        <button 
                                                            onClick={() => openEditUser(u)} 
                                                            className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all border border-transparent hover:border-blue-500/30"
                                                        >
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => setConfirmModal({ isOpen: true, type: 'user', id: u.id })} 
                                                            className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/30"
                                                        >
                                                            <UserX size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'debug' && (
                        <div className="space-y-8">
                            <div className="glass-panel p-8 rounded-[2rem] border-white/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] pointer-events-none" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                                            <Database size={20} />
                                        </div>
                                        <h2 className="text-3xl font-black uppercase tracking-tighter text-white font-outfit">System Maintenance</h2>
                                    </div>
                                    <p className="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em]">Core diagnostic and synchronization protocols</p>
                                </div>
                            </div>

                            <ProgressOverlay progress={maintenanceProgress} />

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Core Reindex */}
                                <div className="glass-card p-8 rounded-[2rem] border-white/5 hover:border-orange-500/30 transition-all flex flex-col group/card relative overflow-hidden">
                                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl group-hover/card:bg-orange-500/10 transition-colors" />
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20 group-hover/card:scale-110 transition-transform">
                                            <Database size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-lg text-white uppercase tracking-tight font-outfit">Neural Index</h3>
                                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Rebuild Database</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-xs mb-8 leading-relaxed">Perform a complete analysis of all system entities and regenerate the artificial intelligence search vectors.</p>
                                    <button
                                        onClick={handleReindex}
                                        disabled={reindexing || maintenanceProgress.active}
                                        className="mt-auto w-full py-4 bg-orange-600/10 text-orange-400 hover:bg-orange-500 hover:text-white border border-orange-500/20 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest shadow-lg hover:shadow-orange-500/20"
                                    >
                                        {reindexing ? 'Protocol Active...' : 'Initialize Reindex'}
                                    </button>
                                </div>

                                {/* Immich Sync */}
                                <div className="glass-card p-8 rounded-[2rem] border-white/5 hover:border-blue-500/30 transition-all flex flex-col group/card relative overflow-hidden">
                                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover/card:bg-blue-500/10 transition-colors" />
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover/card:scale-110 transition-transform">
                                            <Scan size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-lg text-white uppercase tracking-tight font-outfit">Immich Sync</h3>
                                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">External Data Link</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-xs mb-8 leading-relaxed">Synchronize local neural profiles with external Immich repository to update biometric image data.</p>
                                    <div className="mt-auto grid grid-cols-2 gap-3">
                                        <button
                                            onClick={handleSyncAllImmich}
                                            disabled={reindexing || maintenanceProgress.active}
                                            className="py-4 bg-blue-600/10 text-blue-400 hover:bg-blue-500 hover:text-white border border-blue-500/20 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest"
                                        >
                                            Full Sync
                                        </button>
                                        <button
                                            onClick={handleReevaluateAll}
                                            disabled={reindexing || maintenanceProgress.active}
                                            className="py-4 bg-cyan-600/10 text-cyan-400 hover:bg-cyan-500 hover:text-white border border-cyan-500/20 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest"
                                        >
                                            Re-Eval
                                        </button>
                                    </div>
                                </div>

                                {/* Data Purge */}
                                <div className="glass-card p-8 rounded-[2rem] border-white/5 hover:border-red-500/30 transition-all flex flex-col group/card relative overflow-hidden">
                                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/5 rounded-full blur-3xl group-hover/card:bg-red-500/10 transition-colors" />
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20 group-hover/card:scale-110 transition-transform">
                                            <Trash2 size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-lg text-white uppercase tracking-tight font-outfit">Data Purge</h3>
                                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Destructive Reset</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-xs mb-8 leading-relaxed">Critical operations to clear cached biometric data or reset all synchronized visual identities.</p>
                                    <div className="mt-auto grid grid-cols-2 gap-3">
                                        <button
                                            onClick={handleDeleteAllImmichImages}
                                            disabled={reindexing || maintenanceProgress.active}
                                            className="py-4 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/20 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest"
                                        >
                                            Clear Link
                                        </button>
                                        <button
                                            onClick={handleDeleteAllPeoplePhotos}
                                            disabled={reindexing || maintenanceProgress.active}
                                            className="py-4 bg-red-900/10 text-red-500 hover:bg-red-900 hover:text-white border border-red-800/20 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest"
                                        >
                                            Deep Reset
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'facescan' && (
                        <FaceScanner />
                    )}
                </div>

                {/* Modals */}
                <AnimatePresence>
                    {showAddForm && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 z-50">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                                animate={{ opacity: 1, scale: 1, y: 0 }} 
                                exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                                className="glass-panel p-8 md:p-10 w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                                
                                <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
                                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-inner">
                                        <UserPlus size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-tighter font-outfit text-white">Identität Erfassen</h2>
                                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] font-bold">Neues Subjekt Initialisieren</p>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] block ml-1 font-bold">Vollständiger Name</label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                id="new-person-name"
                                                autoFocus
                                                className="glass-input w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all font-outfit text-lg"
                                                placeholder="Name eingeben..."
                                                onKeyDown={async (e) => {
                                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                                        try {
                                                            const res = await createPerson({ name: e.target.value.trim() });
                                                            setShowAddForm(false);
                                                            navigate(`/person/${res.data.id}`, { state: { activeTab: 'people' } });
                                                        } catch (error) {
                                                            toast.error('Initialisierung fehlgeschlagen');
                                                        }
                                                    }
                                                }}
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-600 uppercase tracking-widest pointer-events-none group-focus-within:text-blue-500/50 transition-colors">
                                                [ENTER]
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex items-start gap-3">
                                        <div className="text-blue-400 mt-0.5">
                                            <ShieldCheck size={16} />
                                        </div>
                                        <p className="text-[10px] font-mono text-slate-400 uppercase leading-relaxed tracking-tight font-medium">
                                            Nach der Initialisierung können Sie biometrische Daten, Gruppen-Zugehörigkeiten und zusätzliche Module konfigurieren.
                                        </p>
                                    </div>

                                    <div className="flex gap-4 pt-6 border-t border-white/5">
                                        <button 
                                            onClick={() => setShowAddForm(false)} 
                                            className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all border border-white/10 active:scale-95"
                                        >
                                            Abbrechen
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const name = document.getElementById('new-person-name').value;
                                                if (name.trim()) {
                                                    try {
                                                        const res = await createPerson({ name: name.trim() });
                                                        setShowAddForm(false);
                                                        navigate(`/person/${res.data.id}`, { state: { activeTab: 'people' } });
                                                    } catch (error) {
                                                        toast.error('Initialisierung fehlgeschlagen');
                                                    }
                                                }
                                            }}
                                            className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white rounded-2xl py-4 font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-blue-500/20 border border-blue-400/30 active:scale-95"
                                        >
                                            Subjekt Erstellen
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {showUserForm && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 z-50">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                                animate={{ opacity: 1, scale: 1, y: 0 }} 
                                exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                                className="glass-panel p-8 md:p-10 w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                                
                                <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
                                    <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 border border-purple-500/20 shadow-inner">
                                        <Shield size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-tighter font-outfit text-white">
                                            {userFormState.mode === 'create' ? 'User Initialisieren' : 'Identity Editieren'}
                                        </h2>
                                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] font-bold">Zugriffsverwaltung</p>
                                    </div>
                                </div>
                                <UserForm
                                    onSubmit={handleUserSubmit}
                                    onCancel={() => setShowUserForm(false)}
                                    initialData={userFormState.data}
                                />
                            </motion.div>
                        </div>
                    )}

                    {showGroupForm && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 z-50">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                                animate={{ opacity: 1, scale: 1, y: 0 }} 
                                exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                                className="glass-panel p-8 md:p-10 w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                                
                                <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
                                    <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-400 border border-orange-500/20 shadow-inner">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-tighter font-outfit text-white">
                                            {groupFormState.mode === 'create' ? 'Cluster Erstellen' : 'Cluster Editieren'}
                                        </h2>
                                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] font-bold">Strukturale Reorganisation</p>
                                    </div>
                                </div>

                                <form onSubmit={handleGroupSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] block ml-1 font-bold">Cluster Name</label>
                                        <input
                                            required
                                            value={groupFormState.data.name}
                                            onChange={e => setGroupFormState({ ...groupFormState, data: { ...groupFormState.data, name: e.target.value } })}
                                            className="glass-input w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 transition-all font-mono text-sm uppercase"
                                            placeholder="Name festlegen..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <HUDSelect
                                            label="Hierarchische Position"
                                            value={groupFormState.data.parent_id}
                                            onChange={val => setGroupFormState({ ...groupFormState, data: { ...groupFormState.data, parent_id: val } })}
                                            options={[
                                                { value: "", label: "[WURZEL-EBENE]" },
                                                ...groupsList
                                                    .filter(g => groupFormState.mode === 'create' || g.id !== groupFormState.editId)
                                                    .map(g => ({ value: g.id, label: g.name.toUpperCase() }))
                                            ]}
                                            color="orange"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] block ml-1 font-bold">Beschreibung / Metadaten</label>
                                        <textarea
                                            value={groupFormState.data.description}
                                            onChange={e => setGroupFormState({ ...groupFormState, data: { ...groupFormState.data, description: e.target.value } })}
                                            className="glass-input w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 transition-all font-mono text-sm resize-none"
                                            rows="3"
                                            placeholder="Zusätzliche Informationen..."
                                        />
                                    </div>

                                    <div className="flex gap-4 pt-6 border-t border-white/5">
                                        <button 
                                            type="button" 
                                            onClick={() => setShowGroupForm(false)} 
                                            className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all border border-white/10 active:scale-95"
                                        >
                                            Abbrechen
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="flex-[2] bg-orange-600 hover:bg-orange-500 text-white rounded-2xl py-4 font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-orange-500/20 border border-orange-400/30 active:scale-95"
                                        >
                                            {groupFormState.mode === 'create' ? 'Cluster Initialisieren' : 'Änderungen Sichern'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <ConfirmationModal
                    isOpen={confirmModal.isOpen}
                    onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                    onConfirm={handleDelete}
                    title="Löschen bestätigen"
                    message={`Sind Sie sicher? Diese Aktion kann nicht rückgängig gemacht werden.`}
                    confirmText="Löschen"
                    isDanger={true}
                />
            </div>
        </div>
    );
};

export default Dashboard;

