import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Activity, BarChart3, Clock, ChevronDown, ChevronUp } from 'lucide-react';

const ProgressBar = ({ label, value, max = 5 }) => {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  
  // Color based on value
  let color = 'from-emerald-400 to-emerald-500';
  if (value < 2.5) color = 'from-rose-400 to-rose-500';
  else if (value < 3.5) color = 'from-amber-400 to-amber-500';
  else if (value > 4.5) color = 'from-blue-400 to-blue-500';

  return (
    <div className="mb-4">
      <div className="flex justify-between items-end mb-1">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className="text-sm font-bold text-slate-400">{value.toFixed(1)} <span className="text-xs font-normal text-slate-500">/ 5</span></span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-2">
        <div 
          className={\`bg-gradient-to-r \${color} h-2 rounded-full transition-all duration-1000 ease-out\`}
          style={{ width: \`\${percentage}%\` }}
        ></div>
      </div>
    </div>
  );
};

const EvaluationDisplay = ({ evaluations }) => {
  const [showHistory, setShowHistory] = useState(false);

  if (!evaluations || evaluations.length === 0) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 text-center shadow-lg">
        <BrainCircuit className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-50" />
        <h3 className="text-slate-400 font-medium">Keine Evaluierung vorhanden</h3>
        <p className="text-sm text-slate-500 mt-1">Führe eine Persönlichkeitsanalyse durch, um hier Ergebnisse zu sehen.</p>
      </div>
    );
  }

  const latest = evaluations[0];
  const history = evaluations.slice(1);
  const { results, created_at } = latest;
  const dateStr = new Date(created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 bg-gradient-to-br from-slate-800/30 to-transparent">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-blue-400" />
                Aktuelles Persönlichkeitsprofil
              </h2>
              <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Erstellt am {dateStr}
              </p>
            </div>
            
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-500 uppercase tracking-wider mb-1">Primäre Archetypen</span>
              <div className="flex flex-wrap justify-end gap-2">
                {results.archetypes.map((arch, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm font-medium shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                    {arch}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Big Five */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Big Five
            </h3>
            <ProgressBar label="Offenheit" value={results.dimensions.openness} />
            <ProgressBar label="Gewissenhaftigkeit" value={results.dimensions.conscientiousness} />
            <ProgressBar label="Extraversion" value={results.dimensions.extraversion} />
            <ProgressBar label="Verträglichkeit" value={results.dimensions.agreeableness} />
            <ProgressBar label="Emotionale Stabilität" value={results.dimensions.emotionalStability} />
          </div>

          {/* Arbeitskompetenz */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              Arbeitsstil
            </h3>
            <ProgressBar label="Selbstmanagement" value={results.dimensions.selfManagement} />
            <ProgressBar label="Arbeitsmotivation" value={results.dimensions.workMotivation} />
            <ProgressBar label="Produktivität" value={results.dimensions.productivity} />
            <ProgressBar label="Risikobereitschaft" value={results.dimensions.risk} />
            <ProgressBar label="Führungspotenzial" value={results.dimensions.leadership} />
          </div>

          {/* Social & Decision */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-purple-400" />
              Sozial & Mental
            </h3>
            <ProgressBar label="Empathie" value={results.dimensions.empathy} />
            <ProgressBar label="Kommunikation" value={results.dimensions.communication} />
            <ProgressBar label="Soziale Flexibilität" value={results.dimensions.socialFlexibility} />
            <ProgressBar label="Analytisches Denken" value={results.dimensions.analytical} />
            <ProgressBar label="Intuitives Denken" value={results.dimensions.intuitive} />
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
          >
            <span className="font-medium text-slate-300">Verlauf ({history.length} weitere)</span>
            {showHistory ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
          </button>
          
          {showHistory && (
            <div className="p-4 border-t border-slate-800 space-y-4">
              {history.map((evalItem, index) => {
                const date = new Date(evalItem.created_at).toLocaleDateString('de-DE');
                return (
                  <div key={evalItem.id} className="bg-slate-800/30 p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-slate-300 font-medium mb-1">Auswertung vom {date}</div>
                      <div className="flex gap-2">
                        {evalItem.results.archetypes.slice(0, 2).map((a, i) => (
                          <span key={i} className="text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded">{a}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 text-right">
                      {/* Optional: Add a button to view detailed history modal */}
                      Archiviert
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EvaluationDisplay;
