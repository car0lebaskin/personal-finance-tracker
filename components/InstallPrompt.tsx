'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = 'vault_install_prompt_dismissed_v1';

export default function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === '1') return;
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  async function install() {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setVisible(false);
    setEvent(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }

  if (!visible || !event) return null;

  return <div className="fixed left-4 right-4 bottom-24 z-[80] mx-auto max-w-[640px] rounded-[24px] border border-white/15 bg-[#10140f]/95 p-4 shadow-2xl backdrop-blur-xl"><div className="flex items-start gap-3"><div className="h-10 w-10 rounded-2xl bg-[#a7ff4f]/15 text-[#a7ff4f] flex items-center justify-center shrink-0"><Download className="h-5 w-5"/></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#f4f5ef]">Install Vault</p><p className="text-xs text-[#a8aca3] mt-1">Add it to your phone for a cleaner app-like experience.</p><button onClick={install} className="mt-3 rounded-full bg-[#a7ff4f] px-4 py-2 text-xs font-bold text-[#071006]">Install app</button></div><button onClick={dismiss} className="h-8 w-8 rounded-full bg-white/[0.06] text-[#a8aca3] flex items-center justify-center shrink-0"><X className="h-4 w-4"/></button></div></div>;
}
