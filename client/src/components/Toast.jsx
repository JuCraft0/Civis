import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [message, duration, onClose]);

    if (!message) return null;

    const bgColors = {
        success: 'bg-green-500/10 border-green-500/20 text-green-400',
        error: 'bg-red-500/10 border-red-500/20 text-red-400',
        info: 'bg-blue-500/10 border-blue-500/20 text-blue-400'
    };

    const icons = {
        success: <Check size={20} />,
        error: <AlertCircle size={20} />,
        info: <AlertCircle size={20} />
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: 20, x: '-50%' }}
                className={`fixed bottom-8 left-1/2 z-[70] flex items-center gap-3 px-6 py-4 rounded-xl border backdrop-blur-md shadow-2xl ${bgColors[type]}`}
            >
                {icons[type]}
                <span className="font-medium">{message}</span>
                <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
                    <X size={16} />
                </button>
            </motion.div>
        </AnimatePresence>
    );
};

export default Toast;
