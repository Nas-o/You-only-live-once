import { useEffect, useState } from 'react';
import { Download, RefreshCw, ShieldCheck } from 'lucide-react';
import { Modal } from './ui/Modal';

const SKIP_KEY = 'yolo-skip-update-version';

export function UpdatePrompt() {
  const [info, setInfo] = useState<YoloUpdateInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const check = () => {
      const bridge = window.yolo?.updates;
      if (!bridge) return;
      void bridge.check().then((result) => {
        if (!active || !result.ok || !result.info?.available) return;
        if (window.localStorage.getItem(SKIP_KEY) === result.info.latestVersion) return;
        setInfo(result.info);
        setOpen(true);
      });
    };
    const timer = window.setTimeout(check, 1800);
    const interval = window.setInterval(check, 6 * 60 * 60 * 1000);
    return () => {
      active = false;
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, []);

  const install = async () => {
    if (!info) return;
    const bridge = window.yolo?.updates;
    if (!bridge) return;
    setInstalling(true);
    setMessage(null);
    const result = await bridge.install(info);
    if (!result.ok) {
      setMessage(result.error || '更新失败，请前往 Release 页面手动下载。');
      setInstalling(false);
      return;
    }
    setMessage('已开始更新。桌面端会自动重启；Android 会在浏览器中下载 APK。');
    setInstalling(false);
  };

  if (!info) return null;

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      size="md"
      eyebrow="UPDATE"
      title={`发现新版本 v${info.latestVersion}`}
      subtitle={`当前 v${info.currentVersion} · 新版本已发布`}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
            稍后
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              window.localStorage.setItem(SKIP_KEY, info.latestVersion);
              setOpen(false);
            }}
          >
            跳过这个版本
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void install()} disabled={installing}>
            {installing ? <RefreshCw size={14} className="spin" /> : <Download size={14} />}
            {installing ? '正在准备更新…' : info.installable ? '下载并更新' : '前往下载'}
          </button>
        </>
      }
    >
      <div className="update-prompt">
        <div className="update-version-line">
          <span>v{info.currentVersion}</span>
          <span aria-hidden="true">→</span>
          <strong>v{info.latestVersion}</strong>
        </div>
        {info.notes ? <pre className="update-notes">{info.notes}</pre> : <p>新版本包含问题修复与体验改进。</p>}
        <p className="update-hint">
          <ShieldCheck size={13} /> 桌面端会校验更新包的 SHA-256；任务、报告和设置保存在本地，不受更新影响。
        </p>
        {message ? <p className="update-message">{message}</p> : null}
      </div>
    </Modal>
  );
}
