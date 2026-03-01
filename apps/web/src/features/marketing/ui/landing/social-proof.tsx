'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@ws/ui/components/ui/avatar';
import {
  AvatarGroup,
  AvatarGroupTooltip,
} from '@ws/ui/components/animate-ui/components/animate/avatar-group';

const AVATARS = [
  {
    src: 'https://github.com/mewisme.png',
    fallback: 'Mew',
    tooltip: 'Mewisme',
  },
  {
    src: 'https://github.com/Ninhowi.png',
    fallback: 'NL',
    tooltip: 'Ninhowi',
  },
  {
    src: 'https://pbs.twimg.com/profile_images/1593304942210478080/TUYae5z7_400x400.jpg',
    fallback: 'CN',
    tooltip: 'Shadcn',
  },
  {
    src: 'https://pbs.twimg.com/profile_images/1677042510839857154/Kq4tpySA_400x400.jpg',
    fallback: 'AW',
    tooltip: 'Adam Wathan',
  },
  {
    src: 'https://pbs.twimg.com/profile_images/1783856060249595904/8TfcCN0r_400x400.jpg',
    fallback: 'GR',
    tooltip: 'Guillermo Rauch',
  },
  {
    src: 'https://pbs.twimg.com/profile_images/1534700564810018816/anAuSfkp_400x400.jpg',
    fallback: 'JH',
    tooltip: 'Jhey',
  },
  {
    src: 'https://pbs.twimg.com/profile_images/1927474594102784000/Al0g-I6o_400x400.jpg',
    fallback: 'DH',
    tooltip: 'David Haz',
  },
  {
    fallback: '+99',
    tooltip: '99+',
  }
];

export const SocialProof = () => {
  return (
    <AvatarGroup>
      {AVATARS.map((avatar, index) => (
        <Avatar key={index} className="size-12 border-3 border-background">
          <AvatarImage src={avatar.src} alt={avatar.tooltip} />
          <AvatarFallback>{avatar.fallback}</AvatarFallback>
          <AvatarGroupTooltip>{avatar.tooltip}</AvatarGroupTooltip>
        </Avatar>
      ))}
    </AvatarGroup>
  );
};