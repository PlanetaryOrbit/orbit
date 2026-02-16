import axios from 'axios';
import React, { useEffect, useState, Fragment } from 'react';
import { workspacestate } from '@/state';
import { useRecoilState } from 'recoil';
import { IconSearch, IconRefresh, IconFilter, IconHistory } from '@tabler/icons-react';
import clsx from 'clsx';
import { Popover, Transition } from '@headlessui/react';
import { FC } from '@/types/settingsComponent';

type AuditEntry = {
  id: number;
  userId?: string;
  userName?: string;
  action: string;
  entity?: string;
  details?: any;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  'document.create': 'Document Create',
  'document.update': 'Document Update',
  'document.delete': 'Document Delete',
  'session.create': 'Session Create',
  'session.delete': 'Session Delete',
  'wall.post.delete': 'Wall Delete',
  'wall.post.create': 'Wall Create',
};

const PERMISSION_LABELS: Record<string, string> = {
  'view_wall': 'View wall',
  'post_on_wall': 'Post on wall',
  'delete_wall_posts': 'Delete wall posts',
  'sessions_shift_see': 'Shift Sessions - See',
  'sessions_shift_assign': 'Shift Sessions - Assign',
  'sessions_shift_claim': 'Shift Sessions - Claim',
  'sessions_shift_host': 'Shift Sessions - Host',
  'sessions_shift_unscheduled': 'Shift Sessions - Create Unscheduled',
  'sessions_shift_scheduled': 'Shift Sessions - Create Scheduled',
  'sessions_shift_manage': 'Shift Sessions - Manage',
  'sessions_shift_notes': 'Shift Sessions - Add Notes',
  'sessions_training_see': 'Training Sessions - See',
  'sessions_training_assign': 'Training Sessions - Assign',
  'sessions_training_claim': 'Training Sessions - Claim',
  'sessions_training_host': 'Training Sessions - Host',
  'sessions_training_unscheduled': 'Training Sessions - Create Unscheduled',
  'sessions_training_scheduled': 'Training Sessions - Create Scheduled',
  'sessions_training_manage': 'Training Sessions - Manage',
  'sessions_training_notes': 'Training Sessions - Add Notes',
  'sessions_event_see': 'Event Sessions - See',
  'sessions_event_assign': 'Event Sessions - Assign',
  'sessions_event_claim': 'Event Sessions - Claim',
  'sessions_event_host': 'Event Sessions - Host',
  'sessions_event_unscheduled': 'Event Sessions - Create Unscheduled',
  'sessions_event_scheduled': 'Event Sessions - Create Scheduled',
  'sessions_event_manage': 'Event Sessions - Manage',
  'sessions_event_notes': 'Event Sessions - Add Notes',
  'sessions_other_see': 'Other Sessions - See',
  'sessions_other_assign': 'Other Sessions - Assign',
  'sessions_other_claim': 'Other Sessions - Claim',
  'sessions_other_host': 'Other Sessions - Host',
  'sessions_other_unscheduled': 'Other Sessions - Create Unscheduled',
  'sessions_other_scheduled': 'Other Sessions - Create Scheduled',
  'sessions_other_manage': 'Other Sessions - Manage',
  'sessions_other_notes': 'Other Sessions - Add Notes',
  'view_members': 'View members',
  'use_views': 'Use saved views',
  'create_views': 'Create views',
  'edit_views': 'Edit views',
  'delete_views': 'Delete views',
  'create_docs': 'Create docs',
  'edit_docs': 'Edit docs',
  'delete_docs': 'Delete docs',
  'create_policies': 'Create policies',
  'edit_policies': 'Edit policies',
  'delete_policies': 'Delete policies',
  'view_compliance': 'View compliance',
  'create_notices': 'Create notices',
  'approve_notices': 'Approve notices',
  'manage_notices': 'Manage notices',
  'create_quotas': 'Create quotas',
  'delete_quotas': 'Delete quotas',
  'view_member_profiles': 'Profiles - View',
  'edit_member_details': 'Info - Edit details',
  'record_notices': 'Notices - Record approved',
  'activity_adjustments': 'Activity - Adjustments',
  'view_logbook': 'Logbook - See Entries',
  'logbook_redact': 'Logbook - Redact Entries',
  'logbook_note': 'Logbook - Note',
  'logbook_warning': 'Logbook - Warning',
  'logbook_promotion': 'Logbook - Promotion',
  'logbook_demotion': 'Logbook - Demotion',
  'logbook_termination': 'Logbook - Termination',
  'rank_users': 'Logbook - Use Ranking Integration',
  'create_alliances': 'Create alliances',
  'delete_alliances': 'Delete alliances',
  'represent_alliance': 'Represent alliance',
  'edit_alliance_details': 'Edit alliance details',
  'add_alliance_notes': 'Add notes',
  'edit_alliance_notes': 'Edit notes',
  'delete_alliance_notes': 'Delete notes',
  'add_alliance_visits': 'Add visits',
  'edit_alliance_visits': 'Edit visits',
  'delete_alliance_visits': 'Delete visits',
  'admin': 'Admin (Manage workspace)',
  'reset_activity': 'Reset activity',
  'view_audit_logs': 'View audit logs',
  'manage_apikeys': 'Create API keys',
  'manage_features': 'Manage features',
  'workspace_customisation': 'Workspace customisation',
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  'recurring': 'Recurring',
  'shift': 'Shift',
  'training': 'Training',
  'event': 'Event',
  'other': 'Other',
};

