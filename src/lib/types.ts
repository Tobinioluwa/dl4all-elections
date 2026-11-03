export type Role = 'state_president' | 'lga_president';
export type Status = 'pending' | 'approved' | 'rejected';

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  state: string | null;
  state_code: string | null;
  role: Role | null;
  lga: string | null;
  status: Status;
  is_admin: boolean;
  rules_accepted_at: string | null;
};

export type Settings = {
  title: string;
  voting_open: boolean;
  auto_approve: boolean;
};

export type Position = { id: string; name: string; sort: number };

export type Candidate = {
  id: string;
  position_id: string;
  name: string;
  tagline: string;
  photo_url: string | null;
  sort: number;
};

export const roleLabel = (r: Role | null, isAdmin = false): string =>
  isAdmin ? 'Admin' : r === 'state_president' ? 'State president' : r === 'lga_president' ? 'LGA president' : 'Member';

export const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};
