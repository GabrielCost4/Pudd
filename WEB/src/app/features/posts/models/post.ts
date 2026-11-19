export interface Post {
  id: string;
  userID: string;
  authorName: string;
  authorHasAvatar: boolean;
  hasAvatar?: boolean;
  likeCount?: number;
  isLikedByCurrentUser?: boolean;
  content: string;
  hasImage: boolean;
  createdAt: string;
  updatedAt: string | null;
}
