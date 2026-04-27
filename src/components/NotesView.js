import { useState, useRef, useEffect, useCallback } from 'react';
import { isTr } from '../utils/i18n';
import { Bold, Italic, List, Palette, Trash2, Save, X, Type } from 'lucide-react';

function NotesView({ notes, onSaveNote, onDeleteNote, busy }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ title: '', content: '' });
  const [isExpanding, setIsExpanding] = useState(false);
  const [activeStyles, setActiveStyles] = useState({ bold: false, italic: false, list: false });
  
  const editorRef = useRef(null);
  const titleRef = useRef(null);

  const COLORS = [
    { name: 'Default', value: 'inherit' },
    { name: 'Indigo', value: '#3f51b5' },
    { name: 'Red', value: '#c24747' },
    { name: 'Green', value: '#267653' },
    { name: 'Gold', value: '#d4a017' }
  ];

  const FONT_SIZES = [
    { label: isTr ? 'Küçük' : 'Small', value: '2' },
    { label: isTr ? 'Orta' : 'Medium', value: '3' },
    { label: isTr ? 'Büyük' : 'Large', value: '5' },
    { label: isTr ? 'X-Büyük' : 'X-Large', value: '6' }
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
    // On mobile, scroll to top so the editor is visible without side effects
    if (window.innerWidth < 640) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const content = editorRef.current?.innerHTML || draft.content;
    const title = titleRef.current?.innerHTML || draft.title;
    
    // Clean up empty tags context
    if ((!content || content === '<br>' || content === '<div><br></div>') && 
        (!title || title === '<br>' || title === '<div><br></div>')) return;
    
    await onSaveNote(editingId, { title, content });
    setDraft({ title: '', content: '' });
    setIsExpanding(false);
    setEditingId(null);
  };

  const handleCancel = () => {
    setIsExpanding(false);
    setEditingId(null);
    setDraft({ title: '', content: '' });
  };

  const updateActiveStyles = useCallback(() => {
    setActiveStyles({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      list: document.queryCommandState('insertUnorderedList')
    });
  }, []);

  const execCommand = (e, command, value = null) => {
    e.preventDefault(); // Prevent focus loss from the editor
    document.execCommand(command, false, value);
    updateActiveStyles();
    
    // Ensure the editor keeps focus on mobile after tool click
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  useEffect(() => {
    if (isExpanding) {
      if (editorRef.current) {
        editorRef.current.innerHTML = draft.content;
      }
      if (titleRef.current) {
        titleRef.current.innerHTML = draft.title;
      }
      const handleSelectionChange = () => updateActiveStyles();
      document.addEventListener('selectionchange', handleSelectionChange);
      
      // Auto-focus the title on expand with a slight delay for transition
      const timer = setTimeout(() => {
        if (titleRef.current) {
          titleRef.current.focus();
          // Move cursor to end if editing
          if (editingId) {
             const range = document.createRange();
             const sel = window.getSelection();
             range.selectNodeContents(titleRef.current);
             range.collapse(false);
             sel.removeAllRanges();
             sel.addRange(range);
          }
        }
      }, 300);

      return () => {
        document.removeEventListener('selectionchange', handleSelectionChange);
        clearTimeout(timer);
      };
    }
  }, [isExpanding, updateActiveStyles, editingId]);

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
            <button 
              type="button" 
              className={`toolbar-btn ${activeStyles.bold ? 'toolbar-btn-active' : ''}`} 
              onMouseDown={(e) => execCommand(e, 'bold')} 
              title="Bold"
            >
              <Bold size={18}/>
            </button>
            <button 
              type="button" 
              className={`toolbar-btn ${activeStyles.italic ? 'toolbar-btn-active' : ''}`} 
              onMouseDown={(e) => execCommand(e, 'italic')} 
              title="Italic"
            >
              <Italic size={18}/>
            </button>
            <button 
              type="button" 
              className={`toolbar-btn ${activeStyles.list ? 'toolbar-btn-active' : ''}`} 
              onMouseDown={(e) => execCommand(e, 'insertUnorderedList')} 
              title="List"
            >
              <List size={18}/>
            </button>
            
            <div className="toolbar-divider" />

            <div className="toolbar-dropdown-wrapper">
              <button type="button" className="toolbar-btn" onMouseDown={e => e.preventDefault()}><Type size={18}/></button>
              <div className="toolbar-dropdown font-size-dropdown">
                {FONT_SIZES.map(f => (
                  <button key={f.value} type="button" onMouseDown={(e) => execCommand(e, 'fontSize', f.value)}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="toolbar-dropdown-wrapper">
              <button type="button" className="toolbar-btn" onMouseDown={e => e.preventDefault()}><Palette size={18}/></button>
              <div className="toolbar-dropdown color-dropdown">
                {COLORS.map(c => (
                  <button 
                    key={c.value} 
                    type="button" 
                    className="color-swatch" 
                    style={{ background: c.value === 'inherit' ? 'var(--text)' : c.value }} 
                    onMouseDown={(e) => execCommand(e, 'foreColor', c.value)}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="note-form">
            <div 
              ref={titleRef}
              contentEditable
              className="note-title-rich"
              data-placeholder={isTr ? 'Başlık (İsteğe bağlı)' : 'Title (Optional)'}
              onInput={e => setDraft({ ...draft, title: e.currentTarget.innerHTML })}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  editorRef.current?.focus();
                }
              }}
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
                {note.title && note.title !== '<br>' && note.title !== '<div><br></div>' ? (
                   <h3 dangerouslySetInnerHTML={{ __html: note.title }} />
                ) : (
                   <h3 className="untitled-note">{isTr ? 'Başlıksız' : 'Untitled'}</h3>
                )}
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
              <h2>{isTr ? 'Not bulunamadı' : 'No notes found'}</h2>
              <p>{isTr ? 'Aramanızla eşleşen not yok veya henüz hiç not oluşturmadınız.' : 'No notes match your search or you haven\'t created any yet.'}</p>
              <button className="button button-secondary" onClick={handleStartCreate}>
                {isTr ? 'Yeni not oluştur' : 'Create new note'}
              </button>
            </div>
          )
        )}
      </div>
    </section>
  );
}

export default NotesView;
