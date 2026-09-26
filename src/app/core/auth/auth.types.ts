export type PasswordSlot = 'open' | 'sealed';

export type MemberRole = 'owner' | 'admin' | 'member';

export type AdmissionUser = {
  id: string;
  name: string;
  email: string;
};

export type WorkspaceView = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  logoUrl: string | null;
  role: MemberRole;
};

export type Admission =
  | { phase: 'signed-out' }
  | {
      phase: 'onboarding';
      user: AdmissionUser;
      password: PasswordSlot;
      workspaceUrlPrefix: string;
    }
  | {
      phase: 'admitted';
      user: AdmissionUser;
      password: PasswordSlot;
      workspaceUrlPrefix: string;
      workspace: WorkspaceView;
    };

export function editorRole(role: MemberRole): 'owner' | 'admin' | null {
  return role === 'owner' || role === 'admin' ? role : null;
}
