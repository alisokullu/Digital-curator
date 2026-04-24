import { useState, useRef, useEffect } from 'react';
import { isTr } from '../utils/i18n';
import { Bold, Italic, List, Palette, Trash2, Save, X } from 'lucide-react';

function NotesView({ notes, onSaveNote, onDeleteNote, busy }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ title: '', content: '' });
  const [isExpanding, setIsExpanding] = useState(false);
  const editorRef = useRef(null);

  const COLORS = [
    { name: 'Default', value: 'inherit' },
    { name: 'Indigo', value: '#3f51b5' },
    { name: 'Red', value: '#c24747' },
    { name: 'Green', value: '#267653' },
    { name: 'Gold', value: '#d4a017' }
  ];

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
    const content = editorRef.current ? editorRef.current.innerHTML : draft.content;
    if (!content || content === '<br>') return;
    
    await onSaveNote(editingId, { ...draft, content });
    setDraft({ title: '', content: '' });
    setIsExpanding(false);
    setEditingId(null);
  };

  const handleCancel = () => {
    setIsExpanding(false);
    setEditingId(null);
    setDraft({ title: '', content: '' });
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) editorRef.current.focus();
  };

  useEffect(() => {
    if (isExpanding && editorRef.current) {
      editorRef.current.innerHTML = draft.content;
    }
  }, [isExpanding]);

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
          <div className="note-toolbar">
            <button type="button" className="toolbar-btn" onClick={() => execCommand('bold')} title="Bold"><Bold size={18}/></button>
            <button type="button" className="toolbar-btn" onClick={() => execCommand('italic')} title="Italic"><Italic size={18}/></button>
            <button type="button" className="toolbar-btn" onClick={() => execCommand('insertUnorderedList')} title="List"><List size={18}/></button>
            <div className="color-picker-wrapper">
              <button type="button" className="toolbar-btn"><Palette size={18}/></button>
              <div className="color-dropdown">
                {COLORS.map(c => (
                  <button 
                    key={c.value} 
                    type="button" 
                    className="color-swatch" 
                    style={{ background: c.value === 'inherit' ? 'var(--text)' : c.value }} 
                    onClick={() => execCommand('foreColor', c.value)}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="note-form">
            <input 
              type="text" 
              placeholder={isTr ? 'Başlık (İsteğe bağlı)' : 'Title (Optional)'} 
              value={draft.title}
              onChange={e => setDraft({ ...draft, title: e.target.value })}
              className="note-title-input"
            />
            <div 
              ref={editorRef}
              contentEditable
              className="note-rich-editor"
              data-placeholder={isTr ? 'Bir şeyler yazın...' : 'Write something...'}
              onInput={e => setDraft({ ...draft, content: e.currentTarget.innerHTML })}
            />
            <div className="note-form-actions">
              <button type="button" className="button button-ghost" onClick={handleCancel}>
                <X size={18}/> {isTr ? 'Vazgeç' : 'Cancel'}
              </button>
              <button type="submit" className="button button-primary" disabled={busy}>
                <Save size={18}/> {isTr ? 'Kaydet' : 'Save'}
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
                {note.title ? <h3>{note.title}</h3> : <h3 className="untitled-note">{isTr ? 'Başlıksız' : 'Untitled'}</h3>}
                <button 
                  className="note-delete-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNote(note.id);
                  }}
                >
                  <Trash2 size={16}/>
                </button>
              </div>
              <div 
                className="note-preview-rich" 
                dangerouslySetInnerHTML={{ __html: note.content }} 
              />
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
