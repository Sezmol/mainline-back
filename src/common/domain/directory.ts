export const SPECIALITIES = [
  'frontend',
  'backend',
  'qa',
  'design',
  'manager',
  'hr',
] as const;

export type Speciality = (typeof SPECIALITIES)[number];

export const ROLES = ['member', 'hr', 'manager'] as const;

export type Role = (typeof ROLES)[number];

export const roleForSpeciality = (speciality: Speciality): Role => {
  switch (speciality) {
    case 'hr':
      return 'hr';
    case 'manager':
      return 'manager';
    default:
      return 'member';
  }
};

export const POST_TYPES = ['content', 'vacancy', 'event'] as const;

export type PostType = (typeof POST_TYPES)[number];
