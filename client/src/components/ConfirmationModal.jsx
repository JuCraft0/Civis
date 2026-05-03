import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 flex items-center justify-center p-4 z-[100]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md overflow-hidden"
                    >
                        {/* Glow effect background */}
                        <div className={`absolute inset-0 opacity-10 blur-3xl pointer-events-none ${isDanger ? 'bg-red-500' : 'bg-blue-500'}`} />
                        
                        <div className="relative glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl overflow-hidden">
                            {/* Decorative Top Border */}
                            <div className={`absolute top-0 left-0 right-0 h-1 ${isDanger ? 'bg-red-500' : 'bg-blue-500'}`} />

                            <div className="flex flex-col items-center text-center gap-6">
                                <div className={`p-4 rounded-2xl ${isDanger ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'} border`}>
                                    <AlertTriangle size={32} />
                                </div>
                                
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-white tracking-tight">{title}</h3>
                                    <p className="text-gray-400 leading-relaxed">
                                        {message}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-10">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/5 active:scale-95"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={onConfirm}
                                    className={`flex-1 px-6 py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95 ${
                                        isDanger
                                            ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20'
                                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                                    }`}
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmationModal;
