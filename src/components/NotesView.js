import { useState } from 'react';
import { isTr } from '../utils/i18n';

function NotesView({ notes, onSaveNote, onDeleteNote, busy }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ title: '', content: '' });
  const [isExpanding, setIsExpanding] = useState(false);

  const handleStartCreate = () => {
    setEditingId(null);
    setDraft({ title: '', content: '' });
    setIsExpanding(true);
  };

  const handleEdit = (note) => {
    setEditingId(note.id);
    setDraft({ title: note.title || '', content: note.content });
    setIsExpanding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!draft.content.trim()) return;
    
    await onSaveNote(editingId, draft);
    setDraft({ title: '', content: '' });
    setIsExpanding(false);
    setEditingId(null);
  };

  const handleCancel = () => {
    setIsExpanding(false);
    setEditingId(null);
    setDraft({ title: '', content: '' });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString(isTr ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <section className="notes-view">
      <header className="view-intro">
        <div>
          <span className="eyebrow">{isTr ? 'Kişisel Alan' : 'Personal Space'}</span>
          <h1>{isTr ? 'Notlarım' : 'My Notes'}</h1>
        </div>
        {!isExpanding && (
          <button className="button button-primary" onClick={handleStartCreate}>
            {isTr ? '+ Yeni Not' : '+ New Note'}
          </button>
        )}
      </header>

      {isExpanding && (
        <article className="panel-card note-editor-card">
          <form onSubmit={handleSubmit} className="note-form">
            <input 
              type="text" 
              placeholder={isTr ? 'Başlık (İsteğe bağlı)' : 'Title (Optional)'} 
              value={draft.title}
              onChange={e => setDraft({ ...draft, title: e.target.value })}
              className="note-title-input"
            />
            <textarea 
              placeholder={isTr ? 'Bir şeyler yazın...' : 'Write something...'}
              value={draft.content}
              onChange={e => setDraft({ ...draft, content: e.target.value })}
              required
              className="note-content-input"
              rows={8}
              autoFocus
            />
            <div className="note-form-actions">
              <button type="button" className="button button-ghost" onClick={handleCancel}>
                {isTr ? 'Vazgeç' : 'Cancel'}
              </button>
              <button type="submit" className="button button-primary" disabled={busy || !draft.content.trim()}>
                {isTr ? 'Kaydet' : 'Save'}
              </button>
            </div>
          </form>
        </article>
      )}

      <div className="notes-grid">
        {notes.length > 0 ? (
          notes.map(note => (
            <article key={note.id} className="panel-card note-card" onClick={() => handleEdit(note)}>
              <div className="note-card-header">
                {note.title && <h3>{note.title}</h3>}
                <button 
                  className="note-delete-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNote(note.id);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
                </button>
              </div>
              <p className="note-preview">{note.content}</p>
              <footer className="note-card-footer">
                <span>{formatDate(note.updated_at)}</span>
              </footer>
            </article>
          ))
        ) : (
          !isExpanding && (
            <div className="panel-empty">
              <h2>{isTr ? 'Henüz notunuz yok' : 'No notes yet'}</h2>
              <p>{isTr ? 'Düşüncelerinizi kaydetmek için ilk notunuzu oluşturun.' : 'Create your first note to capture your thoughts.'}</p>
              <button className="button button-secondary" onClick={handleStartCreate}>
                {isTr ? 'Şimdi oluştur' : 'Create now'}
              </button>
            </div>
          )
        )}
      </div>
    </section>
  );
}

export default NotesView;
