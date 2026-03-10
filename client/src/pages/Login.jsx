import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Lock, User } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSetup, setIsSetup] = useState(true); // Default to true to hide setup until checked
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
            if (password !== confirmPassword) {
                return setError('Passwords do not match');
            }
            if (password.length < 4) {
                return setError('Password must be at least 4 characters');
            }
            try {
                await axios.post('/api/auth/setup', { username, password });
                // If successful, log in automatically or switch to login mode
                const response = await axios.post('/api/auth/login', { username, password });
                const { token, role, username: user } = response.data;
                login({ username: user, role }, token);
            } catch (err) {
                setError(err.response?.data?.error || 'Setup failed');
            }
            return;
        }

        try {
            const response = await axios.post('/api/auth/login', {
                username,
                password
            });
            const { token, role, username: user } = response.data;
            login({ username: user, role }, token);
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#242424] p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/10"
            >
                <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    {isSetup ? 'Civis Login' : 'Civis Setup'}
                </h1>

                {!isSetup && (
                    <div className="bg-blue-500/10 text-blue-400 p-3 rounded-lg mb-6 text-sm text-center border border-blue-500/20">
                        Erstellen Sie das erste Administrator-Konto.
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 text-red-500 p-3 rounded-lg mb-6 text-sm text-center border border-red-500/20">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                name="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Admin Username"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="password"
                                name="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder={isSetup ? "Enter password" : "Min. 4 characters"}
                            />
                        </div>
                    </div>

                    {!isSetup && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    autoComplete="new-password"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="Repeat password"
                                />
                            </div>
                        </div>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all mt-4"
                    >
                        {isSetup ? 'Sign In' : 'Complete Setup'}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
};

export default Login;
