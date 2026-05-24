export const HAIKUS = [
  {
    original: "古池や蛙飛こむ水のおと",
    romaji: "furu ike ya / kawazu tobikomu / mizu no oto",
    translation: "The old pond!\nA frog leapt into—\nList, the water sound!",
    source: "Translated by Yone Noguchi, The Spirit of Japanese Poetry (1914)"
  },
  {
    original: "古池や蛙飛こむ水のおと",
    romaji: "furu ike ya / kawazu tobikomu / mizu no oto",
    translation: "The old pond, aye!\nAnd the sound of a frog\nleaping into the water.",
    source: "Translated by Basil Hall Chamberlain, Basho and the Japanese Poetical Epigram (1902)"
  },
  {
    original: "古池や蛙飛こむ水のおと",
    romaji: "furu ike ya / kawazu tobikomu / mizu no oto",
    translation: "An ancient pond!\nWith a sound from the water\nOf the frog as it plunges in.",
    source: "Translated by W. G. Aston, A History of Japanese Literature (1899)"
  },
  {
    original: "夏草や兵どもが夢の跡",
    romaji: "natsukusa ya / tsuwamonodomo ga / yume no ato",
    translation: "A mound of summer grass:\nAre warriors' heroic deeds\nOnly dreams that pass?",
    source: "Translated by Basil Hall Chamberlain, Basho and the Japanese Poetical Epigram (1902)"
  },
  {
    original: "焼にけりされど花は散りつつ",
    romaji: "yakeni keri / saredo hana wa / chiritsutsu",
    translation: "It has burned down:\nHow serene the flowers in their falling!",
    source: "Hokushi, praised by Basho (Translated by Yone Noguchi, The Spirit of Japanese Poetry, 1914)"
  }
];

export function getRandomHaiku() {
  const index = Math.floor(Math.random() * HAIKUS.length);
  return HAIKUS[index];
}