const getActionLabel = (action: string) => {
  if (!action) return '';
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action
    .split(/[._]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
};

const formatValue = (v: any, maxLength: number = 100) => {
  if (v === null) return <span className="text-zinc-400 dark:text-zinc-500 italic">null</span>;
  if (v === undefined) return <span className="text-zinc-400 dark:text-zinc-500 italic">undefined</span>;
  if (typeof v === 'boolean') return <span className="font-medium">{v ? 'true' : 'false'}</span>;
  if (typeof v === 'number') return <span className="font-medium">{v}</span>;
  if (typeof v === 'string') {
    if (v.length === 0) return <span className="text-zinc-400 dark:text-zinc-500 italic">(empty)</span>;
    const truncated = v.length > maxLength ? v.slice(0, maxLength) + '...' : v;
    return <span>{truncated}</span>;
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return <span className="text-zinc-400 dark:text-zinc-500 italic">[]</span>;
    return <span className="font-mono">[{v.length} items]</span>;
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 0) return <span className="text-zinc-400 dark:text-zinc-500 italic">{'{}'}</span>;
    return <span className="font-mono">{'{'}{keys.slice(0, 3).join(', ')}{keys.length > 3 ? '...' : ''}{'}'}</span>;
  }
  return <span className="font-mono">{String(v)}</span>;
};

const itemKey = (x: any) => {
  if (x === null || x === undefined) return String(x);
  if (typeof x === 'string' || typeof x === 'number') return String(x);
  if (typeof x === 'object') {
    if (x.id) return String(x.id);
    if (x.name) return String(x.name);
    return JSON.stringify(x);
  }
  return String(x);
};

