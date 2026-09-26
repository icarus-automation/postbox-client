import { Routes, type CanDeactivateFn } from '@angular/router';
import type { PostEditor } from './post-editor/post-editor';

/** Leaving the editor with unsaved changes asks first. */
const leavePostEditor: CanDeactivateFn<PostEditor> = (editor) => editor.canLeave();

export const routes: Routes = [
  {
    path: '',
    title: 'Blog | Lead Inbox',
    loadComponent: () => import('./post-list/post-list').then((m) => m.PostList),
  },
  {
    // `new` opens an empty post. Its first save moves it to its own id on this same route.
    path: ':id',
    title: 'Post | Lead Inbox',
    canDeactivate: [leavePostEditor],
    loadComponent: () => import('./post-editor/post-editor').then((m) => m.PostEditor),
  },
];
