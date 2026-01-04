import { supabase } from "../lib/supabase";
import { getPendingChanges, removePendingChange, PendingChange, ChangeEntity } from "./offlineStorage";

const TABLE_MAP: Record<ChangeEntity, string> = {
  task: "tasks",
  section: "sections",
  project: "projects",
};

async function processChange(change: PendingChange): Promise<boolean> {
  const table = TABLE_MAP[change.entity];
  if (!table) return false;

  try {
    let error;
    switch (change.operation) {
      case "create":
        ({ error } = await supabase.from(table).insert(change.data));
        break;
      case "update":
        ({ error } = await supabase.from(table).update(change.data).eq("id", change.entityId));
        break;
      case "delete":
        ({ error } = await supabase.from(table).delete().eq("id", change.entityId));
        break;
    }
    return !error;
  } catch {
    return false;
  }
}

export async function syncPendingChanges(): Promise<{ success: boolean; synced: number; failed: number }> {
  const changes = await getPendingChanges();
  let synced = 0, failed = 0;

  for (const change of changes) {
    if (await processChange(change)) {
      await removePendingChange(change.id);
      synced++;
    } else {
      failed++;
    }
  }

  return { success: failed === 0, synced, failed };
}
