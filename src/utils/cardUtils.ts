import { Card } from "../types";

export const createDeck = (): Card[] => {
  const suits: Card["suit"][] = ["hearts", "diamonds", "clubs", "spades"];
  const ranks = [
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
    "A",
  ];
  const deck: Card[] = [];

  suits.forEach((suit) => {
    ranks.forEach((rank, index) => {
      deck.push({
        suit,
        rank,
        value: rank === "A" ? 14 : index >= 9 ? 10 + (index - 8) : index + 2,
        id: `${suit}-${rank}`,
      });
    });
  });

  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const dealCards = (
  deck: Card[],
  count: number,
): { cards: Card[]; remaining: Card[] } => {
  const cards = deck.slice(0, count);
  const remaining = deck.slice(count);
  return { cards, remaining };
};

export const calculatePokerHandRank = (
  cards: Card[],
): { rank: number; description: string } => {
  if (cards.length < 5) {
    return { rank: 0, description: "High Card" };
  }

  // If we have more than 5 cards, evaluate all 5-card combinations and return the best
  if (cards.length > 5) {
    let bestHand = { rank: 0, description: "High Card" };
    const combos = getCombinations(cards, 5);
    for (const combo of combos) {
      const hand = evaluateFiveCards(combo);
      if (
        hand.rank > bestHand.rank ||
        (hand.rank === bestHand.rank &&
          hand.tiebreaker > (bestHand as any).tiebreaker)
      ) {
        bestHand = hand;
      }
    }
    return { rank: bestHand.rank, description: bestHand.description };
  }

  return evaluateFiveCards(cards);
};

// Get all combinations of size k from array
const getCombinations = (arr: Card[], k: number): Card[][] => {
  const results: Card[][] = [];
  const combine = (start: number, combo: Card[]) => {
    if (combo.length === k) {
      results.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  };
  combine(0, []);
  return results;
};

// Evaluate exactly 5 cards
const evaluateFiveCards = (
  cards: Card[],
): { rank: number; description: string; tiebreaker: number } => {
  const suits = cards.map((c) => c.suit);
  const values = cards.map((c) => c.value).sort((a, b) => b - a);

  const valueCounts = values.reduce(
    (acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );

  const counts = Object.values(valueCounts).sort((a, b) => b - a);
  const isFlush = new Set(suits).size === 1;
  const isStraight = checkStraight(values);
  const highCard = Math.max(...values);
  const tiebreaker =
    values[0] * 10000 +
    values[1] * 1000 +
    values[2] * 100 +
    values[3] * 10 +
    values[4];

  // Royal Flush
  if (isFlush && isStraight && Math.min(...values) === 10) {
    return { rank: 10, description: "Royal Flush", tiebreaker };
  }

  // Straight Flush
  if (isFlush && isStraight) {
    return { rank: 9, description: "Straight Flush", tiebreaker };
  }

  // Four of a Kind
  if (counts[0] === 4) {
    return { rank: 8, description: "Four of a Kind", tiebreaker };
  }

  // Full House
  if (counts[0] === 3 && counts[1] === 2) {
    return { rank: 7, description: "Full House", tiebreaker };
  }

  // Flush
  if (isFlush) {
    return { rank: 6, description: "Flush", tiebreaker };
  }

  // Straight
  if (isStraight) {
    return { rank: 5, description: "Straight", tiebreaker };
  }

  // Three of a Kind
  if (counts[0] === 3) {
    return { rank: 4, description: "Three of a Kind", tiebreaker };
  }

  // Two Pair
  if (counts[0] === 2 && counts[1] === 2) {
    return { rank: 3, description: "Two Pair", tiebreaker };
  }

  // One Pair
  if (counts[0] === 2) {
    return { rank: 2, description: "One Pair", tiebreaker };
  }

  return { rank: 1, description: "High Card", tiebreaker };
};

const checkStraight = (values: number[]): boolean => {
  const unique = [...new Set(values)].sort((a, b) => a - b);
  if (unique.length < 5) return false;

  // Check for regular straight
  for (let i = 0; i <= unique.length - 5; i++) {
    let consecutive = true;
    for (let j = 1; j < 5; j++) {
      if (unique[i + j] !== unique[i] + j) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) return true;
  }

  // Check for A-2-3-4-5 straight
  if (
    unique.includes(14) &&
    unique.includes(2) &&
    unique.includes(3) &&
    unique.includes(4) &&
    unique.includes(5)
  ) {
    return true;
  }

  return false;
};

export const calculateBlackjackValue = (
  cards: Card[],
): { value: number; soft: boolean } => {
  let value = 0;
  let aces = 0;

  cards.forEach((card) => {
    if (card.rank === "A") {
      aces++;
      value += 11;
    } else if (["K", "Q", "J"].includes(card.rank)) {
      value += 10;
    } else {
      value += parseInt(card.rank);
    }
  });

  // Adjust for aces
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return {
    value,
    soft: aces > 0 && value + 10 <= 21,
  };
};

export const formatCardForDisplay = (card: Card): string => {
  const suitSymbols = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
  };

  return `${card.rank}${suitSymbols[card.suit]}`;
};
