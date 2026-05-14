import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPeople, getEvaluationsQuestions, saveEvaluation } from '../services/api';
import toast from 'react-hot-toast';

const Evaluation = () => {
  const [people, setPeople] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const questionsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [peopleRes, qRes] = await Promise.all([
          getPeople(),
          getEvaluationsQuestions()
        ]);
        setPeople(peopleRes.data);
        setQuestions(qRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Fehler beim Laden der Daten');
      }
    };
    fetchData();
  }, []);

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async () => {
    if (!selectedPerson) {
      toast.error('Bitte wähle eine Person aus');
      return;
    }
    
    // Check if all questions are answered
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      toast.error(`Bitte beantworte alle Fragen (${answeredCount}/${questions.length})`);
      return;
    }

    try {
      await saveEvaluation(selectedPerson, answers);
      toast.success('Evaluierung erfolgreich gespeichert!');
      navigate(`/person/${selectedPerson}`);
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Fehler beim Speichern der Evaluierung');
    }
  };

  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const currentQuestions = questions.slice(currentPage * questionsPerPage, (currentPage + 1) * questionsPerPage);

  const answeredOnCurrentPage = currentQuestions.filter(q => answers[q.id] !== undefined).length;
  const canGoNext = answeredOnCurrentPage === currentQuestions.length;

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-slate-100 mb-6 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Persönlichkeitsprofil-Analyse
        </h1>

        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Person auswählen
          </label>
          <select
            value={selectedPerson}
            onChange={(e) => setSelectedPerson(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="">-- Bitte wählen --</option>
            {people.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {questions.length > 0 && (
          <div className="space-y-8">
            <div className="flex justify-between items-center text-sm text-slate-400">
              <span>Seite {currentPage + 1} von {totalPages}</span>
              <span>Fortschritt: {Object.keys(answers).length} / {questions.length}</span>
            </div>

              <div className="w-full bg-slate-800 rounded-full h-2 mb-8">
              <div 
                className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
              ></div>
            </div>

            {currentQuestions.map(q => (
              <div key={q.id} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 transition-all hover:border-slate-600/50">
                <p className="text-slate-200 text-lg mb-4">{q.id}. {q.text}</p>
                <div className="flex items-center justify-between gap-2 sm:gap-4">
                  <span className="text-xs text-slate-500 uppercase tracking-wider hidden sm:block">Trifft nicht zu</span>
                  <div className="flex gap-2 flex-1 justify-between sm:justify-center">
                    {[1, 2, 3, 4, 5].map(val => (
                      <button
                        key={val}
                        onClick={() => handleAnswer(q.id, val)}
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200
                          ${answers[q.id] === val 
                            ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-110' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 hover:scale-105 border border-slate-700'
                          }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider hidden sm:block">Trifft voll zu</span>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center pt-8 border-t border-slate-800">
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="px-6 py-2.5 rounded-lg font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Zurück
              </button>
              
              {currentPage < totalPages - 1 ? (
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={!canGoNext}
                  className="px-6 py-2.5 rounded-lg font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-blue-500/30"
                >
                  Weiter
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canGoNext || !selectedPerson}
                  className="px-8 py-2.5 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-emerald-500 text-white hover:from-blue-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25"
                >
                  Auswertung speichern
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Evaluation;
