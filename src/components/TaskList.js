import TaskCard from './TaskCard';
import { isTr } from '../utils/i18n';

function TaskList({
  editingDraft,
  editingTaskId,
  onArchiveTask,
  onBeginEdit,
  onCancelEdit,
  onChangeEditingDraft,
  onSaveEdit,
  onToggleTask,
  onUpdateDuration,
  onUpdateProgress,
  tasks,
}) {
  if (!tasks.length) {
    return (
      <section className="panel-empty">
        <h2>{isTr ? 'Bu koleksiyonda henüz görev yok.' : 'No tasks in this collection yet.'}</h2>
        <p>{isTr ? 'İş akışınızı düzenlemeye devam etmek için yukarıdan bir tane ekleyin veya diğer klasörlere geçin.' : 'Add one above, or switch folders to continue curating your workflow.'}</p>
      </section>
    );
  }

  return (
    <section className="task-list">
      {tasks.map((task) => (
        <TaskCard
          editingDraft={editingDraft}
          isEditing={editingTaskId === task.id}
          key={task.id}
          onArchiveTask={onArchiveTask}
          onBeginEdit={onBeginEdit}
          onCancelEdit={onCancelEdit}
          onChangeEditingDraft={onChangeEditingDraft}
          onSaveEdit={onSaveEdit}
          onToggleTask={onToggleTask}
          onUpdateDuration={onUpdateDuration}
          onUpdateProgress={onUpdateProgress}
          task={task}
        />
      ))}
    </section>
  );
}

export default TaskList;
