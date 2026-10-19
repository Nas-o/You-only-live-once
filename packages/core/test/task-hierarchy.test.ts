import { describe, expect, it } from 'vitest';
import {
  canAssignTaskParent,
  createTask,
  taskAncestors,
  taskDescendantIds,
} from '../src';
import type { Task } from '../src';

const make = (title: string, level: 1 | 2 | 3, parentId?: string): Task => {
  const task = createTask({ title, level, parentId });
  return task;
};

describe('任务链', () => {
  it('能回溯根任务到当前任务的链路', () => {
    const root = make('根任务', 1);
    const child = make('二级任务', 2, root.id);
    const grandchild = make('三级任务', 3, child.id);
    const tasks = [root, child, grandchild];
    expect(taskAncestors(tasks, grandchild.id).map((task) => task.title)).toEqual([
      '根任务',
      '二级任务',
      '三级任务',
    ]);
    expect(taskDescendantIds(tasks, root.id)).toEqual([child.id, grandchild.id]);
  });

  it('上级必须正好高一级，且不能形成循环', () => {
    const root = make('根任务', 1);
    const child = make('二级任务', 2, root.id);
    const grandchild = make('三级任务', 3, child.id);
    const tasks = [root, child, grandchild];
    expect(canAssignTaskParent(tasks, child.id, root.id, 2)).toBe(true);
    expect(canAssignTaskParent(tasks, child.id, grandchild.id, 2)).toBe(false);
    expect(canAssignTaskParent(tasks, child.id, undefined, 2)).toBe(false);
    expect(canAssignTaskParent(tasks, root.id, child.id, 1)).toBe(false);
  });

  it('新建任务默认为一级根任务', () => {
    const task = createTask({ title: '默认任务' });
    expect(task.level).toBe(1);
    expect(task.parentId).toBeUndefined();
  });
});
