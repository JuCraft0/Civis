import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

const HUDSelect = ({
    label,
    options,
    value,
    onChange,
    icon: Icon,
    placeholder = "AUSWÄHLEN...",
    color = "blue", // blue, orange, purple
    onOpenChange
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (onOpenChange) {
            onOpenChange(isOpen);
        }
    }, [isOpen, onOpenChange]);

    const selectedOption = options.find(opt => opt.value === value);

    const colorClasses = {
        blue: {
            border: "focus-within:border-blue-500/50 focus-within:ring-blue-500/20",
            glow: "shadow-blue-500/10",
            activeText: "text-blue-400",
            activeBg: "hover:bg-blue-500/10",
            accent: "border-blue-500/30"
        },
        orange: {
            border: "focus-within:border-orange-500/50 focus-within:ring-orange-500/20",
            glow: "shadow-orange-500/10",
            activeText: "text-orange-400",
            activeBg: "hover:bg-orange-500/10",
            accent: "border-orange-500/30"
        },
        purple: {
            border: "focus-within:border-purple-500/50 focus-within:ring-purple-500/20",
            glow: "shadow-purple-500/10",
            activeText: "text-purple-400",
            activeBg: "hover:bg-purple-500/10",
            accent: "border-purple-500/30"
        }
    };

    const theme = colorClasses[color] || colorClasses.blue;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="space-y-2" ref={containerRef}>
            {label && <label className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] block mb-2 px-1">{label}</label>}
            <div className={`relative ${isOpen ? 'z-50' : 'focus-within:z-20'}`}>
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        w-full glass-panel rounded-2xl px-5 py-3.5 
                        text-white cursor-pointer transition-all flex items-center justify-between
                        border border-white/5 hover:border-white/20 outline-none
                        ${isOpen ? 'ring-1 ring-white/10 border-white/30' : ''} shadow-2xl
                    `}
                    tabIndex={0}
                >
                    <div className="flex items-center gap-4 min-w-0">
                        {Icon && <Icon className={`${selectedOption ? theme.activeText : 'text-gray-500'} shrink-0 transition-colors`} size={18} />}
                        <span className={`truncate font-mono text-[11px] uppercase tracking-wider ${selectedOption ? 'text-white font-bold' : 'text-gray-500'}`}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                    </div>
                    <ChevronDown size={16} className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            className="absolute z-[9999] w-full mt-3 glass-panel rounded-2xl shadow-3xl overflow-hidden border border-white/10"
                        >
                            <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5">
                                {options.length > 0 ? options.map((opt) => (
                                    <div
                                        key={opt.value}
                                        onClick={() => {
                                            onChange(opt.value);
                                            setIsOpen(false);
                                        }}
                                        className={`
                                            w-full px-4 py-3 flex items-center gap-4 
                                            cursor-pointer transition-all rounded-xl mb-1 last:mb-0
                                            ${theme.activeBg}
                                            ${value === opt.value ? 'bg-white/10' : 'hover:bg-white/5'}
                                        `}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full transition-all ${value === opt.value ? (color === 'blue' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : color === 'orange' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]') : 'bg-white/10'}`}></div>
                                        <span className={`
                                            font-mono text-[10px] uppercase tracking-[0.1em] flex-1
                                            ${value === opt.value ? 'text-white font-black' : 'text-gray-400 group-hover:text-gray-200'}
                                        `}>
                                            {opt.label}
                                        </span>
                                        {value === opt.value && <div className={`w-1 h-1 rounded-full ${color === 'blue' ? 'bg-blue-500' : color === 'orange' ? 'bg-orange-500' : 'bg-purple-500'}`} />}
                                    </div>
                                )) : (
                                    <div className="p-6 text-center text-gray-600 font-mono text-[10px] uppercase tracking-widest italic">
                                        Keine Optionen verfügbar
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default HUDSelect;
