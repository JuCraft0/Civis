import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Search, Loader, LogOut, Shield, Users, FolderTree, Trash2, Edit3, ChevronRight, ChevronDown, LayoutGrid, ArrowRight, Share2, Scan } from 'lucide-react';
import PersonCard from '../components/PersonCard';
import PersonForm from '../components/PersonForm';
import UserForm from '../components/UserForm';
import NetworkGraph from '../components/NetworkGraph';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import { getPeople, createPerson, createUser, getUsers, updateUser, deleteUser, getGroups, createGroup, deleteGroup, updateGroup } from '../services/api';
import { useAuth } from '../context/AuthContext';
import HUDSelect from '../components/HUDSelect';
import { getGenderedStatus } from '../utils/statusHelpers';
import FaceScanner from '../components/FaceScanner';

// Nested Group Item Component
const GroupNode = ({ group, onEdit, onDelete, people = [], level = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showPeople, setShowPeople] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();
    const hasChildren = group.children && group.children.length > 0;

    // Recursive function to find all descendant group IDs
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
        <div className="space-y-2">
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center group bg-white/5 border border-white/10 hover:border-orange-500/50 rounded-xl p-4 transition-all ${level > 0 ? 'ml-6 border-l-2 border-l-orange-500/30' : ''}`}
            >
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`p-1 hover:bg-white/10 rounded transition-colors ${!hasChildren ? 'opacity-0 cursor-default' : ''}`}
                >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                <div
                    className="flex-1 flex items-center min-w-0 cursor-pointer"
                    onClick={() => setShowPeople(!showPeople)}
                >
                    <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400 mx-3">
                        <Users size={18} />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-lg truncate flex items-center gap-2">
                            {group.name}
                            {assignedPeople.length > 0 && (
                                <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-mono">
                                    {assignedPeople.length}
                                </span>
                            )}
                        </h4>
                        <p className="text-gray-400 text-sm truncate">{group.description || 'Keine Beschreibung verfügbar.'}</p>
                    </div>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(user?.role === 'admin' || user?.role === 'editor') && (
                        <button
                            onClick={() => onEdit(group)}
                            className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                            title="Edit Group"
                        >
                            <Edit3 size={16} />
                        </button>
                    )}
                    {user?.role === 'admin' && (
                        <button
                            onClick={() => onDelete(group.id)}
                            className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
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
                        className={`ml-16 space-y-2 py-2 overflow-hidden border-l border-white/5 pl-4`}
                    >
                        <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-2">Zugeordnete Personen ({assignedPeople.length})</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {assignedPeople.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => navigate(`/person/${p.id}`, { state: { activeTab: 'groups' } })}
                                    className="flex items-center group/person gap-2 p-2 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-blue-500/30 rounded-lg text-xs font-bold uppercase transition-all text-left"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover/person:animate-pulse"></div>
                                    <span className="truncate flex-1">{p.name}</span>
                                    <ArrowRight size={12} className="text-blue-500/0 group-hover/person:text-blue-500 transition-colors" />
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
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', id: null });
    const [groupFormState, setGroupFormState] = useState({ mode: 'create', data: { name: '', description: '', parent_id: '' } });
    const [userFormState, setUserFormState] = useState({ mode: 'create', data: null });
    const [toast, setToast] = useState({ message: '', type: 'success' });
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

    useEffect(() => {
        fetchPeople();
    }, []);

    const handleGroupSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...groupFormState.data,
                parent_id: groupFormState.data.parent_id === '' ? null : parseInt(groupFormState.data.parent_id)
            };

            if (groupFormState.mode === 'create') {
                await createGroup(payload);
                setToast({ message: 'Group created successfully!', type: 'success' });
            } else {
                await updateGroup(groupFormState.editId, payload);
                setToast({ message: 'Group updated successfully!', type: 'success' });
            }

            setShowGroupForm(false);
            setGroupFormState({ mode: 'create', data: { name: '', description: '', parent_id: '' } });
            fetchGroups();
        } catch (error) {
            console.error("Group submit error:", error);
            setToast({ message: `Failed to ${groupFormState.mode} group`, type: 'error' });
        }
    };

    const handleUserSubmit = async (userData) => {
        try {
            if (userFormState.mode === 'edit') {
                await updateUser(userFormState.editId, userData);
                setToast({ message: "Benutzer erfolgreich aktualisiert", type: 'success' });
            } else {
                await createUser(userData);
                setToast({ message: "Benutzer erfolgreich erstellt", type: 'success' });
            }
            setShowUserForm(false);
            fetchUsers();
        } catch (error) {
            setToast({ message: error.response?.data?.error || "Fehler beim Speichern des Benutzers", type: 'error' });
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
            setToast({ message: `${type} deleted successfully`, type: 'success' });
        } catch (error) {
            console.error("Delete error:", error);
            setToast({ message: `Failed to delete ${type}`, type: 'error' });
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

    const filteredPeople = (people || []).filter(person =>
        person && person.name && person.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
        <div className="min-h-screen bg-[#0a0a0c] text-white p-8 selection:bg-blue-500/30">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header - HUD Style */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-blue-600 pl-6 py-2">
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter bg-gradient-to-r from-blue-400 via-white to-purple-500 bg-clip-text text-transparent">
                            Civis.OS <span className="text-xs font-mono text-blue-500/50 align-top ml-2">v2.4.0</span>
                        </h1>
                        <p className="text-gray-500 font-mono text-xs mt-1">BENUTZER: {user?.username?.toUpperCase()} // STATUS: ANGEMELDET</p>
                    </div>

                    <div className="flex gap-3">
                        {(user?.role === 'admin' || user?.role === 'editor') && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowAddForm(true)}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-blue-500/20 transition-all border border-blue-400/30"
                            >
                                <Plus size={20} />
                                NEUE PERSON
                            </motion.button>
                        )}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={logout}
                            className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-4 py-3 rounded-xl flex items-center gap-2 font-medium transition-all border border-red-500/20"
                        >
                            <LogOut size={20} />
                        </motion.button>
                    </div>
                </div>

                {/* Navbar/Tabs */}
                <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10 w-fit">
                    <button
                        onClick={() => setActiveTab('people')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm tracking-widest transition-all flex items-center gap-2 ${activeTab === 'people' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Users size={16} /> PERSONEN
                    </button>
                    <button
                        onClick={() => setActiveTab('groups')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm tracking-widest transition-all flex items-center gap-2 ${activeTab === 'groups' ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <LayoutGrid size={16} /> GRUPPEN
                    </button>
                    <button
                        onClick={() => setActiveTab('network')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm tracking-widest transition-all flex items-center gap-2 ${activeTab === 'network' ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Share2 size={16} /> NETZWERK
                    </button>
                    {user?.role === 'admin' && (
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`px-6 py-2.5 rounded-xl font-bold text-sm tracking-widest transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Shield size={16} /> BENUTZER
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('facescan')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm tracking-widest transition-all flex items-center gap-2 ${activeTab === 'facescan' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Scan size={16} /> FACE SCAN
                    </button>
                </div>

                {/* Content Area */}
                <div className="min-h-[500px]">
                    {activeTab === 'people' && (
                        <div className="space-y-6">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="PERSONEN SUCHEN..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono text-sm placeholder:text-gray-700 uppercase"
                                />
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
                        <div className="space-y-6">
                            <div className="flex justify-between items-center border-b border-orange-500/20 pb-4">
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                                        <FolderTree className="text-orange-500" />
                                        Gruppen-Hierarchie
                                    </h2>
                                    <p className="text-gray-500 text-xs font-mono mt-1">ÜBERSICHT DER ORGANISATIONSSTRUKTUR</p>
                                </div>
                                {(user?.role === 'admin' || user?.role === 'editor') && (
                                    <button
                                        onClick={() => {
                                            setGroupFormState({ mode: 'create', data: { name: '', description: '', parent_id: '' } });
                                            setShowGroupForm(true);
                                        }}
                                        className="bg-orange-600/10 text-orange-500 hover:bg-orange-600/20 border border-orange-500/20 px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-xs uppercase"
                                    >
                                        <Plus size={16} /> Neue Gruppe
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
                        <div className="space-y-6">
                            <div className="border-b border-green-500/20 pb-4">
                                <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                                    <Share2 className="text-green-500" />
                                    Netzwerk-Graph
                                </h2>
                                <p className="text-gray-500 text-xs font-mono mt-1">INTERAKTIVE VISUALISIERUNG ALLER BEZIEHUNGEN</p>
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
                        <div className="bg-[#121214] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                                <div>
                                    <h2 className="text-xl font-black uppercase tracking-tight">Benutzerverwaltung</h2>
                                    <p className="text-gray-500 text-xs font-mono">LISTE DER BERECHTIGTEN BENUTZER</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setUserFormState({ mode: 'create', data: null });
                                        setShowUserForm(true);
                                    }}
                                    className="text-xs bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-500/20 px-4 py-2 rounded-lg transition-all font-bold uppercase"
                                >
                                    + Benutzer hinzufügen
                                </button>
                            </div>
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-gray-400 text-[10px] uppercase tracking-[0.2em] font-mono">
                                    <tr>
                                        <th className="p-6 font-medium">Benutzername</th>
                                        <th className="p-6 font-medium text-center">Rolle</th>
                                        <th className="p-6 font-medium text-right">Aktionen</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-mono text-sm">
                                    {usersList.map((u) => (
                                        <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-6 flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                                                <span className="font-bold">{u.username.toUpperCase()}</span>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className={`px-3 py-1 rounded-md text-[10px] font-black border uppercase ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                    u.role === 'editor' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        'bg-gray-500/10 text-gray-500 border-gray-500/20'
                                                    }`}>
                                                    {u.role.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openEditUser(u)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all">
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button onClick={() => setConfirmModal({ isOpen: true, type: 'user', id: u.id })} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                                                        <LogOut size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'facescan' && (
                        <FaceScanner />
                    )}
                </div>

                {/* Modals */}
                <AnimatePresence>
                    {showAddForm && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-[#121214] border border-blue-500/30 rounded-3xl p-8 w-full max-w-lg shadow-[0_0_50px_rgba(59,130,246,0.15)] relative">
                                <div className="absolute top-0 right-0 p-10 bg-blue-500/5 rounded-full -mr-10 -mt-10 blur-3xl"></div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 border-b border-white/10 pb-4">Neue Person</h2>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Vollständiger Name</label>
                                        <input
                                            type="text"
                                            id="new-person-name"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all uppercase font-mono text-sm"
                                            placeholder="NAME EINGEBEN..."
                                            onKeyDown={async (e) => {
                                                if (e.key === 'Enter' && e.target.value.trim()) {
                                                    try {
                                                        const res = await createPerson({ name: e.target.value.trim() });
                                                        setShowAddForm(false);
                                                        navigate(`/person/${res.data.id}`, { state: { activeTab: 'people' } });
                                                    } catch (error) {
                                                        setToast({ message: 'Fehler beim Erstellen', type: 'error' });
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                    <p className="text-gray-500 text-[10px] font-mono uppercase">Drücken Sie ENTER zum Erstellen. Danach können Sie Module hinzufügen.</p>
                                    <div className="flex gap-4 pt-4 border-t border-white/5">
                                        <button
                                            onClick={async () => {
                                                const name = document.getElementById('new-person-name').value;
                                                if (name.trim()) {
                                                    try {
                                                        const res = await createPerson({ name: name.trim() });
                                                        setShowAddForm(false);
                                                        navigate(`/person/${res.data.id}`, { state: { activeTab: 'people' } });
                                                    } catch (error) {
                                                        setToast({ message: 'Fehler beim Erstellen', type: 'error' });
                                                    }
                                                }
                                            }}
                                            className="flex-1 bg-blue-600/80 text-white rounded-2xl py-4 font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-blue-500/10 border border-blue-400/20"
                                        >
                                            Erstellen
                                        </button>
                                        <button onClick={() => setShowAddForm(false)} className="px-8 bg-white/5 text-white rounded-2xl py-4 font-bold uppercase text-xs tracking-widest transition-all border border-white/10">Abbrechen</button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {showUserForm && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-[#121214] border border-purple-500/30 rounded-3xl p-8 w-full max-w-lg shadow-[0_0_50px_rgba(168,85,247,0.15)] relative">
                                <div className="absolute top-0 right-0 p-10 bg-purple-500/5 rounded-full -mr-10 -mt-10 blur-3xl"></div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 border-b border-white/10 pb-4">
                                    {userFormState.mode === 'create' ? 'Neuer Benutzer' : 'Benutzer bearbeiten'}
                                </h2>
                                <UserForm
                                    onSubmit={handleUserSubmit}
                                    onCancel={() => setShowUserForm(false)}
                                    initialData={userFormState.data}
                                />
                            </motion.div>
                        </div>
                    )}

                    {showGroupForm && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-[#121214] border border-orange-500/30 rounded-3xl p-8 w-full max-w-lg shadow-[0_0_50px_rgba(249,115,22,0.15)] relative">
                                <div className="absolute top-0 right-0 p-10 bg-orange-500/5 rounded-full -mr-10 -mt-10 blur-3xl"></div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 border-b border-white/10 pb-4">
                                    {groupFormState.mode === 'create' ? 'Gruppe erstellen' : 'Gruppe bearbeiten'}
                                </h2>
                                <form onSubmit={handleGroupSubmit} className="space-y-5">
                                    <div>
                                        <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Gruppenname</label>
                                        <input
                                            required
                                            value={groupFormState.data.name}
                                            onChange={e => setGroupFormState({ ...groupFormState, data: { ...groupFormState.data, name: e.target.value } })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:border-orange-500/50 font-mono text-sm uppercase transition-colors"
                                            placeholder="Name eingeben..."
                                        />
                                    </div>
                                    <HUDSelect
                                        label="Übergeordnete Gruppe"
                                        value={groupFormState.data.parent_id}
                                        onChange={val => setGroupFormState({ ...groupFormState, data: { ...groupFormState.data, parent_id: val } })}
                                        options={[
                                            { value: "", label: "[KEINE]" },
                                            ...groupsList
                                                .filter(g => groupFormState.mode === 'create' || g.id !== groupFormState.editId)
                                                .map(g => ({ value: g.id, label: g.name.toUpperCase() }))
                                        ]}
                                        color="orange"
                                    />
                                    <div>
                                        <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Beschreibung</label>
                                        <textarea
                                            value={groupFormState.data.description}
                                            onChange={e => setGroupFormState({ ...groupFormState, data: { ...groupFormState.data, description: e.target.value } })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:border-orange-500/50 font-mono text-sm transition-colors resize-none"
                                            rows="3"
                                            placeholder="Beschreibung eingeben..."
                                        />
                                    </div>
                                    <div className="flex gap-4 mt-8">
                                        <button type="button" onClick={() => setShowGroupForm(false)} className="flex-1 px-4 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold uppercase text-xs tracking-widest transition-all">Abbrechen</button>
                                        <button type="submit" className="flex-1 px-4 py-4 bg-orange-600 hover:bg-orange-500 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-orange-500/20">
                                            {groupFormState.mode === 'create' ? 'Erstellen' : 'Speichern'}
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
                <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: '' })} />
            </div>
        </div>
    );
};

export default Dashboard;

