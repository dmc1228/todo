import { useState, useEffect, useRef } from "react";
import { WifiOff, Check, RefreshCw } from "lucide-react";
import { syncPendingChanges } from "../../services/syncService";
import { hasPendingChanges } from "../../services/offlineStorage";
import "./OfflineIndicator.css";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSynced, setShowSynced] = useState(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      if (wasOfflineRef.current) {
        const hasPending = await hasPendingChanges();
        if (hasPending) {
          setIsSyncing(true);
          await syncPendingChanges();
          setIsSyncing(false);
          setShowSynced(true);
          setTimeout(() => setShowSynced(false), 3000);
        }
        wasOfflineRef.current = false;
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !isSyncing && !showSynced) return null;

  return (
    <div className={`offline-indicator ${!isOnline ? "offline" : isSyncing ? "syncing" : "synced"}`}>
      {!isOnline ? (
        <>
          <WifiOff size={16} />
          <span>Offline - Changes saved locally</span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw size={16} className="spinning" />
          <span>Syncing...</span>
        </>
      ) : (
        <>
          <Check size={16} />
          <span>All changes synced</span>
        </>
      )}
    </div>
  );
}
