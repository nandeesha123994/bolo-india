import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import "../styles/Feedback.css";

const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const timeoutRef = useRef(null);
  const confirmationResolverRef = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    window.clearTimeout(timeoutRef.current);
    setToast({ message, type });
    timeoutRef.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  const confirmAction = useCallback(
    (message) =>
      new Promise((resolve) => {
        confirmationResolverRef.current = resolve;
        setConfirmation({ message });
      }),
    [],
  );

  const resolveConfirmation = (confirmed) => {
    setConfirmation(null);
    confirmationResolverRef.current?.(confirmed);
    confirmationResolverRef.current = null;
  };

  useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current);
      confirmationResolverRef.current?.(false);
    },
    [],
  );

  return (
    <FeedbackContext.Provider value={{ showToast, confirmAction }}>
      {children}
      {toast && (
        <div
          className={`app-toast ${toast.type}`}
          role={toast.type === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          <span>{toast.message}</span>
          <button
            type="button"
            className="app-toast-close"
            aria-label="Dismiss message"
            onClick={() => {
              window.clearTimeout(timeoutRef.current);
              setToast(null);
            }}
          >
            ×
          </button>
        </div>
      )}
      {confirmation && (
        <div className="app-confirm-backdrop">
          <div
            className="app-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="app-confirm-message"
          >
            <p id="app-confirm-message">{confirmation.message}</p>
            <div className="app-confirm-actions">
              <button
                type="button"
                className="app-confirm-cancel"
                onClick={() => resolveConfirmation(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="app-confirm-accept"
                onClick={() => resolveConfirmation(true)}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const feedback = useContext(FeedbackContext);

  if (!feedback) {
    throw new Error("useFeedback must be used within a FeedbackProvider");
  }

  return feedback;
}
