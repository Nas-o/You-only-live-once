import { describe, expect, it } from 'vitest';
import {
  cardsForSession,
  createDeck,
  createInitialData,
  createPokerState,
  drawCard,
  evaluateHand,
  handPayout,
  migrateData,
  potForSession,
  type PlayingCard,
} from '../src';

const card = (suit: PlayingCard['suit'], rank: number): PlayingCard => ({ suit, rank });

describe('筹码牌桌', () => {
  it('生成 52 张不重复的牌', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((item) => `${item.suit}-${item.rank}`)).size).toBe(52);
  });

  it('识别牌型与倍率', () => {
    expect(
      evaluateHand([
        card('spades', 10),
        card('spades', 11),
        card('spades', 12),
        card('spades', 13),
        card('spades', 14),
      ]).name,
    ).toBe('皇家同花顺');

    expect(
      evaluateHand([
        card('hearts', 5),
        card('hearts', 6),
        card('hearts', 7),
        card('hearts', 8),
        card('hearts', 9),
      ]).name,
    ).toBe('同花顺');

    expect(
      evaluateHand([
        card('spades', 7),
        card('hearts', 7),
        card('clubs', 7),
        card('diamonds', 7),
        card('spades', 14),
      ]).name,
    ).toBe('四条');

    expect(
      evaluateHand([
        card('spades', 8),
        card('hearts', 8),
        card('clubs', 8),
        card('diamonds', 2),
        card('spades', 2),
      ]).name,
    ).toBe('葫芦');

    expect(
      evaluateHand([
        card('spades', 2),
        card('spades', 5),
        card('spades', 8),
        card('spades', 11),
        card('spades', 13),
      ]).name,
    ).toBe('同花');

    expect(
      evaluateHand([
        card('spades', 14),
        card('hearts', 2),
        card('clubs', 3),
        card('diamonds', 4),
        card('spades', 5),
      ]).name,
    ).toBe('顺子');

    expect(
      evaluateHand([
        card('spades', 4),
        card('hearts', 4),
        card('clubs', 4),
        card('diamonds', 9),
        card('spades', 13),
      ]).name,
    ).toBe('三条');

    expect(
      evaluateHand([
        card('spades', 4),
        card('hearts', 4),
        card('clubs', 9),
        card('diamonds', 9),
        card('spades', 13),
      ]).name,
    ).toBe('两对');

    expect(
      evaluateHand([
        card('spades', 4),
        card('hearts', 4),
        card('clubs', 9),
        card('diamonds', 11),
        card('spades', 13),
      ]).name,
    ).toBe('一对');

    expect(
      evaluateHand([
        card('spades', 2),
        card('hearts', 5),
        card('clubs', 9),
        card('diamonds', 11),
        card('spades', 13),
      ]).name,
    ).toBe('高牌');
  });

  it('底池按牌型倍率结算', () => {
    const result = evaluateHand([
      card('spades', 8),
      card('hearts', 8),
      card('clubs', 8),
      card('diamonds', 2),
      card('spades', 2),
    ]);
    expect(handPayout(100, result)).toBe(800);
  });

  it('抽牌推进手牌并记录牌册', () => {
    const poker = createPokerState(() => 0.5);
    const first = drawCard(poker, () => 0.5);
    expect(poker.hand).toHaveLength(1);
    expect(poker.seen).toContain(`${first.suit}-${first.rank}`);
    while (poker.deck.length > 0) drawCard(poker, () => 0.5);
    expect(poker.deck).toHaveLength(0);
    drawCard(poker, () => 0.5);
    expect(poker.deck).toHaveLength(51);
  });

  it('深度专注抽更多牌、注入更多底池', () => {
    expect(cardsForSession(10 * 60)).toBe(1);
    expect(cardsForSession(50 * 60)).toBe(2);
    expect(cardsForSession(90 * 60)).toBe(3);
    expect(potForSession(25 * 60)).toBeGreaterThan(potForSession(5));
    expect(potForSession(300 * 60)).toBe(40);
  });

  it('初始数据带空牌桌与空写作记录', () => {
    const data = createInitialData(new Date('2026-10-19T09:00:00+08:00'));
    expect(data.writingLogs).toEqual([]);
    expect(data.rewards.poker.deck).toHaveLength(52);
    expect(data.rewards.poker.hand).toEqual([]);
    expect(data.rewards.poker.pot).toBe(0);
  });

  it('旧数据迁移补齐牌桌和写作字段', () => {
    const migrated = migrateData({
      meta: { createdAt: '2026-01-01T00:00:00.000Z', lastSavedAt: '2026-01-01T00:00:00.000Z', onboarded: true, installId: 'inst_x' },
      profile: { name: '测试', motto: '', joinedAt: '2026-01-01T00:00:00.000Z' },
      settings: {},
      tasks: [],
      goals: [],
      sessions: [],
      activeTimers: [],
      rewards: { xp: 10, events: [], unlocked: {}, dailyGoalAwards: [] },
    });
    expect(migrated).not.toBeNull();
    expect(migrated!.writingLogs).toEqual([]);
    expect(migrated!.rewards.poker.deck).toHaveLength(52);
  });
});
