import { useState } from 'react';
import { Pencil, Tag, Trash, UserRound } from 'lucide-react';
import { diffProjectNote, noteSuggestions } from '../../domain/projectNotes';
import type { MemoAuthor, ProjectNote } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { Highlight } from '../../shared/ui/Highlight';
import { RulesNotice } from '../../shared/ui/RulesNotice';
import { formatDateTimeIT } from '../../utils/dateUtils';
import { NoteEditor } from './NoteEditor';
import { DueBadge } from './noteUi';
import type { NoteActions } from './roadmapActions';

interface ProjectNotesPanelProps {
  projectId: string;
  /** The notes of the project, oldest first. */
  notes: ProjectNote[];
  /** The published rules do not know the notes yet: the panel says so, and no more. */
  unavailable: boolean;
  me: MemoAuthor | null;
  nameOf: (author: MemoAuthor) => string;
  today: string;
  actions: NoteActions;
}

/**
 * The notes written on a project along the way: a field to add one with Enter, with the other
 * options a click away, then the notes oldest first, each with who wrote it and when, its state
 * to tick, its deadline, owners and tags. Notes are saved as they are added or changed.
 */
export function ProjectNotesPanel({
  projectId,
  notes,
  unavailable,
  me,
  nameOf,
  today,
  actions,
}: ProjectNotesPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ProjectNote | null>(null);
  const suggestions = noteSuggestions(notes);

  if (unavailable) return <RulesNotice what="Le note dei progetti" />;

  const authorOf = (note: ProjectNote) =>
    note.author ? (me && note.author.id === me.id ? 'tu' : nameOf(note.author)) : null;

  return (
    <div className="space-y-4">
      <NoteEditor
        key={projectId}
        initial={{ projectId, text: '' }}
        suggestions={suggestions}
        expanded={expanded}
        onExpandedChange={setExpanded}
        submitLabel="Aggiungi"
        resetOnSubmit
        autoFocus
        onSubmit={actions.onCreate}
      />
      <p className="text-xs text-fg-muted">
        Le note si salvano subito. Invio aggiunge, Maiusc + Invio va a capo.
      </p>

      {notes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-fg-muted">
          Nessuna nota: la prima di solito racconta lo studio di fattibilità o la stima.
        </p>
      ) : (
        <ol aria-label="Note del progetto" className="space-y-2">
          {notes.map((note) => {
            const done = note.status === 'done';
            const author = authorOf(note);
            if (editing === note.id) {
              return (
                <li key={note.id} className="rounded-lg border border-link bg-surface p-3">
                  <NoteEditor
                    initial={note}
                    suggestions={suggestions}
                    expanded
                    onExpandedChange={() => {}}
                    submitLabel="Salva"
                    autoFocus
                    onSubmit={(content) => {
                      const changes = diffProjectNote(note, content);
                      if (Object.keys(changes).length > 0) actions.onUpdate(note.id, changes);
                      setEditing(null);
                    }}
                    onCancel={() => setEditing(null)}
                  />
                </li>
              );
            }
            return (
              <li key={note.id} className="rounded-lg border border-line bg-surface p-2.5 text-sm">
                <div className="flex items-start gap-2">
                  {note.status && (
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={(event) =>
                        actions.onUpdate(note.id, {
                          status: event.target.checked ? 'done' : 'open',
                        })
                      }
                      aria-label={`Fatta: ${note.text}`}
                      className="mt-1 shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`whitespace-pre-line wrap-break-word ${done ? 'text-fg-muted line-through' : ''}`}
                    >
                      <Highlight text={note.text} />
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-fg-muted">
                      <span>
                        {author ? `${author} · ` : ''}
                        {formatDateTimeIT(note.createdAt)}
                      </span>
                      <DueBadge note={note} today={today} />
                      {note.owners && note.owners.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <UserRound className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span className="sr-only">Owner: </span>
                          <Highlight text={note.owners.join(', ')} />
                        </span>
                      )}
                      {note.tags && note.tags.length > 0 && (
                        <span className="inline-flex flex-wrap items-center gap-1">
                          <Tag className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span className="sr-only">Tag: </span>
                          {note.tags.map((tag) => (
                            <span key={tag} className="rounded-sm border border-line px-1">
                              <Highlight text={tag} />
                            </span>
                          ))}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-1.5"
                      onClick={() => setEditing(note.id)}
                      aria-label={`Modifica la nota: ${note.text}`}
                      title="Modifica"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-1.5"
                      onClick={() => setToDelete(note)}
                      aria-label={`Elimina la nota: ${note.text}`}
                      title="Elimina"
                    >
                      <Trash className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Eliminare la nota?"
          message="La nota viene tolta dal progetto."
          itemTitle={toDelete.text}
          confirmLabel="Elimina"
          onConfirm={() => {
            actions.onDelete(toDelete.id);
            setToDelete(null);
          }}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
