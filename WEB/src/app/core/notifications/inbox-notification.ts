export interface InboxNotification {
  id: string;
  actorID: string;
  actorName: string;
  postID: string;
  kind: 'like' | 'comment';
  createdAt: string;
}
