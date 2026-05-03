import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, ShieldCheck, Cpu } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSetup, setIsSetup] = useState(true);
    const [error, setError] = useState('');
    const { login } = useAuth();

    React.useEffect(() => {
        const checkSetup = async () => {
            try {
                const response = await axios.get('/api/auth/status');
                setIsSetup(response.data.isSetup);
            } catch (err) {
                console.error("Setup check failed", err);
            }
        };
        checkSetup();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!isSetup) {
            if (password !== confirmPassword) return setError('Passwörter stimmen nicht überein');
            if (password.length < 4) return setError('Passwort muss min. 4 Zeichen haben');
            try {
                await axios.post('/api/auth/setup', { username, password });
                const response = await axios.post('/api/auth/login', { username, password });
                const { token, role, username: user } = response.data;
                login({ username: user, role }, token);
            } catch (err) {
                setError(err.response?.data?.error || 'Setup fehlgeschlagen');
            }
            return;
        }

        try {
            const response = await axios.post('/api/auth/login', { username, password });
            const { token, role, username: user } = response.data;
            login({ username: user, role }, token);
        } catch (err) {
            setError(err.response?.data?.error || 'Login fehlgeschlagen');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md z-10"
            >
                {/* Branding */}
                <div className="text-center mb-12">
                    <motion.div 
                        initial={{ y: -20, rotate: -10 }}
                        animate={{ y: 0, rotate: 0 }}
                        className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-2xl shadow-blue-500/30 mb-6 border border-blue-400/30 relative"
                    >
                        <Cpu className="text-white" size={40} />
                        <div className="absolute inset-0 bg-white/10 rounded-3xl blur-md opacity-50 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                    <h1 className="text-6xl font-black tracking-tighter text-white font-mono leading-none">
                        CIVIS<span className="text-blue-500">.</span>
                    </h1>
                    <p className="text-blue-400/60 font-black tracking-[0.3em] text-[10px] mt-3 uppercase">Neural Identity Matrix</p>
                </div>

                {/* Form Card */}
                <div className="glass-panel p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group border-white/10">
                    {/* Scanner Line Effect */}
                    <motion.div 
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent z-20 pointer-events-none"
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                    
                    <div className="flex items-center justify-between mb-10">
                        <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
                            <ShieldCheck className="text-blue-500" size={24} />
                            {isSetup ? 'Auth Protocol' : 'Initial Setup'}
                        </h2>
                        <div className="flex gap-1">
                            <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                            <div className="w-1 h-1 rounded-full bg-blue-500/50" />
                            <div className="w-1 h-1 rounded-full bg-blue-500/20" />
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="bg-red-500/10 border-l-4 border-red-500 text-red-400 p-4 rounded-r-xl mb-8 text-xs font-bold flex items-center gap-3 uppercase tracking-wider"
                            >
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Terminal ID</label>
                            <div className="relative">
                                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="glass-input w-full rounded-2xl pl-14 pr-6 py-5 text-sm focus:ring-blue-500/20 transition-all font-mono placeholder:text-slate-700"
                                    placeholder="Enter identifier..."
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Secure Key</label>
                            <div className="relative">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="glass-input w-full rounded-2xl pl-14 pr-6 py-5 text-sm focus:ring-blue-500/20 transition-all font-mono placeholder:text-slate-700"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {!isSetup && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-3"
                            >
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Verify Key</label>
                                <div className="relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="glass-input w-full rounded-2xl pl-14 pr-6 py-5 text-sm focus:ring-blue-500/20 transition-all font-mono placeholder:text-slate-700"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </motion.div>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02, letterSpacing: '0.25em' }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-6 rounded-2xl font-black tracking-[0.2em] uppercase text-xs shadow-2xl shadow-blue-600/30 transition-all mt-4 border border-blue-400/30"
                        >
                            {isSetup ? 'Initiate Link' : 'Secure Core'}
                        </motion.button>
                    </form>
                </div>

                <div className="mt-12 flex flex-col items-center gap-4">
                    <div className="h-[1px] w-12 bg-slate-800" />
                    <p className="text-slate-600 text-[10px] font-black font-mono uppercase tracking-[0.4em]">
                        System Version 2.5.0-ALPHA
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
