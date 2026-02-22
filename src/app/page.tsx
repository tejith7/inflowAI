import { ChatLayout } from '@/components/chat/chat-layout';
import { Header } from '@/components/header';

export default function Home() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] dark:bg-bottom dark:border-b dark:border-slate-100/5 [mask-image:linear-gradient(to_bottom,transparent,black)]"></div>
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <ChatLayout />
      </div>
    </div>
  );
}
