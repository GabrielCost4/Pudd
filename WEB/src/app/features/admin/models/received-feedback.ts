export interface ReceivedFeedback {
  id: string;
  authorName: string;
  kind: 'Suggestion' | 'Bug';
  description: string;
  createdAt: string;
}
