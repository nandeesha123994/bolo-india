import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { API_ORIGIN } from "../api";
import {
  connectChatSocket,
  getChatImage,
  getConversationMessages,
  getConversations,
  uploadChatImage,
} from "../services/chatService";
import "../styles/Chat.css";

const MAX_CHAT_IMAGE_SIZE = 5 * 1024 * 1024;
const CHAT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const getImageUrl = (image) => {
  if (!image) return "";
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  return `${API_ORIGIN}${image.startsWith("/") ? "" : "/"}${image}`;
};

function ChatMessageImage({ imagePath }) {
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";

    const loadImage = async () => {
      try {
        setImageError(false);
        const imageBlob = await getChatImage(imagePath, controller.signal);
        objectUrl = URL.createObjectURL(imageBlob);
        setImageUrl(objectUrl);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to load chat image:", error);
          setImageError(true);
        }
      }
    };

    loadImage();

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imagePath]);

  if (imageError) {
    return <span className="chat-image-error">Image could not be loaded.</span>;
  }

  if (!imageUrl) {
    return <span className="chat-image-loading">Loading image...</span>;
  }

  return (
    <img
      className="chat-message-image"
      src={imageUrl}
      alt="Shared"
      loading="lazy"
      decoding="async"
      onError={() => setImageError(true)}
    />
  );
}

const formatMessageTime = (date) =>
  date
    ? new Date(date).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

