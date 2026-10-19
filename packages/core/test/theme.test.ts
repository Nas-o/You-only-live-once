import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CUSTOM_THEME,
  createInitialData,
  createSampleData,
  migrateData,
  type CustomTheme,
} from '../src';

const NOW = new Date('2026-10-20T09:00:00+08:00');

describe('自编辑主题', () => {
  it('新数据没有自定义主题', () => {
    const data = createInitialData(NOW);
    expect(data.settings.theme).toBe('paper');
    expect(data.settings.customTheme).toBeNull();
  });

  it('肤色明暗随数据迁移', () => {
    const data = createSampleData('行者', NOW);
    data.settings.skinTone = 'dark';
    const migrated = migrateData(JSON.parse(JSON.stringify(data)));
    expect(migrated?.settings.skinTone).toBe('dark');
  });

  it('保存与迁移自定义主题', () => {
    const custom: CustomTheme = {
      name: '噜噜',
      base: 'paper',
      colors: {
        ...DEFAULT_CUSTOM_THEME.colors,
        paper: '#f6efe4',
        seal: '#c25b48',
      },
    };
    const data = createSampleData('行者', NOW);
    data.settings.theme = 'custom';
    data.settings.customTheme = custom;

    const migrated = migrateData(JSON.parse(JSON.stringify(data)));
    expect(migrated?.settings.theme).toBe('custom');
    expect(migrated?.settings.customTheme?.name).toBe('噜噜');
    expect(migrated?.settings.customTheme?.colors.seal).toBe('#c25b48');
  });

  it('无有效自定义主题时回到纸上时间', () => {
    const data = createSampleData('行者', NOW);
    data.settings.theme = 'custom';
    data.settings.customTheme = null;

    const migrated = migrateData(JSON.parse(JSON.stringify(data)));
    expect(migrated?.settings.theme).toBe('paper');
    expect(migrated?.settings.customTheme).toBeNull();
  });

  it('非法颜色回退到默认值', () => {
    const data = createSampleData('行者', NOW);
    data.settings.theme = 'custom';
    data.settings.customTheme = {
      name: 'bad',
      base: 'paper',
      colors: { ...DEFAULT_CUSTOM_THEME.colors, seal: 'red' } as CustomTheme['colors'],
    };

    const migrated = migrateData(JSON.parse(JSON.stringify(data)));
    expect(migrated?.settings.customTheme?.colors.seal).toBe(DEFAULT_CUSTOM_THEME.colors.seal);
  });
});
