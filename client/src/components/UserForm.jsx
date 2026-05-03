import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, X, User, Lock, Shield, UserPlus, Check } from 'lucide-react';
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
        const dataToSend = { ...formData };
        if (isEdit && !dataToSend.password) {
            delete dataToSend.password;
        }
        onSubmit(dataToSend);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
                {/* Username Field */}
                <div className="space-y-2">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] block ml-1 font-bold">Identifikations-Name</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                            <User size={18} />
                        </div>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            autoComplete="username"
                            className="glass-input w-full pl-12 bg-white/5 border border-white/10 rounded-2xl py-4 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                            placeholder="BENUTZERNAME EINGEBEN..."
                        />
                    </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] block ml-1 font-bold">
                        Sicherheits-Schlüssel {isEdit && <span className="text-slate-600 font-normal lowercase tracking-normal opacity-50">(leer lassen für keine Änderung)</span>}
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                            <Lock size={18} />
                        </div>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required={!isEdit}
                            autoComplete="new-password"
                            className="glass-input w-full pl-12 bg-white/5 border border-white/10 rounded-2xl py-4 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all font-password"
                            placeholder="PASSWORT DEFINIEREN..."
                        />
                    </div>
                </div>

                {/* Role Selection */}
                <div className="pt-2">
                    <HUDSelect
                        label="Zugriffsebene"
                        icon={Shield}
                        value={formData.role}
                        onChange={(val) => setFormData(prev => ({ ...prev, role: val }))}
                        options={[
                            { value: "view_only", label: "Protocol View (Nur Lesen)" },
                            { value: "editor", label: "Identity Editor (Bearbeiten)" },
                            { value: "admin", label: "Master Admin (Vollzugriff)" }
                        ]}
                        color="blue"
                    />
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t border-white/10">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl flex items-center justify-center gap-2 font-bold uppercase text-[10px] tracking-widest transition-all border border-white/10 active:scale-95"
                >
                    <X size={16} />
                    Abbrechen
                </button>

                <button
                    type="submit"
                    className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white rounded-2xl py-4 flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-blue-500/20 border border-blue-400/30 active:scale-95"
                >
                    {isEdit ? <Save size={16} /> : <UserPlus size={16} />}
                    {isEdit ? 'Profil Aktualisieren' : 'Benutzer Initialisieren'}
                </button>
            </div>
        </form>
    );
};

export default UserForm;