function Chat() {
  const location = useLocation();
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesConversationId, setMessagesConversationId] = useState(null);
  const [messagePagination, setMessagePagination] = useState(null);
  const [paginationConversationId, setPaginationConversationId] = useState(null);
  const [draft, setDraft] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageSending, setImageSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [error, setError] = useState("");
  const socketRef = useRef(null);
  const selectedConversationIdRef = useRef(null);
  const messageListRef = useRef(null);
  const imageInputRef = useRef(null);
  const preserveScrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  useEffect(
    () => () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    },
    [imagePreviewUrl],
  );

  const applyReadReceipt = useCallback((conversationId, messageIds, readAt) => {
    if (!Array.isArray(messageIds) || messageIds.length === 0 || !readAt) return;

    const readMessageIds = new Set(messageIds);
    setMessages((previous) =>
      previous.map((message) =>
        Number(message.conversationId) === Number(conversationId) &&
        readMessageIds.has(message.id)
          ? { ...message, readAt }
          : message,
      ),
    );
  }, []);

  const requestReadReceipt = useCallback(
    (socket, conversationId) => {
      if (!socket?.connected || !conversationId) return;

      socket.emit("message:read", { conversationId }, (result) => {
        if (!result?.ok) {
          setError(result?.message || "Unable to update read status.");
          return;
        }

        applyReadReceipt(conversationId, result.messageIds, result.readAt);
      });
    },
    [applyReadReceipt],
  );

  const loadMessages = useCallback(async (conversationId) => {
    try {
      setLoadingMessages(true);
      setError("");
      const data = await getConversationMessages(conversationId);
      if (selectedConversationIdRef.current === conversationId) {
        setMessages((currentMessages) => {
          const historyIds = new Set(
            data.messages.map((message) => message.id),
          );
          const liveMessages = currentMessages.filter(
            (message) =>
              Number(message.conversationId) === conversationId &&
              !historyIds.has(message.id),
          );

          return [...data.messages, ...liveMessages].sort(
            (left, right) =>
              new Date(left.createdAt).getTime() -
              new Date(right.createdAt).getTime(),
          );
        });
        setMessagesConversationId(conversationId);
        setMessagePagination(data.pagination);
        setPaginationConversationId(conversationId);
        if (document.visibilityState === "visible") {
          requestReadReceipt(socketRef.current, conversationId);
        }
      }
    } catch (requestError) {
      console.error("Failed to load chat history:", requestError);
      if (selectedConversationIdRef.current === conversationId) {
        setError(
          requestError.response?.data?.message ||
            "Unable to load chat history.",
        );
        setMessages([]);
      }
    } finally {
      if (selectedConversationIdRef.current === conversationId) {
        setLoadingMessages(false);
      }
    }
  }, [requestReadReceipt]);

  useEffect(() => {
    let active = true;

    const loadInitialConversations = async () => {
      try {
        const nextConversations = await getConversations();
        if (!active) return;
        setConversations(nextConversations);

        const requestedId = Number(location.state?.conversationId);
        const selected =
          nextConversations.find((item) => item.id === requestedId) ||
          nextConversations[0] ||
          null;
        if (selected) setSelectedConversation(selected);
      } catch (requestError) {
        console.error("Failed to load chat conversations:", requestError);
        if (active) {
          setError(
            requestError.response?.data?.message ||
              requestError.message ||
              "Unable to load conversations.",
          );
        }
      } finally {
        if (active) setLoadingConversations(false);
      }
    };

    loadInitialConversations();
    return () => {
      active = false;
    };
  }, [location.state?.conversationId]);

  useEffect(() => {
    const socket = connectChatSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("presence:list", (result) => {
        if (result?.ok) {
          setOnlineUsers(
            Object.fromEntries(
              result.onlineUserIds.map((userId) => [userId, true]),
            ),
          );
        }
      });
      const conversationId = selectedConversationIdRef.current;
      if (conversationId) {
        socket.emit("conversation:join", { conversationId }, (result) => {
          if (result?.ok) {
            requestReadReceipt(socket, conversationId);
          }
        });
      }
    });

    socket.on("connect_error", (socketError) => {
      setSocketConnected(false);
      console.error("Chat socket connection error:", socketError);
      setError("Chat connection failed. Check your connection and try again.");
    });

    socket.on("chat:error", ({ message } = {}) => {
      setError(message || "A chat event could not be completed.");
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
      setTypingUsers({});
      isTypingRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    });

    socket.on("presence:update", ({ userId, status } = {}) => {
      if (!userId || !["online", "offline"].includes(status)) return;

      setOnlineUsers((previous) => ({
        ...previous,
        [userId]: status === "online",
      }));
    });

    socket.on("typing:update", ({ conversationId, userId, isTyping } = {}) => {
      if (!conversationId || !userId || typeof isTyping !== "boolean") return;

      const typingKey = `${conversationId}:${userId}`;
      setTypingUsers((previous) => ({
        ...previous,
        [typingKey]: isTyping,
      }));
    });

    socket.on("message:new", (message) => {
      const isCurrentConversation =
        Number(message.conversationId) === selectedConversationIdRef.current;

      if (isCurrentConversation) {
        setMessages((previous) =>
          previous.some((item) => item.id === message.id)
            ? previous
            : [...previous, message],
        );

        if (
          Number(message.senderId) !== Number(currentUser?.id) &&
          document.visibilityState === "visible"
        ) {
          requestReadReceipt(socket, message.conversationId);
        }
      }

      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === message.conversationId
            ? {
                ...conversation,
                lastMessage: message,
                lastMessageAt: message.createdAt,
              }
            : conversation,
        ).sort(
          (left, right) =>
            new Date(right.lastMessageAt).getTime() -
            new Date(left.lastMessageAt).getTime(),
        ),
      );
    });

    socket.on(
      "message:read",
      ({ conversationId, messageIds, readAt } = {}) => {
        if (
          Number(conversationId) !== selectedConversationIdRef.current ||
          !Array.isArray(messageIds)
        ) {
          return;
        }

        applyReadReceipt(conversationId, messageIds, readAt);
      },
    );

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      const activeConversationId = selectedConversationIdRef.current;
      if (
        isTypingRef.current &&
        activeConversationId &&
        socket.connected
      ) {
        socket.emit("typing:stop", {
          conversationId: activeConversationId,
        });
      }
      isTypingRef.current = false;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [applyReadReceipt, currentUser?.id, requestReadReceipt]);

  useEffect(() => {
    if (!selectedConversation) {
      selectedConversationIdRef.current = null;
      return;
    }

    const conversationId = selectedConversation.id;
    selectedConversationIdRef.current = conversationId;
    void Promise.resolve().then(() => loadMessages(conversationId));

    if (socketRef.current?.connected) {
      socketRef.current.emit(
        "conversation:join",
        { conversationId },
        (result) => {
          if (result?.ok && document.visibilityState === "visible") {
            requestReadReceipt(socketRef.current, conversationId);
          }
        },
      );
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      if (isTypingRef.current && socketRef.current?.connected) {
        socketRef.current.emit("typing:stop", { conversationId });
      }
      isTypingRef.current = false;
    };
  }, [selectedConversation, loadMessages, requestReadReceipt]);

  useEffect(() => {
    const list = messageListRef.current;
    if (!list) return;

    if (preserveScrollRef.current) {
      const { height, top } = preserveScrollRef.current;
      list.scrollTop = top + list.scrollHeight - height;
      preserveScrollRef.current = null;
      return;
    }

    list.scrollTop = list.scrollHeight;
  }, [messages]);

  const handleSelectConversation = (conversation) => {
    setError("");
    setSelectedImage(null);
    setImagePreviewUrl("");
    const peerId = conversation.otherUser?.id;
    if (peerId) {
      setTypingUsers((previous) => ({
        ...previous,
        [`${conversation.id}:${peerId}`]: false,
      }));
    }
    setSelectedConversation(conversation);
  };

  const handleLoadOlderMessages = async () => {
    if (
      !selectedConversation ||
      !messagePagination?.hasPreviousPage ||
      paginationConversationId !== selectedConversation.id
    ) {
      return;
    }

    const conversationId = selectedConversation.id;
    try {
      setLoadingMessages(true);
      const data = await getConversationMessages(
        conversationId,
        messagePagination.currentPage + 1,
      );
      if (selectedConversationIdRef.current === conversationId) {
        const list = messageListRef.current;
        if (list) {
          preserveScrollRef.current = {
            height: list.scrollHeight,
            top: list.scrollTop,
          };
        }
        setMessages((previous) => {
          const knownIds = new Set(previous.map((message) => message.id));
          return [
            ...data.messages.filter((message) => !knownIds.has(message.id)),
            ...previous,
          ];
        });
        setMessagePagination(data.pagination);
      }
    } catch (requestError) {
      console.error("Failed to load older chat messages:", requestError);
      setError(
        requestError.response?.data?.message ||
          "Unable to load older messages.",
      );
    } finally {
      if (selectedConversationIdRef.current === conversationId) {
        setLoadingMessages(false);
      }
    }
  };

  const handleSendMessage = (event) => {
    event.preventDefault();
    const content = draft.trim();
    const socket = socketRef.current;

    if (!content || !selectedConversation || sending) return;

    if (!socket?.connected) {
      setError("Chat is disconnected. Please wait for it to reconnect.");
      return;
    }

    stopTyping(selectedConversation.id);
    setSending(true);
    setError("");
    socket.emit(
      "message:send",
      { conversationId: selectedConversation.id, content },
      (result) => {
        setSending(false);
        if (!result?.ok) {
          setError(result?.message || "Message could not be sent.");
          return;
        }
        setDraft("");
      },
    );
  };

  const handleImageSelection = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!CHAT_IMAGE_TYPES.includes(file.type)) {
      setError("Choose a JPEG, PNG, WebP, or GIF image.");
      setSelectedImage(null);
      setImagePreviewUrl("");
      return;
    }

    if (file.size > MAX_CHAT_IMAGE_SIZE) {
      setError("Chat images must be 5MB or smaller.");
      setSelectedImage(null);
      setImagePreviewUrl("");
      return;
    }

    setError("");
    setSelectedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleSendImage = async () => {
    if (!selectedImage || !selectedConversation || imageSending) return;

    const conversationId = selectedConversation.id;
    stopTyping(conversationId);
    setImageSending(true);
    setError("");

    try {
      const message = await uploadChatImage(conversationId, selectedImage);

      if (selectedConversationIdRef.current === conversationId) {
        setMessages((previous) =>
          previous.some((item) => item.id === message.id)
            ? previous
            : [...previous, message],
        );
      }

      setConversations((previous) =>
        previous
          .map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  lastMessage: message,
                  lastMessageAt: message.createdAt,
                }
              : conversation,
          )
          .sort(
            (left, right) =>
              new Date(right.lastMessageAt).getTime() -
              new Date(left.lastMessageAt).getTime(),
          ),
      );
      setSelectedImage(null);
      setImagePreviewUrl("");
    } catch (requestError) {
      console.error("Failed to send chat image:", requestError);
      setError(
        (requestError.code === "ECONNABORTED"
          ? "Image upload timed out. Check your connection and try again."
          : requestError.response?.data?.message ||
            requestError.message) ||
          "Unable to send image.",
      );
    } finally {
      setImageSending(false);
    }
  };

  const stopTyping = (conversationId) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (!isTypingRef.current) return;

    isTypingRef.current = false;
    if (socketRef.current?.connected) {
      socketRef.current.emit("typing:stop", { conversationId });
    }
  };

  const handleDraftChange = (event) => {
    const value = event.target.value;
    setDraft(value);

    if (!selectedConversation || !socketRef.current?.connected) return;

    const conversationId = selectedConversation.id;
    if (value.trim()) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        socketRef.current.emit("typing:start", { conversationId });
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(conversationId);
      }, 1200);
    } else {
      stopTyping(conversationId);
    }
  };

  const selectedMessages =
    messagesConversationId === selectedConversation?.id ? messages : [];
  const otherUserId = selectedConversation?.otherUser?.id;
  const isOtherUserTyping = selectedConversation
    ? typingUsers[`${selectedConversation.id}:${otherUserId}`] === true
    : false;

  return (
    <main className="chat-page">
      <section className="chat-shell" aria-label="Chat">
        <aside className="chat-sidebar">
          <header className="chat-sidebar-header">
            <h1>Messages</h1>
            <p>Keep the conversation going</p>
          </header>

          {error && <p className="chat-error">{error}</p>}

          <div className="chat-conversation-list">
            {loadingConversations ? (
              <p className="chat-empty">Loading conversations...</p>
            ) : conversations.length === 0 ? (
              <p className="chat-empty">
                No conversations yet. Visit someone’s profile to start a chat.
              </p>
            ) : (
              conversations.map((conversation) => {
                const person = conversation.otherUser;
                const avatar = getImageUrl(person?.profileImage);
                const lastMessage = conversation.lastMessage;

                return (
                  <button
                    type="button"
                    key={conversation.id}
                    className={`chat-conversation${
                      selectedConversation?.id === conversation.id
                        ? " selected"
                        : ""
                    }`}
                    onClick={() => handleSelectConversation(conversation)}
                  >
                    {avatar ? (
                      <img src={avatar} alt="" className="chat-avatar" />
                    ) : (
                      <span className="chat-avatar chat-avatar-placeholder">
                        {person?.name?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    )}
                    <span className="chat-conversation-copy">
                      <strong>{person?.name || "Bolo India user"}</strong>
                      <span className="chat-conversation-preview">
                        {lastMessage?.content || (lastMessage?.image ? "Photo" : "Start a conversation")}
                      </span>
                    </span>
                    {lastMessage?.createdAt && (
                      <time className="chat-conversation-time">
                        {formatMessageTime(lastMessage.createdAt)}
                      </time>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="chat-panel">
          {selectedConversation ? (
            <>
              <header className="chat-header">
                {selectedConversation.otherUser?.profileImage ? (
                  <img
                    src={getImageUrl(
                      selectedConversation.otherUser.profileImage,
                    )}
                    alt=""
                    className="chat-avatar"
                  />
                ) : (
                  <span className="chat-avatar chat-avatar-placeholder">
                    {selectedConversation.otherUser?.name
                      ?.charAt(0)
                      ?.toUpperCase() || "U"}
                  </span>
                )}
                <div>
                  <h2>{selectedConversation.otherUser?.name}</h2>
                  <span className="chat-presence">
                    <span
                      className={`chat-presence-dot ${
                        socketConnected &&
                        onlineUsers[selectedConversation.otherUser?.id]
                          ? "online"
                          : ""
                      }`}
                    />
                    {!socketConnected
                      ? "Reconnecting..."
                      : onlineUsers[selectedConversation.otherUser?.id]
                        ? "Online"
                        : "Offline"}
                  </span>
                </div>
              </header>

              <div className="chat-message-list" ref={messageListRef}>
                {isOtherUserTyping && (
                  <p className="chat-typing-indicator">
                    {selectedConversation.otherUser?.name || "User"} is typing…
                  </p>
                )}
                {paginationConversationId === selectedConversation.id &&
                  messagePagination?.hasPreviousPage && (
                    <button
                      type="button"
                      className="chat-load-older"
                      onClick={handleLoadOlderMessages}
                      disabled={loadingMessages}
                    >
                      {loadingMessages ? "Loading..." : "Load older messages"}
                    </button>
                  )}
                {loadingMessages ? (
                  selectedMessages.length === 0 ? (
                    <p className="chat-empty">Loading messages...</p>
                  ) : null
                ) : selectedMessages.length === 0 ? (
                  <p className="chat-empty chat-start-hint">
                    Say hello to start your conversation.
                  </p>
                ) : (
                  selectedMessages.map((message) => {
                    const ownMessage =
                      Number(message.senderId) === Number(currentUser?.id);

                    return (
                      <article
                        key={message.id}
                        className={`chat-message-row${
                          ownMessage ? " own" : ""
                        }`}
                      >
                        <div
                          className={`chat-message-bubble${
                            message.image ? " image-only" : ""
                          }`}
                        >
                          {message.image && (
                            <ChatMessageImage imagePath={message.image} />
                          )}
                          {message.content ||
                            (!message.image ? "" : null)}
                          <span className="chat-message-meta">
                            <time>{formatMessageTime(message.createdAt)}</time>
                            {ownMessage && (
                              <span
                                className={`chat-message-status${
                                  message.readAt ? " read" : ""
                                }`}
                              >
                                {message.readAt ? "Read" : "Sent"}
                              </span>
                            )}
                          </span>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>

              {imagePreviewUrl && (
                <div className="chat-image-preview">
                  <img src={imagePreviewUrl} alt="Selected image preview" />
                  <span>{selectedImage?.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreviewUrl("");
                    }}
                    disabled={imageSending}
                    aria-label="Remove selected image"
                  >
                    Remove
                  </button>
                </div>
              )}

              <form className="chat-compose" onSubmit={handleSendMessage}>
                <input
                  ref={imageInputRef}
                  className="chat-image-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageSelection}
                  aria-label="Choose an image to send"
                />
                <button
                  type="button"
                  className="chat-image-button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={imageSending}
                  aria-label="Choose image to send"
                  title="Choose image"
                >
                  <svg
                    className="chat-image-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                </button>
                {selectedImage ? (
                  <button
                    type="button"
                    className="chat-send-image-button"
                    onClick={handleSendImage}
                    disabled={imageSending}
                  >
                    {imageSending ? "Sending..." : "Send image"}
                  </button>
                ) : null}
                <input
                  type="text"
                  value={draft}
                  onChange={handleDraftChange}
                  placeholder="Write a message..."
                  maxLength={5000}
                  aria-label="Message"
                />
                <button
                  type="submit"
                  className="chat-send-button"
                  disabled={!draft.trim() || sending || !socketConnected}
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </form>
            </>
          ) : (
            <div className="chat-welcome">
              <div className="chat-welcome-icon">💬</div>
              <h2>Your messages</h2>
              <p>Select a conversation or visit a user profile to start chatting.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default Chat;
