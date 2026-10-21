import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Pencil, Plus, RotateCcw, X } from 'lucide-react';
import { teamsInOrder } from '../../domain/roadmapConfig';
import type { RoadmapConfig } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { FIELD_CLASS } from '../../shared/ui/field';
import {
  addRow,
  formatDays,
  nextOfTeam,
  parseDays,
  peopleNotInRows,
  removeRow,
  resetRow,
  rowDays,
  typeDays,
} from './teamEffort';
import type { EffortRow } from './teamEffort';

interface TeamEffortTableProps {
  rows: EffortRow[];
  onRowsChange: (rows: EffortRow[]) => void;
  config: RoadmapConfig;
  /** The totals under the table: days and the end of the work. */
  summary: ReactNode;
  /** Opens the window of an assignment the row is: start, note. */
  onOpenAssignment?: (assignmentId: string) => void;
}

/**
 * The days of each person on the project, one row each: the rows of the teams with a formula are
 * filled from the days of the others until days are typed in them, and «↺» puts them back on the
 * formula. A button adds the next person of a team; a list adds anyone else.
 */
export function TeamEffortTable({
  rows,
  onRowsChange,
  config,
  summary,
  onOpenAssignment,
}: TeamEffortTableProps) {
  const prefix = useId();
  const [picked, setPicked] = useState('');
  const teamsWithNext = teamsInOrder(config)
    .map((team) => ({ team, next: nextOfTeam(rows, team, config) }))
    .filter((item) => item.next !== null && rows.some((row) => row.team?.id === item.team.id));
  const others = peopleNotInRows(rows, config);

  return (
    <div className="space-y-2">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Giorni uomo del team</caption>
        <thead>
          <tr className="border-b border-line-strong text-left text-xs font-semibold tracking-wide text-fg-muted uppercase">
            <th scope="col" className="py-1.5 pr-2 font-semibold">
              Fase / Ruolo
            </th>
            <th scope="col" className="w-44 py-1.5 font-semibold">
              Man Days
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => {
            const segments =
              row.kind === 'person'
                ? rows.filter(
                    (item) => item.kind === 'person' && item.stakeholderId === row.stakeholderId,
                  )
                : [];
            const rowName =
              segments.length > 1
                ? `${row.name} · segmento ${segments.findIndex((item) => item.key === row.key) + 1}`
                : row.name;
            const days = rowDays(row, rows, config);
            const typedProblem =
              !row.auto && row.text.trim() !== '' && parseDays(row.text) === null;
            const inputId = `${prefix}-${row.key}`;
            const hintId = `${inputId}-hint`;
            const color = row.kind === 'contingency' ? 'gray' : row.team?.colorId;
            return (
              <tr key={row.key}>
                <td className="py-1.5 pr-2 align-middle">
                  <label htmlFor={inputId} className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-full border border-line-strong"
                      style={
                        color ? { backgroundColor: `var(--rb-task-${color}-border)` } : undefined
                      }
                    />
                    <span className="truncate font-semibold">{rowName}</span>
                    {row.team && (
                      <span className="shrink-0 text-xs text-fg-muted">{row.team.tag}</span>
                    )}
                    {row.kind === 'contingency' && (
                      <span className="shrink-0 text-xs text-fg-muted">CONT</span>
                    )}
                  </label>
                </td>
                <td className="py-1.5 align-middle">
                  <div className="flex items-center gap-1">
                    <input
                      id={inputId}
                      type="text"
                      inputMode="decimal"
                      value={row.auto ? (days === null ? '' : formatDays(days)) : row.text}
                      placeholder={row.auto ? 'formula' : '0'}
                      onChange={(event) =>
                        onRowsChange(typeDays(rows, row.key, event.target.value))
                      }
                      aria-label={`Giorni uomo di ${rowName}`}
                      aria-describedby={hintId}
                      aria-invalid={typedProblem || undefined}
                      className={`${FIELD_CLASS} w-20 text-right tabular-nums ${
                        row.auto ? 'text-fg-muted' : ''
                      }`}
                    />
                    <span id={hintId} className="min-w-0 flex-1 truncate text-xs text-fg-muted">
                      {typedProblem
                        ? 'Mezze giornate, da 0,5 a 500'
                        : row.auto
                          ? days === null
                            ? 'dalla formula'
                            : 'calcolato'
                          : row.formula
                            ? 'a mano'
                            : ''}
                    </span>
                    {row.formula && !row.auto && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-1"
                        onClick={() => onRowsChange(resetRow(rows, row.key))}
                        aria-label={`Riapplica la formula a ${rowName}`}
                        title={`Riapplica la formula: ${row.formula}`}
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    )}
                    {row.assignmentId && onOpenAssignment && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-1"
                        onClick={() => onOpenAssignment(row.assignmentId!)}
                        aria-label={`Modifica il lavoro di ${rowName}: inizio e nota`}
                        title="Inizio e nota del lavoro"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    )}
                    {row.kind === 'person' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-1"
                        onClick={() => onRowsChange(removeRow(rows, row.key))}
                        aria-label={`Togli ${rowName} dal progetto`}
                        title="Togli dal progetto"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-line-strong bg-surface-muted text-xs">
            <th scope="row" className="py-1.5 pr-2 text-left font-semibold">
              Totale
            </th>
            <td className="py-1.5 font-semibold">{summary}</td>
          </tr>
        </tfoot>
      </table>

      <div className="flex flex-wrap items-center gap-1.5">
        {teamsWithNext.map(({ team, next }) => (
          <Button
            key={team.id}
            size="sm"
            onClick={() => onRowsChange(addRow(rows, next!, config))}
            title={`Aggiungi ${next!.name}: un'altra persona di ${team.name} sul progetto`}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {next!.name}
          </Button>
        ))}
        {others.length > 0 && (
          <select
            aria-label="Aggiungi un'altra persona"
            value={picked}
            onChange={(event) => {
              const person = others.find((item) => item.id === event.target.value);
              setPicked('');
              if (person) onRowsChange(addRow(rows, person, config));
            }}
            className={`${FIELD_CLASS} w-auto py-1 text-xs`}
          >
            <option value="">Altra persona…</option>
            {teamsInOrder(config).map((team) => {
              const people = others.filter((item) => item.teamId === team.id);
              return people.length > 0 ? (
                <optgroup key={team.id} label={team.name}>
                  {people.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              ) : null;
            })}
          </select>
        )}
      </div>
    </div>
  );
}
