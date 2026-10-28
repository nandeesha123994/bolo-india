import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { API_ORIGIN } from "../api";
import {
  connectChatSocket,
  deleteChatMessageForEveryone,
  deleteChatMessageForMe,
  editChatMessage,
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

const getMessageDateLabel = (date) => {
  const messageDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (messageDate.toDateString() === today.toDateString()) return "Today";
  if (messageDate.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return messageDate.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: messageDate.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
};

const formatConversationTime = (date) => {
  if (!date) return "";
  const timestamp = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (timestamp.toDateString() === today.toDateString()) {
    return formatMessageTime(date);
  }
  if (timestamp.toDateString() === yesterday.toDateString()) return "Yesterday";
  return timestamp.toLocaleDateString([], { month: "short", day: "numeric" });
};

const formatLastSeen = (date) => {
  if (!date) return "Offline";

  const lastSeen = new Date(date);
  if (Number.isNaN(lastSeen.getTime())) return "Offline";

  const now = new Date();
  const time = lastSeen.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (lastSeen.toDateString() === now.toDateString()) {
    return `Last seen today at ${time}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (lastSeen.toDateString() === yesterday.toDateString()) {
    return `Last seen yesterday at ${time}`;
  }

  return `Last seen ${lastSeen.toLocaleDateString([], {
    year: lastSeen.getFullYear() === now.getFullYear() ? undefined : "numeric",
    month: "short",
    day: "numeric",
  })} at ${time}`;
};

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
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [messageActionPending, setMessageActionPending] = useState(false);
  const [chatNotice, setChatNotice] = useState("");
  const [openMessageMenuId, setOpenMessageMenuId] = useState(null);
  const [messageMenuPosition, setMessageMenuPosition] = useState(null);
  const [conversationSearch, setConversationSearch] = useState("");
  const [mobileConversationOpen, setMobileConversationOpen] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [error, setError] = useState("");
  const socketRef = useRef(null);
  const selectedConversationIdRef = useRef(null);
  const chatPanelRef = useRef(null);
  const messageMenuRef = useRef(null);
  const messageListRef = useRef(null);
  const conversationSearchRef = useRef(null);
  const messageInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const preserveScrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const pendingDeliveryReceiptsRef = useRef(new Map());
  const deliveryReceiptsInFlightRef = useRef(new Set());
  const deletedForMeMessageIdsRef = useRef(new Set());
  const deletedForEveryoneMessageIdsRef = useRef(new Set());
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  useEffect(
    () => () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    },
    [imagePreviewUrl],
  );

  useEffect(() => {
    const handleSearchShortcut = (event) => {
      const target = event.target;
      const isTypingTarget =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !isTypingTarget) {
        event.preventDefault();
        conversationSearchRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleSearchShortcut);
    return () => document.removeEventListener("keydown", handleSearchShortcut);
  }, []);

  const applyMessageStatuses = useCallback((conversationId, statusMessages) => {
    if (!Array.isArray(statusMessages) || statusMessages.length === 0) return;

    const statusesById = new Map(
      statusMessages.map((message) => [message.id, message]),
    );
    const updateMessage = (message) => {
      const status = statusesById.get(message.id);
      if (!status) return message;
      return {
        ...message,
        deliveredAt: status.deliveredAt || message.deliveredAt,
        readAt: status.readAt || message.readAt,
      };
    };

    setMessages((previous) =>
      previous.map((message) =>
        Number(message.conversationId) === Number(conversationId) &&
        statusesById.has(message.id)
          ? updateMessage(message)
          : message,
      ),
    );
    setConversations((previous) =>
      previous.map((conversation) =>
        Number(conversation.id) === Number(conversationId) &&
        conversation.lastMessage &&
        statusesById.has(conversation.lastMessage.id)
          ? {
              ...conversation,
              lastMessage: updateMessage(conversation.lastMessage),
            }
          : conversation,
      ),
    );
    setSelectedConversation((previous) =>
      Number(previous?.id) === Number(conversationId) &&
      previous.lastMessage &&
      statusesById.has(previous.lastMessage.id)
        ? {
            ...previous,
            lastMessage: updateMessage(previous.lastMessage),
          }
        : previous,
    );
  }, []);

  const replaceMessage = useCallback((message) => {
    setMessages((previous) =>
      previous.map((item) => (item.id === message.id ? message : item)),
    );
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.lastMessage?.id === message.id
          ? { ...conversation, lastMessage: message }
          : conversation,
      ),
    );
    setSelectedConversation((previous) =>
      previous?.lastMessage?.id === message.id
        ? { ...previous, lastMessage: message }
        : previous,
    );
  }, []);

  const removeMessageForMe = useCallback((conversationId, messageId) => {
    deletedForMeMessageIdsRef.current.add(messageId);
    setMessages((previous) => previous.filter((message) => message.id !== messageId));
    setConversations((previous) =>
      previous.map((conversation) =>
        Number(conversation.id) === Number(conversationId) &&
        conversation.lastMessage?.id === messageId
          ? { ...conversation, lastMessage: null }
          : conversation,
      ),
    );
    setSelectedConversation((previous) =>
      Number(previous?.id) === Number(conversationId) &&
      previous.lastMessage?.id === messageId
        ? { ...previous, lastMessage: null }
        : previous,
    );
  }, []);

  const markMessageDeletedForEveryone = useCallback((message) => {
    deletedForEveryoneMessageIdsRef.current.add(message.id);
    replaceMessage(message);
  }, [replaceMessage]);

  const closeMessageMenu = useCallback(() => {
    setOpenMessageMenuId(null);
    setMessageMenuPosition(null);
  }, []);

  const toggleMessageMenu = (event, message, ownMessage, canEdit) => {
    event.stopPropagation();
    if (openMessageMenuId === message.id) {
      closeMessageMenu();
      return;
    }

    const panelBounds = chatPanelRef.current?.getBoundingClientRect();
    if (!panelBounds) return;

    const triggerBounds = event.currentTarget.getBoundingClientRect();
    const menuWidth = 190;
    const menuHeight = (ownMessage ? (canEdit ? 3 : 2) : 1) * 36 + 10;
    const margin = 8;
    const maxLeft = Math.max(
      panelBounds.left + margin,
      panelBounds.right - menuWidth - margin,
    );
    const left = Math.min(
      Math.max(
        ownMessage ? triggerBounds.right - menuWidth : triggerBounds.left,
        panelBounds.left + margin,
      ),
      maxLeft,
    );
    const belowTop = triggerBounds.bottom + 4;
    const aboveTop = triggerBounds.top - menuHeight - 4;
    const top =
      belowTop + menuHeight <= panelBounds.bottom - margin
        ? belowTop
        : Math.max(panelBounds.top + margin, aboveTop);

    setMessageMenuPosition({ top, left });
    setOpenMessageMenuId(message.id);
  };

  useEffect(() => {
    if (openMessageMenuId === null) return undefined;

    const handleOutsidePointer = (event) => {
      if (
        messageMenuRef.current?.contains(event.target) ||
        event.target.closest?.(".chat-message-menu-trigger")
      ) {
        return;
      }
      closeMessageMenu();
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeMessageMenu();
    };

    document.addEventListener("pointerdown", handleOutsidePointer);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", closeMessageMenu, true);
    window.addEventListener("resize", closeMessageMenu);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointer);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", closeMessageMenu, true);
      window.removeEventListener("resize", closeMessageMenu);
    };
  }, [closeMessageMenu, openMessageMenuId]);

  const requestDeliveryReceipts = useCallback(
    (socket, conversationId, incomingMessages = []) => {
      const pendingIds =
        pendingDeliveryReceiptsRef.current.get(conversationId) || new Set();
      for (const message of incomingMessages) {
        if (
          Number(message.senderId) !== Number(currentUser?.id) &&
          !message.deliveredAt &&
          !message.deletedAt
        ) {
          pendingIds.add(message.id);
        }
      }
      if (pendingIds.size > 0) {
        pendingDeliveryReceiptsRef.current.set(conversationId, pendingIds);
      }
      if (!socket?.connected || pendingIds.size === 0) return;

      const messageIds = [...pendingIds].filter(
        (messageId) =>
          !deliveryReceiptsInFlightRef.current.has(
            `${conversationId}:${messageId}`,
          ),
      );
      if (messageIds.length === 0) return;

      for (const messageId of messageIds) {
        deliveryReceiptsInFlightRef.current.add(
          `${conversationId}:${messageId}`,
        );
      }
      socket.emit(
        "message:delivered",
        { conversationId, messageIds },
        (result) => {
          for (const messageId of messageIds) {
            deliveryReceiptsInFlightRef.current.delete(
              `${conversationId}:${messageId}`,
            );
          }

          if (!result?.ok) {
            setError(
              result?.message || "Unable to update delivery status.",
            );
            return;
          }

          const currentPending =
            pendingDeliveryReceiptsRef.current.get(conversationId);
          for (const messageId of messageIds) {
            currentPending?.delete(messageId);
          }
          if (currentPending?.size === 0) {
            pendingDeliveryReceiptsRef.current.delete(conversationId);
          }
          applyMessageStatuses(conversationId, result.messages);
        },
      );
    },
    [applyMessageStatuses, currentUser?.id],
  );

  const requestReadReceipt = useCallback(
    (socket, conversationId) => {
      if (!socket?.connected || !conversationId) return;

      socket.emit("message:read", { conversationId }, (result) => {
        if (!result?.ok) {
          setError(result?.message || "Unable to update read status.");
          return;
        }

        applyMessageStatuses(conversationId, result.messages);
        setConversations((previous) =>
          previous.map((conversation) =>
            Number(conversation.id) === Number(conversationId)
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
        );
      });
    },
    [applyMessageStatuses],
  );

  const loadMessages = useCallback(async (conversationId) => {
    try {
      setLoadingMessages(true);
      setError("");
      const data = await getConversationMessages(conversationId);
      if (selectedConversationIdRef.current === conversationId) {
        setMessages((currentMessages) => {
          const currentMessagesById = new Map(
            currentMessages.map((message) => [message.id, message]),
          );
          const historyMessages = data.messages.map((message) => {
            const currentMessage = currentMessagesById.get(message.id);
            return currentMessage
              ? {
                  ...message,
                  deliveredAt:
                    currentMessage.deliveredAt || message.deliveredAt,
                  readAt: currentMessage.readAt || message.readAt,
                }
              : message;
          });
          const historyIds = new Set(
            historyMessages.map((message) => message.id),
          );
          const liveMessages = currentMessages.filter(
            (message) =>
              Number(message.conversationId) === conversationId &&
              !historyIds.has(message.id),
          );

          return [...historyMessages, ...liveMessages].sort(
            (left, right) =>
              new Date(left.createdAt).getTime() -
              new Date(right.createdAt).getTime(),
          );
        });
        setMessagesConversationId(conversationId);
        setMessagePagination(data.pagination);
        setPaginationConversationId(conversationId);
        requestDeliveryReceipts(
          socketRef.current,
          conversationId,
          data.messages,
        );
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
  }, [requestDeliveryReceipts, requestReadReceipt]);

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
        if (selected) {
          setSelectedConversation(selected);
          if (requestedId) setMobileConversationOpen(true);
        }
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
            void loadMessages(conversationId);
          }
        });
      }
      for (const pendingConversationId of
        pendingDeliveryReceiptsRef.current.keys()) {
        requestDeliveryReceipts(socket, pendingConversationId);
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
      deliveryReceiptsInFlightRef.current.clear();
    });

    socket.on(
      "presence:update",
      ({ userId, status, lastSeenAt } = {}) => {
        if (!userId || !["online", "offline"].includes(status)) return;

        setOnlineUsers((previous) => ({
          ...previous,
          [userId]: status === "online",
        }));

        if (status === "offline" && lastSeenAt) {
          setConversations((previous) =>
            previous.map((conversation) =>
              conversation.otherUser?.id === userId
                ? {
                    ...conversation,
                    otherUser: { ...conversation.otherUser, lastSeenAt },
                  }
                : conversation,
            ),
          );
          setSelectedConversation((previous) =>
            previous?.otherUser?.id === userId
              ? {
                  ...previous,
                  otherUser: { ...previous.otherUser, lastSeenAt },
                }
              : previous,
          );
        }
      },
    );

    const handleDeliveredUpdate = ({ conversationId, messages } = {}) => {
      if (!Number.isInteger(Number(conversationId))) return;
      applyMessageStatuses(conversationId, messages);
    };
    socket.on("message:delivered", handleDeliveredUpdate);

    const handleMessageUpdated = ({ message } = {}) => {
      if (!message || deletedForEveryoneMessageIdsRef.current.has(message.id)) {
        return;
      }
      replaceMessage(message);
    };
    socket.on("message:updated", handleMessageUpdated);

    const handleMessageDeleted = ({ message } = {}) => {
      if (!message) return;
      markMessageDeletedForEveryone(message);
    };
    socket.on("message:deleted", handleMessageDeleted);

    const handleMessageDeletedForMe = ({
      conversationId,
      messageId,
      userId,
    } = {}) => {
      if (Number(userId) !== Number(currentUser?.id)) return;
      removeMessageForMe(Number(conversationId), Number(messageId));
    };
    socket.on("message:deleted-for-me", handleMessageDeletedForMe);

    const handleTypingUpdate = ({
      conversationId,
      userId,
      isTyping,
    } = {}) => {
      const normalizedConversationId = Number(conversationId);
      const normalizedUserId = Number(userId);
      if (
        !Number.isInteger(normalizedConversationId) ||
        normalizedConversationId <= 0 ||
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0 ||
        typeof isTyping !== "boolean"
      ) {
        return;
      }

      const typingKey = `${normalizedConversationId}:${normalizedUserId}`;
      setTypingUsers((previous) => ({
        ...previous,
        [typingKey]: isTyping,
      }));
    };
    socket.on("typing:update", handleTypingUpdate);

    socket.on("message:new", (message) => {
      if (
        deletedForMeMessageIdsRef.current.has(message.id) ||
        deletedForEveryoneMessageIdsRef.current.has(message.id)
      ) {
        return;
      }

      if (Number(message.senderId) !== Number(currentUser?.id)) {
        requestDeliveryReceipts(socket, message.conversationId, [message]);
      }

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
                unreadCount:
                  Number(message.senderId) !== Number(currentUser?.id) &&
                  (!isCurrentConversation ||
                    document.visibilityState !== "visible") &&
                  conversation.lastMessage?.id !== message.id
                    ? (conversation.unreadCount || 0) + 1
                    : conversation.unreadCount,
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
      ({ conversationId, messages } = {}) => {
        applyMessageStatuses(conversationId, messages);
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
      socket.off("message:delivered", handleDeliveredUpdate);
      socket.off("message:updated", handleMessageUpdated);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("message:deleted-for-me", handleMessageDeletedForMe);
      socket.off("typing:update", handleTypingUpdate);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    applyMessageStatuses,
    currentUser?.id,
    loadMessages,
    markMessageDeletedForEveryone,
    removeMessageForMe,
    replaceMessage,
    requestDeliveryReceipts,
    requestReadReceipt,
  ]);

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

  useEffect(() => {
    const input = messageInputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
  }, [draft]);

  const handleSelectConversation = (conversation) => {
    closeMessageMenu();
    setMobileConversationOpen(true);
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

  const handleBackToConversations = () => {
    closeMessageMenu();
    setMobileConversationOpen(false);
    setSelectedConversation(null);
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

  const startEditingMessage = (message) => {
    setChatNotice("");
    setEditingMessageId(message.id);
    setEditDraft(message.content || "");
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditDraft("");
  };

  const handleSaveEditedMessage = async (event, message) => {
    event.preventDefault();
    const content = editDraft.trim();
    if (!content || content.length > 5000 || messageActionPending) return;

    setMessageActionPending(true);
    setError("");
    setChatNotice("");
    try {
      const updatedMessage = await editChatMessage(
        message.conversationId,
        message.id,
        content,
      );
      replaceMessage(updatedMessage);
      cancelEditingMessage();
      setChatNotice("Message updated.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to edit message.",
      );
    } finally {
      setMessageActionPending(false);
    }
  };

  const handleDeleteMessageForMe = async (message) => {
    if (messageActionPending) return;

    setMessageActionPending(true);
    setError("");
    setChatNotice("");
    try {
      await deleteChatMessageForMe(message.conversationId, message.id);
      removeMessageForMe(message.conversationId, message.id);
      setChatNotice("Message deleted for you.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to delete message.",
      );
    } finally {
      setMessageActionPending(false);
    }
  };

  const handleDeleteMessageForEveryone = async (message) => {
    if (
      messageActionPending ||
      !window.confirm("Delete this message for everyone? This cannot be undone.")
    ) {
      return;
    }

    setMessageActionPending(true);
    setError("");
    setChatNotice("");
    try {
      const deletedMessage = await deleteChatMessageForEveryone(
        message.conversationId,
        message.id,
      );
      markMessageDeletedForEveryone(deletedMessage);
      setChatNotice("Message deleted for everyone.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to delete message for everyone.",
      );
    } finally {
      setMessageActionPending(false);
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
      }, 2000);
    } else {
      stopTyping(conversationId);
    }
  };

  const selectedMessages =
    messagesConversationId === selectedConversation?.id ? messages : [];
  const filteredConversations = conversations.filter((conversation) =>
    (conversation.otherUser?.name || "")
      .toLocaleLowerCase()
      .includes(conversationSearch.trim().toLocaleLowerCase()),
  );
  const otherUserId = selectedConversation?.otherUser?.id;
  const isOtherUserTyping = selectedConversation
    ? typingUsers[`${selectedConversation.id}:${otherUserId}`] === true
    : false;

  return (
    <main className="chat-page">
      <section
        className={`chat-shell${
          mobileConversationOpen ? " mobile-conversation-open" : ""
        }`}
        aria-label="Chat"
      >
        <aside className="chat-sidebar">
          <header className="chat-sidebar-header">
            <div className="chat-sidebar-heading">
              <div>
                <h1>Messages</h1>
                <p>Keep the conversation going</p>
              </div>
              <span className="chat-conversation-total">
                {conversations.length}
              </span>
            </div>
            <label className="chat-search">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m16 16 4 4" />
              </svg>
              <input
                ref={conversationSearchRef}
                type="search"
                value={conversationSearch}
                onChange={(event) => setConversationSearch(event.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
              />
              <kbd>/</kbd>
            </label>
          </header>

          {error && <p className="chat-error">{error}</p>}
          {chatNotice && (
            <p className="chat-success" role="status">
              {chatNotice}
            </p>
          )}

          <div className="chat-conversation-list">
            {loadingConversations ? (
              <p className="chat-empty">Loading conversations...</p>
            ) : conversations.length === 0 ? (
              <p className="chat-empty">
                No conversations yet. Visit someone’s profile to start a chat.
              </p>
            ) : filteredConversations.length === 0 ? (
              <p className="chat-empty">No conversations match your search.</p>
            ) : (
              filteredConversations.map((conversation) => {
                const person = conversation.otherUser;
                const avatar = getImageUrl(person?.profileImage);
                const lastMessage = conversation.lastMessage;
                const isOnline = socketConnected && onlineUsers[person?.id];

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
                    <span className="chat-avatar-wrap">
                      {avatar ? (
                        <img src={avatar} alt="" className="chat-avatar" />
                      ) : (
                        <span className="chat-avatar chat-avatar-placeholder">
                          {person?.name?.charAt(0)?.toUpperCase() || "U"}
                        </span>
                      )}
                      {isOnline && (
                        <span
                          className="chat-avatar-presence-dot"
                          aria-label="Online"
                        />
                      )}
                    </span>
                    <span className="chat-conversation-copy">
                      <span className="chat-conversation-topline">
                        <strong>{person?.name || "Bolo India user"}</strong>
                        {lastMessage?.createdAt && (
                          <time className="chat-conversation-time">
                            {formatConversationTime(lastMessage.createdAt)}
                          </time>
                        )}
                      </span>
                      <span className="chat-conversation-preview">
                        {lastMessage?.deletedAt
                          ? "This message was deleted"
                          : lastMessage?.content ||
                            (lastMessage?.image ? "Photo" : "Start a conversation")}
                      </span>
                      <span
                        className={`chat-conversation-status${
                          isOnline ? " online" : ""
                        }`}
                      >
                        <span className="chat-conversation-status-dot" />
                        {!socketConnected
                          ? "Reconnecting..."
                          : isOnline
                            ? "Online"
                            : formatLastSeen(person?.lastSeenAt)}
                      </span>
                    </span>
                    {conversation.unreadCount > 0 && (
                      <span className="chat-unread-count">
                        {conversation.unreadCount > 99
                          ? "99+"
                          : conversation.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="chat-panel" ref={chatPanelRef}>
          {selectedConversation ? (
            <>
              <header className="chat-header">
                <button
                  type="button"
                  className="chat-back-button"
                  onClick={handleBackToConversations}
                  aria-label="Back to conversations"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <span className="chat-avatar-wrap">
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
                  {socketConnected &&
                    onlineUsers[selectedConversation.otherUser?.id] && (
                      <span
                        className="chat-avatar-presence-dot"
                        aria-label="Online"
                      />
                    )}
                </span>
                <div className="chat-header-copy">
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
                        : formatLastSeen(
                            selectedConversation.otherUser?.lastSeenAt,
                          )}
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
                  selectedMessages.map((message, index) => {
                    const ownMessage =
                      Number(message.senderId) === Number(currentUser?.id);
                    const messageDay = getMessageDateLabel(message.createdAt);
                    const previousDay =
                      index > 0
                        ? getMessageDateLabel(selectedMessages[index - 1].createdAt)
                        : null;
                    const canEdit =
                      ownMessage &&
                      Boolean(message.content) &&
                      !message.image &&
                      !message.deletedAt;

                    return (
                      <Fragment key={message.id}>
                        {messageDay !== previousDay && (
                          <div className="chat-date-separator">
                            <span>{messageDay}</span>
                          </div>
                        )}
                        <article
                          className={`chat-message-row${
                            ownMessage ? " own" : ""
                          }`}
                        >
                          <div
                            className={`chat-message-bubble${
                              message.image ? " image-only" : ""
                            }`}
                          >
                          {editingMessageId === message.id ? (
                            <form
                              className="chat-edit-form"
                              onSubmit={(event) =>
                                handleSaveEditedMessage(event, message)
                              }
                            >
                              <textarea
                                value={editDraft}
                                onChange={(event) =>
                                  setEditDraft(event.target.value)
                                }
                                maxLength={5000}
                                aria-label="Edit message"
                                autoFocus
                              />
                              <div className="chat-edit-actions">
                                <button
                                  type="button"
                                  onClick={cancelEditingMessage}
                                  disabled={messageActionPending}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={
                                    messageActionPending ||
                                    !editDraft.trim() ||
                                    editDraft.trim() === message.content
                                  }
                                >
                                  {messageActionPending ? "Saving..." : "Save"}
                                </button>
                                </div>
                            </form>
                          ) : (
                            <>
                              {message.image && (
                                <ChatMessageImage imagePath={message.image} />
                              )}
                              {message.deletedAt
                                ? "This message was deleted."
                                : message.content ||
                                  (!message.image ? "" : null)}
                              <span className="chat-message-meta">
                                {message.editedAt && !message.deletedAt && (
                                  <span className="chat-message-edited">
                                    Edited
                                  </span>
                                )}
                                <time>{formatMessageTime(message.createdAt)}</time>
                                {ownMessage && (
                                  <span
                                    className={`chat-message-status${
                                      message.readAt
                                        ? " read"
                                        : message.deliveredAt
                                          ? " delivered"
                                          : ""
                                    }`}
                                    role="img"
                                    aria-label={
                                      message.readAt
                                        ? "Read"
                                        : message.deliveredAt
                                          ? "Delivered"
                                          : "Sent"
                                    }
                                    title={
                                      message.readAt
                                        ? "Read"
                                        : message.deliveredAt
                                          ? "Delivered"
                                          : "Sent"
                                    }
                                  >
                                    {message.deliveredAt || message.readAt
                                      ? "✓✓"
                                      : "✓"}
                                  </span>
                                )}
                              </span>
                            </>
                          )}
                        </div>
                        {editingMessageId !== message.id && (
                          <div className="chat-message-actions">
                            <button
                              type="button"
                              className="chat-message-menu-trigger"
                              aria-label="Message actions"
                              title="Message actions"
                              aria-haspopup="menu"
                              aria-expanded={openMessageMenuId === message.id}
                              onClick={(event) =>
                                toggleMessageMenu(
                                  event,
                                  message,
                                  ownMessage,
                                  canEdit,
                                )
                              }
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <circle cx="5" cy="12" r="1" />
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="19" cy="12" r="1" />
                              </svg>
                            </button>
                          </div>
                        )}
                        </article>
                      </Fragment>
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
                  <svg className="chat-image-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21.4 11.1 12 20.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
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
                <textarea
                  ref={messageInputRef}
                  value={draft}
                  onChange={handleDraftChange}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="Write a message..."
                  maxLength={5000}
                  aria-label="Message"
                  rows={1}
                />
                <button
                  type="submit"
                  className="chat-send-button"
                  disabled={!draft.trim() || sending || !socketConnected}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                  <span>{sending ? "Sending..." : "Send"}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="chat-welcome">
              <div className="chat-welcome-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
                </svg>
              </div>
              <h2>Your messages</h2>
              <p>Select a conversation or visit a user profile to start chatting.</p>
            </div>
          )}
        </section>
      </section>
      {openMessageMenuId !== null &&
        messageMenuPosition &&
        createPortal(
          (() => {
            const message = selectedMessages.find(
              (item) => item.id === openMessageMenuId,
            );
            if (!message) return null;

            const ownMessage =
              Number(message.senderId) === Number(currentUser?.id);
            const canEdit =
              ownMessage &&
              Boolean(message.content) &&
              !message.image &&
              !message.deletedAt;

            return (
              <div
                ref={messageMenuRef}
                className="chat-message-action-menu"
                role="menu"
                style={{
                  top: `${messageMenuPosition.top}px`,
                  left: `${messageMenuPosition.left}px`,
                }}
              >
                {canEdit && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      closeMessageMenu();
                      startEditingMessage(message);
                    }}
                    disabled={messageActionPending}
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeMessageMenu();
                    void handleDeleteMessageForMe(message);
                  }}
                  disabled={messageActionPending}
                >
                  Delete for me
                </button>
                {ownMessage && !message.deletedAt && (
                  <button
                    type="button"
                    role="menuitem"
                    className="danger"
                    onClick={() => {
                      closeMessageMenu();
                      void handleDeleteMessageForEveryone(message);
                    }}
                    disabled={messageActionPending}
                  >
                    Delete for everyone
                  </button>
                )}
              </div>
            );
          })(),
          document.body,
        )}
    </main>
  );
}

export default Chat;
