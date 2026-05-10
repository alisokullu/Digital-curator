import { useState, useMemo } from 'react';
import { Book, Plus, Trash2, RefreshCw, CheckCircle, Circle, Edit3, X, Save } from 'lucide-react';

function VocabularyView({ vocabulary, onAddWord, onDeleteWord, onEditWord, isRoutineEnabled, onToggleRoutine, busy }) {
  const lang = localStorage.getItem('digital-curator-lang') || 'tr';
  const isTr = lang === 'tr';

  const [draft, setDraft] = useState({ id: null, english: '', turkish: '', meaning: '', example: '' });
  const [flipped, setFlipped] = useState(new Set());
  const [shuffleKey, setShuffleKey] = useState(0);

  const shuffledVocab = useMemo(() => {
    if (shuffleKey === 0) return vocabulary;

    // Create a shuffled copy
    const copy = [...vocabulary];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocabulary, shuffleKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!draft.english.trim() || !draft.turkish.trim()) return;
    
    if (draft.id) {
      await onEditWord(draft);
    } else {
      await onAddWord(draft);
    }
    setDraft({ id: null, english: '', turkish: '', meaning: '', example: '' });
  };

  const handleEditClick = (e, word) => {
    e.stopPropagation();
    setDraft({
      id: word.id,
      english: word.english,
      turkish: word.turkish,
      meaning: word.meaning || '',
      example: word.example || ''
    });
    // Scroll to top where the form is
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setDraft({ id: null, english: '', turkish: '', meaning: '', example: '' });
  };

  const toggleFlip = (id) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleShuffle = () => {
    setFlipped(new Set());
    setShuffleKey((k) => k + 1);
  };

  const wordsAddedToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return vocabulary.filter(v => v.created_at && v.created_at.startsWith(today)).length;
  }, [vocabulary]);

  return (
    <div className="vocabulary-view">
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Book className="lucide-icon text-brand" size={24} />
          <h2>{isTr ? 'Kelime Çalışması' : 'Vocabulary'}</h2>
        </div>
        
        <div className="routine-toggle-container" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-elevated)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {isTr ? 'Günlük 3 Kelime Rutini' : 'Daily 3 Words Routine'}
            </span>
            <span className="eyebrow" style={{ marginBottom: 0 }}>
              {isRoutineEnabled ? (isTr ? `İlerleme: ${Math.min(wordsAddedToday, 3)}/3` : `Progress: ${Math.min(wordsAddedToday, 3)}/3`) : (isTr ? 'Kapalı' : 'Off')}
            </span>
          </div>
          <button 
            className={`routine-toggle-btn ${isRoutineEnabled ? 'enabled' : ''}`}
            onClick={onToggleRoutine}
            disabled={busy}
            type="button"
            style={{ color: isRoutineEnabled ? 'var(--brand)' : 'var(--text)' }}
          >
            {isRoutineEnabled ? <CheckCircle size={20} /> : <Circle size={20} />}
          </button>
        </div>
      </div>

      <div className="vocabulary-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginTop: '1.5rem', alignItems: 'start' }}>
        
        {/* Form Column */}
        <div className="vocab-form-panel" style={{ background: 'var(--bg-elevated)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)', position: 'sticky', top: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {draft.id ? (isTr ? 'Kelimeyi Düzenle' : 'Edit Word') : (isTr ? 'Yeni Kelime Ekle' : 'Add New Word')}
            {draft.id && (
              <button onClick={handleCancelEdit} type="button" className="button button-ghost" style={{ padding: '0.4rem' }}>
                <X size={16} />
              </button>
            )}
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>{isTr ? 'İngilizce' : 'English'}</label>
              <input 
                required
                value={draft.english}
                onChange={e => setDraft({...draft, english: e.target.value})}
                placeholder="e.g. Serendipity"
                className="vocab-input"
              />
            </div>
            <div className="form-group">
              <label>{isTr ? 'Türkçe' : 'Turkish'}</label>
              <input 
                required
                value={draft.turkish}
                onChange={e => setDraft({...draft, turkish: e.target.value})}
                placeholder="Örn. Tesadüfen bulma"
                className="vocab-input"
              />
            </div>
            <div className="form-group">
              <label>{isTr ? 'İngilizce Anlamı (Opsiyonel)' : 'Meaning (Optional)'}</label>
              <textarea 
                value={draft.meaning}
                onChange={e => setDraft({...draft, meaning: e.target.value})}
                placeholder="e.g. The occurrence and development of events by chance in a happy or beneficial way."
                className="vocab-input"
                rows={4}
              />
            </div>
            <div className="form-group">
              <label>{isTr ? 'Örnek Cümle (Opsiyonel)' : 'Example Sentence (Optional)'}</label>
              <textarea 
                value={draft.example}
                onChange={e => setDraft({...draft, example: e.target.value})}
                placeholder="e.g. It was a happy serendipity that we met."
                className="vocab-input"
                rows={2}
              />
            </div>
            <button type="submit" className="button button-primary" disabled={busy || !draft.english || !draft.turkish} style={{ marginTop: '0.5rem' }}>
              {draft.id ? <Save size={18} /> : <Plus size={18} />}
              {draft.id ? (isTr ? 'Kaydet' : 'Save Changes') : (isTr ? 'Kelimeyi Ekle' : 'Add Word')}
            </button>
          </form>
        </div>

        {/* Cards Column */}
        <div className="vocab-cards-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>
              {isTr ? 'Flashcards Pratiği' : 'Flashcards Practice'} ({vocabulary.length})
            </h3>
            <button className="button button-ghost" onClick={handleShuffle} type="button">
              <RefreshCw size={16} />
              {isTr ? 'Karıştır' : 'Shuffle'}
            </button>
          </div>

          {shuffledVocab.length === 0 ? (
            <div className="panel-empty" style={{ minHeight: '300px' }}>
              {isTr ? 'Henüz kelime eklemediniz. Sol taraftaki formu kullanarak başlayın!' : 'No words added yet. Start by using the form on the left!'}
            </div>
          ) : (
            <div className="flashcards-grid">
              {shuffledVocab.map(word => (
                <div 
                  key={word.id} 
                  className={`flashcard-container ${flipped.has(word.id) ? 'flipped' : ''}`}
                  onClick={() => toggleFlip(word.id)}
                >
                  <div className="flashcard-inner">
                    <div className="flashcard-front">
                      <h2 className="flashcard-word-en">{word.english}</h2>
                      <span className="flashcard-hint">{isTr ? 'Çevirmek için tıkla' : 'Click to flip'}</span>
                      <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="flashcard-action-btn"
                          onClick={(e) => handleEditClick(e, word)}
                          aria-label="Edit"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          className="flashcard-action-btn flashcard-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteWord(word.id);
                          }}
                          aria-label="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="flashcard-back">
                      <h2 className="flashcard-word-tr">{word.turkish}</h2>
                      {word.meaning && (
                        <div className="flashcard-meaning">
                          <strong>{isTr ? 'Anlamı:' : 'Meaning:'}</strong> {word.meaning}
                        </div>
                      )}
                      {word.example && (
                        <div className="flashcard-example">
                          <em>"{word.example}"</em>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default VocabularyView;
