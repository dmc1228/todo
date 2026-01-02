import { useState } from "react";
import { X, Share2, Mail, UserX } from "lucide-react";
import { ProjectCollaborator } from "../../types";
import "./ShareModal.css";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  collaborators: ProjectCollaborator[];
  onAddCollaborator: (email: string) => Promise<boolean>;
  onRemoveCollaborator: (collaboratorId: string) => Promise<void>;
  currentUserEmail: string;
}

export function ShareModal({
  isOpen,
  onClose,
  title,
  collaborators,
  onAddCollaborator,
  onRemoveCollaborator,
  currentUserEmail,
}: ShareModalProps) {
  const [email, setEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setIsAdding(true);

    try {
      const success = await onAddCollaborator(email.trim());
      if (success) {
        setEmail("");
      } else {
        setError("Failed to add collaborator");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (collaboratorId: string) => {
    try {
      await onRemoveCollaborator(collaboratorId);
    } catch (err) {
      setError("Failed to remove collaborator");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <div className="share-modal-title">
            <Share2 size={20} />
            <h2>Share {title}</h2>
          </div>
          <button
            className="share-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="share-modal-content">
          <form onSubmit={handleAddCollaborator} className="share-add-form">
            <div className="share-input-group">
              <Mail size={18} className="share-input-icon" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="share-input"
                disabled={isAdding}
              />
              <button
                type="submit"
                className="share-add-button"
                disabled={isAdding || !email.trim()}
              >
                {isAdding ? "Adding..." : "Add"}
              </button>
            </div>
            {error && <div className="share-error">{error}</div>}
          </form>

          <div className="share-collaborators-section">
            <h3 className="share-section-title">
              People with access ({collaborators.length})
            </h3>
            <div className="share-collaborators-list">
              {collaborators.map((collaborator) => (
                <div key={collaborator.id} className="share-collaborator-item">
                  <div className="share-collaborator-info">
                    <div className="share-collaborator-email">
                      {collaborator.email}
                      {collaborator.email === currentUserEmail && (
                        <span className="share-you-badge">You</span>
                      )}
                    </div>
                    <div className="share-collaborator-role">
                      {collaborator.role === "owner" ? "Owner" : "Editor"}
                    </div>
                  </div>
                  {collaborator.role !== "owner" &&
                    collaborator.email !== currentUserEmail && (
                      <button
                        className="share-remove-button"
                        onClick={() => handleRemove(collaborator.id)}
                        aria-label="Remove collaborator"
                      >
                        <UserX size={16} />
                      </button>
                    )}
                </div>
              ))}

              {collaborators.length === 0 && (
                <div className="share-empty-state">
                  No collaborators yet. Add someone to start sharing.
                </div>
              )}
            </div>
          </div>

          <div className="share-info">
            <p>
              Collaborators can view and edit tasks in this {title.toLowerCase()}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
