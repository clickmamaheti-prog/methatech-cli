import { moonshotModels } from '@methatech/common/constants/model-config'

import { createBase2 } from './base2'

const definition = {
  ...createBase2('free', {
    model: moonshotModels.kimiK27Code,
  }),
  id: 'base2-kimi-2-7-code',
  displayName: 'MethaTech Kimi K2.7 Code Orchestrator',
}

export default definition