const renderDetails = (details: any, action?: string) => {
  if (!details) return <span className="text-xs text-zinc-500 dark:text-zinc-400">—</span>;
  if (typeof details === 'string' || typeof details === 'number') {
    return <div className="text-sm">{formatValue(details, 200)}</div>;
  }

  const hasBefore = Object.prototype.hasOwnProperty.call(details, 'before');
  const hasAfter = Object.prototype.hasOwnProperty.call(details, 'after');
  
  if (hasBefore || hasAfter) {
    const before = details.before || {};
    const after = details.after || {};
    const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
    const changes: any[] = [];
    
    if (details.roleName) {
      changes.push({
        key: 'roleName',
        type: 'roleName',
        value: details.roleName
      });
    }
    
    for (const key of allKeys) {
      const beforeVal = before[key];
      const afterVal = after[key];
      if (JSON.stringify(beforeVal) === JSON.stringify(afterVal)) continue;
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt' || key === '__v') continue;
      if (key === 'permissions' && Array.isArray(beforeVal) && Array.isArray(afterVal)) {
        const beforeSet = new Set(beforeVal);
        const afterSet = new Set(afterVal);
        const added = afterVal.filter((p: string) => !beforeSet.has(p));
        const removed = beforeVal.filter((p: string) => !afterSet.has(p));
        
        if (added.length > 0 || removed.length > 0) {
          changes.push({
            key: 'permissions',
            type: 'permissions',
            added: added.map((p: string) => PERMISSION_LABELS[p] || p),
            removed: removed.map((p: string) => PERMISSION_LABELS[p] || p)
          });
        }
        continue;
      }
      
      if (key === 'sessionColors' && typeof beforeVal === 'object' && typeof afterVal === 'object' && beforeVal !== null && afterVal !== null) {
        const allSessionKeys = Array.from(new Set([...Object.keys(beforeVal), ...Object.keys(afterVal)]));
        const colorChanges: any[] = [];
        
        for (const sessionKey of allSessionKeys) {
          if (beforeVal[sessionKey] !== afterVal[sessionKey]) {
            colorChanges.push({
              type: sessionKey,
              label: SESSION_TYPE_LABELS[sessionKey] || sessionKey,
              before: beforeVal[sessionKey],
              after: afterVal[sessionKey]
            });
          }
        }
        
        if (colorChanges.length > 0) {
          changes.push({
            key: 'sessionColors',
            type: 'sessionColors',
            colorChanges
          });
        }
        continue;
      }
      
      if (Array.isArray(beforeVal) && Array.isArray(afterVal)) {
        const maxLength = Math.max(beforeVal.length, afterVal.length);
        for (let i = 0; i < maxLength; i++) {
          if (JSON.stringify(beforeVal[i]) !== JSON.stringify(afterVal[i])) {
            if (typeof beforeVal[i] === 'object' && typeof afterVal[i] === 'object') {
              const nestedKeys = Array.from(new Set([
                ...Object.keys(beforeVal[i] || {}),
                ...Object.keys(afterVal[i] || {})
              ]));
              for (const nestedKey of nestedKeys) {
                if (JSON.stringify(beforeVal[i]?.[nestedKey]) !== JSON.stringify(afterVal[i]?.[nestedKey])) {
                  changes.push({
                    key: `${key}[${i}].${nestedKey}`,
                    before: beforeVal[i]?.[nestedKey],
                    after: afterVal[i]?.[nestedKey]
                  });
                }
              }
            } else {
              changes.push({
                key: `${key}[${i}]`,
                before: beforeVal[i],
                after: afterVal[i]
              });
            }
          }
        }
      } else if (typeof beforeVal === 'object' && typeof afterVal === 'object' && beforeVal !== null && afterVal !== null) {
        const nestedKeys = Array.from(new Set([...Object.keys(beforeVal), ...Object.keys(afterVal)]));
        let hasNestedChange = false;
        for (const nestedKey of nestedKeys) {
          if (JSON.stringify(beforeVal[nestedKey]) !== JSON.stringify(afterVal[nestedKey])) {
            hasNestedChange = true;
            changes.push({
              key: `${key}.${nestedKey}`,
              before: beforeVal[nestedKey],
              after: afterVal[nestedKey]
            });
          }
        }
        if (!hasNestedChange) {
          changes.push({ key, before: beforeVal, after: afterVal });
        }
      } else {
        changes.push({ key, before: beforeVal, after: afterVal });
      }
    }
    
    if (changes.length === 0) {
      return <span className="text-xs text-zinc-500 dark:text-zinc-400 italic">No changes detected</span>;
    }
    
    return (
      <div className="space-y-2">
        {changes.map((change, idx) => {
          if (change.type === 'roleName') {
            return (
              <div key={change.key} className="text-sm mb-2">
                <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Role: {change.value}
                </div>
              </div>
            );
          }
          
          if (change.type === 'permissions') {
            return (
              <div key={change.key} className="text-sm">
                <div className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Permissions
                </div>
                <div className="space-y-2">
                  {change.removed && change.removed.length > 0 && (
                    <div className="bg-red-50/80 dark:bg-red-950/30 border border-red-200/80 dark:border-red-800/60 rounded-lg px-2.5 py-1.5">
                      <div className="text-[10px] font-medium text-red-600 dark:text-red-400 mb-1 uppercase tracking-wide">Removed</div>
                      <div className="text-xs text-red-900 dark:text-red-200">{change.removed.join(', ')}</div>
                    </div>
                  )}
                  {change.added && change.added.length > 0 && (
                    <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg px-2.5 py-1.5">
                      <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mb-1 uppercase tracking-wide">Added</div>
                      <div className="text-xs text-emerald-900 dark:text-emerald-200">{change.added.join(', ')}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          }
          
          if (change.type === 'sessionColors') {
            return (
              <div key={change.key} className="text-sm">
                <div className="font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Session Colors
                </div>
                <div className="space-y-2">
                  {change.colorChanges.map((colorChange: any) => (
                    <div key={colorChange.type} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 w-20">
                        {colorChange.label}:
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-red-50/80 dark:bg-red-950/30 border border-red-200/80 dark:border-red-800/60 rounded-lg px-2 py-1">
                          <div className={`w-3.5 h-3.5 rounded ${colorChange.before}`} />
                          <span className="text-[10px] text-red-700 dark:text-red-300">{colorChange.before}</span>
                        </div>
                        <span className="text-zinc-400 dark:text-zinc-500">→</span>
                        <div className="flex items-center gap-1.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg px-2 py-1">
                          <div className={`w-3.5 h-3.5 rounded ${colorChange.after}`} />
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-300">{colorChange.after}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          
          return (
            <div key={change.key + idx} className="text-sm">
              <div className="font-medium text-zinc-700 dark:text-zinc-300 mb-1 capitalize">
                {change.key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
              </div>
                <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0 bg-red-50/80 dark:bg-red-950/30 border border-red-200/80 dark:border-red-800/60 rounded-lg px-2.5 py-1.5">
                  <div className="text-[10px] font-medium text-red-600 dark:text-red-400 mb-0.5 uppercase tracking-wide">Before</div>
                  <div className="text-xs text-red-900 dark:text-red-200 break-words">{formatValue(change.before, 150)}</div>
                </div>
                <div className="text-zinc-400 dark:text-zinc-500 self-center shrink-0">→</div>
                <div className="flex-1 min-w-0 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg px-2.5 py-1.5">
                  <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mb-0.5 uppercase tracking-wide">After</div>
                  <div className="text-xs text-emerald-900 dark:text-emerald-200 break-words">{formatValue(change.after, 150)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (typeof details === 'object') {
    const entries = Object.entries(details).filter(([key]) => 
      key !== 'id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt'
    );
    
    if (entries.length === 0) {
      return <span className="text-xs text-zinc-500 dark:text-zinc-400 italic">No details</span>;
    }
    
    return (
      <div className="space-y-1.5">
        {entries.map(([key, value]) => (
          <div key={key} className="text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300 capitalize">
              {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}:
            </span>{' '}
            <span className="text-zinc-600 dark:text-zinc-400">{formatValue(value, 150)}</span>
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-sm text-zinc-600 dark:text-zinc-400">{String(details)}</span>;
};
const AuditLogs: FC<{ triggerToast?: any }> = () => {
  const [workspace] = useRecoilState(workspacestate);
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (actionFilter === 'session.create') {
        params.search = (search ? search + ' ' : '') + 'session.create';
      } else if (actionFilter) {
        params.action = actionFilter;
        if (search) params.search = search;
      } else if (search) {
        params.search = search;
      }

      const res = await axios.get(`/api/workspace/${workspace.groupId}/audit`, { params });
      if (res.data?.success) {
        setRows(res.data.rows || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[color:rgb(var(--group-theme)/0.12)] text-[color:rgb(var(--group-theme))] shrink-0">
          <IconHistory className="w-5 h-5" stroke={1.5} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Activity log</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Search and filter workspace audit events</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
            <IconSearch className="w-4 h-4" stroke={1.5} />
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetch()}
            placeholder="Search details…"
            className={clsx(
              "w-full py-2.5 pl-10 pr-3 text-sm rounded-xl border transition-colors",
              "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-600",
              "text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500",
              "focus:ring-2 focus:ring-[color:rgb(var(--group-theme)/0.25)] focus:border-[color:rgb(var(--group-theme))]"
            )}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetch}
            title="Refresh"
            disabled={loading}
            className={clsx(
              "p-2.5 rounded-xl border transition-colors",
              "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-600",
              "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <IconRefresh className="w-4 h-4" stroke={1.5} />
          </button>
          <Popover className="relative">
            {({ open, close }) => (
              <>
                <Popover.Button
                  className={clsx(
                    "inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-xl border transition-all",
                    open
                      ? "bg-[color:rgb(var(--group-theme)/0.1)] border-[color:rgb(var(--group-theme)/0.3)] text-[color:rgb(var(--group-theme))] ring-2 ring-[color:rgb(var(--group-theme)/0.25)]"
                      : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <IconFilter className="w-4 h-4" stroke={1.5} />
                  <span>{actionFilter ? (ACTION_LABELS[actionFilter] || getActionLabel(actionFilter)) : 'Filters'}</span>
                </Popover.Button>
                <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
                  <Popover.Panel className="absolute z-50 mt-2 w-48 max-w-[90vw] origin-top-right right-0 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg shadow-zinc-200/50 dark:shadow-none overflow-hidden top-full max-h-[60vh] overflow-y-auto">
                    <div className="p-1.5 space-y-0.5">
                      <button
                        onClick={() => { setActionFilter(''); setSearch(''); fetch(); close(); }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 transition-colors"
                      >
                        All actions
                      </button>
                      {Object.keys(ACTION_LABELS).map((k) => (
                        <button
                          key={k}
                          onClick={() => { setActionFilter(k); fetch(); close(); }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 transition-colors"
                        >
                          {ACTION_LABELS[k]}
                        </button>
                      ))}
                    </div>
                  </Popover.Panel>
                </Transition>
              </>
            )}
          </Popover>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/50 dark:bg-zinc-900/30">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider bg-zinc-100/80 dark:bg-zinc-800/80">
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    No audit entries
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const details = r.details || {};
                return (
                  <tr
                    key={r.id}
                    className="border-t border-zinc-200/80 dark:border-zinc-700/50 bg-white dark:bg-zinc-800/50 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/80 transition-colors"
                  >
                    <td className="py-3 px-4 text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap" title={new Date(r.createdAt).toUTCString()}>
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-medium text-zinc-900 dark:text-white">
                      {r.userName || r.userId || 'System'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[color:rgb(var(--group-theme)/0.12)] text-[color:rgb(var(--group-theme))]">
                        {getActionLabel(r.action)}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      {renderDetails(details, r.action)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

AuditLogs.title = 'Audit Logs';

export default AuditLogs;
