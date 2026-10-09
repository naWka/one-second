import type { Beat } from './types';
import { cover } from './s0-cover';
import { tap } from './s1-tap';
import { chip } from './s2-chip';
import { acquirer } from './s3-acquirer';
import { network } from './s4-network';
import { bank } from './s5-bank';
import { returnTrip } from './s6-return';
import { settle } from './s7-settle';
import { fees } from './s8-fees';

export const beats: Beat[] = [
  cover,
  tap,
  chip,
  acquirer,
  network,
  bank,
  returnTrip,
  settle,
  fees,
];
