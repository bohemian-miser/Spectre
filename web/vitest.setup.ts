import { afterEach } from 'vitest';

// Tests in one file run back to back as one chain of promises, so the event
// loop never turns between them. The worker's progress reports to vitest wait
// for a reply that is only read when it does, and give up after 60 s: a file
// whose tests together run longer than that (the walker search, the harmonics
// engine) fails the run though every test passed. A timer then an immediate
// after each test takes the loop once round, through the phase that reads the
// reply; only a single test longer than 60 s can still trip it. The timers are
// taken now so a test that fakes them cannot stall the hook.
const { setTimeout, setImmediate } = globalThis;

afterEach(async () => {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await new Promise<void>((resolve) => setImmediate(resolve));
});
