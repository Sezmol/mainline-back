export const dedupeKey = {
  favorites: (userId: string) => `favorites:${userId}`,
  private: (a: string, b: string) => `private:${[a, b].sort().join(':')}`,
  vacancy: (postId: string, responderId: string) =>
    `vacancy:${postId}:${responderId}`,
  task: (postId: string, responderId: string) =>
    `task:${postId}:${responderId}`,
  event: (postId: string) => `event:${postId}`,
  content: (postId: string) => `content:${postId}`,
  company: (companyId: string) => `company:${companyId}`,
  department: (departmentId: string) => `department:${departmentId}`,
  team: (teamId: string) => `team:${teamId}`,
  project: (projectId: string) => `project:${projectId}`,
};
