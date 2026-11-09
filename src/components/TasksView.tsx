/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Check, Trash2, Sparkles, Filter, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { TaskEntity } from '../types';
import { roomDb } from '../db/roomDatabase';
import { useApp } from '../context/AppContext';

export const TasksView: React.FC = () => {
  const { dbRevision, refreshDb, language, t } = useApp();
  const [tasks, setTasks] = useState<TaskEntity[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [filterState, setFilterState] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    let isMounted = true;
    roomDb.taskDao.getAll().then((list) => {
      if (isMounted) setTasks(list);
    });
    return () => {
      isMounted = false;
    };
  }, [dbRevision]);

  const handleToggleTask = async (task: TaskEntity) => {
    const isNowDone = await roomDb.taskDao.toggle(task.id);
    if (isNowDone) {
      // Fire confetti burst for celebration!
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899'],
      });
    }
    refreshDb();
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask: TaskEntity = {
      id: `task_${Date.now()}`,
      text: newTaskText.trim(),
      isDone: false,
      priority: 'medium',
      createdAt: Date.now(),
    };

    await roomDb.taskDao.insert(newTask);
    setNewTaskText('');
    refreshDb();
  };

  const handleDeleteTask = async (id: string) => {
    await roomDb.taskDao.delete(id);
    refreshDb();
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.isDone).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const filteredTasks = tasks.filter((t) => {
    if (filterState === 'pending') return !t.isDone;
    if (filterState === 'completed') return t.isDone;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Progress & Summary Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t.navTasks}
            </h3>
            <p className="text-xs text-slate-500">
              قائمة المهام المستخرجة من التسجيلات الصوتية وملاحظات Room اليومية.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-slate-500 block">{t.taskProgress}</span>
              <span className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
                {progressPercent}%
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Progress Track */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{totalTasks - completedTasks} مهام متبقية</span>
          <span>{completedTasks} مهام منجزة من {totalTasks}</span>
        </div>
      </div>

      {/* Add Task Input Form */}
      <form onSubmit={handleAddTask} className="flex items-center gap-2">
        <input
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          placeholder="أضف مهمة جديدة أو بند عمل واضغط Enter..."
          className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t.addTask}</span>
        </button>
      </form>

      {/* Filter Tabs (Functional Button Controls §1.A) */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-fit">
        <button
          onClick={() => setFilterState('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterState === 'all'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          الكل ({totalTasks})
        </button>
        <button
          onClick={() => setFilterState('pending')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterState === 'pending'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {t.pending} ({totalTasks - completedTasks})
        </button>
        <button
          onClick={() => setFilterState('completed')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterState === 'completed'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {t.completed} ({completedTasks})
        </button>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
          <CheckSquare className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {filterState === 'completed' ? 'لم تكتمل أي مهمة بعد' : 'لا توجد مهام حالياً'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleToggleTask(task)}
              className={`p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex items-center justify-between gap-3 cursor-pointer shadow-sm ${
                task.isDone
                  ? 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 opacity-70'
                  : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                    task.isDone
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'border-2 border-slate-300 dark:border-slate-600 hover:border-indigo-600'
                  }`}
                >
                  {task.isDone && <Check className="w-4 h-4 stroke-[3]" />}
                </div>

                <span
                  className={`text-sm leading-normal break-words flex-1 ${
                    task.isDone
                      ? 'line-through text-slate-400 dark:text-slate-500'
                      : 'text-slate-800 dark:text-slate-100 font-medium'
                  }`}
                >
                  {task.text}
                </span>
              </div>

              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 shrink-0"
              >
                <button
                  type="button"
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1.5 text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
