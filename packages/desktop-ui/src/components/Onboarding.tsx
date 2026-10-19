import { useState } from 'react';
import { ArrowRight, Compass, Database, ShieldCheck, Sparkles, Sprout, Timer } from 'lucide-react';
import { useAppStore } from '../store/appStore';

const DAILY_OPTIONS = [30, 60, 90, 120, 180];

export function Onboarding() {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const [name, setName] = useState('');
  const [dailyGoal, setDailyGoal] = useState(90);

  return (
    <div className="onboarding">
      <div className="onboarding-bg" aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => (
          <span
            key={index}
            style={{
              left: `${(index * 37) % 100}%`,
              top: `${(index * 53) % 100}%`,
              animationDelay: `${index * 180}ms`,
            }}
          />
        ))}
      </div>

      <section className="onboarding-art">
        <div className="onboarding-brand">
          <div className="brand-seal">
            <Timer size={20} strokeWidth={1.6} />
          </div>
          <div data-i18n-skip>
            <strong>你只活一次</strong>
            <span>YOU ONLY LIVE ONCE</span>
          </div>
        </div>

        <div className="onboarding-manifesto">
          <div className="eyebrow">MEMENTO MORI</div>
          <h1>
            记住你终有一死——
            <br />
            然后，真正地活。
          </h1>
          <p>
            人生不能重来，时间也不会回头。
            <br />
            这个应用不替你管理时间，它只做一件事：
            <br />
            让你看清时间去了哪里。
          </p>
        </div>

        <ul className="onboarding-principles">
          <li>
            <span className="principle-icon">
              <Compass size={17} />
            </span>
            <div>
              <strong>先侦查，再启程</strong>
              <p>开始计时前，先写清楚学什么、怎么学、明确不学什么。</p>
            </div>
          </li>
          <li>
            <span className="principle-icon">
              <Timer size={17} />
            </span>
            <div>
              <strong>用计时兑现估计</strong>
              <p>每一次专注都留下记录，让「预计 vs 实际」越来越准。</p>
            </div>
          </li>
          <li>
            <span className="principle-icon">
              <Sparkles size={17} />
            </span>
            <div>
              <strong>把进步变成光</strong>
              <p>任务、阶段与知识点都会沉淀为证据，点亮属于你的技能树。</p>
            </div>
          </li>
        </ul>

        <div className="onboarding-art-foot">
          <span>LINUX X64 · v0.1</span>
          <span className="onboarding-shield">
            <ShieldCheck size={13} /> 本地优先
          </span>
        </div>
      </section>

      <section className="onboarding-panel">
        <div className="onboarding-panel-inner">
          <div className="eyebrow">第一步 · 立心</div>
          <h2>从今天开始，认真对待时间。</h2>
          <p className="onboarding-lede">花一分钟完成设置。之后你随时可以在设置里修改。</p>

          <label className="field">
            <span className="field-label">怎么称呼你</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="行者"
              maxLength={24}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  completeOnboarding({
                    name,
                    dailyGoalMinutes: dailyGoal,
                  });
                }
              }}
            />
          </label>

          <div className="field">
            <span className="field-label">
              每日专注目标 <em>{dailyGoal} 分钟</em>
            </span>
            <div className="option-chips">
              {DAILY_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className={dailyGoal === minutes ? 'is-active' : ''}
                  onClick={() => setDailyGoal(minutes)}
                >
                  {minutes < 60 ? `${minutes} 分` : `${minutes / 60} 小时`}
                </button>
              ))}
            </div>
            <span className="field-hint">先定一个能坚持的数字，而不是一个看起来很努力的数字。</span>
          </div>

          <button
            type="button"
            className="btn btn-primary onboarding-submit"
            onClick={() =>
              completeOnboarding({
                name,
                dailyGoalMinutes: dailyGoal,
              })
            }
          >
            <Sprout size={17} /> 开始成长 <ArrowRight size={16} />
          </button>

          <div className="onboarding-local">
            <Database size={13} />
            <span>所有数据只保存在这台设备上，可随时导出备份。</span>
          </div>
        </div>
      </section>
    </div>
  );
}
