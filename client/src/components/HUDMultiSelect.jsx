import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';

const HUDMultiSelect = ({
    label,
    options,
    value = [], // Array of values
    onChange,
    icon: Icon,
    placeholder = "AUSWÄHLEN...",
    color = "blue",
    onOpenChange
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (onOpenChange) {
            onOpenChange(isOpen);
        }
    }, [isOpen, onOpenChange]);

    const colorClasses = {
        blue: { activeText: "text-blue-400", activeBg: "hover:bg-blue-500/10", accent: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" },
        orange: { activeText: "text-orange-400", activeBg: "hover:bg-orange-500/10", accent: "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" },
        purple: { activeText: "text-purple-400", activeBg: "hover:bg-purple-500/10", accent: "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" }
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

    const toggleOption = (val) => {
        const newValue = value.includes(val)
            ? value.filter(v => v !== val)
            : [...value, val];
        onChange(newValue);
    };

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
                    <div className="flex flex-wrap gap-2 items-center min-w-0">
                        {Icon && <Icon className={`${value.length > 0 ? theme.activeText : 'text-gray-500'} shrink-0 transition-colors`} size={18} />}
                        {value.length === 0 ? (
                            <span className="truncate font-mono text-[11px] uppercase tracking-wider text-gray-500">
                                {placeholder}
                            </span>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {value.map(v => {
                                    const opt = options.find(o => o.value === v);
                                    if (!opt) return null;
                                    return (
                                        <div key={v} className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 group/tag hover:border-white/30 transition-all">
                                            <span className="text-[9px] font-black uppercase tracking-widest">{opt.label}</span>
                                            <X 
                                                size={12} 
                                                className="text-gray-500 hover:text-red-500 transition-colors" 
                                                onClick={(e) => { e.stopPropagation(); toggleOption(v); }} 
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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
                            <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5 bg-[#0a0a0c]">
                                {options.length > 0 ? options.map((opt) => (
                                    <div
                                        key={opt.value}
                                        onClick={() => toggleOption(opt.value)}
                                        className={`
                                            w-full px-4 py-3 flex items-center gap-4 
                                            cursor-pointer transition-all rounded-xl mb-1 last:mb-0
                                            ${theme.activeBg}
                                            ${value.includes(opt.value) ? 'bg-white/10' : 'hover:bg-white/5'}
                                        `}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full transition-all ${value.includes(opt.value) ? theme.accent : 'bg-white/10'}`}></div>
                                        <span className={`
                                            font-mono text-[10px] uppercase tracking-[0.1em] flex-1
                                            ${value.includes(opt.value) ? 'text-white font-black' : 'text-gray-400 group-hover:text-gray-200'}
                                        `}>
                                            {opt.label}
                                        </span>
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

export default HUDMultiSelect;
