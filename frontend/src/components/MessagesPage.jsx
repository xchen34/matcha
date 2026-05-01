import { Navigate, useParams } from "react-router-dom";
import ChatConversationPage from "./ChatConversationPage.jsx";
import ChatListPage from "./ChatListPage.jsx";

export default function MessagesPage({ currentUser }) {
  const { conversationId } = useParams();

  if (!currentUser?.id) {
    return <Navigate to="/login" replace />;
  }

  return (
    <section className="space-y-4">
      <div className="lg:hidden">
        {conversationId ? (
          <ChatConversationPage currentUser={currentUser} />
        ) : (
          <ChatListPage currentUser={currentUser} />
        )}
      </div>

      <div className="hidden gap-4 lg:grid lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ChatListPage currentUser={currentUser} embedded />
        </div>
        <div className="lg:col-span-2">
          {conversationId ? (
            <ChatConversationPage currentUser={currentUser} embedded />
          ) : (
            <div className="flex min-h-[360px] items-center justify-center rounded-3xl border-2 border-slate-200 bg-white/90 p-8 text-center shadow-sm">
              <div className="space-y-2">
                <p className="text-lg font-semibold text-slate-800">Select a conversation</p>
                <p className="text-sm text-slate-500">
                  Pick someone from the left to open your direct messages.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}