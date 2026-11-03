/** The election rules. Edit the wording here: it is shown on /rules and before a voter's first vote. */
export const RULES: string[] = [
  'Only state presidents and LGA presidents of DL4All Nigeria may vote. Each person votes once, in one national election, and every vote counts the same.',
  'Every part of the sign-up form must be filled in: your name, your state, your state code and your role. An LGA president must also give their local government area.',
  'If your state or LGA is missing, wrong or cannot be confirmed, your vote will be nullified.',
  'An admin must approve your account before you can vote. Do not share the link or your login with anyone. Voting for another person is not allowed.',
  'You choose one candidate for each position, then confirm. A vote cannot be changed after it is cast.',
  'Your choices are secret. They are not shown to other voters or listed in the admin screens. Admins can nullify a vote only when these rules were broken.',
  'A nullified vote is taken out of the results and that person cannot vote again.',
  'The admins can open and close voting. Votes cast while voting is closed are not accepted.',
];

export function RulesText() {
  return (
    <ol style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 16 }}>
      {RULES.map((r) => <li key={r}>{r}</li>)}
    </ol>
  );
}
