import { useEffect, useMemo, useState } from 'react';
import { isTr } from './utils/i18n';
import ArchiveView from './components/ArchiveView';
import Header from './components/Header';
import InsightsView from './components/InsightsView';
import Sidebar from './components/Sidebar';
import TaskComposer from './components/TaskComposer';
import TaskList from './components/TaskList';
import AuthScreen from './components/AuthScreen';
import NotesView from './components/NotesView';
import VocabularyView from './components/VocabularyView';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const VIEWS = {
  TASKS: 'tasks',
  INSIGHTS: 'insights',
  ARCHIVE: 'archive',
  NOTES: 'notes',
  VOCABULARY: 'vocabulary',
};

const THEME_KEY = 'digital-curator-theme';
const VOCAB_ROUTINE_TITLE = 'Günlük 3 İngilizce Kelime';
const VOCAB_ROUTINE_TARGET = 3;

const formatError = (error, fallback) => error?.message || fallback;

const stamp = () => new Date().toISOString();

const getLocalISODate = (date = new Date()) => {
  const d = new Date(date);
  const z = d.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(d.getTime() - z);
  return localDate.toISOString().split('T')[0];
};

const getVocabularyCountForDate = (words, dateString = getLocalISODate()) =>
  words.filter((word) => word.created_at && getLocalISODate(word.created_at) === dateString).length;

