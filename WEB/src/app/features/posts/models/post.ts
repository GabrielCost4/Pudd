export interface Post {
  id: string;
  userID: string;
  authorName: string;
  content: string;
  hasImage: boolean;
  createdAt: string;
  updatedAt: string | null;
}
