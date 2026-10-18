// Interests a member can show on their profile (up to 8). Stored in profiles.interests as these
// codes, never free text, so they can be matched or filtered later.
export const MAX_INTERESTS = 8; // mirrors the profiles.interests check constraint

export const INTERESTS: { value: string; label: string }[] = [
  { value: 'coffee_ceremony', label: 'Coffee ceremony' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'food', label: 'Trying new food' },
  { value: 'family_time', label: 'Family time' },
  { value: 'faith_community', label: 'Church or mosque community' },
  { value: 'volunteering', label: 'Volunteering' },
  { value: 'music', label: 'Music' },
  { value: 'dancing', label: 'Dancing (eskista)' },
  { value: 'singing', label: 'Singing' },
  { value: 'movies', label: 'Movies and series' },
  { value: 'reading', label: 'Reading' },
  { value: 'poetry', label: 'Poetry' },
  { value: 'history', label: 'History and culture' },
  { value: 'art', label: 'Art' },
  { value: 'photography', label: 'Photography' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'travel', label: 'Travel' },
  { value: 'hiking', label: 'Hiking and nature' },
  { value: 'football', label: 'Football' },
  { value: 'running', label: 'Running' },
  { value: 'fitness', label: 'Gym and fitness' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'entrepreneurship', label: 'Business and entrepreneurship' },
  { value: 'technology', label: 'Technology' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'board_games', label: 'Board games' },
  { value: 'podcasts', label: 'Podcasts' },
  { value: 'gardening', label: 'Gardening' },
  { value: 'pets', label: 'Pets' },
  { value: 'languages', label: 'Learning languages' },
];

const BY_CODE = new Map(INTERESTS.map((i) => [i.value, i.label]));
export const interestLabel = (code: string) => BY_CODE.get(code) ?? code;
export const isKnownInterest = (code: string) => BY_CODE.has(code);
