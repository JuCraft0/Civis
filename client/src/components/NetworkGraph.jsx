import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const personIcon = new Image();
personIcon.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="rgb(96,165,250)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>');

const groupIcon = new Image();
groupIcon.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="rgb(251,146,60)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>');

const NetworkGraph = ({ data }) => {
    const fgRef = useRef();
    const navigate = useNavigate();
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const containerRef = useRef(null);
    const [hoverNode, setHoverNode] = useState(null);
    const [imgCache, setImgCache] = useState({});

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };

        window.addEventListener('resize', updateDimensions);
        setTimeout(updateDimensions, 100);

        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Effect to preload images
    useEffect(() => {
        data.nodes.forEach(node => {
            if (node.photo_url && !imgCache[node.photo_url]) {
                const pUrl = node.photo_url.startsWith('/') ? node.photo_url : `/${node.photo_url}`;
                const fullUrl = `${pUrl}`;
                const img = new Image();
                img.src = fullUrl;
                img.onload = () => {
                    setImgCache(prev => ({ ...prev, [node.photo_url]: img }));
                };
            }
        });
    }, [data.nodes, imgCache]);

    // Group links to handle multi-link label stacking
    const linksGrouped = useMemo(() => {
        const groups = {};
        if (!data.links) return groups;
        data.links.forEach(l => {
            const id1 = typeof l.source === 'object' ? l.source.id : l.source;
            const id2 = typeof l.target === 'object' ? l.target.id : l.target;
            const key = [id1, id2].sort().join('-');
            if (!groups[key]) groups[key] = [];
            groups[key].push(l);
        });
        return groups;
    }, [data.links]);

    const handleNodeClick = useCallback(node => {
        if (fgRef.current) {
            fgRef.current.centerAt(node.x, node.y, 1000);
            fgRef.current.zoom(4, 2000);
        }
    }, [fgRef]);

    const handleNodeRightClick = (node, event) => {
        event.preventDefault();
        if (node.id.startsWith('person_')) {
            const personId = node.id.replace('person_', '');
            navigate(`/person/${personId}`, { state: { activeTab: 'network' } });
        }
    };

    const drawNode = (node, ctx, globalScale) => {
        const label = node.name.toUpperCase();
        const fontSize = 12 / globalScale;
        const isHovered = hoverNode === node;
        const isRelated = hoverNode && (data.links.some(l =>
            (l.source.id === node.id && l.target.id === hoverNode.id) ||
            (l.target.id === node.id && l.source.id === hoverNode.id)
        ));

        const baseSize = node.type === 'group' ? 15 : 10;
        const size = isHovered ? baseSize * 1.3 : baseSize;

        ctx.save();

        // 1. Draw Glow/Aura
        if (isHovered || isRelated) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, size * 1.3, 0, 2 * Math.PI);
            const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size * 1.3);
            const color = node.type === 'group' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(59, 130, 246, 0.2)';
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // 2. Draw Pulse Ring for hovered node
        if (isHovered) {
            const time = Date.now() / 1000;
            const pulse = (Math.sin(time * 3) + 1) / 2;
            ctx.beginPath();
            ctx.arc(node.x, node.y, size * (1.05 + pulse * 0.2), 0, 2 * Math.PI);
            ctx.strokeStyle = node.type === 'group' ? `rgba(249, 115, 22, ${0.4 - pulse * 0.4})` : `rgba(59, 130, 246, ${0.4 - pulse * 0.4})`;
            ctx.lineWidth = 1.5 / globalScale;
            ctx.stroke();
        }

        // 3. Draw Main Node Shape
        ctx.beginPath();
        if (node.type === 'group') {
            // Hexagon for groups
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const x = node.x + size * Math.cos(angle);
                const y = node.y + size * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = 'rgba(20, 20, 25, 0.9)';
            ctx.fill();
            ctx.strokeStyle = isHovered ? '#fb923c' : 'rgba(249, 115, 22, 0.6)';
            ctx.lineWidth = 2 / globalScale;
            ctx.stroke();

            // Inner Details
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                ctx.moveTo(node.x + (size * 0.6) * Math.cos(angle), node.y + (size * 0.6) * Math.sin(angle));
                ctx.lineTo(node.x + (size * 0.8) * Math.cos(angle), node.y + (size * 0.8) * Math.sin(angle));
            }
            ctx.stroke();
        } else {
            // Person Node: Circle with Photo or Icon
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(15, 15, 18, 0.95)';
            ctx.fill();
            ctx.strokeStyle = isHovered ? '#60a5fa' : 'rgba(59, 130, 246, 0.5)';
            ctx.lineWidth = 1.5 / globalScale;
            ctx.stroke();

            // Clipping for photo
            const cachedImg = node.photo_url ? imgCache[node.photo_url] : null;
            if (cachedImg) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(node.x, node.y, size - (1 / globalScale), 0, 2 * Math.PI);
                ctx.clip();

                // Draw image centered and scaled to fill the circle
                const aspect = cachedImg.width / cachedImg.height;
                let drawW = size * 2;
                let drawH = size * 2;
                if (aspect > 1) drawW = drawH * aspect;
                else drawH = drawW / aspect;

                ctx.drawImage(cachedImg, node.x - drawW / 2, node.y - drawH / 2, drawW, drawH);
                ctx.restore();

                // Overlay subtle scanlines or brightness on image if hovered
                if (isHovered) {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
                    ctx.fill();
                }
            } else {
                // Generic Icon if no photo
                const iconSize = size * 1.2;
                if (personIcon.complete) {
                    ctx.drawImage(personIcon, node.x - iconSize / 2, node.y - iconSize / 2, iconSize, iconSize);
                }
            }

            // Tactical corners/brackets
            const cornerSize = size * 1.2;
            ctx.lineWidth = 1 / globalScale;
            ctx.strokeStyle = isHovered ? '#60a5fa' : 'rgba(59, 130, 246, 0.3)';
            // Top Left
            ctx.beginPath(); ctx.moveTo(node.x - cornerSize, node.y - cornerSize + 4 / globalScale); ctx.lineTo(node.x - cornerSize, node.y - cornerSize); ctx.lineTo(node.x - cornerSize + 4 / globalScale, node.y - cornerSize); ctx.stroke();
            // Top Right
            ctx.beginPath(); ctx.moveTo(node.x + cornerSize, node.y - cornerSize + 4 / globalScale); ctx.lineTo(node.x + cornerSize, node.y - cornerSize); ctx.lineTo(node.x + cornerSize - 4 / globalScale, node.y - cornerSize); ctx.stroke();
            // Bottom Left
            ctx.beginPath(); ctx.moveTo(node.x - cornerSize, node.y + cornerSize - 4 / globalScale); ctx.lineTo(node.x - cornerSize, node.y + cornerSize); ctx.lineTo(node.x - cornerSize + 4 / globalScale, node.y + cornerSize); ctx.stroke();
            // Bottom Right
            ctx.beginPath(); ctx.moveTo(node.x + cornerSize, node.y + cornerSize - 4 / globalScale); ctx.lineTo(node.x + cornerSize, node.y + cornerSize); ctx.lineTo(node.x + cornerSize - 4 / globalScale, node.y + cornerSize); ctx.stroke();
        }

        // 4. Draw Label
        if (globalScale > 0.8 || isHovered) {
            ctx.font = `${isHovered ? 'bold' : 'normal'} ${12 / globalScale}px monospace`;
            const textWidth = ctx.measureText(label).width;
            const pad = 4 / globalScale;

            // Label box
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.strokeStyle = isHovered ? (node.type === 'group' ? '#fb923c' : '#60a5fa') : 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1 / globalScale;

            const labelY = node.y + size + 8 / globalScale;
            ctx.beginPath();
            ctx.moveTo(node.x - textWidth / 2 - pad, labelY - (12 / globalScale) / 2 - pad);
            ctx.lineTo(node.x + textWidth / 2 + pad, labelY - (12 / globalScale) / 2 - pad);
            ctx.lineTo(node.x + textWidth / 2 + pad + 3 / globalScale, labelY + (12 / globalScale) / 2 + pad);
            ctx.lineTo(node.x - textWidth / 2 - pad - 3 / globalScale, labelY + (12 / globalScale) / 2 + pad);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
            ctx.fillText(label, node.x, labelY);

            // Tech ID on hover
            if (isHovered) {
                ctx.font = `${(12 / globalScale) * 0.7}px monospace`;
                ctx.fillStyle = node.type === 'group' ? '#fb923c' : '#60a5fa';
                ctx.fillText(`ID: ${node.id.toUpperCase()}`, node.x, labelY + (12 / globalScale) + 4 / globalScale);
            }
        }

        ctx.restore();
    };

    const nodePointerAreaPaint = (node, color, ctx, globalScale) => {
        const baseSize = node.type === 'group' ? 15 : 10;
        // The interactive area should cover the tactical brackets (size * 1.2)
        // We make it slightly larger (1.4) to feel more responsive
        const size = baseSize * 1.4;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
        ctx.fill();
    };

    const drawLink = (link, ctx, globalScale) => {
        const start = link.source;
        const end = link.target;

        if (!start || !end || typeof start.x !== 'number' || typeof end.x !== 'number') return;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);

        let color = 'rgba(255, 255, 255, 0.05)';
        let lineWidth = 1 / globalScale;
        let lineDash = [];

        if (link.type === 'Familie') {
            color = 'rgba(34, 197, 94, 0.3)';
            lineDash = [5 / globalScale, 5 / globalScale];
        } else if (link.type === 'Beziehung/Partner') {
            color = 'rgba(239, 68, 68, 0.4)';
        } else if (link.type === 'Soziales Umfeld') {
            color = 'rgba(59, 130, 246, 0.3)';
            lineDash = [2 / globalScale, 4 / globalScale];
        } else if (link.type === 'Group') {
            color = 'rgba(249, 115, 22, 0.1)';
        }

        const isActive = hoverNode && (start.id === hoverNode.id || end.id === hoverNode.id);
        if (isActive) {
            color = color.replace('0.4)', '0.9)').replace('0.3)', '0.8)').replace('0.1)', '0.5)');
            lineWidth = 2 / globalScale;
            ctx.shadowBlur = 10 / globalScale;
            ctx.shadowColor = color;
        }

        ctx.setLineDash(lineDash);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        // Animated "Data Flow" particles on active links
        if (isActive) {
            const time = Date.now() * 0.002;
            const numParticles = 3;
            for (let i = 0; i < numParticles; i++) {
                const t = (time + i / numParticles) % 1;
                const px = start.x + (end.x - start.x) * t;
                const py = start.y + (end.y - start.y) * t;

                ctx.beginPath();
                ctx.arc(px, py, 1.5 / globalScale, 0, 2 * Math.PI);
                ctx.fillStyle = '#fff';
                ctx.fill();
            }
        }

        // Multi-link label stacking logic
        if (globalScale > 2.0 || isActive) {
            if (link.label) {
                const id1 = typeof start === 'object' ? start.id : start;
                const id2 = typeof end === 'object' ? end.id : end;
                const key = [id1, id2].sort().join('-');
                const group = linksGrouped[key] || [];
                const index = group.indexOf(link);
                const total = group.length;

                const fontSize = 10 / globalScale;
                const rowHeight = fontSize * 1.5;
                const offset = (index - (total - 1) / 2) * rowHeight;

                const midX = (start.x + end.x) / 2;
                const midY = (start.y + end.y) / 2 + offset;

                const label = link.label.toUpperCase();
                ctx.font = `${fontSize}px monospace`;
                const textWidth = ctx.measureText(label).width;

                ctx.setLineDash([]); // Reset dash for label bg
                ctx.fillStyle = 'rgba(5, 5, 5, 0.9)';
                ctx.fillRect(midX - textWidth / 2 - 2 / globalScale, midY - fontSize / 2 - 2 / globalScale, textWidth + 4 / globalScale, fontSize + 4 / globalScale);

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = color.replace('0.9)', '1)').replace('0.8)', '1)').replace('0.5)', '1)');
                ctx.fillText(label, midX, midY);
            }
        }

        ctx.restore();
    };

    return (
        <div ref={containerRef} className="w-full h-[700px] bg-[#050505] rounded-3xl overflow-hidden border border-white/10 relative shadow-2xl group/graph">
            {/* Grid Background Effect */}
            <div className="absolute inset-0 pointer-events-none z-0"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), 
                        linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), 
                        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
                    `,
                    backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px'
                }}>
            </div>

            {/* Vignette Overlay */}
            <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]"></div>

            {/* Scanlines Effect */}
            <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03]"
                style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 2px)',
                    backgroundSize: '100% 2px'
                }}>
            </div>

            {/* Hint Overlay */}
            <div className="absolute top-4 right-4 z-10 pointer-events-none opacity-50 group-hover/graph:opacity-100 transition-opacity">
                <div className="bg-black/60 border border-white/10 rounded-xl p-3 text-right backdrop-blur-md">
                    <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest"><span className="text-white font-bold">Klick</span>: Zoom & Focus</p>
                    <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest mt-1"><span className="text-blue-400 font-bold">Rechtsklick</span>: Profil öffnen</p>
                </div>
            </div>

            <ForceGraph2D
                ref={fgRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={data}
                nodeCanvasObject={drawNode}
                nodePointerAreaPaint={nodePointerAreaPaint}
                linkCanvasObject={drawLink}
                backgroundColor="transparent"
                onNodeHover={node => setHoverNode(node)}
                onNodeClick={handleNodeClick}
                onNodeRightClick={handleNodeRightClick}
                cooldownTicks={100}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
            />

            {/* Legend Overlay */}
            <div className="absolute bottom-6 left-6 p-6 bg-[#0a0a0c]/90 backdrop-blur-xl rounded-2xl border border-white/10 pointer-events-none shadow-[0_0_40px_rgba(0,0,0,0.8)] z-20">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 bg-green-500 rounded-full"></div>
                    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.3em] font-black">System.Network_Overview</div>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-[10px] font-mono tracking-widest">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-blue-500/20 border border-blue-500/60 rounded-sm"></div>
                            <span className="text-gray-400">PERSON_NODE</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-orange-500/20 border border-orange-500/60" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></div>
                            <span className="text-gray-400">GROUP_CLUSTER</span>
                        </div>
                    </div>
                    <div className="space-y-3 border-l border-white/10 pl-8">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-px bg-green-500/60 border-b border-dashed border-green-500/40"></div>
                            <span className="text-gray-500 italic">FAMILIE</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-px bg-red-500/60 shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div>
                            <span className="text-gray-500 italic">PARTNER</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-px bg-blue-500/60 border-b border-dotted border-blue-500/40" style={{ borderBottomWidth: '2px' }}></div>
                            <span className="text-gray-500 italic">SOZIAL</span>
                        </div>
                    </div>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center opacity-30">
                    <span className="text-[8px] font-mono tracking-[0.4em]">CONNECTED.OS_STABLE</span>
                    <div className="flex gap-1">
                        <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                        <div className="w-1 h-1 bg-white rounded-full animate-pulse [animation-delay:0.2s]"></div>
                        <div className="w-1 h-1 bg-white rounded-full animate-pulse [animation-delay:0.4s]"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NetworkGraph;
