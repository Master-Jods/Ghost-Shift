import type { State } from "../../src/engine.js";
import type { ActorRole, Proposal } from "../../src/protocol.js";
import type { PlayerProfile } from "../../src/playerProfile.js";
export type Identity = {
  id: string;
  role: ActorRole;
  sessionId: string;
  profile?: PlayerProfile;
  username?: string;
  connectionId?: string;
};
export type Room = {
  id: string;
  code: string;
  owner: string | null;
  state: State;
  version: number;
  closed: boolean;
  expires_at: number;
  created_at: number;
  updated_at: number;
  last_tick: number;
  pause_reason: string | null;
  proposal: Proposal | null;
  rematch_code: string | null;
  parent_id: string | null;
  override_disconnect: boolean;
  pendingPlayer?: {
    id: string;
    lastSeq: number;
    leaseUntil: number;
    lastSeen: number;
  };
};
export type Player = {
  id: string;
  session_id: string;
  role: "A" | "B";
  token_hash: string;
  profile: PlayerProfile;
  last_seq: number;
  joined_at: number;
  released: boolean;
  connection_id: string | null;
  lease_until: number;
  last_seen: number;
};
export class CloudError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function check(
  value: unknown,
  status: number,
  message: string,
): asserts value {
  if (!value) throw new CloudError(status, message);
}
