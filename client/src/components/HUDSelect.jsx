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
    color = "blue" // blue, orange, purple
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

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
            {label && <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2">{label}</label>}
            <div className="relative">
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 
                        text-white cursor-pointer transition-all flex items-center justify-between
                        ${theme.border} ${isOpen ? 'ring-1 border-opacity-50' : ''} shadow-lg ${theme.glow}
                    `}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        {Icon && <Icon className="text-gray-500 shrink-0" size={18} />}
                        <span className={`truncate font-mono text-xs uppercase ${selectedOption ? 'text-white' : 'text-gray-600'}`}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                </div>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute z-50 w-full mt-2 bg-[#121214] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
                        >
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                {options.length > 0 ? options.map((opt) => (
                                    <div
                                        key={opt.value}
                                        onClick={() => {
                                            onChange(opt.value);
                                            setIsOpen(false);
                                        }}
                                        className={`
                                            w-full px-5 py-3.5 flex items-center gap-3 
                                            cursor-pointer transition-all border-b border-white/5 last:border-0
                                            ${theme.activeBg}
                                            ${value === opt.value ? 'bg-white/5' : ''}
                                        `}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full ${value === opt.value ? (color === 'blue' ? 'bg-blue-500' : color === 'orange' ? 'bg-orange-500' : 'bg-purple-500') : 'bg-transparent'}`}></div>
                                        <span className={`
                                            font-mono text-[10px] uppercase tracking-wider flex-1
                                            ${value === opt.value ? theme.activeText + ' font-bold' : 'text-gray-400'}
                                        `}>
                                            {opt.label}
                                        </span>
                                    </div>
                                )) : (
                                    <div className="p-5 text-center text-gray-600 font-mono text-[10px] uppercase tracking-widest">
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
