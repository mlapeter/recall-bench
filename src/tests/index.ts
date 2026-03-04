/**
 * All RECALL test cases
 */

export { retentionTests } from './retention.js';
export { encodingTests } from './encoding.js';
export { consolidationTests } from './consolidation.js';
export { adaptationTests } from './adaptation.js';
export { lossTests } from './loss.js';
export { learningTests } from './learning.js';

import { retentionTests } from './retention.js';
import { encodingTests } from './encoding.js';
import { consolidationTests } from './consolidation.js';
import { adaptationTests } from './adaptation.js';
import { lossTests } from './loss.js';
import { learningTests } from './learning.js';
import type { TestCase } from '../types/index.js';

/** All available test cases */
export const allTests: TestCase[] = [
  ...retentionTests,
  ...encodingTests,
  ...consolidationTests,
  ...adaptationTests,
  ...lossTests,
  ...learningTests,
];
