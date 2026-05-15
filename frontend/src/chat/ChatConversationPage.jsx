import { useEffect, useState } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { useChatConversationRealtime } from "./hooks/useChatConversationRealtime.js";
import { useChatScroll } from "./hooks/useChatScroll.js";
import { useConversationData } from "./hooks/useConversationData.js";
import { useMessageActions } from "./hooks/useMessageActions.js";
import ChatConversationHeader from "./components/ChatConversationHeader.jsx";
import ChatMessagesList from "./components/ChatMessagesList.jsx";
import ChatInputForm from "./components/ChatInputForm.jsx";

export default function ChatConversationPage({
  currentUser,
  embedded = false,
}) {
  const { conversationId } = useParams();
  const navigate = useNavigate();

  /* =============== LOCAL STATE =============== */
  const currentUserId = Number(currentUser?.id) || null;
  const [error, setError] = useState("");
  const [expandedMessageId, setExpandedMessageId] = useState(null);
  const [body, setBody] = useState("");
  const [quotedMessage, setQuotedMessage] = useState(null);

  /* =============== CONVERSATION DATA =============== */
  const conversationData = useConversationData(currentUser, conversationId);
  const {
    loading,
    loadingMore,
    conversation,
    messages,
    hasMore,
    wasMatchedBefore,
    unmatchedAt,
    loadConversation,
    loadOlder,
  } = conversationData;

  /* ====================== MESSAGE ACTIONS ====================== */
  const messageActions = useMessageActions(
    currentUser,
    conversation,
    conversationData.setConversation,
    conversationData.setMessages,
    setError,
    navigate,
  );
  const {
    sending,
    deletingConversation,
    deletingMessageId,
    handleSend,
    handleDeleteConversation,
    handleDeleteMessage,
  } = messageActions;

  /* ====================== SCROLL & INFINITE LOAD ====================== */
  const {
    listRef,
    handleScroll,
    saveScrollPositionBeforePrepend,
  } = useChatScroll({
    messages,
    loadingMore,
    hasMore,
    loadOlder: () => loadOlder(listRef, saveScrollPositionBeforePrepend),
    currentUserId,
  });

  /* ====================== DERIVED STATE ====================== */
  const activeConversationId = Number(conversation?.id) || null;

  const canSend =
    Boolean(conversation?.is_match) &&
    !conversation?.blocked_by_you &&
    !conversation?.blocked_you;

  /* ====================== EFFECTS ====================== */
  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  useChatConversationRealtime({
    conversationId,
    activeConversationId,
    currentUserId,
    otherUserId: conversation?.other_user?.id,
    loadConversation,
    navigate,
    setConversation: conversationData.setConversation,
    setMessages: conversationData.setMessages,
    setQuotedMessage,
    setWasMatchedBefore: conversationData.setWasMatchedBefore,
    setUnmatchedAt: conversationData.setUnmatchedAt,
  });

  /* ====================== HANDLERS ====================== */
  const handleSendMessage = async (bodyText, quoted, clearBody, clearQuote) => {
    await handleSend(bodyText, quoted, clearBody, clearQuote);
  };

  const handleDeleteMsg = async (message) => {
    await handleDeleteMessage(message, setQuotedMessage);
  };

  /* ============= Redirect if not logged in ============= */
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <section className="h-full flex flex-col overflow-hidden">
      {/* HEADER */}
      <ChatConversationHeader
        conversation={conversation}
        embedded={embedded}
        deletingConversation={deletingConversation}
        onDelete={handleDeleteConversation}
      />

      {/* ERROR */}
      {error && <p className="text-sm text-primary-dark">{error}</p>}

      {/* MESSAGES */}
      <ChatMessagesList
        messages={messages}
        loading={loading}
        loadingMore={loadingMore}
        listRef={listRef}
        handleScroll={handleScroll}
        currentUserId={currentUserId}
        conversation={conversation}
        expandedMessageId={expandedMessageId}
        setExpandedMessageId={setExpandedMessageId}
        deletingMessageId={deletingMessageId}
        quotedMessage={quotedMessage}
        setQuotedMessage={setQuotedMessage}
        onDelete={handleDeleteMsg}
        wasMatchedBefore={wasMatchedBefore}
        unmatchedAt={unmatchedAt}
      />

      {/* INPUT */}
      <ChatInputForm
        canSend={canSend}
        sending={sending}
        body={body}
        setBody={setBody}
        quotedMessage={quotedMessage}
        setQuotedMessage={setQuotedMessage}
        onSubmit={handleSendMessage}
      />
    </section>
  );
}
