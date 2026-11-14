/**
 * The letter as it ships. Anything saved through /letter overrides it.
 * `*text*` inside the body renders as the rose italic accent.
 */
export const DEFAULT_LETTER = {
  salutation: 'My dearest,',
  body: [
    'I know these days have been heavy. You carry so much quietly — you make it look easy, and I wish you didn’t have to. I see it. The tired you hide behind *“niko sawa.”* The smile that now arrives a second later than it used to. I see all of it, and I’m not going anywhere.',
    'So before anything else, hear this: *you are not alone in this.* Not today. Not on the heavy days. Not ever. You don’t have to be strong with me — you can put it down here.',
    'I made you this because there aren’t enough hours in our days right now, and I wanted to leave you something that waits patiently at any hour. Something that says, every time you open it: *I was thinking about you.* I am always thinking about you.',
    'Yesterday you told me you felt bad, and I didn’t know what to do with my hands. I don’t know exactly what it is, and you don’t have to explain it perfectly. I just want to be there. To hold you. To sit with you in the quiet until the noise passes.',
    'And if I’ve been clumsy with your heart lately — *I’m sorry.* Not the kind of sorry that wants something back. Just sorry that you had to carry it alone, and grateful that you still let me stay.',
    'All I could ever ask for is to see a smile on your face. Nothing more, nothing less.',
    'So breathe. You’re doing better than you think you are. And you are *so deeply loved* — today, and on every heavy day after this one.',
  ].join('\n\n'),
  signature: 'always yours, Newton',
  ps: 'P.S. — I love you more than any of these words can hold. Have a beautiful day, my love.',
};

export function normalizeLetter(row) {
  if (!row) return DEFAULT_LETTER;
  return {
    salutation: row.salutation || DEFAULT_LETTER.salutation,
    body: row.body || DEFAULT_LETTER.body,
    signature: row.signature || DEFAULT_LETTER.signature,
    ps: row.ps || '',
  };
}
