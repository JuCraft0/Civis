import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, X, User, Lock, Shield } from 'lucide-react';
import HUDSelect from './HUDSelect';

const UserForm = ({ onSubmit, onCancel, initialData = null }) => {
    const [formData, setFormData] = useState({
        username: initialData?.username || '',
        password: '',
        role: initialData?.role || 'view_only'
    });

    const isEdit = !!initialData;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // If editing and password is empty, don't send it
        const dataToSend = { ...formData };
        if (isEdit && !dataToSend.password) {
            delete dataToSend.password;
        }
        onSubmit(dataToSend);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Benutzername</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        autocomplete="username"
                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors uppercase font-mono text-xs"
                        placeholder="BENUTZERNAME"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2">
                    Passwort {isEdit && <span className="text-gray-600 font-normal normal-case">(LEER LASSEN FÜR KEINE ÄNDERUNG)</span>}
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required={!isEdit}
                        autocomplete="new-password"
                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono text-xs"
                        placeholder="PASSWORT"
                    />
                </div>
            </div>

            <HUDSelect
                label="Rolle"
                icon={Shield}
                value={formData.role}
                onChange={(val) => setFormData(prev => ({ ...prev, role: val }))}
                options={[
                    { value: "view_only", label: "VIEW ONLY (NUR LESEN)" },
                    { value: "editor", label: "EDITOR (PERSONEN EDITIEREN)" },
                    { value: "admin", label: "ADMIN (VOLLER ZUGRIFF)" }
                ]}
                color="purple"
            />

            <div className="flex gap-4 pt-4">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-bold uppercase text-xs transition-colors shadow-lg shadow-green-500/10 border border-green-400/20"
                >
                    <Save size={18} />
                    {isEdit ? 'SPEICHERN' : 'ERSTELLEN'}
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={onCancel}
                    className="px-6 bg-white/5 hover:bg-white/10 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-bold uppercase text-xs transition-colors border border-white/10"
                >
                    <X size={18} />
                    ABBRECHEN
                </motion.button>
            </div>
        </form>
    );
};

export default UserForm;
