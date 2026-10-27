import type {
  UserDataset,
  UserDatasetType,
  UserDatasets,
} from "../domain/user";
import { currentSessionToken } from "./session";
import { userDataApi } from "./userData";

type DatasetHandler = (payload: unknown, dataset: UserDataset) => void;

const handlers = new Map<UserDatasetType, DatasetHandler>();
const pendingDatasets = new Map<UserDatasetType, UserDataset>();
const revisions: Record<UserDatasetType, number> = {
  learning: 0,
  paper: 0,
};
let hydrating = false;

export function registerDatasetHandler(
  type: UserDatasetType,
  handler: DatasetHandler,
) {
  handlers.set(type, handler);
  const pending = pendingDatasets.get(type);
  if (!pending) return;
  hydrating = true;
  try {
    handler(pending.payload, pending);
  } finally {
    hydrating = false;
  }
}

export function hydrateUserDatasets(datasets: Partial<UserDatasets> | null) {
  if (!datasets) return;
  hydrating = true;
  try {
    for (const type of ["learning", "paper"] as const) {
      const dataset = datasets[type];
      if (!dataset) continue;
      revisions[type] = Number(dataset.revision) || 0;
      pendingDatasets.set(type, dataset);
      handlers.get(type)?.(dataset.payload, dataset);
    }
  } finally {
    hydrating = false;
  }
}

export async function pushUserDataset(
  type: UserDatasetType,
  payload: unknown,
) {
  if (hydrating) return null;
  const token = currentSessionToken();
  if (!token) return null;
  const result = await userDataApi.push(token, type, payload, revisions[type]);
  if (result.conflict && result.current) {
    revisions[type] = result.current.revision;
    if (result.current.payload !== null) {
      handlers.get(type)?.(result.current.payload, result.current);
    }
    return result.current;
  }
  if (result.dataset) revisions[type] = result.dataset.revision;
  return result.dataset ?? null;
}

export function resetDatasetRevisions() {
  revisions.learning = 0;
  revisions.paper = 0;
  pendingDatasets.clear();
}
