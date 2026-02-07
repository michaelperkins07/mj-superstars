// ============================================================
// MJ's Superstars - Tasks Screen
// ============================================================

import React, { useState, useEffect } from 'react';
import { TaskAPI, TokenManager } from '../../services/api';
import { Plus, Check } from '../shared/Icons';

function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);
  const isGuest = !TokenManager.isAuthenticated();

  const saveTasksLocally = (taskList) => {
    localStorage.setItem('mj_guest_tasks', JSON.stringify(taskList));
  };

  useEffect(() => {
    const loadTasks = async () => {
      if (isGuest) {
        const stored = localStorage.getItem('mj_guest_tasks');
        if (stored) setTasks(JSON.parse(stored));
        setLoading(false);
        return;
      }
      try {
        const response = await TaskAPI.list();
        setTasks(response.tasks || response || []);
      } catch (err) {
        console.error('Failed to load tasks:', err);
        const stored = localStorage.getItem('mj_guest_tasks');
        if (stored) setTasks(JSON.parse(stored));
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, []);

  const addTask = async () => {
    if (!newTask.trim()) return;
    if (isGuest) {
      const localTask = { id: 'task_' + Date.now(), title: newTask.trim(), difficulty: 'small', status: 'pending', created_at: new Date().toISOString() };
      const updated = [localTask, ...tasks];
      setTasks(updated);
      saveTasksLocally(updated);
      setNewTask('');
      return;
    }
    try {
      const response = await TaskAPI.create({ title: newTask.trim(), difficulty: 'small' });
      setTasks(prev => [response.task || response, ...prev]);
      setNewTask('');
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  const completeTask = async (taskId) => {
    if (isGuest) {
      const updated = tasks.map(t => t.id === taskId ? { ...t, status: 'completed' } : t);
      setTasks(updated);
      saveTasksLocally(updated);
      return;
    }
    try {
      await TaskAPI.complete(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' } : t));
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-2">Today's Tasks</h1>
      <p className="text-slate-400 text-sm mb-6">Small steps lead to big changes</p>

      <div className="flex gap-2 mb-6">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="Add a new task..."
          className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/50 placeholder-slate-400"
        />
        <button
          onClick={addTask}
          disabled={!newTask.trim()}
          className="w-11 h-11 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 text-white flex items-center justify-center transition-colors"
        >
          <Plus />
        </button>
      </div>

      <div className="space-y-2 mb-6">
        {pendingTasks.map((task) => (
          <div key={task.id} className="bg-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => completeTask(task.id)}
              className="w-6 h-6 rounded-full border-2 border-slate-600 hover:border-sky-500 flex items-center justify-center transition-colors shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm">{task.title}</p>
              {task.difficulty && (
                <span className="text-xs text-slate-500 capitalize">{task.difficulty}</span>
              )}
            </div>
          </div>
        ))}
        {!loading && pendingTasks.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-4">All caught up! Add a task above.</p>
        )}
      </div>

      {completedTasks.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            Completed <span className="text-sm text-emerald-400">({completedTasks.length})</span>
          </h2>
          <div className="space-y-2">
            {completedTasks.slice(0, 5).map((task) => (
              <div key={task.id} className="bg-slate-800/50 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Check />
                </div>
                <p className="text-slate-500 text-sm line-through">{task.title}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default TasksScreen;
