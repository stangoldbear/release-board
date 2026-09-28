import React, { useState } from 'react';
import { SquareCheckBig, Copy, Layers, Plus, Tag, Trash, User, X } from 'lucide-react';
import type { BorderStyle, Lane, TaskItem, TaskStatus } from '../types';
import { COLOR_PRESETS, DEFAULT_COLOR_ID } from '../data/colors';
import { TASK_STATUSES, TASK_STATUS_LABELS } from '../domain/plan';
import {
  addDays,
  daysBetween,
  formatDateToISO,
  formatDateToIT,
  parseISODate,
} from '../utils/dateUtils';
import { createId } from '../utils/id';
import { ConfirmDialog } from './ConfirmDialog';

interface TaskModalProps {
  onClose: () => void;
  onSave: (task: TaskItem) => void;
  onDelete?: (taskId: string) => void;
  onDuplicate?: (task: TaskItem) => void;
  /** The task to edit; null to create a new one. */
  initialTask: TaskItem | null;
  lanes: Lane[];
  defaultDate?: string;
  defaultLaneId?: string;
}

/** Mounted only while open, so every opening starts from the task passed in. */
export const TaskModal: React.FC<TaskModalProps> = ({
  onClose,
  onSave,
  onDelete,
  onDuplicate,
  initialTask,
  lanes,
  defaultDate,
  defaultLaneId,
}) => {
  const initialDate = defaultDate ?? formatDateToISO(new Date());
  const [title, setTitle] = useState(initialTask?.title ?? '');
  const [laneId, setLaneId] = useState(initialTask?.laneId ?? defaultLaneId ?? lanes[0]?.id ?? '');
  const [startDate, setStartDate] = useState(initialTask?.startDate ?? initialDate);
  const [endDate, setEndDate] = useState(initialTask?.endDate ?? initialDate);
  const [colorId, setColorId] = useState(initialTask?.colorId ?? DEFAULT_COLOR_ID);
  const [borderStyle, setBorderStyle] = useState<BorderStyle>(initialTask?.borderStyle ?? 'dashed');
  const [status, setStatus] = useState<TaskStatus>(initialTask?.status ?? 'planned');
  const [assignee, setAssignee] = useState(initialTask?.assignee ?? '');
  const [description, setDescription] = useState(initialTask?.description ?? '');
  const [deliverables, setDeliverables] = useState<string[]>(initialTask?.deliverables ?? []);
  const [newDeliverable, setNewDeliverable] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAddDeliverable = () => {
    if (!newDeliverable.trim()) return;
    setDeliverables([...deliverables, newDeliverable.trim()]);
    setNewDeliverable('');
  };

  const handleRemoveDeliverable = (index: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) return;

    // Ensure start date <= end date
    const finalStart = startDate <= endDate ? startDate : endDate;
    const finalEnd = startDate <= endDate ? endDate : startDate;

    const taskToSave: TaskItem = {
      id: initialTask?.id ?? createId(),
      title: title.trim(),
      laneId,
      startDate: finalStart,
      endDate: finalEnd,
      colorId,
      borderStyle,
      status,
      assignee: assignee.trim(),
      description: description.trim(),
      deliverables,
    };

    onSave(taskToSave);
    onClose();
  };

  const durationDays = startDate && endDate ? daysBetween(startDate, endDate) : 1;
  const selectedColor = COLOR_PRESETS.find((c) => c.id === colorId) || COLOR_PRESETS[0];

  return (
    <div
      id="task-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="task-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {initialTask ? 'Modifica attività' : 'Nuova attività'}
            </h2>
          </div>
          <button
            id="close-task-modal-btn"
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Titolo Attività */}
          <div>
            <label
              htmlFor="task-title-input"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
            >
              Titolo *
            </label>
            <textarea
              id="task-title-input"
              required
              rows={2}
              placeholder="es. Rilascio versione 2.8"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-400 focus:border-slate-500 font-mono tracking-tight"
            />
            <p className="text-[11px] text-slate-500 mt-1">Puoi andare a capo con Invio.</p>
          </div>

          {/* Lane */}
          <div>
            <label
              htmlFor="task-lane-select"
              className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              Corsia
            </label>

            <select
              id="task-lane-select"
              value={laneId}
              onChange={(e) => setLaneId(e.target.value)}
              className="w-full px-3 py-2 text-sm font-medium bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-400"
            >
              {lanes.map((lane) => (
                <option key={lane.id} value={lane.id}>
                  {lane.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Inizio e Fine */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="task-start-date"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
                >
                  Inizio *
                </label>
                <span className="text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {formatDateToIT(startDate)}
                </span>
              </div>
              <div className="relative">
                <input
                  id="task-start-date"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value > endDate) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="task-end-date"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
                >
                  Fine (inclusa) *
                </label>
                <span className="text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {formatDateToIT(endDate)}
                </span>
              </div>
              <div className="relative">
                <input
                  id="task-end-date"
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (e.target.value < startDate) {
                      setStartDate(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Quick Duration Indicator */}
          <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <span>
              Periodo:{' '}
              <strong className="text-slate-800 font-semibold font-mono">
                {formatDateToIT(startDate)} → {formatDateToIT(endDate)}
              </strong>{' '}
              ({durationDays} {durationDays === 1 ? 'giorno' : 'giorni'})
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setEndDate(startDate)}
                className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] hover:bg-slate-100"
              >
                1 giorno
              </button>
              <button
                type="button"
                onClick={() => setEndDate(formatDateToISO(addDays(parseISODate(startDate), 2)))}
                className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] hover:bg-slate-100"
              >
                3 giorni
              </button>
              <button
                type="button"
                onClick={() => setEndDate(formatDateToISO(addDays(parseISODate(startDate), 6)))}
                className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] hover:bg-slate-100"
              >
                1 settimana
              </button>
            </div>
          </div>

          {/* Appearance on the calendar: color and border */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              Aspetto nel calendario
            </label>

            {/* Colors */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setColorId(preset.id)}
                  aria-pressed={colorId === preset.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                    preset.bg
                  } ${preset.border} ${
                    colorId === preset.id
                      ? 'ring-2 ring-slate-800 shadow-xs'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${preset.border} border-2 bg-white`} />
                  <span className={`text-xs font-medium truncate ${preset.text}`}>
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Border Style */}
            <div className="flex items-center gap-4 pt-1">
              <span className="text-xs text-slate-600 font-medium">Bordo:</span>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="borderStyle"
                  value="dashed"
                  checked={borderStyle === 'dashed'}
                  onChange={() => setBorderStyle('dashed')}
                  className="text-slate-800 focus:ring-slate-500"
                />
                <span className="font-mono px-2 py-0.5 border border-dashed border-slate-500 rounded bg-slate-50">
                  Tratteggiato
                </span>
              </label>

              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="borderStyle"
                  value="solid"
                  checked={borderStyle === 'solid'}
                  onChange={() => setBorderStyle('solid')}
                  className="text-slate-800 focus:ring-slate-500"
                />
                <span className="font-mono px-2 py-0.5 border border-solid border-slate-500 rounded bg-slate-50">
                  Continuo
                </span>
              </label>
            </div>

            {/* Live Preview Box */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Anteprima
              </span>
              <div
                className={`p-2.5 rounded-xs text-center font-bold text-xs uppercase ${
                  selectedColor.bg
                } ${selectedColor.text} border-2 ${
                  borderStyle === 'dashed' ? 'border-dashed' : 'border-solid'
                } ${selectedColor.border} shadow-xs`}
              >
                {title.trim() || 'Titolo attività'}
              </div>
            </div>
          </div>

          {/* Status & Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label
                htmlFor="task-status-select"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
              >
                Stato
              </label>
              <select
                id="task-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-400"
              >
                {TASK_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {TASK_STATUS_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="task-assignee-input"
                className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                Assegnatario
              </label>
              <input
                id="task-assignee-input"
                type="text"
                placeholder="es. Team mobile"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          {/* Deliverables Checklist */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <SquareCheckBig className="w-3.5 h-3.5 text-slate-400" />
              Checklist
            </label>

            <div className="flex gap-2">
              <input
                type="text"
                aria-label="Nuova voce della checklist"
                placeholder="Aggiungi una voce (es. Revisione del codice)"
                value={newDeliverable}
                onChange={(e) => setNewDeliverable(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDeliverable();
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-400"
              />
              <button
                type="button"
                onClick={handleAddDeliverable}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 border border-slate-300"
              >
                <Plus className="w-3.5 h-3.5" />
                Aggiungi
              </button>
            </div>

            {deliverables.length > 0 && (
              <div className="space-y-1.5 mt-2 max-h-32 overflow-y-auto">
                {deliverables.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      {item}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDeliverable(idx)}
                      aria-label={`Rimuovi ${item}`}
                      className="text-slate-400 hover:text-red-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Note aggiuntive */}
          <div>
            <label
              htmlFor="task-description-input"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
            >
              Note
            </label>
            <textarea
              id="task-description-input"
              rows={2}
              placeholder="Dettagli, link o note di rilascio…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2">
              {initialTask && onDelete && (
                <button
                  id="delete-task-btn"
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash className="w-4 h-4" />
                  Elimina
                </button>
              )}

              {initialTask && onDuplicate && (
                <button
                  id="duplicate-task-btn"
                  type="button"
                  onClick={() => {
                    onDuplicate(initialTask);
                    onClose();
                  }}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Crea una copia esatta di questa attività"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  Duplica
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                id="cancel-task-btn"
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                id="save-task-btn"
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                {initialTask ? 'Salva modifiche' : 'Crea attività'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Confirmation Dialog for Deleting Task */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Eliminare l'attività?"
        message="L'attività viene rimossa dal calendario."
        itemTitle={title || initialTask?.title}
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant="danger"
        onConfirm={() => {
          if (initialTask && onDelete) {
            onDelete(initialTask.id);
          }
          setShowDeleteConfirm(false);
          onClose();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
