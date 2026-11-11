import { FREEBUFF_GLM_V52_MODEL_ID } from '@methatech/common/constants/freebuff-models'

import { createBase2 } from './base2'

const definition = {
  ...createBase2('free', {
    model: FREEBUFF_GLM_V52_MODEL_ID,
  }),
  id: 'base2-free-glm',
  displayName: 'MethaTech GLM 5.2 Free Orchestrator',
}

export default definition
