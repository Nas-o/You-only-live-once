/**
 * 筹码牌桌：把每次专注变成一张牌。
 * 5 张牌摊牌，牌型决定底池的倍率。
 */
import type {
  CardSuit,
  PlayingCard,
  PokerHandName,
  PokerHandResult,
  PokerState,
} from './types';

export const SUITS: CardSuit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
export const SUIT_LABEL: Record<CardSuit, string> = {
  spades: '黑桃',
  hearts: '红桃',
  clubs: '梅花',
  diamonds: '方块',
};
export const SUIT_SYMBOL: Record<CardSuit, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦',
};
export const RANK_LABEL: Record<number, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

export const HAND_LADDER: { name: PokerHandName; multiplier: number; rank: number }[] = [
  { name: '皇家同花顺', multiplier: 50, rank: 10 },
  { name: '同花顺', multiplier: 25, rank: 9 },
  { name: '四条', multiplier: 12, rank: 8 },
  { name: '葫芦', multiplier: 8, rank: 7 },
  { name: '同花', multiplier: 5, rank: 6 },
  { name: '顺子', multiplier: 4, rank: 5 },
  { name: '三条', multiplier: 3, rank: 4 },
  { name: '两对', multiplier: 2, rank: 3 },
  { name: '一对', multiplier: 1.5, rank: 2 },
  { name: '高牌', multiplier: 1, rank: 1 },
];

export function cardKey(card: PlayingCard): string {
  return `${card.suit}-${card.rank}`;
}

export function cardLabel(card: PlayingCard): string {
  return `${SUIT_LABEL[card.suit]} ${RANK_LABEL[card.rank]}`;
}

export function createDeck(): PlayingCard[] {
  const deck: PlayingCard[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank += 1) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function shuffleCards(cards: PlayingCard[], random: () => number = Math.random): PlayingCard[] {
  const next = [...cards];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

export function createPokerState(random: () => number = Math.random): PokerState {
  return {
    deck: shuffleCards(createDeck(), random),
    hand: [],
    pot: 0,
    seen: [],
    history: [],
  };
}

/** 从牌靴抽一张牌；牌靴空了会自动洗牌。 */
export function drawCard(poker: PokerState, random: () => number = Math.random): PlayingCard {
  if (poker.deck.length === 0) poker.deck = shuffleCards(createDeck(), random);
  const card = poker.deck.pop()!;
  poker.hand.push(card);
  const key = cardKey(card);
  if (!poker.seen.includes(key)) poker.seen.push(key);
  return card;
}

/** 一次专注抽牌数量：越深的专注，一次摸更多牌。 */
export function cardsForSession(seconds: number): number {
  if (seconds >= 90 * 60) return 3;
  if (seconds >= 50 * 60) return 2;
  return 1;
}

/** 每次专注注入底池的基础筹码。 */
export function potForSession(seconds: number): number {
  return Math.max(5, Math.min(40, 5 + Math.round(Math.max(0, seconds) / 300)));
}

/** 5 张牌的牌型判断。 */
export function evaluateHand(cards: PlayingCard[]): PokerHandResult {
  if (cards.length !== 5) {
    return { name: '高牌', multiplier: 1, rank: 1, high: 0 };
  }
  const ranks = cards.map((card) => card.rank).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  for (const rank of ranks) counts.set(rank, (counts.get(rank) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = cards.every((card) => card.suit === cards[0]!.suit);
  const unique = [...new Set(ranks)];
  const wheel = unique.length === 5 && unique[0] === 14 && unique[1] === 5 && unique[2] === 4 && unique[3] === 3 && unique[4] === 2;
  const straight = unique.length === 5 && (unique[0]! - unique[4]! === 4 || wheel);
  const high = wheel ? 5 : unique[0]!;

  const result = (name: PokerHandName): PokerHandResult => {
    const meta = HAND_LADDER.find((item) => item.name === name) ?? HAND_LADDER[9]!;
    return { ...meta, high };
  };

  if (flush && straight) return result(high === 14 ? '皇家同花顺' : '同花顺');
  if (groups[0]![1] === 4) return result('四条');
  if (groups[0]![1] === 3 && groups[1]![1] === 2) return result('葫芦');
  if (flush) return result('同花');
  if (straight) return result('顺子');
  if (groups[0]![1] === 3) return result('三条');
  if (groups[0]![1] === 2 && groups[1]![1] === 2) return result('两对');
  if (groups[0]![1] === 2) return result('一对');
  return result('高牌');
}

export function handPayout(pot: number, result: PokerHandResult): number {
  return Math.max(0, Math.round(pot * result.multiplier));
}

export function isRoyalFlush(cards: PlayingCard[], result: PokerHandResult): boolean {
  return result.name === '皇家同花顺' && cards.length === 5;
}
