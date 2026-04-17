export { default } from './DigitalCuratorApp'; /*
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const supabaseUrl = 'https://mwyqzwrgnstxxhywiezg.supabase.co';
const supabaseAnonKey = 'sb_publishable_QNVDjSDGkYXMcM1BvKReEQ_hOC8yQuV';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TaskApp = () => {
  const [view, setView] = useState('tasks'); // 'tasks', 'insights', or 'archive'
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true' || false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Initial Data Fetch
  useEffect(() => {
    fetchFolders();
    fetchArchivedTasks();
  }, []);

  // Fetch Tasks for Active Folder (non-archived only)
  useEffect(() => {
    if (activeFolder && view === 'tasks') {
      fetchTasks(activeFolder.id);
    }
  }, [activeFolder, view]);

  const fetchFolders = async () => {
    const { data, error } = await supabase.from('folders').select('*').order('created_at', { ascending: true });
    if (!error) {
      setFolders(data);
      if (data.length > 0 && !activeFolder) setActiveFolder(data[0]);
    }
    setLoading(false);
  };

  const fetchTasks = async (folderId) => {
    setLoading(true);
    const { data, error } = await supabase.from('tasks')
      .select('*')
      .eq('folder_id', folderId)
      .eq('is_archived', false) // Only show non-archived
      .order('created_at', { ascending: false });
    if (!error) setTasks(data);
    setLoading(false);
  };

  const fetchArchivedTasks = async () => {
    const { data, error } = await supabase.from('tasks')
      .select('*, folders(name)')
      .eq('is_archived', true)
      .order('updated_at', { ascending: false });
    if (!error) setArchivedTasks(data);
  };

  // Archive Task (Soft Delete)
  const archiveTask = async (taskId) => {
    const { error } = await supabase.from('tasks').update({ is_archived: true }).eq('id', taskId);
    if (!error) {
      setTasks(tasks.filter(t => t.id !== taskId));
      fetchArchivedTasks(); // Refresh trash list
    }
  };

  // Restore Task
  const restoreTask = async (task) => {
    const { error } = await supabase.from('tasks').update({ is_archived: false }).eq('id', task.id);
    if (!error) {
      setArchivedTasks(archivedTasks.filter(t => t.id !== task.id));
      if (activeFolder?.id === task.folder_id) {
        setTasks([ { ...task, is_archived: false }, ...tasks ]);
      }
    }
  };

  // Permanent Delete
  const permanentDeleteTask = async (taskId) => {
    if (!window.confirm('Bu görevi kalıcı olarak silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (!error) {
      setArchivedTasks(archivedTasks.filter(t => t.id !== taskId));
    }
  };

  const emptyTrash = async () => {
    if (!window.confirm('Çöp kutusundaki tüm görevleri kalıcı olarak silmek istiyor musunuz?')) return;
    const { error } = await supabase.from('tasks').delete().eq('is_archived', true);
    if (!error) setArchivedTasks([]);
  };

  // ... (Other functions like addFolder, addTask, toggleTask remain similar but use archiveTask instead of direct delete)

  if (loading && folders.length === 0) return Yükleniyor...;

  return (
    <div className={flex h-screen font-['Manrope'] transition-colors duration-300 ${darkMode ? 'dark bg-[#121212] text-[#E0E0E0]' : 'bg-[#f8f9fa] text-[#191c1d]'}}>

  {/* Sidebar */}
  <aside className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 w-64 p-6 flex flex-col border-r border-gray-200 dark:border-white/10 bg-[#f3f4f5] dark:bg-[#1a1a1a] z-50 transition-transform duration-300 ease-in-out`}>
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-xl font-extrabold text-[#3F51B5] dark:text-[#7986CB]">The Digital Curator</h1>
      <button className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>✕</button>
    </div>
    
    <nav className="mb-8 space-y-1">
      <button onClick={() => { setView('tasks'); setIsSidebarOpen(false); }} className={`w-full flex items-center px-4 py-2 rounded-lg transition-all ${view === 'tasks' ? 'bg-white dark:bg-[#2c2c2c] text-[#3F51B5] shadow-sm font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
        <span className="mr-2">📋</span> Görevler
      </button>
      <button onClick={() => { setView('insights'); setIsSidebarOpen(false); }} className={`w-full flex items-center px-4 py-2 rounded-lg transition-all ${view === 'insights' ? 'bg-white dark:bg-[#2c2c2c] text-[#3F51B5] shadow-sm font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
        <span className="mr-2">📈</span> İstatistikler
      </button>
      <button onClick={() => { setView('archive'); setIsSidebarOpen(false); }} className={`w-full flex items-center px-4 py-2 rounded-lg transition-all ${view === 'archive' ? 'bg-white dark:bg-[#2c2c2c] text-[#3F51B5] shadow-sm font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
        <span className="mr-2">🗑️</span> Çöp Kutusu
      </button>
    </nav>

    {view === 'tasks' && (
      <div className="flex-1 overflow-y-auto">
         {/* Folder list logic... */}
      </div>
    )}

    <div className="pt-6 border-t border-gray-200 dark:border-white/10 space-y-4">
      <button onClick={() => setDarkMode(!darkMode)} className="flex items-center w-full text-sm text-gray-500">
        <span className="mr-2">{darkMode ? '☀️' : '🌙'}</span> {darkMode ? 'Açık Mod' : 'Karanlık Mod'}
      </button>
    </div>
  </aside>

  {/* Main Content */}
  <main className="flex-1 overflow-y-auto p-4 md:p-12 relative">
    <header className="flex justify-between items-center mb-8">
      <div className="flex items-center space-x-4">
        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2">☰</button>
        <h2 className="text-2xl md:text-3xl font-bold">{view === 'archive' ? 'Çöp Kutusu' : (activeFolder?.name || 'Klasör Seçin')}</h2>
      </div>
      {view === 'archive' && archivedTasks.length > 0 && (
        <button onClick={emptyTrash} className="text-sm text-red-500 hover:underline">Çöpü Boşalt</button>
      )}
    </header>

    {view === 'archive' ? (
      <div className="space-y-4">
        {archivedTasks.map(task => (
          <div key={task.id} className="bg-white dark:bg-[#1a1a1a] p-5 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm flex items-center">
            <div className="flex-1">
              <p className="text-lg text-gray-800 dark:text-gray-200">{task.title}</p>
              <p className="text-xs text-gray-400">Klasör: {task.folders?.name}</p>
            </div>
            <div className="flex space-x-2">
              <button onClick={() => restoreTask(task)} className="p-2 text-[#3F51B5] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg">Geri Yükle</button>
              <button onClick={() => permanentDeleteTask(task.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">Kalıcı Sil</button>
            </div>
          </div>
        ))}
        {archivedTasks.length === 0 && (
          <div className="text-center py-20 text-gray-400">Çöp kutusu boş.</div>
        )}
      </div>
    ) : (
      /* Task/Insights list logic... */
      <div>...</div>
    )}
  </main>
</div>

  );
};

*/
