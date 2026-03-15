// ─────────────────────────────────────────────────────────────
// test-messages.js — 15+ test messages with expected intents
// ─────────────────────────────────────────────────────────────

export const TEST_MESSAGES = [
  // ── Clear intent messages ─────────────────────────────
  { message: 'how do i sort a list of objects in python?', expected: 'code' },
  { message: 'explain this sql query for me', expected: 'code' },
  { message: "This paragraph sounds awkward, can you help me fix it?", expected: 'writing' },
  { message: "I'm preparing for a job interview, any tips?", expected: 'career' },
  { message: "what's the average of these numbers: 12, 45, 23, 67, 34", expected: 'data' },

  // ── Ambiguous / unclear messages ──────────────────────
  { message: 'Help me make this better.', expected: 'unclear' },
  { message: "I need to write a function that takes a user id and returns their profile, but also i need help with my resume.", expected: 'unclear' },
  { message: 'hey', expected: 'unclear' },
  { message: 'Can you write me a poem about clouds?', expected: 'unclear' },

  // ── Writing intent ────────────────────────────────────
  { message: 'Rewrite this sentence to be more professional.', expected: 'writing' },
  { message: 'My boss says my writing is too verbose.', expected: 'writing' },

  // ── Career intent ─────────────────────────────────────
  { message: "I'm not sure what to do with my career.", expected: 'career' },
  { message: 'How do I structure a cover letter?', expected: 'career' },

  // ── Data intent ───────────────────────────────────────
  { message: 'what is a pivot table', expected: 'data' },

  // ── Code intent with typos ────────────────────────────
  { message: 'fxi thsi bug pls: for i in range(10) print(i)', expected: 'code' },

  // ── Additional edge cases ─────────────────────────────
  { message: '', expected: 'unclear' },
  { message: '???', expected: 'unclear' },
  { message: 'Calculate the standard deviation of [10, 20, 30, 40, 50] and plot a histogram', expected: 'data' },
  { message: 'Write me a recursive fibonacci function in Rust with memoization', expected: 'code' },
  { message: 'Should I switch from backend to frontend development?', expected: 'career' },
];
