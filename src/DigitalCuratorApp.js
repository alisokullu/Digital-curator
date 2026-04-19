import { useEffect, useMemo, useState } from 'react';
import { isTr } from './utils/i18n';
import ArchiveView from './components/ArchiveView';
import Header from './components/Header';
import InsightsView from './components/InsightsView';
import Sidebar from './components/Sidebar';
import TaskComposer from './components/TaskComposer';
import TaskList from './components/TaskList';
import AuthScreen from './components/AuthScreen';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const VIEWS = {
  TASKS: 'tasks',
  INSIGHTS: 'insights',
  ARCHIVE: 'archive',
};

const THEME_KEY = 'digital-curator-theme';

const formatError = (error, fallback) => error?.message || fallback;

const stamp = () => new Date().toISOString();

function DigitalCuratorApp() {
  const [view, setView] = useState(() => localStorage.getItem('dc-last-view') || VIEWS.TASKS);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light');
  const [folders, setFolders] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [activeFolderId, setActiveFolderId] = useState(() => localStorage.getItem('dc-last-folder') || null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [draftTask, setDraftTask] = useState({ title: '', description: '', recurrence: 'none' });
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingDraft, setEditingDraft] = useState({ title: '', description: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('dc-last-view', view);
  }, [view]);

  useEffect(() => {
    if (activeFolderId) {
      localStorage.setItem('dc-last-folder', activeFolderId);
    } else {
      localStorage.removeItem('dc-last-folder');
    }
  }, [activeFolderId]);

  useEffect(() => {
    if (!isSupabaseConfigured || !session) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadAll = async (isInitial = false) => {
      if (isInitial === true) {
        setLoading(true);
      }
      setError('');

      const [folderResponse, taskResponse, historyResponse] = await Promise.all([
        supabase.from('folders').select('*').order('created_at', { ascending: true }),
        supabase
          .from('tasks')
          .select('*, folders(name)')
          .order('updated_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('task_history')
          .select('*')
          .order('period_date', { ascending: false })
          .limit(100),
      ]);

      if (cancelled) {
        return;
      }

      if (folderResponse.error || taskResponse.error) {
        setError(
          formatError(folderResponse.error || taskResponse.error || historyResponse.error, 'Data could not be loaded from Supabase.')
        );
        setLoading(false);
        return;
      }

      const nextFolders = folderResponse.data || [];
      const nextTasks = taskResponse.data || [];
      const nextHistory = historyResponse.data || [];

      // Routine Automation Engine + History Snapshot
      const now = new Date();
      const routineUpdates = [];
      const historySnapshots = [];
      
      // Group tasks by folder and recurrence to check for period transitions
      const recurrenceGroups = {};
      nextTasks.forEach(task => {
        if (!task.recurrence || task.recurrence === 'none') return;
        const key = `${task.folder_id}-${task.recurrence}`;
        if (!recurrenceGroups[key]) recurrenceGroups[key] = [];
        recurrenceGroups[key].push(task);
      });

      Object.entries(recurrenceGroups).forEach(([key, tasks]) => {
        const [folderId, recurrence] = key.split('-');
        const folder = nextFolders.find(f => f.id === folderId);
        
        // We only need to check if AT LEAST ONE task in this group needs reset
        // To simplify, we check the first task or just check them all.
        // If at least one is past its reset time, the whole group's period has ended.
        let needsReset = false;
        let periodDateStr = '';

        tasks.forEach(task => {
          const updated = new Date(task.updated_at);
          const created = new Date(task.created_at);
          let nextResetTime = null;
          let currentPeriodStart = null;

          if (task.recurrence === 'daily') {
            const lastUpdateMidnight = new Date(updated);
            lastUpdateMidnight.setHours(0, 0, 0, 0);
            nextResetTime = new Date(lastUpdateMidnight);
            nextResetTime.setDate(lastUpdateMidnight.getDate() + 1);
            currentPeriodStart = lastUpdateMidnight;
          } else if (task.recurrence === 'weekly') {
            const createdDayMidnight = new Date(created);
            createdDayMidnight.setHours(0, 0, 0, 0);
            const diffTime = updated.getTime() - createdDayMidnight.getTime();
            const weeksPassed = Math.floor(Math.floor(diffTime / (1000 * 60 * 60 * 24)) / 7);
            nextResetTime = new Date(createdDayMidnight);
            nextResetTime.setDate(createdDayMidnight.getDate() + ((weeksPassed + 1) * 7));
            currentPeriodStart = new Date(createdDayMidnight);
            currentPeriodStart.setDate(createdDayMidnight.getDate() + (weeksPassed * 7));
          } else if (task.recurrence === 'monthly') {
            const createdDayMidnight = new Date(created);
            createdDayMidnight.setHours(0, 0, 0, 0);
            let monthsPassed = (updated.getFullYear() - createdDayMidnight.getFullYear()) * 12 + (updated.getMonth() - createdDayMidnight.getMonth());
            if (updated.getDate() < createdDayMidnight.getDate()) monthsPassed -= 1;
            nextResetTime = new Date(createdDayMidnight);
            nextResetTime.setMonth(createdDayMidnight.getMonth() + monthsPassed + 1);
            currentPeriodStart = new Date(createdDayMidnight);
            currentPeriodStart.setMonth(createdDayMidnight.getMonth() + monthsPassed);
          }

          if (nextResetTime && now >= nextResetTime) {
            needsReset = true;
            periodDateStr = currentPeriodStart.toISOString().split('T')[0];
            if (task.is_completed) routineUpdates.push(task.id);
          }
        });

        if (needsReset && folder) {
          // Check if we already recorded history for this period
          const alreadyRecorded = nextHistory.some(h => 
            h.folder_id === folderId && 
            h.period_date === periodDateStr && 
            h.period_type === recurrence
          );

          if (!alreadyRecorded) {
            const completed = tasks.filter(t => t.is_completed).length;
            historySnapshots.push({
              user_id: session.user.id,
              folder_id: folderId,
              folder_name: folder.name,
              period_date: periodDateStr,
              period_type: recurrence,
              completed_count: completed,
              total_count: tasks.length
            });
          }
        }
      });

      if (historySnapshots.length > 0) {
        supabase.from('task_history').insert(historySnapshots).then(() => {
          // Refresh history locally after recording
          supabase.from('task_history').select('*').order('period_date', { ascending: false }).limit(100)
            .then(({ data }) => { if (data) setHistory(data); });
        });
      }

      if (routineUpdates.length > 0) {
        supabase.from('tasks').update({ is_completed: false, updated_at: now.toISOString() }).in('id', routineUpdates).then();
      }

      setFolders(nextFolders);
      setAllTasks(nextTasks);
      setHistory(nextHistory);
      setActiveFolderId((currentId) => {
        if (nextFolders.length === 0) {
          return null;
        }

        if (currentId && nextFolders.some((folder) => folder.id === currentId)) {
          return currentId;
        }

        return nextFolders[0].id;
      });
      if (isInitial === true) {
        setLoading(false);
      }
    };

    loadAll(true);

    const channel = supabase
      .channel('digital-curator-db')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, () => loadAll(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadAll(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_history' }, () => loadAll(false))
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [session]);

  const activeFolder = useMemo(
    () => folders.find((folder) => folder.id === activeFolderId) || null,
    [folders, activeFolderId]
  );

  const searchNeedle = searchTerm.trim().toLowerCase();

  const activeTasks = useMemo(
    () =>
      allTasks.filter(
        (task) =>
          task.folder_id === activeFolderId &&
          !task.is_archived &&
          (!searchNeedle ||
            task.title.toLowerCase().includes(searchNeedle) ||
            (task.description || '').toLowerCase().includes(searchNeedle))
      ),
    [allTasks, activeFolderId, searchNeedle]
  );

  const archivedTasks = useMemo(
    () =>
      allTasks.filter(
        (task) =>
          task.is_archived &&
          (!searchNeedle ||
            task.title.toLowerCase().includes(searchNeedle) ||
            (task.description || '').toLowerCase().includes(searchNeedle) ||
            (task.folders?.name || '').toLowerCase().includes(searchNeedle))
      ),
    [allTasks, searchNeedle]
  );

  const stats = useMemo(() => {
    const total = allTasks.length;
    const active = allTasks.filter((task) => !task.is_archived);
    const completed = active.filter((task) => task.is_completed).length;
    const remaining = active.filter((task) => !task.is_completed).length;
    const archived = allTasks.filter((task) => task.is_archived).length;
    const completionRate = active.length ? Math.round((completed / active.length) * 100) : 0;
    const totalRoutines = active.filter((task) => task.recurrence && task.recurrence !== 'none').length;

    const byFolder = folders.map((folder) => {
      const folderTasks = allTasks.filter((task) => task.folder_id === folder.id && !task.is_archived);
      const folderCompleted = folderTasks.filter((task) => task.is_completed).length;

      return {
        id: folder.id,
        name: folder.name,
        total: folderTasks.length,
        completed: folderCompleted,
        open: folderTasks.length - folderCompleted,
      };
    });

    return {
      total,
      active: active.length,
      completed,
      remaining,
      archived,
      completionRate,
      totalRoutines,
      byFolder,
    };
  }, [allTasks, folders]);

  const setTransientMessage = (setter, message) => {
    setter(message);
    window.clearTimeout(setTransientMessage.timerId);
    setTransientMessage.timerId = window.setTimeout(() => setter(''), 3200);
  };

  const runMutation = async (job, successMessage) => {
    if (!isSupabaseConfigured) {
      return null;
    }

    setBusy(true);
    setError('');

    try {
      const result = await job();

      if (result?.error) {
        throw result.error;
      }

      if (successMessage) {
        setTransientMessage(setNotice, successMessage);
      }

      return result;
    } catch (mutationError) {
      setTransientMessage(
        setError,
        formatError(mutationError, 'Something went wrong while syncing with Supabase.')
      );
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleCreateFolder = async (event) => {
    event.preventDefault();

    const name = newFolderName.trim();
    if (!name) {
      return;
    }

    const result = await runMutation(
      () => supabase.from('folders').insert([{ name, user_id: session.user.id }]).select().single(),
      isTr ? 'Klasör oluşturuldu.' : 'Folder created.'
    );

    if (!result?.data) {
      return;
    }

    setFolders((current) => [...current, result.data]);
    setActiveFolderId(result.data.id);
    setNewFolderName('');
    setIsAddingFolder(false);
    setIsSidebarOpen(false);
  };

  const handleDeleteFolder = async (folderId) => {
    const folder = folders.find((item) => item.id === folderId);
    if (!folder) {
      return;
    }

    if (!window.confirm(isTr ? `"${folder.name}" ve içindeki tüm görevler silinsin mi?` : `Delete "${folder.name}" and all its tasks?`)) {
      return;
    }

    const result = await runMutation(
      () => supabase.from('folders').delete().eq('id', folderId),
      isTr ? 'Klasör silindi.' : 'Folder deleted.'
    );

    if (!result) {
      return;
    }

    const nextFolders = folders.filter((folderItem) => folderItem.id !== folderId);
    setFolders(nextFolders);
    setAllTasks((current) => current.filter((task) => task.folder_id !== folderId));
    setActiveFolderId(nextFolders[0]?.id || null);
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();

    const title = draftTask.title.trim();
    const description = draftTask.description.trim();

    if (!activeFolderId || !title) {
      return;
    }

    const payload = {
      folder_id: activeFolderId,
      title,
      description: description || null,
      is_completed: false,
      is_archived: false,
      updated_at: stamp(),
      user_id: session.user.id,
      recurrence: draftTask.recurrence || 'none',
    };

    const result = await runMutation(
      () => supabase.from('tasks').insert([payload]).select('*, folders(name)').single(),
      isTr ? 'Görev eklendi.' : 'Task added.'
    );

    if (!result?.data) {
      return;
    }

    setAllTasks((current) => [result.data, ...current]);
    setDraftTask({ title: '', description: '', recurrence: 'none' });
  };

  const handleToggleTask = async (task) => {
    const nextUpdatedAt = stamp();
    const result = await runMutation(
      () =>
        supabase
          .from('tasks')
          .update({ is_completed: !task.is_completed, updated_at: nextUpdatedAt })
          .eq('id', task.id),
      task.is_completed ? (isTr ? 'Görev tekrar açıldı.' : 'Task reopened.') : (isTr ? 'Görev tamamlandı.' : 'Task completed.')
    );

    if (!result) {
      return;
    }

    setAllTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? { ...item, is_completed: !task.is_completed, updated_at: nextUpdatedAt }
          : item
      )
    );
  };

  const handleArchiveTask = async (task) => {
    const nextUpdatedAt = stamp();
    const result = await runMutation(
      () => supabase.from('tasks').update({ is_archived: true, updated_at: nextUpdatedAt }).eq('id', task.id),
      isTr ? 'Görev arşive taşındı.' : 'Task moved to archive.'
    );

    if (!result) {
      return;
    }

    setAllTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, is_archived: true, updated_at: nextUpdatedAt } : item
      )
    );
  };

  const handleRestoreTask = async (task) => {
    const nextUpdatedAt = stamp();
    const result = await runMutation(
      () => supabase.from('tasks').update({ is_archived: false, updated_at: nextUpdatedAt }).eq('id', task.id),
      isTr ? 'Görev kurtarıldı.' : 'Task restored.'
    );

    if (!result) {
      return;
    }

    setAllTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, is_archived: false, updated_at: nextUpdatedAt } : item
      )
    );
  };

  const handleDeleteTaskPermanently = async (taskId) => {
    if (!window.confirm(isTr ? 'Bu görev kalıcı olarak silinsin mi?' : 'Delete this task permanently?')) {
      return;
    }

    const result = await runMutation(
      () => supabase.from('tasks').delete().eq('id', taskId),
      isTr ? 'Görev kalıcı olarak silindi.' : 'Task deleted permanently.'
    );

    if (!result) {
      return;
    }

    setAllTasks((current) => current.filter((item) => item.id !== taskId));
  };

  const handleEmptyArchive = async () => {
    if (!archivedTasks.length) {
      return;
    }

    if (!window.confirm(isTr ? 'Arşiv kalıcı olarak boşaltılsın mı?' : 'Empty the archive permanently?')) {
      return;
    }

    const archivedIds = archivedTasks.map((task) => task.id);
    const result = await runMutation(
      () => supabase.from('tasks').delete().in('id', archivedIds),
      isTr ? 'Arşiv boşaltıldı.' : 'Archive emptied.'
    );

    if (!result) {
      return;
    }

    setAllTasks((current) => current.filter((task) => !archivedIds.includes(task.id)));
  };

  const handleBeginEdit = (task) => {
    setEditingTaskId(task.id);
    setEditingDraft({
      title: task.title,
      description: task.description || '',
    });
  };

  const handleSaveEdit = async (taskId) => {
    const title = editingDraft.title.trim();
    const description = editingDraft.description.trim();

    if (!title) {
      setTransientMessage(setError, isTr ? 'Görev başlığı boş olamaz.' : 'Task title cannot be empty.');
      return;
    }

    const nextUpdatedAt = stamp();
    const result = await runMutation(
      () =>
        supabase
          .from('tasks')
          .update({
            title,
            description: description || null,
            updated_at: nextUpdatedAt,
          })
          .eq('id', taskId),
      isTr ? 'Görev güncellendi.' : 'Task updated.'
    );

    if (!result) {
      return;
    }

    setAllTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
            ...task,
            title,
            description: description || null,
            updated_at: nextUpdatedAt,
          }
          : task
      )
    );
    setEditingTaskId(null);
    setEditingDraft({ title: '', description: '' });
  };

  const activeTaskCount = activeTasks.filter((task) => !task.is_completed).length;

  const renderMainContent = () => {
    if (!isSupabaseConfigured) {
      return (
        <section className="setup-panel">
          <span className="eyebrow">Setup Required</span>
          <h2>Connect Supabase to unlock the workspace.</h2>
          <p>
            Add `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` to a local `.env`
            file, then restart the dev server.
          </p>
          <pre>{`REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key`}</pre>
          <p className="setup-note">
            After that, run the SQL schema you shared for `folders` and `tasks` in the Supabase
            SQL editor.
          </p>
        </section>
      );
    }

    if (loading) {
      return <section className="panel-empty">{isTr ? 'Çalışma alanınız yükleniyor...' : 'Loading your workspace...'}</section>;
    }

    if (view === VIEWS.ARCHIVE) {
      return (
        <ArchiveView
          archivedTasks={archivedTasks}
          onDeleteTask={handleDeleteTaskPermanently}
          onEmptyArchive={handleEmptyArchive}
          onRestoreTask={handleRestoreTask}
        />
      );
    }

    if (view === VIEWS.INSIGHTS) {
      return <InsightsView activeFolder={activeFolder} folders={folders} stats={stats} history={history} />;
    }

    return (
      <>
        <TaskComposer
          busy={busy}
          draftTask={draftTask}
          hasFolder={Boolean(activeFolder)}
          onChangeDraft={setDraftTask}
          onSubmit={handleCreateTask}
        />
        <TaskList
          editingDraft={editingDraft}
          editingTaskId={editingTaskId}
          onArchiveTask={handleArchiveTask}
          onBeginEdit={handleBeginEdit}
          onCancelEdit={() => setEditingTaskId(null)}
          onChangeEditingDraft={setEditingDraft}
          onSaveEdit={handleSaveEdit}
          onToggleTask={handleToggleTask}
          tasks={activeTasks}
        />
      </>
    );
  };

  if (!session && isSupabaseConfigured) {
    return <AuthScreen />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeFolderId={activeFolderId}
        busy={busy}
        folders={folders}
        isAddingFolder={isAddingFolder}
        isOpen={isSidebarOpen}
        newFolderName={newFolderName}
        onChangeFolderName={setNewFolderName}
        onClose={() => setIsSidebarOpen(false)}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={handleDeleteFolder}
        onOpenFolder={(folderId) => {
          setActiveFolderId(folderId);
          setView(VIEWS.TASKS);
          setIsSidebarOpen(false);
        }}
        onToggleAddFolder={() => setIsAddingFolder((current) => !current)}
        onToggleTheme={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
        onViewChange={(nextView) => {
          setView(nextView);
          setIsSidebarOpen(false);
        }}
        onSignOut={() => supabase.auth.signOut()}
        theme={theme}
        view={view}
      />

      {isSidebarOpen ? <button className="backdrop" onClick={() => setIsSidebarOpen(false)} type="button" /> : null}

      <main className="main-panel">
        <Header
          activeFolder={activeFolder}
          onMenuOpen={() => setIsSidebarOpen(true)}
          onSearchChange={setSearchTerm}
          searchTerm={searchTerm}
          stats={stats}
          view={view}
        />

        {notice ? <div className="flash flash-success">{notice}</div> : null}
        {error ? <div className="flash flash-error">{error}</div> : null}

        {view === VIEWS.TASKS && activeFolder ? (
          <section className="view-intro">
            <div>
              <span className="eyebrow">{isTr ? 'Klasör Odağı' : 'Collection Focus'}</span>
              <h1>{activeFolder.name}</h1>
            </div>
            <p>{isTr ? `Bu klasörde bekleyen ${activeTaskCount} açık görev var.` : `${activeTaskCount} open tasks waiting in this collection.`}</p>
          </section>
        ) : null}

        {view === VIEWS.TASKS && !activeFolder && isSupabaseConfigured && !loading ? (
          <section className="panel-empty">
            <h2>{isTr ? 'İlk klasörünüzü oluşturun.' : 'Create your first collection.'}</h2>
            <p>{isTr ? 'Kenar çubuğundan bir klasörle başlayın, görevler ve istatistikler onu takip edecektir.' : 'Start with a folder in the sidebar, then tasks and insights will follow.'}</p>
          </section>
        ) : (
          renderMainContent()
        )}
      </main>
    </div>
  );
}

export default DigitalCuratorApp;