const isVocabularyRoutineTask = (task) =>
  task.title === VOCAB_ROUTINE_TITLE && task.recurrence === 'daily';

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
  const [notes, setNotes] = useState([]);
  const [vocabulary, setVocabulary] = useState([]);
  const [isVocabRoutineEnabled, setIsVocabRoutineEnabled] = useState(() => localStorage.getItem('dc-vocab-routine') === 'true');

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

      const [folderResponse, taskResponse, historyResponse, notesResponse] = await Promise.all([
        supabase.from('folders').select('*').order('created_at', { ascending: true }),
        supabase
          .from('tasks')
          .select('*, folders(name)')
          .order('sort_order', { ascending: true, nullsFirst: true })
          .order('updated_at', { ascending: false, nullsFirst: false }),
        supabase
          .from('task_history')
          .select('*')
          .order('period_date', { ascending: false })
          .limit(100),
        supabase
          .from('notes')
          .select('*')
          .order('updated_at', { ascending: false }),
        supabase
          .from('vocabulary')
          .select('*')
          .order('created_at', { ascending: false })
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
      let nextTasks = taskResponse.data || [];
      let nextHistory = historyResponse.data || [];
      const nextNotes = notesResponse.data || [];
      // we check for vocabulary error separately in case the table doesn't exist yet
      const nextVocabulary = (arguments[0] && !arguments[0].error && folderResponse.data && taskResponse.data && historyResponse.data && notesResponse.data) ? (await supabase.from('vocabulary').select('*').order('created_at', { ascending: false })).data || [] : [];

      nextHistory = nextHistory.map((item) => {
        if (
          item.period_type !== 'daily' ||
          getVocabularyCountForDate(nextVocabulary, item.period_date) < VOCAB_ROUTINE_TARGET ||
          !Array.isArray(item.tasks_snapshot) ||
          !item.tasks_snapshot.some((task) => isVocabularyRoutineTask(task) && !task.is_completed)
        ) {
          return item;
        }

        const tasksSnapshot = item.tasks_snapshot.map((task) =>
          isVocabularyRoutineTask(task) ? { ...task, is_completed: true } : task
        );

        return {
          ...item,
          completed_count: tasksSnapshot.filter((task) => task.is_completed).length,
          tasks_snapshot: tasksSnapshot,
        };
      });

      // Routine Automation Engine + History Snapshot
      const now = new Date();
      const routineUpdates = [];
      const historySnapshots = [];
      
      // Group tasks by folder and recurrence to check for period transitions
      const recurrenceGroups = {};
      nextTasks.forEach(task => {
        if (!task.recurrence || task.recurrence === 'none' || task.is_archived) return;
        const key = `${task.folder_id}:::${task.recurrence}`;
        if (!recurrenceGroups[key]) recurrenceGroups[key] = [];
        recurrenceGroups[key].push(task);
      });

      Object.entries(recurrenceGroups).forEach(([key, tasks]) => {
        const [folderId, recurrence] = key.split(':::');
        const folder = nextFolders.find(f => f.id === folderId);
        
        if (!folder) {
          console.warn(`[Automation] Folder not found for tasks in group: ${key}. Snapshot skipped.`);
          return;
        }
        // To simplify, we check the first task or just check them all.
        // If at least one is past its reset time, the whole group's period has ended.
        let needsReset = false;
        let periodDateStr = '';

        tasks.forEach(task => {
          const updated = new Date(task.updated_at);
          let nextResetTime = null;
          let currentPeriodStart = null;

          if (task.recurrence === 'daily') {
            const lastUpdateMidnight = new Date(updated);
            lastUpdateMidnight.setHours(0, 0, 0, 0);
            nextResetTime = new Date(lastUpdateMidnight);
            nextResetTime.setDate(lastUpdateMidnight.getDate() + 1);
            currentPeriodStart = lastUpdateMidnight;
          } else if (task.recurrence === 'weekly') {
            // Find the Monday of the week updated_at belongs to
            const day = updated.getDay();
            const diff = (day === 0 ? -6 : 1) - day;
            const currentMonday = new Date(updated);
            currentMonday.setDate(updated.getDate() + diff);
            currentMonday.setHours(0, 0, 0, 0);
            
            nextResetTime = new Date(currentMonday);
            nextResetTime.setDate(currentMonday.getDate() + 7);
            currentPeriodStart = currentMonday;
          } else if (task.recurrence === 'monthly') {
            const currentMonthFirst = new Date(updated.getFullYear(), updated.getMonth(), 1);
            nextResetTime = new Date(updated.getFullYear(), updated.getMonth() + 1, 1);
            currentPeriodStart = currentMonthFirst;
          }

          if (nextResetTime && now >= nextResetTime) {
            needsReset = true;
            periodDateStr = getLocalISODate(currentPeriodStart);
            routineUpdates.push(task.id);
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
            const tasksSnapshot = tasks.map(t => {
              const completedByVocabulary =
                isVocabularyRoutineTask(t) &&
                getVocabularyCountForDate(nextVocabulary, periodDateStr) >= VOCAB_ROUTINE_TARGET;

              return {
                title: t.title,
                is_completed: t.is_completed || completedByVocabulary,
                duration_total: t.duration_total || 0,
                duration_progress: t.duration_progress || 0,
                due_date: t.due_date || null,
                sub_tasks: t.sub_tasks || []
              };
            });
            const completed = tasksSnapshot.filter(t => t.is_completed).length;
            historySnapshots.push({
              user_id: session.user.id,
              folder_id: folderId,
              folder_name: folder.name,
              period_date: periodDateStr,
              period_type: recurrence,
              completed_count: completed,
              total_count: tasks.length,
              tasks_snapshot: tasksSnapshot
            });
          }
        }
      });

      if (historySnapshots.length > 0) {
        supabase.from('task_history').insert(historySnapshots).then(({ error }) => {
          if (error) {
            console.error('[Automation] History snapshot insertion failed:', error);
          } else {
            console.log(`[Automation] Recorded ${historySnapshots.length} history snapshots.`);
            // Refresh history locally after recording
            supabase.from('task_history').select('*').order('period_date', { ascending: false }).limit(100)
              .then(({ data }) => { if (data) setHistory(data); });
          }
        });
      }

      if (routineUpdates.length > 0) {
        supabase.from('tasks').update({ 
          is_completed: false, 
          duration_progress: 0, 
          updated_at: now.toISOString() 
        }).in('id', routineUpdates).then();
      }

      const completedVocabularyRoutineIds = [];
      if (getVocabularyCountForDate(nextVocabulary) >= VOCAB_ROUTINE_TARGET) {
        const completedAt = stamp();
        nextTasks = nextTasks.map((task) => {
          if (isVocabularyRoutineTask(task) && !task.is_archived && !task.is_completed) {
            completedVocabularyRoutineIds.push(task.id);
            return { ...task, is_completed: true, updated_at: completedAt };
          }
          return task;
        });
        if (completedVocabularyRoutineIds.length > 0) {
          supabase
            .from('tasks')
            .update({ is_completed: true, updated_at: completedAt })
            .in('id', completedVocabularyRoutineIds)
            .then();
        }
      }

      setFolders(nextFolders);
      setAllTasks(nextTasks);
      setHistory(nextHistory);
      setNotes(nextNotes);
      setVocabulary(nextVocabulary);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => loadAll(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vocabulary' }, () => loadAll(false))
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
      allTasks
        .filter(
          (task) =>
            task.folder_id === activeFolderId &&
            !task.is_archived &&
            task.title !== VOCAB_ROUTINE_TITLE &&
            (!searchNeedle ||
              task.title.toLowerCase().includes(searchNeedle) ||
              (task.description || '').toLowerCase().includes(searchNeedle))
        )
        .sort((a, b) => {
          if (a.is_completed === b.is_completed) {
            const orderA = typeof a.sort_order === 'number' ? a.sort_order : 999999;
            const orderB = typeof b.sort_order === 'number' ? b.sort_order : 999999;
            if (orderA !== orderB) return orderA - orderB;
            // Fallback to updated_at
            return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
          }
          return a.is_completed ? 1 : -1;
        }),
    [allTasks, activeFolderId, searchNeedle]
  );

  const archivedTasks = useMemo(
    () =>
      allTasks
        .filter(
          (task) =>
            task.is_archived &&
            task.title !== VOCAB_ROUTINE_TITLE &&
            (!searchNeedle ||
              task.title.toLowerCase().includes(searchNeedle) ||
              (task.description || '').toLowerCase().includes(searchNeedle) ||
              (task.folders?.name || '').toLowerCase().includes(searchNeedle))
        )
        .sort((a, b) => {
          if (a.is_completed === b.is_completed) return 0;
          return a.is_completed ? 1 : -1;
        }),
    [allTasks, searchNeedle]
  );

  const stats = useMemo(() => {
    const total = allTasks.length;
    const activeTasksList = allTasks.filter((task) => !task.is_archived);
    const completedTasksList = activeTasksList.filter((task) => task.is_completed);
    const completed = completedTasksList.length;
    const remaining = activeTasksList.filter((task) => !task.is_completed).length;
    const archived = allTasks.filter((task) => task.is_archived).length;
    const completionRate = activeTasksList.length ? Math.round((completed / activeTasksList.length) * 100) : 0;
    const routinesList = activeTasksList.filter((task) => task.recurrence && task.recurrence !== 'none');
    const totalRoutines = routinesList.length;

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
      active: activeTasksList.length,
      activeTasksList,
      completed,
      completedTasksList,
      remaining,
      archived,
      completionRate,
      totalRoutines,
      routinesList,
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
  
  const handleRenameFolder = async (folderId, newName) => {
    if (!newName.trim()) return;
    
    const result = await runMutation(
      () => supabase.from('folders').update({ name: newName }).eq('id', folderId),
      isTr ? 'Klasör ismi güncellendi.' : 'Folder renamed.'
    );

    if (result) {
      setFolders((current) => current.map((f) => f.id === folderId ? { ...f, name: newName } : f));
    }
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

  const handleUpdateTaskDuration = async (taskId, total) => {
    const nextUpdatedAt = stamp();
    await runMutation(
      () => supabase.from('tasks').update({ duration_total: total, updated_at: nextUpdatedAt }).eq('id', taskId),
      isTr ? 'Görev süresi güncellendi.' : 'Task duration updated.'
    );
  };

  const handleUpdateTaskDueDate = async (taskId, dueDate) => {
    const nextUpdatedAt = stamp();
    await runMutation(
      () => supabase.from('tasks').update({ due_date: dueDate || null, updated_at: nextUpdatedAt }).eq('id', taskId),
      isTr ? 'Son tarih güncellendi.' : 'Due date updated.'
    );
  };
  
  const handleUpdateSubTasks = async (taskId, subTasks) => {
    const nextUpdatedAt = stamp();
    await runMutation(
      () => supabase.from('tasks').update({ sub_tasks: subTasks, updated_at: nextUpdatedAt }).eq('id', taskId),
      null
    );
  };
  
  const handleUpdateTaskProgress = async (taskId, progress, isCompleted = false) => {
    const nextUpdatedAt = stamp();
    const payload = { 
       duration_progress: progress, 
       updated_at: nextUpdatedAt 
    };
    if (isCompleted) {
      payload.is_completed = true;
    }
    
    await runMutation(
      () => supabase.from('tasks').update(payload).eq('id', taskId),
      isCompleted ? (isTr ? 'Harika! Görev tamamlandı.' : 'Great! Task completed.') : null
    );
  };
  
  const handleSaveNote = async (noteId, draft) => {
    const content = draft.content.trim();
    if (!content) return;
    
    const nextUpdatedAt = stamp();
    const payload = {
      title: draft.title?.trim() || null,
      content,
      updated_at: nextUpdatedAt,
      user_id: session.user.id
    };

    if (noteId) {
      await runMutation(
        () => supabase.from('notes').update(payload).eq('id', noteId),
        isTr ? 'Not güncellendi.' : 'Note updated.'
      );
    } else {
      await runMutation(
        () => supabase.from('notes').insert([payload]),
        isTr ? 'Not eklendi.' : 'Note added.'
      );
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm(isTr ? 'Bu not silinsin mi?' : 'Delete this note?')) return;
    
    await runMutation(
      () => supabase.from('notes').delete().eq('id', noteId),
      isTr ? 'Not silindi.' : 'Note deleted.'
    );
  };

  const handleToggleVocabRoutine = async () => {
    const nextState = !isVocabRoutineEnabled;
    setIsVocabRoutineEnabled(nextState);
    localStorage.setItem('dc-vocab-routine', nextState.toString());
    
    const routineTitle = VOCAB_ROUTINE_TITLE;

    if (nextState && activeFolderId) {
      const existing = allTasks.find(t => t.title === routineTitle && t.recurrence === 'daily');
      if (!existing) {
        const payload = {
          folder_id: activeFolderId,
          title: routineTitle,
          description: 'Her gün 3 yeni kelime ekle.',
          is_completed: false,
          is_archived: false,
          updated_at: stamp(),
          user_id: session.user.id,
          recurrence: 'daily',
        };
        const res = await supabase.from('tasks').insert([payload]).select('*, folders(name)').single();
        if (res.data) setAllTasks(c => [res.data, ...c]);
      } else if (existing.is_archived) {
        handleRestoreTask(existing);
      }
    } else if (!nextState) {
      const existing = allTasks.find(t => t.title === routineTitle && t.recurrence === 'daily' && !t.is_archived);
      if (existing) {
        handleArchiveTask(existing);
      }
    }
  };

  const handleAddWord = async (draft) => {
    const payload = {
      english: draft.english,
      turkish: draft.turkish,
      meaning: draft.meaning || null,
      example: draft.example || null,
      user_id: session.user.id,
    };

    const res = await runMutation(
      () => supabase.from('vocabulary').insert([payload]).select().single(),
      isTr ? 'Kelime eklendi.' : 'Word added.'
    );

    if (res?.data) {
      const newVocab = [res.data, ...vocabulary];
      setVocabulary(newVocab);

      // Check daily routine
      if (isVocabRoutineEnabled) {
        const addedToday = getVocabularyCountForDate(newVocab);
        
        if (addedToday >= VOCAB_ROUTINE_TARGET) {
          const routineTitle = VOCAB_ROUTINE_TITLE;
          const existing = allTasks.find(t => t.title === routineTitle && t.recurrence === 'daily' && !t.is_archived && !t.is_completed);
          if (existing) {
            handleToggleTask(existing); // Complete it
            setTransientMessage(setNotice, isTr ? 'Günlük kelime hedefinize ulaştınız!' : 'Daily word goal reached!');
          }
        }
      }
    }
  };

  const handleReorderTasks = (dragId, targetId) => {
    const tasksToReorder = activeTasks.filter(t => !t.is_completed);
    const dragIndex = tasksToReorder.findIndex(t => t.id === dragId);
    const targetIndex = tasksToReorder.findIndex(t => t.id === targetId);
    
    if (dragIndex === -1 || targetIndex === -1 || dragIndex === targetIndex) return;

    const newOrder = [...tasksToReorder];
    const [dragItem] = newOrder.splice(dragIndex, 1);
    newOrder.splice(targetIndex, 0, dragItem);

    const updates = newOrder.map((t, index) => ({ id: t.id, sort_order: index }));
    
    setAllTasks(current => current.map(task => {
      const update = updates.find(u => u.id === task.id);
      if (update) return { ...task, sort_order: update.sort_order };
      return task;
    }));

    // Async update to Supabase
    updates.forEach(u => {
      supabase.from('tasks').update({ sort_order: u.sort_order }).eq('id', u.id).then();
    });
  };

  const handleEditWord = async (draft) => {
    const payload = {
      english: draft.english,
      turkish: draft.turkish,
      meaning: draft.meaning || null,
      example: draft.example || null,
    };

    const res = await runMutation(
      () => supabase.from('vocabulary').update(payload).eq('id', draft.id),
      isTr ? 'Kelime güncellendi.' : 'Word updated.'
    );

    if (res) {
      setVocabulary(c => c.map(w => w.id === draft.id ? { ...w, ...payload } : w));
    }
  };

  const handleDeleteWord = async (wordId) => {
    if (!window.confirm(isTr ? 'Bu kelimeyi silmek istediğinize emin misiniz?' : 'Delete this word?')) return;
    const res = await runMutation(
      () => supabase.from('vocabulary').delete().eq('id', wordId),
      isTr ? 'Kelime silindi.' : 'Word deleted.'
    );
    if (res) {
      setVocabulary(c => c.filter(w => w.id !== wordId));
    }
  };

  const activeTaskCount = activeTasks.filter((task) => !task.is_completed).length;

  const filteredNotes = useMemo(() => {
    if (!searchNeedle) return notes;
    return notes.filter(note => 
      (note.title || '').toLowerCase().includes(searchNeedle) || 
      (note.content || '').toLowerCase().includes(searchNeedle)
    );
  }, [notes, searchNeedle]);

  const renderMainContent = () => {
    if (view === VIEWS.NOTES) {
      return (
        <NotesView 
          notes={filteredNotes}
          onDeleteNote={handleDeleteNote}
          onSaveNote={handleSaveNote}
          busy={busy}
        />
      );
    }

    if (view === VIEWS.VOCABULARY) {
      return (
        <VocabularyView
          vocabulary={vocabulary}
          onAddWord={handleAddWord}
          onDeleteWord={handleDeleteWord}
          onEditWord={handleEditWord}
          isRoutineEnabled={isVocabRoutineEnabled}
          onToggleRoutine={handleToggleVocabRoutine}
          busy={busy}
        />
      );
    }

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
          onUpdateDuration={handleUpdateTaskDuration}
          onUpdateProgress={handleUpdateTaskProgress}
          onUpdateDueDate={handleUpdateTaskDueDate}
          onUpdateSubTasks={handleUpdateSubTasks}
          onReorderTasks={handleReorderTasks}
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
        onRenameFolder={handleRenameFolder}
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
