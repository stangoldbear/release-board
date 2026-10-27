import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Contact as ContactIcon, Mail, Pencil, Phone, Plus, Trash } from 'lucide-react';
import {
  CONTACT_EMAIL_MAX,
  CONTACT_NAME_MAX,
  CONTACT_NOTE_MAX,
  CONTACT_PHONE_MAX,
  CONTACT_TEXT_MAX,
  managerChoices,
  notesOfContact,
  reportsMovedUp,
} from '../../domain/contacts';
import type { ContactContent } from '../../domain/contacts';
import type { Contact, ContactNote, MemoAuthor } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { Dialog } from '../../shared/ui/Dialog';
import { FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { Markdown } from '../../shared/ui/Markdown';
import { MarkdownTextarea } from '../../shared/ui/MarkdownTextarea';
import { formatDateTimeIT } from '../../utils/dateUtils';

/** What the window does to the contacts. */
export interface ContactActions {
  /** Saves the person: a new one when `contactId` is null; returns their id. */
  onSave: (contactId: string | null, content: ContactContent) => string;
  onDelete: (contactId: string) => void;
  onAddNote: (contactId: string, text: string) => void;
  onEditNote: (noteId: string, text: string) => void;
  onDeleteNote: (noteId: string) => void;
}

/** A note on the person: its author and time, its text in Markdown, and its commands. */
function NoteItem({
  note,
  authorName,
  onEdit,
  onDelete,
}: {
  note: ContactNote;
  authorName: string | null;
  onEdit: (text: string) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const fieldId = useId();
  const by = `${authorName ? `${authorName} · ` : ''}${formatDateTimeIT(note.createdAt)}`;
  return (
    <li className="space-y-1.5 rounded-lg border border-line bg-surface p-3">
      <p className="flex items-center justify-between gap-2 text-xs text-fg-muted">
        <span>{by}</span>
        {draft === null && (
          <span className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Modifica la nota del ${formatDateTimeIT(note.createdAt)}`}
              title="Modifica la nota"
              onClick={() => setDraft(note.text)}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="danger-subtle"
              size="icon"
              aria-label={`Elimina la nota del ${formatDateTimeIT(note.createdAt)}`}
              title="Elimina la nota"
              onClick={onDelete}
            >
              <Trash className="h-4 w-4" aria-hidden="true" />
            </Button>
          </span>
        )}
      </p>
      {draft === null ? (
        <Markdown text={note.text} className="text-sm" />
      ) : (
        <div className="space-y-2">
          <label htmlFor={fieldId} className="sr-only">
            Testo della nota
          </label>
          <MarkdownTextarea
            id={fieldId}
            label="Testo della nota"
            rows={4}
            maxLength={CONTACT_NOTE_MAX}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => setDraft(null)}>
              Annulla
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={!draft.trim()}
              onClick={() => {
                if (draft.trim() && draft.trim() !== note.text) onEdit(draft.trim());
                setDraft(null);
              }}
            >
              Salva la nota
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * A person of the contacts: name, role, team, how to reach them and whom they report to, and the
 * notes on them, in Markdown, newest first. The notes are added at once; «Salva» saves the person,
 * and also a note written and not added yet. Mounted only while open.
 */
export function ContactDialog({
  contact,
  initialManagerId,
  contacts,
  notes,
  nameOf,
  actions,
  onClose,
}: {
  /** The person to edit; null for a new one. */
  contact: Contact | null;
  /** For a new person, whom they report to. */
  initialManagerId?: string;
  contacts: readonly Contact[];
  notes: readonly ContactNote[];
  nameOf: (author: MemoAuthor) => string;
  actions: ContactActions;
  onClose: () => void;
}) {
  const [name, setName] = useState(contact?.name ?? '');
  const [role, setRole] = useState(contact?.role ?? '');
  const [team, setTeam] = useState(contact?.team ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [managerId, setManagerId] = useState(contact?.managerId ?? initialManagerId ?? '');
  const [newNote, setNewNote] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<ContactNote | null>(null);
  const formId = useId();
  const ids = {
    name: useId(),
    role: useId(),
    team: useId(),
    email: useId(),
    phone: useId(),
    manager: useId(),
    note: useId(),
  };
  const choices = managerChoices(contacts, contact?.id ?? null);
  const own = contact ? notesOfContact(notes, contact.id) : [];
  const manager = contacts.find((item) => item.id === contact?.managerId);
  const reports = contact ? reportsMovedUp(contacts, contact.id) : [];

  const content = (): ContactContent => {
    const saved: ContactContent = { name: name.trim() };
    if (role.trim()) saved.role = role.trim();
    if (team.trim()) saved.team = team.trim();
    if (email.trim()) saved.email = email.trim();
    if (phone.trim()) saved.phone = phone.trim();
    if (managerId) saved.managerId = managerId;
    return saved;
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    const id = actions.onSave(contact?.id ?? null, content());
    // A note written and not added yet goes with the person, once.
    if (newNote.trim()) actions.onAddNote(id, newNote.trim());
    onClose();
  };

  const addNote = () => {
    if (!contact || !newNote.trim()) return;
    actions.onAddNote(contact.id, newNote.trim());
    setNewNote('');
  };

  const field = (
    id: string,
    label: string,
    value: string,
    set: (value: string) => void,
    max: number,
    type = 'text',
    extra: Record<string, unknown> = {},
  ) => (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        maxLength={max}
        value={value}
        onChange={(event) => set(event.target.value)}
        className={FIELD_CLASS}
        {...extra}
      />
    </div>
  );

  return (
    <>
      <Dialog
        title={contact ? contact.name : 'Nuova persona'}
        description="Contatti · organigramma"
        icon={<ContactIcon className="h-5 w-5" aria-hidden="true" />}
        onClose={onClose}
        className="max-w-2xl"
        footer={
          <>
            {contact && (
              <Button
                variant="danger-subtle"
                className="mr-auto"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash className="h-4 w-4" aria-hidden="true" />
                Elimina la persona
              </Button>
            )}
            <Button onClick={onClose}>Annulla</Button>
            <Button variant="primary" type="submit" form={formId} disabled={!name.trim()}>
              {contact ? 'Salva' : 'Aggiungi la persona'}
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={save} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {field(ids.name, 'Nome *', name, setName, CONTACT_NAME_MAX, 'text', {
              required: true,
              'data-autofocus': true,
            })}
            {field(ids.role, 'Ruolo', role, setRole, CONTACT_TEXT_MAX, 'text', {
              placeholder: 'es. Responsabile acquisti',
            })}
            {field(ids.team, 'Team o ufficio', team, setTeam, CONTACT_TEXT_MAX, 'text', {
              placeholder: 'es. Prodotto',
            })}
            <div>
              <label htmlFor={ids.manager} className={LABEL_CLASS}>
                Riporta a
              </label>
              <select
                id={ids.manager}
                value={managerId}
                onChange={(event) => setManagerId(event.target.value)}
                className={FIELD_CLASS}
              >
                <option value="">Nessuno: in cima all’organigramma</option>
                {choices.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.role ? ` · ${item.role}` : ''}
                  </option>
                ))}
              </select>
            </div>
            {field(ids.email, 'Email', email, setEmail, CONTACT_EMAIL_MAX, 'email', {
              autoComplete: 'off',
            })}
            {field(ids.phone, 'Telefono', phone, setPhone, CONTACT_PHONE_MAX, 'tel', {
              autoComplete: 'off',
            })}
          </div>
          {(contact?.email || contact?.phone) && (
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="inline-flex items-center gap-1 text-link underline underline-offset-2"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Scrivi a {contact.email}
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}
                  className="inline-flex items-center gap-1 text-link underline underline-offset-2"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  Chiama {contact.phone}
                </a>
              )}
            </p>
          )}

          <section
            aria-labelledby={`${formId}-notes`}
            className="space-y-3 border-t border-line pt-4"
          >
            <h3 id={`${formId}-notes`} className="text-sm font-semibold">
              Note <span className="font-normal text-fg-muted">({own.length})</span>
            </h3>
            <div className="space-y-2">
              <label htmlFor={ids.note} className={LABEL_CLASS}>
                Nuova nota
              </label>
              <MarkdownTextarea
                id={ids.note}
                label="Nuova nota"
                rows={3}
                maxLength={CONTACT_NOTE_MAX}
                value={newNote}
                placeholder="Di cosa si occupa, come contattarla, decisioni…"
                onChange={(event) => setNewNote(event.target.value)}
              />
              {contact && (
                <Button size="sm" disabled={!newNote.trim()} onClick={addNote}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Aggiungi la nota
                </Button>
              )}
              {!contact && (
                <p className="text-xs text-fg-muted">La nota si aggiunge insieme alla persona.</p>
              )}
            </div>
            {own.length > 0 && (
              <ol className="space-y-2">
                {own.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    authorName={note.author ? nameOf(note.author) : null}
                    onEdit={(text) => actions.onEditNote(note.id, text)}
                    onDelete={() => setNoteToDelete(note)}
                  />
                ))}
              </ol>
            )}
          </section>
        </form>
      </Dialog>

      {confirmDelete && contact && (
        <ConfirmDialog
          title="Eliminare la persona?"
          message={`Si eliminano anche le note sulla persona.${
            reports.length > 0
              ? ` Chi riportava a questa persona (${reports.length}) passa ${manager ? `a ${manager.name}` : 'in cima all’organigramma'}.`
              : ''
          }`}
          itemTitle={contact.name}
          confirmLabel="Elimina"
          onConfirm={() => {
            actions.onDelete(contact.id);
            onClose();
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {noteToDelete && (
        <ConfirmDialog
          title="Eliminare la nota?"
          message="La nota non si recupera, salvo dalla cronologia."
          confirmLabel="Elimina"
          onConfirm={() => {
            actions.onDeleteNote(noteToDelete.id);
            setNoteToDelete(null);
          }}
          onCancel={() => setNoteToDelete(null)}
        />
      )}
    </>
  );
}
