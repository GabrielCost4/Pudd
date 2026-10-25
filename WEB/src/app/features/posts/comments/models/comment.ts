export interface PostComment {
  id: string;
  postID: string;
  userID: string;
  authorName: string;
  authorHasAvatar: boolean;
  content: string;
  createdAt: string;
}
