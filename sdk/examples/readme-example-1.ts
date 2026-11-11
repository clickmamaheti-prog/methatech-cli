import { MethaTechClient } from '@methatech/sdk'

async function main() {
  const client = new MethaTechClient({
    // You need to pass in your own API key here.
    // Get one here: https://console.methatech.eu.org/api-keys
    apiKey: process.env.METHATECH_API_KEY,
    cwd: process.cwd(),
  })

  // First run
  const runState1 = await client.run({
    // The agent id. Any agent on the store (https://console.methatech.eu.org/store)
    agent: 'methatech/base@0.0.16',
    prompt: 'Create a simple calculator class',
    handleEvent: (event) => {
      // All events that happen during the run: agent start/finish, tool calls/results, text responses, errors.
      console.log('MethaTech Event', JSON.stringify(event))
    },
  })

  // Continue the same session with a follow-up
  const _runOrError2 = await client.run({
    agent: 'methatech/base@0.0.16',
    prompt: 'Add unit tests for the calculator',
    previousRun: runState1, // <-- this is where your next run differs from the previous run
    handleEvent: (event) => {
      console.log('MethaTech Event', JSON.stringify(event))
    },
  })
}

main()
