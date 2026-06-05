import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import ChatConversationPage from "../chat/ChatConversationPage.jsx";
import ChatListPage from "../chat/ChatListPage.jsx";

export default function MessagesBloc({ currentUser }) {
  const { conversationId } = useParams();
  const [quotedMessage, setQuotedMessage] = useState(null);

  /* ============= Redirect if not logged in ============= */
  if (!currentUser?.id) {
    return <Navigate to="/login" replace />;
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col space-y-4">
      {/* Mobile layout */}
      <div className="flex min-h-0 min-w-0 flex-col lg:hidden">
        {conversationId ? (
          <div className="h-[calc(100dvh-13rem)] min-h-[26rem] overflow-hidden">
            <ChatConversationPage
              currentUser={currentUser}
              quotedMessage={quotedMessage}
              setQuotedMessage={setQuotedMessage}
            />
          </div>
        ) : (
          <div className="h-[calc(100dvh-13rem)] min-h-[26rem] overflow-hidden">
            <ChatListPage currentUser={currentUser} />
          </div>
        )}
      </div>

      {/* Desktop layout */}
      <div className="hidden min-h-0 min-w-0 gap-4 lg:grid lg:grid-cols-[minmax(20rem,1fr)_minmax(0,2fr)] lg:items-stretch">
        <div className="min-w-0 h-[72vh] min-h-[34rem] overflow-hidden">
          <ChatListPage currentUser={currentUser} embedded />
        </div>

        <div className="min-w-0 h-[72vh] min-h-[34rem] overflow-hidden">
          {conversationId ? (
            <ChatConversationPage
              currentUser={currentUser}
              embedded
              quotedMessage={quotedMessage}
              setQuotedMessage={setQuotedMessage}
            />
          ) : (
            <div className="flex min-h-[360px] items-center justify-center rounded-3xl border-2 border-slate-200 bg-white/90 p-8 text-center shadow-sm">
              <div className="space-y-2">
                <p className="text-lg font-semibold text-slate-800">
                  Select a conversation
                </p>
                
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
